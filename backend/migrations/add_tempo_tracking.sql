-- Add tempo tracking fields to practice_sessions table
ALTER TABLE practice_sessions 
ADD COLUMN target_tempo INTEGER,
ADD COLUMN practice_mode VARCHAR(20) DEFAULT 'normal';

-- Create tempo_tracking table for detailed tempo data
CREATE TABLE tempo_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actual_tempo INTEGER NOT NULL,
    target_tempo INTEGER NOT NULL,
    is_under_tempo BOOLEAN NOT NULL,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tempo_tracking_session_id ON tempo_tracking(session_id);
CREATE INDEX idx_tempo_tracking_timestamp ON tempo_tracking(timestamp);
CREATE INDEX idx_tempo_tracking_created_at ON tempo_tracking(created_at);

-- Create tempo_achievements table for gamification
CREATE TABLE tempo_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(user_id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    level INTEGER DEFAULT 1,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, achievement_type)
);

-- Create index for achievements
CREATE INDEX idx_tempo_achievements_student_id ON tempo_achievements(student_id);

-- Add some initial achievement types as comments for reference
COMMENT ON TABLE tempo_achievements IS 'Achievement types: zen_master, patience_padawan, slow_and_steady, tempo_discipline, meditation_master, first_slow_practice';