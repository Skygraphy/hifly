CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL DEFAULT 'string' CHECK (type IN ('string','boolean','region')),
  min_role    TEXT NOT NULL DEFAULT 'super_admin' CHECK (min_role IN ('user','admin','super_admin')),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO app_settings (key, value, label, description, type, min_role) VALUES
  ('default_region_id',    'null', 'Standard-Region',
   'Region, die in der öffentlichen Galerie vorausgewählt ist', 'region', 'super_admin'),
  ('worker_auto_process',  'true', 'Automatische Bildverarbeitung',
   'DNG-Dateien nach dem Upload automatisch in JPGs umwandeln', 'boolean', 'super_admin'),
  ('registration_enabled', 'true', 'Registrierung offen',
   'Neue Benutzer können sich registrieren', 'boolean', 'super_admin')
ON CONFLICT (key) DO NOTHING;
