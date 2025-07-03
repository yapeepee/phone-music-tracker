-- Fix the piece_archive_summary view to NOT aggregate data across all students
-- This view should only be used for reference, not for actual queries

-- Drop the existing view
DROP VIEW IF EXISTS piece_archive_summary;

-- Recreate the view with a warning comment
-- WARNING: This view aggregates data from ALL students who practiced the piece
-- DO NOT USE THIS VIEW for student-specific queries
-- Instead, use custom queries that filter by student_id in the JOINs
CREATE OR REPLACE VIEW piece_archive_summary_all_students AS
SELECT 
    t.id as piece_id,
    t.name as piece_name,
    t.composer,
    t.opus_number,
    t.difficulty_level,
    t.is_archived,
    t.archived_at,
    t.created_at,
    t.owner_teacher_id,
    COUNT(DISTINCT ps.id) as total_segments,
    COUNT(DISTINCT ps.id) FILTER (WHERE ps.is_completed = true) as completed_segments,
    COALESCE(SUM(ps.total_click_count), 0) as total_clicks,
    COUNT(DISTINCT sc.session_id) as sessions_practiced,
    MIN(sc.clicked_at) as first_practiced,
    MAX(sc.clicked_at) as last_practiced
FROM tags t
LEFT JOIN practice_segments ps ON ps.piece_tag_id = t.id
LEFT JOIN segment_clicks sc ON sc.segment_id = ps.id
WHERE t.tag_type = 'piece'
GROUP BY t.id, t.name, t.composer, t.opus_number, t.difficulty_level, 
         t.is_archived, t.archived_at, t.created_at, t.owner_teacher_id;

-- Note: Always use custom queries with student_id filtering for actual application use