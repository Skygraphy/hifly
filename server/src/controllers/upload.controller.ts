import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { generateUploadUrl } from '../services/s3.service';
import { findByChecksum } from '../services/duplicates.service';
import { createImage, updateImageStatus } from '../services/images.service';
import * as regionsService from '../services/regions.service';
import { getSetting } from '../services/settings.service';
import type { UploadInitiateResult } from '../types';

// Parses filename: Adalbert_Stifter_Gasse_2024_07_13_001_7EE7.DNG
const FILENAME_RE = /^(.+)_(\d{4})_(\d{2})_(\d{2})_(\d+)_([A-Fa-f0-9]{4})\.DNG$/i;

function parseFilename(filename: string) {
  const m = filename.match(FILENAME_RE);
  if (!m) return null;
  return {
    address: m[1].replace(/_/g, ' '),
    captureDate: `${m[2]}-${m[3]}-${m[4]}`,
    sequenceNumber: m[5],
    hash: m[6].toUpperCase(),
  };
}

const initiateSchema = z.object({
  files: z.array(z.object({
    filename: z.string().min(1),
    fileSize: z.number().int().positive(),
    checksum: z.string().length(64),
    tags: z.array(z.string()).optional().default([]),
    regionId: z.string().uuid().nullable().optional(),
  })).min(1).max(100),
});

export async function initiate(req: Request, res: Response, next: NextFunction) {
  try {
    const { files } = initiateSchema.parse(req.body);

    const results: UploadInitiateResult[] = await Promise.all(
      files.map(async (file) => {
        const parsed = parseFilename(file.filename);
        if (!parsed) {
          return { id: '', hash: '', isDuplicate: false, error: `Invalid filename: ${file.filename}` } as UploadInitiateResult & { error?: string };
        }

        const id = file.filename.replace(/\.DNG$/i, '');
        const s3KeyPrefix = `images/${id}/`;
        const s3Key = `${s3KeyPrefix}original.dng`;

        const existingId = await findByChecksum(file.checksum);
        if (existingId) {
          return { id, hash: parsed.hash, isDuplicate: true, duplicateId: existingId };
        }

        const presignedUrl = await generateUploadUrl(s3Key);

        let regionPath: string[] = [];
        let regionPathIds: string[] = [];
        if (file.regionId) {
          [regionPath, regionPathIds] = await Promise.all([
            regionsService.getRegionPathById(file.regionId),
            regionsService.getRegionPathIdsById(file.regionId),
          ]);
        }

        await createImage({
          id,
          hash: parsed.hash,
          originalFilename: file.filename,
          address: parsed.address,
          captureDate: parsed.captureDate,
          sequenceNumber: parsed.sequenceNumber,
          s3KeyPrefix,
          fileSizeBytes: file.fileSize,
          checksum: file.checksum,
          tags: file.tags ?? [],
          uploadedBy: req.user!.userId,
          regionId: file.regionId ?? null,
          regionPath,
          regionPathIds,
        });

        return { id, hash: parsed.hash, isDuplicate: false, presignedUrl, s3Key };
      })
    );

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

const confirmSchema = z.object({
  id: z.string().min(1),
  s3Key: z.string().min(1),
});

export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = confirmSchema.parse(req.body);
    // Only queue for processing if worker_auto_process is enabled
    const autoProcess = await getSetting<boolean>('worker_auto_process');
    await updateImageStatus(id, autoProcess !== false ? 'uploaded' : 'pending');
    res.json({ data: { id, status: autoProcess !== false ? 'queued' : 'pending' } });
  } catch (err) {
    next(err);
  }
}
