-- Add uploaded_by column to track which admin uploaded each image.
-- NULL = legacy image, only super_admin can modify.
ALTER TABLE images
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL;
