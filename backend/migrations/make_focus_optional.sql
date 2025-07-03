-- Make focus field optional in practice_sessions table
-- This allows sessions to be created without predefined focus categories
-- as practice focuses are now custom text created by students

ALTER TABLE practice_sessions 
ALTER COLUMN focus DROP NOT NULL;

-- Add a comment to explain the change
COMMENT ON COLUMN practice_sessions.focus IS 'Legacy field for predefined focus categories. Now optional as practice focuses are custom text stored in practice_segments table.';