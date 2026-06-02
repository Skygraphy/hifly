import { Request, Response, NextFunction } from 'express';
import { getAllTags } from '../services/tags.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const tags = await getAllTags();
    res.json({ data: tags });
  } catch (err) {
    next(err);
  }
}
