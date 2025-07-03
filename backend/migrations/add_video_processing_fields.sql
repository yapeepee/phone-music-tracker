-- Add video processing fields to practice_sessions table
-- These columns are required for the video processing pipeline

ALTER TABLE practice_sessions
ADD COLUMN IF NOT EXISTS processing_result JSONB,
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE;