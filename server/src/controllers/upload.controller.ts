import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { generateUploadUrl } from '../services/s3.service';
import { findByChecksum } from '../services/duplicates.service';
import { createImage, updateImageStatus } from '../services/images.service';
import { enqueueProcessingJob } from '../services/sqs.service';
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
    checksum: z.string().length(64), // SHA-256 hex
    tags: z.array(z.string()).optional().default([]),
  })).min(1).max(100),
});

export async function initiate(req: Request, res: Response, next: NextFunction) {
  try {
    const { files } = initiateSchema.parse(req.body);

    const results: UploadInitiateResult[] = await Promise.all(
      files.map(async (file) => {
        const parsed = parseFilename(file.filename);
        if (!parsed) {
          return {
            hash: '',
            isDuplicate: false,
            presignedUrl: undefined,
            s3Key: undefined,
            error: `Invalid filename format: ${file.filename}`,
          } as UploadInitiateResult & { error?: string };
        }

        const existingHash = await findByChecksum(file.checksum);
        if (existingHash) {
          return { hash: parsed.hash, isDuplicate: true, duplicateHash: existingHash };
        }

        const s3Key = `images/${parsed.hash}/original.dng`;
        const presignedUrl = await generateUploadUrl(s3Key);

        await createImage({
          hash: parsed.hash,
          originalFilename: file.filename,
          address: parsed.address,
          captureDate: parsed.captureDate,
          sequenceNumber: parsed.sequenceNumber,
          s3KeyPrefix: `images/${parsed.hash}/`,
          fileSizeBytes: file.fileSize,
          checksum: file.checksum,
          tags: file.tags ?? [],
        });

        return { hash: parsed.hash, isDuplicate: false, presignedUrl, s3Key };
      })
    );

    res.json({ data: results });
  } catch (err) {
    next(err);
  }
}

const confirmSchema = z.object({
  hash: z.string().length(4),
  s3Key: z.string().min(1),
});

export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const { hash } = confirmSchema.parse(req.body);

    await updateImageStatus(hash, 'processing');
    await enqueueProcessingJob({ hash, s3KeyPrefix: `images/${hash}/` });

    res.json({ data: { hash, status: 'queued' } });
  } catch (err) {
    next(err);
  }
}
