-- V10: Add profile_image_url column to students and users tables
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
