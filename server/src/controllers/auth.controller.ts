import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { supabase } from '../config/supabase';
import { env } from '../config/env';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const { data: user } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    const valid = user && await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ data: { token, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 12);

    const { data, error } = await supabase
      .from('users')
      .insert({ email: email.toLowerCase(), password_hash: passwordHash })
      .select('id, email')
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }
      throw error;
    }

    const token = jwt.sign(
      { userId: data.id, email: data.email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ data: { token, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString() } });
  } catch (err) {
    next(err);
  }
}
