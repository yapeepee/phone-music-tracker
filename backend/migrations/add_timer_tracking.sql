-- Add timer tracking system for practice sessions
-- This migration adds support for tracking practice time with pause/resume events

-- Create the session_timers table to track timer state per session
CREATE TABLE IF NOT EXISTS session_timers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    total_seconds INTEGER DEFAULT 0,
    is_paused BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- One timer per session
    UNIQUE(session_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_session_timers_session_id ON session_timers(session_id);

-- Create the timer_events table to track pause/resume events
CREATE TABLE IF NOT EXISTS timer_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_timer_id UUID NOT NULL REFERENCES session_timers(id) ON DELETE CASCADE,
    event_type VARCHAR(10) NOT NULL CHECK (event_type IN ('start', 'pause', 'resume', 'stop')),
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Index for efficient queries
    INDEX idx_timer_events_session_timer_id (session_timer_id),
    INDEX idx_timer_events_timestamp (event_timestamp)
);

-- Create a view for timer analytics per piece
CREATE OR REPLACE VIEW piece_timer_analytics AS
SELECT 
    ps.primary_piece_tag_id as piece_id,
    t.name as piece_name,
    COUNT(DISTINCT ps.id) as total_sessions,
    SUM(st.total_seconds) as total_practice_seconds,
    AVG(st.total_seconds) as avg_session_seconds,
    COUNT(DISTINCT te.id) FILTER (WHERE te.event_type = 'pause') as total_pauses,
    MAX(st.total_seconds) as longest_session_seconds
FROM practice_sessions ps
JOIN tags t ON ps.primary_piece_tag_id = t.id
LEFT JOIN session_timers st ON ps.id = st.session_id
LEFT JOIN timer_events te ON st.id = te.session_timer_id
WHERE ps.primary_piece_tag_id IS NOT NULL
GROUP BY ps.primary_piece_tag_id, t.name;

-- Create a function to update timer when events are recorded
CREATE OR REPLACE FUNCTION update_session_timer()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    UPDATE session_timers
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.session_timer_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamps
CREATE TRIGGER trigger_update_session_timer
AFTER INSERT ON timer_events
FOR EACH ROW
EXECUTE FUNCTION update_session_timer();

-- Add comment for documentation
COMMENT ON TABLE session_timers IS 'Tracks practice timer state for each session including total time and pause status';
COMMENT ON TABLE timer_events IS 'Records pause/resume events during practice sessions for detailed time tracking';