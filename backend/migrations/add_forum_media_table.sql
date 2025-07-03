-- Create forum media table for storing uploaded images and videos
CREATE TABLE IF NOT EXISTS forum_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner of the media - either post or comment
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES forum_comments(id) ON DELETE CASCADE,
    
    -- Uploader info
    uploader_id UUID NOT NULL REFERENCES users(id),
    
    -- Media details
    media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
    s3_key VARCHAR(500) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    
    -- Image specific metadata
    width INTEGER,
    height INTEGER,
    
    -- Video specific metadata
    duration_seconds INTEGER,
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    thumbnail_s3_key VARCHAR(500),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure media belongs to either post or comment, not both
    CONSTRAINT check_single_owner CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR 
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_media_post_id ON forum_media(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_media_comment_id ON forum_media(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_forum_media_uploader_id ON forum_media(uploader_id);
CREATE INDEX IF NOT EXISTS idx_forum_media_created_at ON forum_media(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_forum_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER forum_media_updated_at_trigger
    BEFORE UPDATE ON forum_media
    FOR EACH ROW
    EXECUTE FUNCTION update_forum_media_updated_at();