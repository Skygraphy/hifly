import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase';

export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data: data ?? [] });
  } catch (err) {
    next(err);
  }
}

const roleSchema = z.object({
  role: z.enum(['user', 'admin']), // super_admin cannot be granted via API
});

export async function updateUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { role } = roleSchema.parse(req.body);
    const targetId = req.params.id;

    // Super-admin cannot demote themselves
    if (targetId === req.user!.userId) {
      res.status(400).json({ error: 'Cannot change your own role' });
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', targetId)
      .select('id, email, role')
      .maybeSingle();

    if (error) throw error;
    if (!data) { res.status(404).json({ error: 'User not found' }); return; }

    res.json({ data });
  } catch (err) {
    next(err);
  }
}
