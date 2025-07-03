-- Add practice segment tracking system
-- This migration adds support for tracking practice segments within musical pieces

-- First, extend the tags table to support piece tracking
ALTER TABLE tags ADD COLUMN IF NOT EXISTS tag_type VARCHAR(20) DEFAULT 'general';
ALTER TABLE tags ADD COLUMN IF NOT EXISTS composer VARCHAR(100);
ALTER TABLE tags ADD COLUMN IF NOT EXISTS opus_number VARCHAR(50);
ALTER TABLE tags ADD COLUMN IF NOT EXISTS difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 10);
ALTER TABLE tags ADD COLUMN IF NOT EXISTS estimated_mastery_sessions INTEGER;

-- Create an index on tag_type for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tags_tag_type ON tags(tag_type);

-- Create the practice_segments table
CREATE TABLE IF NOT EXISTS practice_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    piece_tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(user_id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_click_count INTEGER DEFAULT 0,
    last_clicked_at TIMESTAMP WITH TIME ZONE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique segments per student and piece
    UNIQUE(piece_tag_id, student_id, name)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_practice_segments_piece_student ON practice_segments(piece_tag_id, student_id);
CREATE INDEX IF NOT EXISTS idx_practice_segments_student ON practice_segments(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_segments_completed ON practice_segments(is_completed);

-- Create the segment_clicks table to track individual click events
CREATE TABLE IF NOT EXISTS segment_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    segment_id UUID NOT NULL REFERENCES practice_segments(id) ON DELETE CASCADE,
    session_id UUID REFERENCES practice_sessions(id) ON DELETE SET NULL,
    clicked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    click_count INTEGER DEFAULT 1,  -- Allow multiple clicks to be recorded at once
    
    -- Index for efficient queries
    INDEX idx_segment_clicks_segment_id (segment_id),
    INDEX idx_segment_clicks_session_id (session_id),
    INDEX idx_segment_clicks_clicked_at (clicked_at)
);

-- Add a field to practice_sessions to track the primary piece being practiced
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS primary_piece_tag_id UUID REFERENCES tags(id);

-- Create a function to update the total_click_count when a click is recorded
CREATE OR REPLACE FUNCTION update_segment_click_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE practice_segments
    SET 
        total_click_count = total_click_count + NEW.click_count,
        last_clicked_at = NEW.clicked_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.segment_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update click counts
CREATE TRIGGER trigger_update_segment_click_count
AFTER INSERT ON segment_clicks
FOR EACH ROW
EXECUTE FUNCTION update_segment_click_count();

-- Create a view for segment analytics
CREATE OR REPLACE VIEW segment_practice_analytics AS
SELECT 
    ps.id as segment_id,
    ps.name as segment_name,
    ps.piece_tag_id,
    t.name as piece_name,
    ps.student_id,
    ps.total_click_count,
    ps.is_completed,
    COUNT(DISTINCT DATE(sc.clicked_at)) as days_practiced,
    MIN(sc.clicked_at) as first_practice_date,
    MAX(sc.clicked_at) as last_practice_date,
    COALESCE(
        json_agg(
            json_build_object(
                'date', DATE(sc.clicked_at),
                'count', SUM(sc.click_count)
            ) ORDER BY DATE(sc.clicked_at)
        ) FILTER (WHERE sc.id IS NOT NULL),
        '[]'::json
    ) as daily_practice_data
FROM practice_segments ps
JOIN tags t ON ps.piece_tag_id = t.id
LEFT JOIN segment_clicks sc ON ps.id = sc.segment_id
GROUP BY ps.id, ps.name, ps.piece_tag_id, t.name, ps.student_id, ps.total_click_count, ps.is_completed;

-- Add updated_at trigger for practice_segments
CREATE TRIGGER update_practice_segments_updated_at
BEFORE UPDATE ON practice_segments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();