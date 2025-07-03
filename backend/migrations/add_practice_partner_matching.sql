-- Migration: Add practice partner matching system
-- Date: 2025-01-15
-- Description: Adds tables for user availability, practice partner requests, and matches

-- 1. User availability preferences
CREATE TABLE IF NOT EXISTS user_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, day_of_week, start_time) -- Prevent overlapping slots for same day
);

-- Index for faster queries
CREATE INDEX idx_user_availability_user_id ON user_availability(user_id);
CREATE INDEX idx_user_availability_active ON user_availability(is_active) WHERE is_active = true;

-- 2. User practice preferences
CREATE TABLE IF NOT EXISTS user_practice_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_available_for_partners BOOLEAN DEFAULT false, -- Opt-in for partner matching
    preferred_communication VARCHAR(50) DEFAULT 'in_app', -- 'in_app', 'email', 'video_call'
    skill_level VARCHAR(20), -- 'beginner', 'intermediate', 'advanced', 'professional'
    practice_goals TEXT,
    languages VARCHAR[] DEFAULT ARRAY['English'::VARCHAR], -- Array of languages spoken
    max_partners INTEGER DEFAULT 5, -- Maximum number of practice partners
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Practice partner requests/matches
CREATE TABLE IF NOT EXISTS practice_partner_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    piece_id UUID REFERENCES tags(id) ON DELETE CASCADE, -- The piece they want to practice together
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'cancelled', 'ended'
    match_reason VARCHAR(50), -- 'same_piece', 'similar_timezone', 'skill_level', 'manual'
    requester_message TEXT,
    partner_message TEXT,
    matched_at TIMESTAMP WITH TIME ZONE, -- When the match was accepted
    ended_at TIMESTAMP WITH TIME ZONE, -- When the partnership ended
    ended_reason VARCHAR(50), -- 'completed_piece', 'schedule_conflict', 'user_request', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT different_users CHECK (requester_id != partner_id),
    UNIQUE(requester_id, partner_id, piece_id) -- Prevent duplicate requests for same piece
);

-- Indexes for efficient queries
CREATE INDEX idx_partner_matches_requester ON practice_partner_matches(requester_id);
CREATE INDEX idx_partner_matches_partner ON practice_partner_matches(partner_id);
CREATE INDEX idx_partner_matches_piece ON practice_partner_matches(piece_id);
CREATE INDEX idx_partner_matches_status ON practice_partner_matches(status);

-- 4. Practice sessions together (links to existing sessions table)
CREATE TABLE IF NOT EXISTS partner_practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES practice_partner_matches(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    partner_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL, -- Partner's corresponding session
    is_synchronized BOOLEAN DEFAULT false, -- Whether they practiced at the same time
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Helper view for finding compatible partners
CREATE OR REPLACE VIEW compatible_practice_partners AS
WITH user_pieces AS (
    -- Get all active pieces for each user
    SELECT 
        ucp.user_id,
        ucp.piece_id,
        ucp.priority,
        u.timezone as user_timezone,
        u.full_name,
        upp.is_available_for_partners,
        upp.skill_level,
        upp.languages
    FROM user_current_pieces ucp
    JOIN users u ON u.id = ucp.user_id
    LEFT JOIN user_practice_preferences upp ON upp.user_id = u.id
    JOIN tags t ON t.id = ucp.piece_id
    WHERE t.is_archived = false
      AND u.is_active = true
)
SELECT 
    up1.user_id as user1_id,
    up1.full_name as user1_name,
    up2.user_id as user2_id,
    up2.full_name as user2_name,
    up1.piece_id,
    t.name as piece_name,
    t.composer,
    -- Calculate timezone difference in hours
    EXTRACT(HOUR FROM (up1.user_timezone::interval - up2.user_timezone::interval)) as timezone_diff_hours,
    up1.skill_level as user1_skill_level,
    up2.skill_level as user2_skill_level,
    -- Find common languages
    ARRAY(SELECT unnest(up1.languages) INTERSECT SELECT unnest(up2.languages)) as common_languages
FROM user_pieces up1
JOIN user_pieces up2 ON up1.piece_id = up2.piece_id AND up1.user_id != up2.user_id
JOIN tags t ON t.id = up1.piece_id
WHERE up1.is_available_for_partners = true
  AND up2.is_available_for_partners = true
  -- Exclude existing matches
  AND NOT EXISTS (
      SELECT 1 FROM practice_partner_matches ppm
      WHERE (ppm.requester_id = up1.user_id AND ppm.partner_id = up2.user_id AND ppm.piece_id = up1.piece_id)
         OR (ppm.requester_id = up2.user_id AND ppm.partner_id = up1.user_id AND ppm.piece_id = up1.piece_id)
      AND ppm.status IN ('pending', 'accepted')
  );

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_user_availability_updated_at BEFORE UPDATE ON user_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_practice_preferences_updated_at BEFORE UPDATE ON user_practice_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practice_partner_matches_updated_at BEFORE UPDATE ON practice_partner_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some helpful comments
COMMENT ON TABLE user_availability IS 'Stores user availability windows for practice partner matching';
COMMENT ON TABLE user_practice_preferences IS 'User preferences for practice partner discovery';
COMMENT ON TABLE practice_partner_matches IS 'Tracks practice partner requests and active partnerships';
COMMENT ON TABLE partner_practice_sessions IS 'Links practice sessions between partners';
COMMENT ON VIEW compatible_practice_partners IS 'Helper view to find users working on the same pieces with compatible preferences';