import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getSettings, updateSetting } from '../services/settings.service';
import type { UserRole } from '../types';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.user?.role ?? 'user';
    const settings = await getSettings(role as UserRole);
    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
}

const updateSchema = z.object({
  value: z.unknown(),
});

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const { value } = updateSchema.parse(req.body);
    const key = req.params.key;
    await updateSetting(key, value, req.user!.userId);
    res.json({ data: { key, value } });
  } catch (err) {
    next(err);
  }
}
