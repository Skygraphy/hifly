import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { env } from './env';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws },
});
