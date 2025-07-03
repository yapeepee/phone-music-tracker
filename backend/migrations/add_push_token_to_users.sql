-- Add push notification token fields to users table
ALTER TABLE users
ADD COLUMN push_token VARCHAR(255),
ADD COLUMN push_platform VARCHAR(20);

-- Create index for push token lookups (optional but recommended)
CREATE INDEX idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.push_token IS 'Expo push notification token';
COMMENT ON COLUMN users.push_platform IS 'Platform type: ios, android, web';