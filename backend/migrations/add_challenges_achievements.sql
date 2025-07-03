-- Add challenges and achievements tables for practice gamification

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    icon VARCHAR(50) DEFAULT 'medal',
    badge_image_url VARCHAR(500),
    total_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create challenges table
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('streak', 'total_sessions', 'score_threshold', 'duration', 'focus_specific', 'time_of_day', 'weekly_goal')),
    target_value INTEGER NOT NULL,
    target_metric VARCHAR(50),
    target_focus VARCHAR(50),
    reputation_reward INTEGER DEFAULT 10,
    achievement_id UUID REFERENCES achievements(id) ON DELETE SET NULL,
    icon VARCHAR(50) DEFAULT 'trophy',
    color VARCHAR(7) DEFAULT '#6366F1',
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    is_repeatable BOOLEAN DEFAULT TRUE,
    cooldown_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_challenges table to track progress
CREATE TABLE IF NOT EXISTS user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'expired')),
    current_value INTEGER DEFAULT 0,
    progress_data JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_active_challenge UNIQUE (user_id, challenge_id, status) WHERE status IN ('not_started', 'in_progress')
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    earned_from_challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
    CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_id)
);

-- Create indexes
CREATE INDEX idx_challenges_active ON challenges(is_active, order_index);
CREATE INDEX idx_challenges_dates ON challenges(start_date, end_date) WHERE is_active = TRUE;
CREATE INDEX idx_user_challenges_user_status ON user_challenges(user_id, status);
CREATE INDEX idx_user_challenges_expires ON user_challenges(expires_at) WHERE status = 'in_progress';
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id, earned_at DESC);

-- Create function to update challenge updated_at
CREATE OR REPLACE FUNCTION update_challenge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_challenge_updated_at
    BEFORE UPDATE ON challenges
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_updated_at();

-- Insert initial achievements
INSERT INTO achievements (name, description, tier, icon) VALUES
    ('First Steps', 'Complete your first practice session', 'bronze', 'footsteps'),
    ('Consistent Learner', 'Complete a 7-day practice streak', 'silver', 'calendar-check'),
    ('Dedicated Musician', 'Complete a 30-day practice streak', 'gold', 'fire'),
    ('Virtuoso', 'Achieve 95% or higher in all metrics', 'platinum', 'star'),
    ('Century Club', 'Complete 100 practice sessions', 'gold', 'certificate'),
    ('Time Master', 'Practice for 1000 minutes total', 'silver', 'clock'),
    ('Technique Focus', 'Complete 20 technique-focused sessions', 'bronze', 'hand'),
    ('Rhythm Expert', 'Achieve 90% rhythm consistency 10 times', 'silver', 'musical-note'),
    ('Early Bird', 'Practice before 9 AM for 7 days', 'bronze', 'weather-sunny'),
    ('Night Owl', 'Practice after 8 PM for 7 days', 'bronze', 'moon-waning-crescent');

-- Insert initial challenges
INSERT INTO challenges (name, description, type, target_value, reputation_reward, achievement_id, icon, order_index) VALUES
    ('7-Day Streak', 'Practice every day for 7 days in a row', 'streak', 7, 50, 
        (SELECT id FROM achievements WHERE name = 'Consistent Learner'), 'calendar-check', 1),
    ('30-Day Streak', 'Practice every day for 30 days in a row', 'streak', 30, 200,
        (SELECT id FROM achievements WHERE name = 'Dedicated Musician'), 'fire', 2),
    ('Session Century', 'Complete 100 practice sessions', 'total_sessions', 100, 100,
        (SELECT id FROM achievements WHERE name = 'Century Club'), 'certificate', 3),
    ('Time Dedication', 'Practice for 1000 minutes total', 'duration', 1000, 75,
        (SELECT id FROM achievements WHERE name = 'Time Master'), 'clock', 4),
    ('Technique Master', 'Complete 20 technique-focused sessions', 'focus_specific', 20, 40,
        (SELECT id FROM achievements WHERE name = 'Technique Focus'), 'hand', 5),
    ('Rhythm Consistency', 'Achieve 90% rhythm score 10 times', 'score_threshold', 10, 60,
        (SELECT id FROM achievements WHERE name = 'Rhythm Expert'), 'musical-note', 6),
    ('Perfect Performance', 'Achieve 95% or higher in all metrics', 'score_threshold', 1, 100,
        (SELECT id FROM achievements WHERE name = 'Virtuoso'), 'star', 7),
    ('Early Practice', 'Practice before 9 AM for 7 days', 'time_of_day', 7, 30,
        (SELECT id FROM achievements WHERE name = 'Early Bird'), 'weather-sunny', 8),
    ('Night Practice', 'Practice after 8 PM for 7 days', 'time_of_day', 7, 30,
        (SELECT id FROM achievements WHERE name = 'Night Owl'), 'moon-waning-crescent', 9),
    ('Weekly Goal', 'Complete 5 sessions in a week', 'weekly_goal', 5, 20,
        NULL, 'target', 10);

-- Set target_metric for score-based challenges
UPDATE challenges SET target_metric = 'rhythm_score' WHERE name = 'Rhythm Consistency';
UPDATE challenges SET target_metric = 'overall_consistency_score' WHERE name = 'Perfect Performance';

-- Set target_focus for focus-specific challenges
UPDATE challenges SET target_focus = 'technique' WHERE name = 'Technique Master';

-- Add comment
COMMENT ON TABLE challenges IS 'Practice challenges that users can take on to earn achievements and reputation';
COMMENT ON TABLE achievements IS 'Achievements that can be earned by completing challenges';
COMMENT ON TABLE user_challenges IS 'Tracks user progress on challenges';
COMMENT ON TABLE user_achievements IS 'Records achievements earned by users';