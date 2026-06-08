-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'super_admin'));

-- To set the super admin (run once after migration):
-- UPDATE users SET role = 'super_admin' WHERE email = 'your@email.com';
