-- Add user_current_pieces association table
-- This migration adds support for tracking which musical pieces users are currently working on

-- Create user_current_pieces table (many-to-many between users and piece tags)
CREATE TABLE IF NOT EXISTS user_current_pieces (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    piece_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    
    -- Track when the user started working on this piece
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Optional notes about the current work
    notes TEXT,
    
    -- Priority level (1-5, where 1 is highest priority)
    priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
    
    -- Last time the user practiced this piece
    last_practiced_at TIMESTAMP WITH TIME ZONE,
    
    -- Total practice sessions for this piece
    practice_session_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id, piece_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_user_current_pieces_user_id ON user_current_pieces(user_id);
CREATE INDEX idx_user_current_pieces_piece_id ON user_current_pieces(piece_id);
CREATE INDEX idx_user_current_pieces_priority ON user_current_pieces(priority);
CREATE INDEX idx_user_current_pieces_last_practiced ON user_current_pieces(last_practiced_at);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_current_pieces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_current_pieces_updated_at
    BEFORE UPDATE ON user_current_pieces
    FOR EACH ROW
    EXECUTE FUNCTION update_user_current_pieces_updated_at();

-- Create a view to easily get current pieces with full piece information
CREATE OR REPLACE VIEW user_current_pieces_details AS
SELECT 
    ucp.user_id,
    ucp.piece_id,
    ucp.started_at,
    ucp.notes,
    ucp.priority,
    ucp.last_practiced_at,
    ucp.practice_session_count,
    ucp.created_at,
    ucp.updated_at,
    t.name AS piece_name,
    t.composer,
    t.opus_number,
    t.difficulty_level,
    t.estimated_mastery_sessions,
    u.full_name AS user_name,
    CASE 
        WHEN u.role = 'student' THEN s.instrument
        ELSE NULL
    END AS instrument
FROM user_current_pieces ucp
INNER JOIN tags t ON ucp.piece_id = t.id AND t.tag_type = 'piece'
INNER JOIN users u ON ucp.user_id = u.id
LEFT JOIN students s ON u.id = s.user_id
ORDER BY ucp.priority ASC, ucp.started_at DESC;

-- Create a function to automatically update practice stats when a session is linked to a piece
CREATE OR REPLACE FUNCTION update_current_piece_practice_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_practiced_at and increment practice_session_count
    UPDATE user_current_pieces
    SET 
        last_practiced_at = NEW.start_time,
        practice_session_count = practice_session_count + 1
    WHERE 
        user_id = NEW.student_id AND
        piece_id IN (
            SELECT st.tag_id 
            FROM session_tags st 
            INNER JOIN tags t ON st.tag_id = t.id
            WHERE st.session_id = NEW.id AND t.tag_type = 'piece'
        );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update practice stats when a new session is created
CREATE TRIGGER trigger_update_current_piece_stats
    AFTER INSERT ON practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_current_piece_practice_stats();

-- Add comment to the table
COMMENT ON TABLE user_current_pieces IS 'Tracks which musical pieces users are currently actively working on';