import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as regionsService from '../services/regions.service';

export async function getTree(req: Request, res: Response, next: NextFunction) {
  try {
    const tree = await regionsService.getRegionTree();
    res.json({ data: tree });
  } catch (err) {
    next(err);
  }
}

const LEVEL_VALUES = [
  'federal', 'state', 'district', 'statutory_city', 'municipality', 'cadastral_municipality', 'area',
] as const;

const createSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  shortName: z.string().min(1).max(50).trim().nullable().default(null),
  parentId: z.string().uuid().nullable().default(null),
  level: z.enum(LEVEL_VALUES),
  code: z.string().min(1).max(20).nullable().default(null),
});

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, shortName, parentId, level, code } = createSchema.parse(req.body);
    const region = await regionsService.createRegion(name, parentId, level, code, shortName);
    res.status(201).json({ data: region });
  } catch (err) {
    next(err);
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  shortName: z.string().min(1).max(50).trim().nullable().optional(),
  code: z.string().min(1).max(20).nullable().optional(),
  level: z.enum(LEVEL_VALUES).optional(),
});

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const updates = updateSchema.parse(req.body);
    const region = await regionsService.updateRegion(req.params.id, updates);
    res.json({ data: region });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const force = req.query.force === 'true';
    await regionsService.deleteRegion(req.params.id, force);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
