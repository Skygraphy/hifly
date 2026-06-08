import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { env } from '../config/env';
import { getSetting } from '../services/settings.service';
import type { UserRole } from '../types';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

function makeToken(userId: string, email: string, role: UserRole): string {
  return jwt.sign({ userId, email, role }, env.JWT_SECRET, { expiresIn: '7d' });
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const { data: user } = await supabase
      .from('users')
      .select('id, email, password_hash, role')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    const valid = user && await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = makeToken(user.id, user.email, (user.role ?? 'user') as UserRole);
    res.json({ data: { token, role: user.role, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const registrationEnabled = await getSetting<boolean>('registration_enabled');
    if (registrationEnabled === false) {
      res.status(403).json({ error: 'Registrierung ist derzeit deaktiviert' });
      return;
    }
    const { email, password } = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
      .from('users')
      .insert({ email: email.toLowerCase(), password_hash: passwordHash, role: 'user' })
      .select('id, email, role')
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
      throw error;
    }

    const token = makeToken(data.id, data.email, 'user');
    res.status(201).json({ data: { token, role: 'user', expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() } });
  } catch (err) {
    next(err);
  }
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = passwordSchema.parse(req.body);

    const { data: user } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user!.userId)
      .maybeSingle();

    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) { res.status(400).json({ error: 'Aktuelles Passwort ist nicht korrekt' }); return; }

    const newHash = await bcrypt.hash(newPassword, 12);
    await supabase.from('users').update({ password_hash: newHash }).eq('id', req.user!.userId);

    res.json({ data: { message: 'Passwort erfolgreich geändert' } });
  } catch (err) {
    next(err);
  }
}
