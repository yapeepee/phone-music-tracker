-- Add archive fields to tags table for musical pieces
ALTER TABLE tags 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Create an index for efficient querying of non-archived pieces
CREATE INDEX IF NOT EXISTS idx_tags_piece_archived 
ON tags(tag_type, is_archived, owner_teacher_id) 
WHERE tag_type = 'piece';

-- Create a function to automatically set archived_at when archiving
CREATE OR REPLACE FUNCTION set_archived_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_archived = TRUE AND OLD.is_archived = FALSE THEN
        NEW.archived_at = CURRENT_TIMESTAMP;
    ELSIF NEW.is_archived = FALSE AND OLD.is_archived = TRUE THEN
        NEW.archived_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to manage archived_at timestamp
DROP TRIGGER IF EXISTS trigger_set_archived_timestamp ON tags;
CREATE TRIGGER trigger_set_archived_timestamp
BEFORE UPDATE ON tags
FOR EACH ROW
WHEN (NEW.is_archived IS DISTINCT FROM OLD.is_archived)
EXECUTE FUNCTION set_archived_timestamp();

-- Create a view for piece archive summaries
CREATE OR REPLACE VIEW piece_archive_summary AS
SELECT 
    t.id as piece_id,
    t.name as piece_name,
    t.composer,
    t.opus_number,
    t.difficulty_level,
    t.is_archived,
    t.archived_at,
    t.created_at,
    t.owner_teacher_id,
    COUNT(DISTINCT ps.id) as total_segments,
    COUNT(DISTINCT ps.id) FILTER (WHERE ps.is_completed = true) as completed_segments,
    COALESCE(SUM(ps.total_click_count), 0) as total_clicks,
    COUNT(DISTINCT sc.session_id) as sessions_practiced,
    MIN(sc.clicked_at) as first_practiced,
    MAX(sc.clicked_at) as last_practiced
FROM tags t
LEFT JOIN practice_segments ps ON ps.piece_tag_id = t.id
LEFT JOIN segment_clicks sc ON sc.segment_id = ps.id
WHERE t.tag_type = 'piece'
GROUP BY t.id, t.name, t.composer, t.opus_number, t.difficulty_level, 
         t.is_archived, t.archived_at, t.created_at, t.owner_teacher_id;