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

const createSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  parentId: z.string().uuid().nullable().default(null),
});

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, parentId } = createSchema.parse(req.body);
    const region = await regionsService.createRegion(name, parentId);
    res.status(201).json({ data: region });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await regionsService.deleteRegion(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
