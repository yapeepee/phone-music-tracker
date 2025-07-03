-- Migration: Add TUS upload fields to videos table
-- Date: 2025-06-26

-- Add new columns for TUS protocol support
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS upload_id VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS upload_offset INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS upload_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS upload_metadata TEXT,
ADD COLUMN IF NOT EXISTS upload_expires_at TIMESTAMP WITH TIME ZONE;

-- Create index for upload_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_videos_upload_id ON videos(upload_id);

-- Update existing videos to mark them as completed
UPDATE videos 
SET upload_completed = TRUE 
WHERE upload_completed IS NULL;

-- Add comment to describe the columns
COMMENT ON COLUMN videos.upload_id IS 'Unique identifier for TUS upload session';
COMMENT ON COLUMN videos.upload_offset IS 'Current upload offset in bytes';
COMMENT ON COLUMN videos.upload_completed IS 'Whether the upload has been completed';
COMMENT ON COLUMN videos.upload_metadata IS 'JSON metadata for the upload including S3 multipart info';
COMMENT ON COLUMN videos.upload_expires_at IS 'When the upload session expires';