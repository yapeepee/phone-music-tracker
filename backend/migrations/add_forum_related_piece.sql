-- Add related_piece_id field to forum_posts table for piece-specific discussions
ALTER TABLE forum_posts 
ADD COLUMN IF NOT EXISTS related_piece_id UUID REFERENCES tags(id);

-- Add constraint to ensure related_piece_id only references tags with tag_type='piece'
CREATE OR REPLACE FUNCTION check_related_piece_type()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.related_piece_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM tags 
            WHERE id = NEW.related_piece_id 
            AND tag_type = 'piece'
        ) THEN
            RAISE EXCEPTION 'related_piece_id must reference a tag with tag_type=piece';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate piece type
DROP TRIGGER IF EXISTS trigger_check_related_piece_type ON forum_posts;
CREATE TRIGGER trigger_check_related_piece_type
BEFORE INSERT OR UPDATE ON forum_posts
FOR EACH ROW
WHEN (NEW.related_piece_id IS NOT NULL)
EXECUTE FUNCTION check_related_piece_type();

-- Create index for efficient querying of posts by piece
CREATE INDEX IF NOT EXISTS idx_forum_posts_related_piece 
ON forum_posts(related_piece_id) 
WHERE related_piece_id IS NOT NULL;

-- Create index for finding posts about a specific piece
CREATE INDEX IF NOT EXISTS idx_forum_posts_piece_created 
ON forum_posts(related_piece_id, created_at DESC) 
WHERE related_piece_id IS NOT NULL;