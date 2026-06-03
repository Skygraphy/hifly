import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as imagesService from '../services/images.service';
import * as s3Service from '../services/s3.service';
import type { ProcessingStatus } from '../types';

const listSchema = z.object({
  tags: z.union([z.string(), z.array(z.string())]).optional().transform((v) =>
    v === undefined ? [] : Array.isArray(v) ? v : [v]
  ),
  address: z.string().optional(),
  status: z.enum(['pending', 'processing', 'ready', 'error']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const params = listSchema.parse(req.query);
    const { data, total } = await imagesService.listImages({
      tags: params.tags as string[],
      address: params.address,
      status: params.status as ProcessingStatus | undefined,
      page: params.page,
      limit: params.limit,
    });

    res.json({
      data,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        hasMore: params.page * params.limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const image = await imagesService.getImage(req.params.id);
    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    res.json({ data: image });
  } catch (err) {
    next(err);
  }
}

const tagsSchema = z.object({
  tags: z.array(z.string().min(1).max(50)).max(20),
});

export async function updateTags(req: Request, res: Response, next: NextFunction) {
  try {
    const { tags } = tagsSchema.parse(req.body);
    const updated = await imagesService.updateTags(req.params.id, tags);
    res.json({ data: { id: req.params.id, tags: updated } });
  } catch (err) {
    next(err);
  }
}

export async function deleteOne(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id;
    const prefix = await imagesService.getS3Prefix(id);
    if (prefix) await s3Service.deleteImage(prefix);
    await imagesService.deleteImageRecord(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

export async function deleteBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const { ids } = bulkDeleteSchema.parse(req.body);
    const prefixes = await imagesService.getS3Prefixes(ids);

    await s3Service.deleteImages(prefixes);
    await imagesService.deleteImageRecords(ids);

    res.json({ data: { deleted: ids } });
  } catch (err) {
    next(err);
  }
}
