-- Add sample musical pieces and practice goals for development/testing
-- This migration creates mock data for the practice segment tracking system

-- First, ensure we have a test student user (if not already exists)
INSERT INTO users (id, email, full_name, hashed_password, role, is_active, is_verified, created_at, updated_at)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'student@test.com', 'Test Student', 
     '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36P9kPtJGkCwiLp5dCCjdHu', 'student', true, true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert the student record
INSERT INTO students (user_id, teacher_id, created_at, updated_at)
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', NULL, NOW(), NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Create sample musical pieces as tags with tag_type='piece'
INSERT INTO tags (id, name, color, tag_type, composer, opus_number, difficulty_level, created_at, updated_at)
VALUES 
    -- Classical pieces
    ('b1234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'Moonlight Sonata - 1st Movement', '#5856D6', 'piece', 
     'Ludwig van Beethoven', 'Op. 27 No. 2', 6, NOW(), NOW()),
    
    ('b2234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'Invention No. 1 in C Major', '#34C759', 'piece', 
     'Johann Sebastian Bach', 'BWV 772', 4, NOW(), NOW()),
    
    ('b3234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'Nocturne in E-flat Major', '#FF9500', 'piece', 
     'Frédéric Chopin', 'Op. 9 No. 2', 5, NOW(), NOW()),
    
    ('b4234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'Clair de Lune', '#007AFF', 'piece', 
     'Claude Debussy', 'Suite Bergamasque', 5, NOW(), NOW()),
    
    -- Jazz/Modern pieces
    ('b5234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'Autumn Leaves', '#AF52DE', 'piece', 
     'Joseph Kosma', NULL, 3, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Create practice goals/reminders for each piece
-- These are the "segments" but they're actually practice reminders/goals

-- Moonlight Sonata practice goals
INSERT INTO practice_segments (piece_tag_id, student_id, name, description, display_order, created_at, updated_at)
VALUES 
    ('b1234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Smooth legato in opening arpeggios', 'Keep the right hand flowing smoothly without gaps between notes', 1, NOW(), NOW()),
    
    ('b1234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Left hand softer than melody', 'Maintain pp dynamic in left hand accompaniment', 2, NOW(), NOW()),
    
    ('b1234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Pedal changes with harmony', 'Change pedal cleanly on each harmony change to avoid muddiness', 3, NOW(), NOW()),
    
    ('b1234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Build intensity to development', 'Gradual crescendo from bar 15 to forte at bar 23', 4, NOW(), NOW());

-- Bach Invention practice goals
INSERT INTO practice_segments (piece_tag_id, student_id, name, description, display_order, created_at, updated_at)
VALUES 
    ('b2234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Even sixteenth notes throughout', 'Maintain consistent tempo and touch in running passages', 1, NOW(), NOW()),
    
    ('b2234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Clear articulation between hands', 'Each voice should be independently articulated', 2, NOW(), NOW()),
    
    ('b2234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Subject entrances prominent', 'Bring out the main theme whenever it appears', 3, NOW(), NOW());

-- Chopin Nocturne practice goals
INSERT INTO practice_segments (piece_tag_id, student_id, name, description, display_order, created_at, updated_at)
VALUES 
    ('b3234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Rubato in melody line', 'Flexible timing while keeping left hand steady', 1, NOW(), NOW()),
    
    ('b3234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Ornaments light and graceful', 'Trills and turns should not interrupt the melodic line', 2, NOW(), NOW()),
    
    ('b3234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Control in cadenza sections', 'Maintain clarity in fast passages, not just speed', 3, NOW(), NOW());

-- Clair de Lune practice goals
INSERT INTO practice_segments (piece_tag_id, student_id, name, description, display_order, created_at, updated_at)
VALUES 
    ('b4234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Impressionistic tone color', 'Use more arm weight and slower key depression for warm tone', 1, NOW(), NOW()),
    
    ('b4234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Seamless dynamic transitions', 'No sudden changes, everything should flow', 2, NOW(), NOW()),
    
    ('b4234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Pedal for color, not just sustain', 'Experiment with half and quarter pedaling', 3, NOW(), NOW());

-- Autumn Leaves practice goals
INSERT INTO practice_segments (piece_tag_id, student_id, name, description, display_order, created_at, updated_at)
VALUES 
    ('b5234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Swing feel in eighth notes', 'Long-short pattern, not straight eighths', 1, NOW(), NOW()),
    
    ('b5234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Chord voicings in left hand', 'Use rootless voicings for more sophisticated sound', 2, NOW(), NOW()),
    
    ('b5234567-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
     'Improvisation over changes', 'Practice scales and arpeggios that fit each chord', 3, NOW(), NOW());

-- Add some practice history for demonstration
-- Some segments have been clicked multiple times
INSERT INTO segment_clicks (segment_id, clicked_at, click_count)
SELECT id, NOW() - INTERVAL '3 days', 5 
FROM practice_segments 
WHERE name = 'Smooth legato in opening arpeggios';

INSERT INTO segment_clicks (segment_id, clicked_at, click_count)
SELECT id, NOW() - INTERVAL '2 days', 3 
FROM practice_segments 
WHERE name = 'Left hand softer than melody';

INSERT INTO segment_clicks (segment_id, clicked_at, click_count)
SELECT id, NOW() - INTERVAL '1 day', 2 
FROM practice_segments 
WHERE name = 'Even sixteenth notes throughout';

-- Update click counts in practice_segments table
UPDATE practice_segments
SET total_click_count = (
    SELECT COALESCE(SUM(click_count), 0)
    FROM segment_clicks
    WHERE segment_clicks.segment_id = practice_segments.id
),
last_clicked_at = (
    SELECT MAX(clicked_at)
    FROM segment_clicks
    WHERE segment_clicks.segment_id = practice_segments.id
);

-- Mark one practice goal as completed for demonstration
UPDATE practice_segments
SET is_completed = true,
    completed_at = NOW() - INTERVAL '1 day'
WHERE name = 'Chord voicings in left hand';