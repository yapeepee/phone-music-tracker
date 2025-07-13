-- Add new notification types for practice partner matching
-- This migration adds enum values to the existing NotificationType enum

-- PostgreSQL doesn't allow direct modification of enums, so we need to:
-- 1. Create a new enum type
-- 2. Update the column to use the new type
-- 3. Drop the old type
-- 4. Rename the new type

-- Check if the new values already exist
DO $$
BEGIN
    -- Only proceed if the new types don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'notificationtype'::regtype 
        AND enumlabel = 'PARTNER_REQUEST_RECEIVED'
    ) THEN
        -- Add new enum values
        ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'PARTNER_REQUEST_RECEIVED';
        ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'PARTNER_REQUEST_ACCEPTED';
        ALTER TYPE notificationtype ADD VALUE IF NOT EXISTS 'PARTNER_REQUEST_DECLINED';
    END IF;
END $$;

-- Add index for faster partner notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_type_user_created 
ON notifications(type, user_id, created_at DESC)
WHERE type IN ('PARTNER_REQUEST_RECEIVED', 'PARTNER_REQUEST_ACCEPTED', 'PARTNER_REQUEST_DECLINED');