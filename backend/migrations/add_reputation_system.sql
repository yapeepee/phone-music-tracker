-- Add reputation fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reputation_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reputation_level VARCHAR(20) DEFAULT 'newcomer';

-- Create reputation history table to track changes
CREATE TABLE IF NOT EXISTS reputation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- What caused the reputation change
    reason VARCHAR(50) NOT NULL,
    -- Reference to the specific item (post, comment, session, etc)
    reference_id UUID,
    
    -- Points change (can be positive or negative)
    points_change INTEGER NOT NULL,
    -- Total points after this change
    total_points INTEGER NOT NULL,
    
    -- Additional context
    description TEXT,
    
    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate entries for same reason/reference
    CONSTRAINT unique_reputation_event UNIQUE (user_id, reason, reference_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_reputation_points ON users(reputation_points);
CREATE INDEX IF NOT EXISTS idx_reputation_history_user_id ON reputation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reputation_history_created_at ON reputation_history(created_at);
CREATE INDEX IF NOT EXISTS idx_reputation_history_reason ON reputation_history(reason);

-- Create function to update user reputation
CREATE OR REPLACE FUNCTION update_user_reputation(
    p_user_id UUID,
    p_reason VARCHAR(50),
    p_reference_id UUID,
    p_points_change INTEGER,
    p_description TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    v_current_points INTEGER;
    v_new_points INTEGER;
BEGIN
    -- Get current points
    SELECT reputation_points INTO v_current_points
    FROM users
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Calculate new points (minimum 0)
    v_new_points := GREATEST(0, COALESCE(v_current_points, 0) + p_points_change);
    
    -- Update user reputation
    UPDATE users 
    SET reputation_points = v_new_points,
        reputation_level = CASE
            WHEN v_new_points >= 10000 THEN 'expert'
            WHEN v_new_points >= 5000 THEN 'veteran'
            WHEN v_new_points >= 2000 THEN 'advanced'
            WHEN v_new_points >= 500 THEN 'intermediate'
            WHEN v_new_points >= 100 THEN 'contributor'
            ELSE 'newcomer'
        END
    WHERE id = p_user_id;
    
    -- Insert history record
    INSERT INTO reputation_history (
        user_id, reason, reference_id, points_change, total_points, description
    ) VALUES (
        p_user_id, p_reason, p_reference_id, p_points_change, v_new_points, p_description
    ) ON CONFLICT (user_id, reason, reference_id) DO NOTHING;
    
    RETURN v_new_points;
END;
$$ LANGUAGE plpgsql;

-- Reputation point values as comments for reference
-- Post upvoted: +5 points
-- Post downvoted: -2 points  
-- Comment upvoted: +2 points
-- Comment downvoted: -1 point
-- Answer accepted: +15 points (answerer), +2 points (asker)
-- First post of the day: +2 points
-- Practice session completed (students): +1 point
-- Feedback given (teachers): +3 points