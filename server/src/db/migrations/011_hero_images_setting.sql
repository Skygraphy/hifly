-- Extend type check to include image_list
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_type_check;
ALTER TABLE app_settings ADD CONSTRAINT app_settings_type_check
  CHECK (type IN ('string','boolean','region','image_list'));

-- Hero image IDs: array of image IDs shown on the homepage (public)
INSERT INTO app_settings (key, value, label, description, type, min_role) VALUES
  ('hero_image_ids', '[]'::jsonb,
   'Hero-Bilder',
   'Bis zu 5 Bilder für die Startseite. Leer = automatisch aus der Standard-Region.',
   'image_list', 'user')
ON CONFLICT (key) DO NOTHING;
