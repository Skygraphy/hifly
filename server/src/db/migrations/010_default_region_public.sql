-- Make default_region_id readable by anonymous users
-- so the Hero and gallery filter work without login.
UPDATE app_settings SET min_role = 'user' WHERE key = 'default_region_id';

-- Reload Supabase PostgREST schema cache
NOTIFY pgrst, 'reload schema';
