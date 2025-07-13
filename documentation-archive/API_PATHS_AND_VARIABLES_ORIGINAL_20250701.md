# 🎯 API Paths and Variables Reference

> **⚠️ CRITICAL**: This file is the single source of truth for all API paths, variable names, and data flow. 
> **UPDATE THIS FILE IMMEDIATELY** when:
> - Creating new endpoints
> - Defining request/response fields  
> - Changing variable names
> - Discovering path patterns
> 
> **Don't wait for errors - document as you code!**

## 📍 API Endpoints

### Base URLs
```
Frontend (Mobile): process.env.EXPO_PUBLIC_API_URL = http://192.168.8.196:8000/api/v1
Backend: http://localhost:8000/api/v1
```

### Authentication Endpoints
| Method | Path | Frontend Service | Backend Handler |
|--------|------|-----------------|-----------------|
| POST | `/auth/register` | authService.register() | auth.register() |
| POST | `/auth/login` | authService.login() | auth.login() |
| POST | `/auth/refresh` | authService.refreshToken() | auth.refresh_token() |
| GET | `/auth/me` | authService.getMe() | auth.get_current_user() |
| PUT | `/auth/push-token` | notificationService.updatePushToken() | auth.update_push_token() |

### Session Endpoints
| Method | Path | Frontend Service | Backend Handler |
|--------|------|-----------------|-----------------|
| POST | `/sessions/` | practiceService.createSession() | sessions.create_session() |
| GET | `/sessions/` | practiceService.getSessions() | sessions.get_sessions() |
| GET | `/sessions/?skip={n}&limit={n}&start_date={datetime}&end_date={datetime}` | practiceService.getSessions(params) | sessions.get_sessions() |
| GET | `/sessions/{id}` | practiceService.getSession() | sessions.get_session() |
| PUT | `/sessions/{id}` | practiceService.updateSession() | sessions.update_session() |
| DELETE | `/sessions/{id}` | practiceService.deleteSession() | sessions.delete_session() |
| GET | `/sessions/statistics` | practiceService.getStatistics() | sessions.get_statistics() |
| GET | `/sessions/search` | - | sessions.search_sessions() |

**Session Creation Request Fields**:
- `focus` (optional): PracticeFocus enum value
- `start_time` (required): ISO datetime string
- `tags` (optional): Array of tag names
- `target_tempo` (optional): Target BPM (20-300)
- `practice_mode` (optional): "normal" | "slow_practice" | "meditation" (default: "normal")

**Query Parameters for Sessions Search Endpoint**:
- `/sessions/search`:
  - `q` (required): Search query string for fuzzy technique search
  - `skip` (optional): Pagination offset (default: 0)
  - `limit` (optional): Max results (default: 100, max: 100)
  - Searches in: focus field, note field, and tag names
  - Uses case-insensitive ILIKE pattern matching

### Video Upload Endpoints ⚠️ CRITICAL
| Method | Path | Frontend Service | Backend Handler |
|--------|------|-----------------|-----------------|
| POST | `/videos/upload-multipart/{session_id}` | videoUploadService | video_processing.upload_video_multipart() |
| POST | `/videos/upload/{session_id}` | (unused - for regular uploads) | video_processing.upload_video() |
| GET | `/videos/{session_id}/status` | - | video_processing.get_processing_status() |
| GET | `/videos/session/{session_id}` | videoApiService.getSessionVideos() | videos.get_session_videos() |
| GET | `/videos/{video_id}` | videoApiService.getVideoWithUrl() | videos.get_video() |
| DELETE | `/videos/{video_id}` | videoApiService.deleteVideo() | videos.delete_video() |

**Note**: The `videos.router` must be included in `/backend/app/api/v1/api.py` for these endpoints to work!

### Analytics Endpoints 📊 NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|-----------------|-----------------|
| GET | `/sessions/{session_id}/analytics` | - | analytics.get_session_analytics() |
| GET | `/sessions/{session_id}/metrics` | - | analytics.get_session_metrics() |
| GET | `/analytics/summary` | - | analytics.get_analytics_summary() |
| GET | `/analytics/trends` | - | analytics.get_analytics_trends() |

### Teacher Endpoints 👩‍🏫 NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|------------------|-----------------|
| GET | `/teachers/students` | - | teachers.get_teacher_students() |
| GET | `/teachers/students/{student_id}` | - | teachers.get_student_profile() |
| GET | `/teachers/students/{student_id}/recent-sessions` | - | teachers.get_student_recent_sessions() |

**Query Parameters for Teacher Endpoints**:
- `/teachers/students`:
  - `skip` (optional): Pagination offset (default: 0)
  - `limit` (optional): Max results (default: 100, max: 100)
  - `active_only` (optional): Filter to active students only (default: false)
- `/teachers/students/{student_id}/recent-sessions`:
  - `days` (optional): Number of days to look back (default: 7, range: 1-90)
  - `limit` (optional): Max results (default: 20, max: 100)

### Feedback Endpoints 💬 NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|------------------|-----------------|
| POST | `/feedback/` | - | feedback.create_feedback() |
| GET | `/feedback/sessions/{session_id}` | - | feedback.get_session_feedback() |
| GET | `/feedback/videos/{video_id}` | - | feedback.get_video_feedback() |
| GET | `/feedback/{feedback_id}` | - | feedback.get_feedback() |
| PUT | `/feedback/{feedback_id}` | - | feedback.update_feedback() |
| DELETE | `/feedback/{feedback_id}` | - | feedback.delete_feedback() |
| GET | `/feedback/students/{student_id}/all` | - | feedback.get_student_all_feedback() |

### Tag Management Endpoints 🏷️ NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|------------------|-----------------|
| GET | `/tags/` | tagService.getTags() | tags.get_tags() |
| GET | `/tags/popular` | tagService.getPopularTags() | tags.get_popular_tags() |
| GET | `/tags/{tag_id}` | tagService.getTag() | tags.get_tag() |
| POST | `/tags/` | tagService.createTag() | tags.create_tag() |
| PUT | `/tags/{tag_id}` | tagService.updateTag() | tags.update_tag() |
| DELETE | `/tags/{tag_id}` | tagService.deleteTag() | tags.delete_tag() |
| GET | `/tags/{tag_id}/usage-count` | tagService.getTagUsageCount() | tags.get_tag_usage_count() |

**Query Parameters for Tag Endpoints**:
- `/tags/`:
  - `skip` (optional): Pagination offset (default: 0)
  - `limit` (optional): Max results (default: 100, max: 100)
- `/tags/popular`:
  - `limit` (optional): Max results (default: 10, max: 50)

**Tag Request Bodies**:
- POST `/tags/`: `{ name: string, color: string }`
- PUT `/tags/{tag_id}`: `{ name?: string, color?: string }`

**Tag Access Rules**:
- Teachers see: their custom tags + global tags
- Students see: only global tags
- Teachers can create/update/delete any tags
- Students can only create tags with tag_type='piece' (musical pieces)

**Tag Name Uniqueness**:
- Tag names must be unique within the same tag_type
- A piece named "Moonlight Sonata" won't conflict with a tag named "Moonlight Sonata"
- Duplicate names are checked per teacher/global scope AND tag_type

### Notification Management Endpoints 🔔 NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|-----------------|-----------------|
| GET | `/notifications/` | notificationService.getNotifications() | notifications.get_notifications() |
| GET | `/notifications/unread-count` | notificationService.getUnreadCount() | notifications.get_unread_count() |
| GET | `/notifications/{notification_id}` | notificationService.getNotification() | notifications.get_notification() |
| PUT | `/notifications/{notification_id}` | notificationService.markAsRead() | notifications.mark_notification_as_read() |
| PUT | `/notifications/mark-all-read` | notificationService.markAllAsRead() | notifications.mark_all_notifications_as_read() |
| DELETE | `/notifications/{notification_id}` | notificationService.deleteNotification() | notifications.delete_notification() |

### Notification Preferences Endpoints 🔔 NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|-----------------|-----------------|
| GET | `/notification-preferences/` | - | notification_preferences.get_notification_preferences() |
| PUT | `/notification-preferences/` | - | notification_preferences.update_notification_preferences() |
| POST | `/notification-preferences/reset` | - | notification_preferences.reset_notification_preferences() |

**Notification Preferences Request/Response Format**:
- GET `/notification-preferences/` returns:
  ```json
  {
    "globalEnabled": boolean,
    "types": {
      "practiceReminders": boolean,
      "sessionFeedback": boolean,
      "videoProcessing": boolean,
      "achievements": boolean,
      "eventReminders": boolean,
      "systemAnnouncements": boolean
    },
    "quietHours": {
      "enabled": boolean,
      "startTime": "HH:MM",
      "endTime": "HH:MM"
    }
  }
  ```
- PUT `/notification-preferences/` accepts same format (all fields optional)

**Query Parameters for Notifications**:
- `/notifications/`:
  - `skip` (optional): Pagination offset (default: 0)
  - `limit` (optional): Max results (default: 20, max: 100)
  - `unread_only` (optional): Filter to unread only (default: false)

**Notification Types (enum)**:
- `video_processing` - Video processing updates
- `feedback_received` - New feedback from teachers
- `session_reminder` - Practice session reminders
- `achievement_unlocked` - Achievement notifications
- `system_announcement` - System-wide announcements
- `event_invitation` - New event scheduled
- `event_cancelled` - Event cancellation

**Feedback Request Body (POST/PUT)**:
- POST: `{ text: string, rating?: 1-5, session_id?: UUID, video_id?: UUID, timestamp_seconds?: int }`
- PUT: `{ text: string, rating?: 1-5 }`
- Note: Must provide either session_id OR video_id, not both

### Forum (Community Q&A) Endpoints 🆕
| Method | Path | Frontend Service | Backend Handler |
|--------|------|------------------|-----------------|
| POST | `/forum/posts/` | forumService.createPost() | forum.create_post() |
| GET | `/forum/posts/` | forumService.getPosts() | forum.get_posts() |
| GET | `/forum/posts/{post_id}` | forumService.getPost() | forum.get_post() |
| PUT | `/forum/posts/{post_id}` | forumService.updatePost() | forum.update_post() |
| DELETE | `/forum/posts/{post_id}` | forumService.deletePost() | forum.delete_post() |
| POST | `/forum/posts/{post_id}/comments/` | forumService.createComment() | forum.create_comment() |
| GET | `/forum/posts/{post_id}/comments/` | forumService.getComments() | forum.get_comments() |
| PUT | `/forum/comments/{comment_id}` | forumService.updateComment() | forum.update_comment() |
| DELETE | `/forum/comments/{comment_id}` | forumService.deleteComment() | forum.delete_comment() |
| POST | `/forum/posts/{post_id}/vote` | forumService.votePost() | forum.vote_post() |

### Forum Media Endpoints 📸 NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|-----------------|-----------------|
| POST | `/forum-media/upload/{entity_type}/{entity_id}` | forumMediaService.uploadMedia() | forum_media.upload_forum_media() |
| GET | `/forum-media/post/{post_id}` | - | forum_media.get_post_media() |
| GET | `/forum-media/comment/{comment_id}` | - | forum_media.get_comment_media() |
| DELETE | `/forum-media/{media_id}` | forumMediaService.deleteMedia() | forum_media.delete_forum_media() |

**Forum Media Upload**:
- `entity_type`: Must be "post" or "comment"
- `entity_id`: UUID of the post or comment
- Supported image formats: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Supported video formats: `.mp4`, `.mov`, `.avi`, `.webm`
- Max image size: 10MB
- Max video size: 100MB

**⚠️ CRITICAL FIX**: Forum media files were not loading because the forum endpoints were returning empty `media_files` arrays. Fixed by:
1. Converting ForumMedia objects to ForumMediaWithUrl with presigned URLs
2. URL replacement from internal MinIO URL to external URL using S3_EXTERNAL_URL
3. Added helper function `convert_media_files_to_urls()` in forum.py endpoints
| POST | `/forum/comments/{comment_id}/vote` | forumService.voteComment() | forum.vote_comment() |
| POST | `/forum/posts/{post_id}/accept-answer/{comment_id}` | forumService.acceptAnswer() | forum.accept_answer() |

**Query Parameters for Forum Endpoints**:
- `/forum/posts/`:
  - `skip` (optional): Pagination offset (default: 0)
  - `limit` (optional): Max results (default: 20, max: 100)
  - `tag` (optional): Filter by tag name
  - `author_id` (optional): Filter by author UUID
  - `status` (optional): Filter by status (draft/published/closed/deleted)
  - `sort_by` (optional): Sort order (recent/votes/activity)
  - `search` (optional): Search in post title and content (case-insensitive)
  - `related_piece_id` (optional): Filter by musical piece UUID

**Forum Request Bodies**:
- POST `/forum/posts/`: `{ title: string, content: string, tags?: string[], related_piece_id?: UUID }`
- PUT `/forum/posts/{post_id}`: `{ title?: string, content?: string, status?: PostStatus }`
- POST `/forum/posts/{post_id}/comments/`: `{ content: string, parent_id?: UUID }`
- PUT `/forum/comments/{comment_id}`: `{ content: string }`
- POST vote endpoints: `{ vote_type: 1 | -1 }`

**NEW: Forum Post Fields (2025-07-01)**:
- `related_piece_id` (optional): UUID of a musical piece (tag with tag_type='piece') that this post is about
- `related_piece` (in response): Full Tag object with piece details when related_piece_id is set

**Forum Access Rules**:
- Posts can be viewed without authentication
- Creating posts/comments requires authentication
- Updating/deleting requires being the author (or admin)
- Only post authors can accept answers

### Forum Media Endpoints 🆕
| Method | Path | Frontend Service | Backend Handler |
|--------|------|------------------|-----------------|
| POST | `/forum/media/upload/{entity_type}/{entity_id}` | forumMediaService.uploadMedia() | forum_media.upload_forum_media() |
| GET | `/forum/media/post/{post_id}` | forumMediaService.getPostMedia() | forum_media.get_post_media() |
| GET | `/forum/media/comment/{comment_id}` | forumMediaService.getCommentMedia() | forum_media.get_comment_media() |
| DELETE | `/forum/media/{media_id}` | forumMediaService.deleteMedia() | forum_media.delete_forum_media() |

**Forum Media Upload Details**:
- Path: `/forum/media/upload/{entity_type}/{entity_id}`
  - `entity_type`: Must be "post" or "comment"
  - `entity_id`: UUID of the post or comment
- Request: Multipart form data with file field
- Supported formats:
  - Images: .jpg, .jpeg, .png, .gif, .webp (max 10MB)
  - Videos: .mp4, .mov, .avi, .webm (max 100MB)
- Response: `{ media_id: UUID, url: string, media_type: "image"|"video", file_size: int, width?: int, height?: int, duration?: int }`

### Reputation System Endpoints 🏆 NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|------------------|-----------------|
| GET | `/reputation/users/{user_id}/reputation` | reputationService.getUserReputation() | reputation.get_user_reputation() |
| GET | `/reputation/users/{user_id}/reputation/history` | reputationService.getReputationHistory() | reputation.get_reputation_history() |
| GET | `/reputation/leaderboard` | reputationService.getLeaderboard() | reputation.get_reputation_leaderboard() |

**Query Parameters for Reputation Endpoints**:
- `/reputation/users/{user_id}/reputation/history`:
  - `skip` (optional): Pagination offset (default: 0)
  - `limit` (optional): Max results (default: 50, max: 100)
- `/reputation/leaderboard`:
  - `skip` (optional): Pagination offset (default: 0)
  - `limit` (optional): Max results (default: 20, max: 100)

**Reputation Levels**:
- `newcomer`: 0-99 points
- `contributor`: 100-499 points
- `intermediate`: 500-1999 points
- `advanced`: 2000-4999 points
- `veteran`: 5000-9999 points
- `expert`: 10000+ points

**Important Note**: `/reputation/leaderboard` returns an array directly, not a paginated response object!

**Reputation Point Values**:
- Post upvoted: +5 points
- Post downvoted: -2 points
- Comment upvoted: +2 points
- Comment downvoted: -1 point
- Answer accepted: +15 points (answerer), +2 points (asker)
- Practice session completed: +1 point
- Feedback given (teachers): +3 points

### Challenge & Achievement Endpoints 🎯 NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|------------------|-----------------|
| GET | `/challenges/` | - | challenges.get_challenges() |
| GET | `/challenges/{challenge_id}` | - | challenges.get_challenge() |
| POST | `/challenges/start` | - | challenges.start_challenge() (⚠️ DEPRECATED - challenges auto-activate) |
| GET | `/challenges/user/active` | - | challenges.get_active_challenges() |
| GET | `/challenges/user/completed` | - | challenges.get_completed_challenges() |
| GET | `/challenges/achievements/all` | - | challenges.get_all_achievements() |
| GET | `/challenges/achievements/earned` | - | challenges.get_user_achievements() |
| GET | `/challenges/achievements/{user_id}` | - | challenges.get_user_achievements_by_id() |

**⚠️ IMPORTANT CHANGE (2025-07-01)**: 
- Challenges now auto-activate for all users
- All active challenges are automatically started when:
  - User registers (students only)
  - User logs in
  - User completes their first practice session
- The POST `/challenges/start` endpoint is deprecated but kept for backward compatibility
- Frontend changes:
  - No "Start Challenge" button - all challenges show progress immediately
  - Removed "Active" tab (redundant) - only "All" and "Completed" tabs remain
  - All non-completed challenges are automatically IN_PROGRESS
- **Challenge Progress Tracking**:
  - Progress is tracked ONLY when a session has an end_time
  - Frontend must call PUT `/sessions/{id}` with end_time to trigger tracking
  - Different challenge types track different metrics:
    - Streak challenges: Track daily practice patterns
    - Session count: Increment on each completed session
    - Duration: Add session duration_minutes
    - Time of day: Check session start_time hour
    - Weekly goals: Track sessions per week

**Query Parameters for Challenge Endpoints**:
- `/challenges/`:
  - `skip` (optional): Pagination offset (default: 0)
  - `limit` (optional): Max results (default: 20, max: 100)
  - `only_active` (optional): Filter to active challenges only (default: true)
- `/challenges/user/completed`:
  - `skip` (optional): Pagination offset (default: 0)
  - `limit` (optional): Max results (default: 20, max: 100)

**Challenge Types**:
- `streak`: Practice X days in a row
- `total_sessions`: Complete X sessions
- `score_threshold`: Achieve X score in a metric
- `duration`: Practice for X minutes total
- `focus_specific`: Practice X sessions with specific focus
- `time_of_day`: Practice at specific times
- `weekly_goal`: Complete X sessions per week

**Achievement Tiers**:
- `bronze`: Entry level achievements
- `silver`: Intermediate achievements
- `gold`: Advanced achievements
- `platinum`: Elite achievements

**Challenge Request Bodies**:
- POST `/challenges/start`: `{ challenge_id: UUID }`

**Date/DateTime Parameters**: 
- Backend endpoints expecting `datetime` type require full ISO format
- ✅ Correct: `2025-04-30T16:00:00.000Z` (use `.toISOString()`)
- ❌ Wrong: `2025-04-30` (will return 422 error)

**Video Filename Pattern**: `{sessionId}_practice_video_{timestamp}.mp4`
- Example: `89626eb4-064b-42e4-adec-6dbca6200ab3_practice_video_2025-01-28T05-53-24-496Z.mp4`
- Session ID extraction regex: `/^([a-f0-9-]+|\d+)_practice_video/i`

### Schedule Management Endpoints 📅 NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|-----------------|-----------------| 
| POST | `/schedule/` | - | schedule.create_event() |
| GET | `/schedule/` | - | schedule.get_events() |
| GET | `/schedule/calendar` | - | schedule.get_calendar_view() |
| GET | `/schedule/{event_id}` | - | schedule.get_event() |
| PUT | `/schedule/{event_id}` | - | schedule.update_event() |
| DELETE | `/schedule/{event_id}` | - | schedule.delete_event() |
| POST | `/schedule/conflicts/{conflict_id}/resolve` | - | schedule.resolve_conflict() |
| GET | `/schedule/my/upcoming` | - | schedule.get_my_upcoming_events() |
| GET | `/schedule/students/{student_id}/events` | - | schedule.get_student_events() |
| GET | `/schedule/calendar/export` | - | schedule.export_calendar() |

**Query Parameters for Schedule Endpoints**:
- `/schedule/`:
  - `start_date` (optional): Filter events starting after (ISO date format YYYY-MM-DD)
  - `end_date` (optional): Filter events ending before (ISO date format YYYY-MM-DD)
  - `event_type` (optional): Filter by type (lesson, practice, masterclass, recital, other)
  - `status` (optional): Filter by status (scheduled, confirmed, cancelled, completed, rescheduled)
  - `skip` (optional): Pagination offset (default: 0)
  - `limit` (optional): Max results (default: 100, max: 100)
- `/schedule/calendar`:
  - `start_date` (required): Start date for calendar view (ISO date format YYYY-MM-DD)
  - `end_date` (required): End date for calendar view (ISO date format YYYY-MM-DD)
  - `include_cancelled` (optional): Include cancelled events (default: false)
- `/schedule/{event_id}`:
  - `include_conflicts` (optional): Include conflict information (default: false)
- `/schedule/{event_id}` (PUT/DELETE):
  - `update_series`/`delete_series` (optional): Apply to all events in series (default: false)
- `/schedule/my/upcoming`:
  - `days_ahead` (optional): Number of days to look ahead (default: 7, range: 1-30)
- `/schedule/calendar/export`:
  - `start_date` (optional): Start date for export (ISO date format YYYY-MM-DD)
  - `end_date` (optional): End date for export (ISO date format YYYY-MM-DD)
  - `include_cancelled` (optional): Include cancelled events (default: false)
  - Returns: iCal/ICS file (text/calendar content type)

**Request Body for Schedule Event Creation**:
```json
{
  "title": "string",
  "description": "string (optional)",
  "event_type": "lesson|practice|masterclass|recital|other",
  "start_datetime": "ISO datetime",
  "end_datetime": "ISO datetime",
  "timezone": "string (default: UTC)",
  "location": "string (optional)",
  "is_online": boolean,
  "meeting_url": "string (required if is_online)",
  "color": "#hexcolor (default: #6366F1)",
  "reminder_minutes": integer (default: 15),
  "max_participants": integer (optional),
  "participant_ids": ["UUID array"],
  "recurrence_rule": {
    "recurrence_type": "none|daily|weekly|biweekly|monthly",
    "interval": integer (default: 1),
    "days_of_week": [integers 0-6] (for weekly),
    "day_of_month": integer 1-31 (for monthly),
    "week_of_month": integer 1-5 (for monthly),
    "end_date": "date (optional)",
    "occurrences": integer (optional),
    "exception_dates": ["date array (optional)"]
  }
}
```

### Timer Tracking Endpoints ⏱️ NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|------------------|-----------------|
| POST | `/timer/sessions/{session_id}/timer` | - | timer.create_session_timer() |
| GET | `/timer/sessions/{session_id}/timer` | - | timer.get_session_timer() |
| PUT | `/timer/sessions/{session_id}/timer` | - | timer.update_session_timer() |
| POST | `/timer/sessions/{session_id}/timer/events` | - | timer.add_timer_event() |
| GET | `/timer/sessions/{session_id}/timer/summary` | - | timer.get_timer_summary() |

**Timer Request Bodies**:
- POST `/timer/sessions/{session_id}/timer`:
  ```json
  {
    "session_id": "UUID",
    "total_seconds": 0,
    "is_paused": false,
    "events": [{
      "event_type": "start",
      "event_timestamp": "ISO datetime"
    }]
  }
  ```
- PUT `/timer/sessions/{session_id}/timer`:
  ```json
  {
    "total_seconds": 120,
    "is_paused": true
  }
  ```
- POST `/timer/sessions/{session_id}/timer/events`:
  ```json
  {
    "event_type": "pause|resume",
    "event_timestamp": "ISO datetime"
  }
  ```

**Timer Response Types**:
- SessionTimer: includes id, session_id, total_seconds, is_paused, created_at, updated_at, events[]
- TimerEvent: includes id, session_timer_id, event_type, event_timestamp
- TimerSummary: includes total_seconds, pause_count, total_pause_seconds, events[]

### Practice Segments Endpoints 🎼 NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|------------------|-----------------|
| GET | `/practice-segments/pieces` | practiceSegmentService.getStudentPieces() | practice_segments.get_student_pieces() |
| GET | `/practice-segments/pieces/{piece_tag_id}/segments` | practiceSegmentService.getPieceSegments() | practice_segments.get_piece_segments() |
| POST | `/practice-segments/segments` | practiceSegmentService.createSegment() | practice_segments.create_segment() |
| PUT | `/practice-segments/segments/{segment_id}` | practiceSegmentService.updateSegment() | practice_segments.update_segment() |
| DELETE | `/practice-segments/segments/{segment_id}` | practiceSegmentService.deleteSegment() | practice_segments.delete_segment() |
| POST | `/practice-segments/segments/click` | practiceSegmentService.recordSegmentClick() | practice_segments.record_segment_click() |
| GET | `/practice-segments/pieces/{piece_tag_id}/progress` | practiceSegmentService.getPieceProgress() | practice_segments.get_piece_progress() |
| GET | `/practice-segments/segments/{segment_id}/analytics` | practiceSegmentService.getSegmentAnalytics() | practice_segments.get_segment_analytics() |
| POST | `/practice-segments/pieces/{piece_id}/archive` | practiceSegmentService.archivePiece() | practice_segments.archive_piece() |
| POST | `/practice-segments/pieces/{piece_id}/unarchive` | practiceSegmentService.unarchivePiece() | practice_segments.unarchive_piece() |
| GET | `/practice-segments/pieces/archived` | practiceSegmentService.getArchivedPieces() | practice_segments.get_archived_pieces() |
| GET | `/practice-segments/pieces/{piece_id}/archived-details` | practiceSegmentService.getArchivedPieceDetails() | practice_segments.get_archived_piece_details() |

**Query Parameters for Practice Segments Endpoints**:
- `/practice-segments/pieces`:
  - `include_completed` (optional): Include completed/archived pieces (default: false)

**Practice Segment Request Bodies**:
- POST `/practice-segments/segments`:
  ```json
  {
    "piece_tag_id": "UUID",
    "name": "string (1-200 chars)",
    "description": "string (optional, max 1000 chars)",
    "display_order": "integer (default: 0)"
  }
  ```
- PUT `/practice-segments/segments/{segment_id}`:
  ```json
  {
    "name": "string (optional)",
    "description": "string (optional)",
    "display_order": "integer (optional)",
    "is_completed": "boolean (optional)"
  }
  ```
- POST `/practice-segments/segments/click`:
  ```json
  {
    "segment_id": "UUID",
    "session_id": "UUID (optional)",
    "click_count": "integer (default: 1, min: 1)"
  }
  ```

**Practice Segment Response Types**:
- PracticeSegment: includes id, name, description, is_completed, total_click_count, last_clicked_at
- PieceProgress: includes piece info, segment counts, completion percentage, practice dates
- Pieces list returns: piece tag + total_segments, completed_segments, total_clicks

**Updated Tag Schema**:
- Added fields: `tag_type`, `composer`, `opus_number`, `difficulty_level`, `estimated_mastery_sessions`
- tag_type values: "piece", "technique", "general"
- difficulty_level: integer 1-10

**Archive/Unarchive Pieces**:
- POST `/practice-segments/pieces/{piece_id}/archive`: Archives a piece and returns summary statistics
  - Sets is_completed=true on all piece segments
  - Returns: Summary with total practice time, click counts, achievement progress
- POST `/practice-segments/pieces/{piece_id}/unarchive`: Unarchives a piece
  - Sets is_completed=false on all piece segments
  - Returns: Updated piece with segments
- GET `/practice-segments/pieces/archived`: Get all archived pieces with summaries
  - Returns: List of archived pieces with practice statistics for each
  - Each piece includes: total segments, total clicks, practice duration, completion date
- GET `/practice-segments/pieces/{piece_id}/archived-details`: Get full details of an archived piece
  - Returns: Piece info, practice summary, and all segments with their individual statistics
  - Summary includes: total/completed segments, total clicks, sessions practiced, first/last practice dates
  - Fixed: Uses separate queries to avoid SQL JOIN multiplication of segment counts
- Archived pieces are excluded from `/practice-segments/pieces` by default unless `include_completed=true`

### Current Pieces Endpoints 🎯 NEW
| Method | Path | Frontend Service | Backend Handler |
|--------|------|------------------|-----------------|
| GET | `/current-pieces/` | - | current_pieces.get_current_pieces() |
| POST | `/current-pieces/{piece_id}` | - | current_pieces.add_current_piece() |
| GET | `/current-pieces/{piece_id}` | - | current_pieces.get_current_piece() |
| PUT | `/current-pieces/{piece_id}` | - | current_pieces.update_current_piece() |
| DELETE | `/current-pieces/{piece_id}` | - | current_pieces.remove_current_piece() |
| GET | `/current-pieces/stats/summary` | - | current_pieces.get_current_pieces_summary() |

**Query Parameters for Current Pieces Endpoints**:
- `/current-pieces/`:
  - `skip` (optional): Pagination offset (default: 0)
  - `limit` (optional): Max results (default: 100, max: 100)
  - Returns pieces ordered by priority (ascending) and started_at (descending)

**Current Pieces Request Bodies**:
- POST `/current-pieces/{piece_id}`:
  ```json
  {
    "piece_id": "UUID",
    "notes": "string (optional, max 500 chars)",
    "priority": "integer (default: 3, range: 1-5)"
  }
  ```
- PUT `/current-pieces/{piece_id}`:
  ```json
  {
    "notes": "string (optional, max 500 chars)",
    "priority": "integer (optional, range: 1-5)"
  }
  ```

**Current Pieces Response Types**:
- CurrentPiece: includes piece_id, started_at, notes, priority, last_practiced_at, practice_session_count
- CurrentPieceWithDetails: CurrentPiece + full Tag object with piece details
- Summary: total_current_pieces, pieces_by_priority (grouped by priority level)

**Business Rules**:
- Only pieces (tags with tag_type='piece') can be added to current pieces
- Archived pieces cannot be added to current pieces
- Each user can only add a piece once to their current pieces
- Practice stats (last_practiced_at, practice_session_count) are automatically updated via database trigger
- Priority levels: 1 (highest) to 5 (lowest), default is 3

## 🔄 Data Flow

### Session Creation Flow (Hybrid Mode) 🆕
```
1. Frontend (NewSessionScreen.tsx)
   ↓ dispatch(createSessionHybrid({studentId, focus, tags}))
   
2. Redux Thunk (practiceSlice.ts)
   ↓ Check NetInfo.fetch() for connectivity
   
3A. Online Mode:
   ↓ POST /api/v1/sessions
   ↓ Backend creates session with UUID
   ↓ Response: {id: "UUID", student_id: "UUID", ...}
   ↓ session.is_synced = true
   
3B. Offline Mode:
   ↓ Create local session
   ↓ id: Date.now().toString() (timestamp)
   ↓ session.is_synced = false
   ↓ session.pending_sync = true
   
4. Store in Redux state as currentSession
```

### Video Upload Flow
```
1. Frontend (VideoRecorder.tsx)
   ↓ uploadFromPath(uri, fileName, sessionId)
   
2. Hook (useVideoUpload.ts)
   ↓ dispatch(startUpload({id, filePath, fileName, metadata}))
   
3. Service (video-upload.service.ts)
   ↓ FileSystem.createUploadTask()
   ↓ URL: {EXPO_PUBLIC_API_URL}/videos/upload-multipart/{sessionId}
   ↓ Field name: 'video'
   ↓ Headers: { Authorization: `Bearer ${authToken}` }
   
4. Backend (video_processing.py)
   ↓ upload_video_multipart(session_id, video: UploadFile)
   ↓ Validates file type: ['.mp4', '.mov', '.avi', '.webm', '.mkv']
   ↓ Saves to MinIO: videos/temp/user_{id}/session_{sessionId}_{filename}
   
5. Response (VideoUploadResponse)
   ↓ session_id: 0 (always 0 for mobile compatibility)
   ↓ video_url: string (S3/MinIO path)
   ↓ file_size: int
   ↓ duration: float (0 initially)
   ↓ processing_status: "pending" (NEVER None!)
   ↓ task_id: string | null
```

## 🔑 Critical Variable Mappings

### Session ID Types
```typescript
// Frontend (offline/temporary sessions)
sessionId: string = "1750948453406"  // timestamp

// Backend (database sessions)  
session_id: UUID = "7e28cd69-4ef6-400e-94a3-23f8ca38da65"

// Backend accepts BOTH formats in upload endpoint!
session_id: str  // Can be UUID or timestamp
```

### Authentication Token
```typescript
// Frontend Redux State
state.auth.accessToken: string

// Frontend Service
this.authToken: string

// HTTP Header
Authorization: "Bearer {token}"

// Backend Dependency
current_user: User = Depends(get_current_user)
```

### File Upload Fields
```typescript
// Frontend (Expo FileSystem)
fieldName: 'video'  // ⚠️ MUST be 'video'

// Backend (FastAPI)
video: UploadFile = File(...)  // ⚠️ Parameter name MUST match fieldName
```

### Response Fields
```typescript
// Backend Response (Pydantic)
class VideoUploadResponse:
    session_id: int  // Always 0 for mobile
    video_url: str
    file_size: int
    duration: float
    processing_status: ProcessingStatus  // ⚠️ NOT Optional!
    task_id: Optional[str]

// Frontend expects
response.video_url or response.url  // Check both
```

### Enum Values ⚠️ MUST MATCH EXACTLY
```typescript
// PracticeFocus (same in frontend and backend)
enum PracticeFocus {
    TECHNIQUE = "technique"
    MUSICALITY = "musicality"
    RHYTHM = "rhythm"
    INTONATION = "intonation"
    OTHER = "other"
}

// ⚠️ IMPORTANT: focus field is now OPTIONAL in PracticeSession
// Backend migration has made focus nullable
// Frontend must handle null/undefined focus values
// Local SQLite database has been migrated to allow NULL focus
// Migration happens automatically on app startup
```

## ⚠️ Common Pitfalls

### 0. Import Name Consistency
```typescript
// ❌ WRONG
import { colors } from '../constants/colors';  // lowercase

// ✅ CORRECT
import { Colors } from '../constants/colors';  // uppercase - matches export
```

### 0.5. Don't Assume Library APIs
```typescript
// ❌ WRONG - Assuming API exists
<VictoryChart theme={VictoryTheme.material}>

// ✅ CORRECT - Check documentation first
<VictoryChart>  // No theme if not supported
```

### 0.6. Check Library Versions and APIs
```typescript
// ❌ WRONG - Assuming victory-native has traditional Victory API
import { VictoryChart, VictoryAxis, VictoryLine } from 'victory-native';

// ✅ CORRECT - victory-native v41+ uses new CartesianChart API
import { CartesianChart, Line } from 'victory-native';

// Note: victory-native v41+ is actually victory-native-xl with different API!
```

### 1. Path Mismatch
```typescript
// ❌ WRONG
'/video-processing/upload'

// ✅ CORRECT
'/videos/upload'
```

### 2. Missing .replace() for multipart
```typescript
// The service does this transformation:
this.uploadEndpoint.replace('/upload', '/upload-multipart')

// So base path MUST end with '/upload'
```

### 3. Processing Status None
```python
# ❌ WRONG
processing_status=ProcessingStatus.PENDING if session else None

# ✅ CORRECT
processing_status=ProcessingStatus.PENDING  # Always valid enum
```

### 4. Auth Token Not Set
```typescript
// Must call after login:
videoUploadService.setAuthToken(authToken);
```

### 5. File Extension Check
```python
# Backend validates these extensions:
SUPPORTED_VIDEO_FORMATS = ['.mp4', '.mov', '.avi', '.webm', '.mkv']
```

## 🧪 Debug Checklist

When video upload fails:

1. **Check Auth**
   - Is user logged in?
   - Is authToken in Redux state?
   - Is videoUploadService.setAuthToken() called?

2. **Check Paths**
   - Frontend URL: `/api/v1/videos/upload-multipart/{sessionId}`
   - Backend route: `prefix="/videos"` in api.py
   - Endpoint: `@router.post("/upload-multipart/{session_id}")`

3. **Check Services**
   ```bash
   docker-compose ps  # All should be healthy
   docker exec musictracker-minio mc ls myminio/  # Bucket exists
   ```

4. **Check Logs**
   ```bash
   docker-compose logs -f backend | grep POST
   ```

## 🎵 Audio Analysis Integration

### Models & Tables
| Model | Table | Purpose |
|-------|-------|---------|
| PracticeMetrics | practice_metrics | Time-series metrics (TimescaleDB hypertable) |
| AnalysisResult | analysis_results | Analysis summary per session |

### PracticeMetrics Fields
| Field | Type | Description |
|-------|------|-------------|
| time | TIMESTAMP | Primary time dimension for TimescaleDB |
| session_id | UUID | Foreign key to practice session |
| metric_type | MetricType | Type of metric (enum) |
| value | FLOAT | Metric value |
| confidence | FLOAT | Optional confidence score (0.0-1.0) |
| extra_data | JSON | Additional metadata (⚠️ NOT 'metadata' - reserved by SQLAlchemy) |

### Metric Types (Enum)
```python
class MetricType(str, enum.Enum):
    # Tempo metrics
    TEMPO_BPM = "tempo_bpm"
    TEMPO_STABILITY = "tempo_stability"
    BEAT_INTERVAL = "beat_interval"
    
    # Pitch metrics
    PITCH_HZ = "pitch_hz"
    PITCH_STABILITY = "pitch_stability"
    PITCH_CONFIDENCE = "pitch_confidence"
    PITCH_MIDI = "pitch_midi"
    
    # Dynamics metrics
    DYNAMICS_RMS = "dynamics_rms"
    DYNAMICS_DB = "dynamics_db"
    DYNAMICS_RANGE = "dynamics_range"
    DYNAMICS_STABILITY = "dynamics_stability"
    
    # Vibrato metrics
    VIBRATO_RATE = "vibrato_rate"
    VIBRATO_EXTENT = "vibrato_extent"
    VIBRATO_CONSISTENCY = "vibrato_consistency"
    
    # Note onset metrics
    NOTE_ONSET = "note_onset"
    ONSET_STRENGTH = "onset_strength"
    TIMING_CONSISTENCY = "timing_consistency"
    
    # Overall scores
    OVERALL_CONSISTENCY = "overall_consistency"
    TECHNICAL_PROFICIENCY = "technical_proficiency"
    MUSICAL_EXPRESSION = "musical_expression"
```

### Video Processing Result
The `process_video` task now includes audio analysis in results:
```json
{
    "video_info": {...},
    "transcoded_videos": {...},
    "thumbnails": [...],
    "audio_track": {...},
    "preview_clip": {...},
    "audio_analysis": {
        "tempo": {...},
        "pitch": {...},
        "dynamics": {...},
        "vibrato": {...},
        "note_onsets": {...},
        "overall_metrics": {...}
    }
}
```

## 📊 Analytics API Details

### Analytics Endpoints Parameters

#### GET `/sessions/{session_id}/analytics`
- **Purpose**: Get analysis result for a specific session
- **Response**: AnalysisResultResponse
- **Fields**: All scores (0-100), summary statistics, full analysis data

#### GET `/sessions/{session_id}/metrics`
- **Purpose**: Get time-series metrics for a session
- **Query Parameters**:
  - `metric_type` (optional): Filter by MetricType enum
  - `start_time` (optional): ISO datetime
  - `end_time` (optional): ISO datetime
- **Response**: MetricsResponse with metrics grouped by type

#### GET `/analytics/summary`
- **Purpose**: Get user's overall analytics summary
- **Query Parameters**:
  - `days` (default: 30, range: 1-365): Number of days to analyze
- **Response**: AnalyticsSummary with averages and improvements

#### GET `/analytics/trends`
- **Purpose**: Get trend analysis for a specific metric
- **Query Parameters**:
  - `metric_type` (required): MetricType enum value
  - `days` (default: 30, range: 7-365): Number of days to analyze
- **Response**: TrendAnalysis with daily/weekly averages and trend direction

## 📝 Update History

- 2025-06-26: Initial documentation after fixing multiple path/variable inconsistencies
- Fixed: `/video-processing/` → `/videos/`
- Fixed: `processing_status` can't be None
- Fixed: MinIO credentials and bucket creation
- 2025-06-26: Added audio analysis integration
- Added: AudioAnalysisService with librosa
- Added: PracticeMetrics and AnalysisResult models
- Added: TimescaleDB hypertable for time-series data
- Added: Audio analysis step in video processing pipeline
- 2025-06-27: Fixed video processing type mismatch
- Fixed: process_video task now accepts UUID for session_id (was int)
- Fixed: All related functions updated to handle UUID types
- Fixed: Notification creation properly handles UUID conversion
- 2025-06-27: Fixed temporary session processing
- Fixed: Video processing now works for non-UUID session IDs (timestamps)
- Fixed: DB operations skip gracefully for temporary sessions
- Success: User's 11MB video processed successfully with all artifacts generated
- 2025-06-27: Implemented hybrid session creation
- Added: createSessionHybrid thunk for online/offline mode
- Online: Creates session on backend immediately (gets UUID)
- Offline: Creates local session with timestamp ID
- Variable consistency maintained: student_id, created_at, updated_at
- 2025-06-28: Fixed video upload session ID extraction
- Fixed: Updated regex to match actual filename pattern `{sessionId}_practice_video_{timestamp}.mp4`
- Changed: `/session_([a-f0-9-]+|\d+)/i` → `/^([a-f0-9-]+|\d+)_practice_video/i`
- Result: Videos now properly link to UUID sessions when created online
- 2025-06-28: Fixed session creation greenlet error
- Fixed: SessionService.create_session() now eagerly loads tags relationship
- Error: "MissingGreenlet: greenlet_spawn has not been called"
- Solution: Query session back with selectinload(PracticeSession.tags)
- Result: Session creation works properly, no more fallback to offline mode
- 2025-06-28: Fixed PracticeFocus enum mismatch
- Fixed: Frontend had DYNAMICS and ARTICULATION, backend had INTONATION
- Error: 422 Unprocessable Entity on session creation
- Solution: Updated frontend enum to match backend exactly
- Values: technique, musicality, rhythm, intonation, other
- 2025-06-28: Fixed tags serialization in session response
- Fixed: PracticeSession schema expects List[str] but SQLAlchemy returns List[Tag]
- Error: ValidationError - "Input should be a valid string"
- Solution: Convert tags to string list in sessions.py before model validation
- Result: Session creation now returns properly formatted response
- 2025-06-28: Complete system verification successful
- Confirmed: Online session creation returns UUID
- Confirmed: Videos upload with UUID in path: `/videos/upload-multipart/{UUID}`
- Confirmed: Original files stored in `videos/original/`
- Confirmed: Processed files stored in `videos/sessions/{UUID}/`
- Note: Minor TimescaleDB type issue in audio analysis (doesn't affect core functionality)
- 2025-06-28: Fixed TimescaleDB audio analysis type issue
- Fixed: PracticeMetrics session_id expects UUID object but received string
- Error: "Can't match sentinel values in result set to parameter sets"
- Solution: Convert session_id to UUID object before creating PracticeMetrics
- Files: `/backend/app/tasks/video_tasks.py` - Added UUID conversion
- Result: Audio analysis metrics now save correctly to TimescaleDB
- 2025-06-28: Fixed TimescaleDB composite key bulk insert issue
- Fixed: Composite primary key (time, session_id, metric_type) causing insert conflicts
- Error: Key not found when SQLAlchemy tries to refresh/merge after insert
- Solution: Use bulk_insert_mappings instead of individual db.add() calls
- Result: All time-series metrics now insert successfully without conflicts
- 2025-06-27: Created Analytics API endpoints
- Added: GET /sessions/{session_id}/analytics - Get analysis results
- Added: GET /sessions/{session_id}/metrics - Get time-series metrics
- Added: GET /analytics/summary - Get user analytics summary
- Added: GET /analytics/trends - Get metric trend analysis
- Note: Kept naming consistent with existing patterns (sessions, analytics)
- 2025-06-27: Fixed Victory Native setup issues
- Fixed: Removed non-existent VictoryTheme.material
- Fixed: Installed missing peer dependency react-native-svg
- Lesson: Always check library documentation and peer dependencies
- 2025-06-27: Fixed Victory Native API mismatch
- Fixed: victory-native v41+ is actually victory-native-xl with different API
- Changed: VictoryChart/VictoryAxis/VictoryLine → CartesianChart/Line
- Error: "Element type is invalid" - components were undefined
- Lesson: Check actual library exports, don't assume based on library name
- 2025-06-27: Fixed Victory Native font configuration error
- Error: "TypeError: xAxis.font.getGlyphIDs is not a function"
- Fixed: Removed axisOptions configuration - API expects different format
- Lesson: Start with minimal configuration when using new APIs
- 2025-06-27: Added Practice History Timeline
- Added: PracticeCalendar and SessionListItem components
- Added: PracticeHistoryScreen to replace placeholder Practice tab
- Extended: getSessions() to accept optional date parameters
- Maintained consistency: SessionResponse type, ISO datetime format for queries
- 2025-06-27: Fixed Practice History - removed duplicate methods
- Issue: Created getSessionsByDateRange() and getSessionsByDate() unnecessarily
- Fix: Extended existing getSessions() to accept optional parameters
- Backend already supported start_date/end_date on /sessions endpoint
- Lesson: Always check existing methods before creating new ones!
- 2025-06-27: Fixed date format for sessions endpoint
- Issue: Backend returned 422 for YYYY-MM-DD format
- Fix: Use full ISO datetime string (toISOString())
- Backend expects datetime type, not just date string
- Example: ✅ "2025-04-30T16:00:00.000Z" vs ❌ "2025-04-30"
- 2025-06-27: Added Teacher endpoints (Phase 4)
- Added: GET /teachers/students - Get teacher's students with activity
- Added: GET /teachers/students/{student_id} - Get detailed student profile
- Added: GET /teachers/students/{student_id}/recent-sessions - Get recent sessions
- Created: StudentActivity and StudentProfile schemas
- Extended: UserService with get_teacher_students() method
- 2025-06-27: Added Feedback endpoints (Phase 4)
- Added: Full CRUD operations for feedback on sessions and videos
- Created: FeedbackService for business logic
- Note: Feedback model and schemas already existed
- Supports: Session feedback, video annotations with timestamps
- 2025-06-27: Fixed video playback issue - presigned URL field name mismatch
- Issue: Backend returned `presigned_url` but frontend expected `url`
- Fix: Changed VideoWithPresignedUrl schema field from `presigned_url` to `url`
- Files: `/backend/app/schemas/video.py`, `/backend/app/services/media/video_service.py`
- Result: Videos now play correctly in the app
- 2025-06-27: Fixed MinIO presigned URL external access issue
- Issue: Presigned URLs contained internal Docker hostname (http://minio:9000) not accessible from mobile app
- Fix: Added S3_EXTERNAL_URL env var and URL replacement logic
- Files: `/backend/app/services/media/video_service.py`, `/docker-compose.yml`
- Result: Videos are now accessible from outside Docker network
- 2025-06-28: Added Tag Management endpoints (Phase 4)
- Added: Complete CRUD operations for tags (GET, POST, PUT, DELETE)
- Added: Popular tags endpoint with usage counts
- Added: Tag usage count endpoint
- Created: TagService for business logic
- Note: Tags already existed in models/schemas, just needed API layer
- Access control: Teachers can manage custom tags, students see only global tags
- 2025-06-28: Fixed backend crash due to incorrect import path ⚠️ CRITICAL
- Issue: Tags endpoint tried `from app.core.deps import get_current_user`
- Fix: Use `from app.api import deps` then `Depends(deps.get_current_user)`
- Error: "ModuleNotFoundError: No module named 'app.core.deps'"
- Result: Backend crashed, causing network errors on all API calls
- Lesson: Always use `app.api.deps` for FastAPI dependencies!
- 2025-06-28: Fixed tag endpoint serialization error ⚠️ CRITICAL
- Issue: Popular tags endpoint returned raw SQLAlchemy models causing Pydantic serialization error
- Error: "PydanticSerializationError: Unable to serialize unknown type: <class 'app.models.practice.Tag'>"
- Fix: Convert SQLAlchemy models to Pydantic schemas using `Tag.model_validate(tag)`
- Files: `/backend/app/api/v1/endpoints/tags.py` line 64
- Lesson: Always convert SQLAlchemy models to Pydantic schemas before returning in API responses!
- 2025-06-28: Implemented Notification System (Phase 4 Final Task) ✅
- Added: Complete notification system for feedback received
- Created: Notification schemas, service, and API endpoints
- Created: Frontend notification service and UI components (badge, list, screen)
- Integrated: Feedback service now creates notifications when teachers add feedback
- Added: Notification icons to Student home and Teacher dashboard
- Note: Notification model already existed, just needed implementation layer
- Result: Phase 4 Teacher Tools is now 100% complete!
- 2025-06-28: Fixed navigation.navigate undefined error ⚠️ CRITICAL
- Issue: "TypeError: navigation.navigate is not a function (it is undefined)"
- Root Cause: Components using navigation before NavigationContainer ready
- Fixes: Used safeNavigate in ForumListScreen/NotificationsScreen, added optional chaining in HomeScreen/DashboardScreen
- Pattern: Always use `navigation?.navigate()` or `safeNavigate` function
- Lesson: Navigation might be undefined during initial component render!
- 2025-06-28: Implemented Forum Media Embedding ✅
- Added: Markdown rendering with react-native-markdown-display
- Created: ImageViewer, ForumVideoPlayer, MarkdownRenderer components
- Media syntax: Images `![alt](url)`, Videos `[video](url)`
- Current limitation: Only URL-based embedding (no file upload backend)
- Fixed: MarkdownRenderer style bug (undefined styles.text)
- Note: File upload functionality prepared but requires backend implementation
- 2025-06-29: Added Forum Search Functionality ✅
- Added: Search parameter to GET /forum/posts/ endpoint
- Implemented: Case-insensitive search in post title and content using SQL ILIKE
- Pattern: search=%{query}% searches both title and content fields
- Next: Frontend search UI implementation
- 2025-06-29: Implemented User Reputation System ✅
- Added: reputation_points and reputation_level fields to User model
- Created: ReputationHistory model to track changes
- Built: ReputationService with point calculation logic
- Created: API endpoints for viewing reputation and leaderboard
- Next: Integrate reputation updates with forum voting
- 2025-06-29: Integrated Reputation with Forum Voting ✅
- Updated: ForumService.vote_post() to call ReputationService
- Updated: ForumService.vote_comment() to call ReputationService
- Updated: ForumService.accept_answer() to call ReputationService
- Added: First post daily bonus in create_post()
- Important: No reputation for self-voting (user can't vote on own content)
- Result: Reputation now updates automatically with forum activity
- 2025-06-29: Added Reputation UI Display ✅
- Updated: User schema to include reputation_points and reputation_level
- Updated: Forum Post/Comment schemas to include author reputation fields
- Created: ReputationBadge component for displaying reputation
- Created: reputation.service.ts for frontend API calls
- Added: Reputation display in ForumListScreen post items
- Added: Reputation section in ProfileScreen
- Updated: All forum endpoints to include reputation data in responses
- Result: User reputation now visible in forum posts and profile!
- 2025-06-29: Created Leaderboard Screen ✅
- Created: LeaderboardScreen component with ranking display
- Added: Trophy icons for top 3 users (🏆🥈🥉)
- Added: Current user highlighting
- Added: Navigation from ForumListScreen via trophy icon button
- Added: LeaderboardScreen to both Student and Teacher navigators
- Uses: existing reputationService.getLeaderboard() method
- Result: Users can now view global reputation rankings!
- 2025-06-29: Fixed Leaderboard Response Format Mismatch ⚠️
- Issue: "Cannot read property 'length' of undefined" error
- Root Cause: Frontend expected `{items: [...]}` but backend returns array directly
- Fix: Updated reputation service and LeaderboardScreen to handle array response
- Added: Rank calculation on frontend using skip + index + 1
- Lesson: Always verify actual API response format!
- 2025-06-29: Implemented Practice Challenges & Achievements 🎯
- Created: Challenge and Achievement models with relationships
- Built: ChallengeService with progress tracking and completion logic
- Added: Database migration with initial challenges and achievements
- Created: API endpoints for challenges and achievements
- Integrated: Session service to track challenge progress on completion
- Integrated: Video processing to track challenges with analysis results
- Features: Streak tracking, score thresholds, duration goals, focus-specific challenges
- Result: Complete gamification system for practice motivation!
- 2025-06-29: Fixed Schedule Event Creation Error ⚠️
- Issue: MissingGreenlet error when creating events
- Root Cause: NotificationService.create_notification expects NotificationCreate object
- Fix: Create NotificationCreate object instead of passing keyword arguments
- Files: `/backend/app/services/scheduling/schedule_service.py`
- Lesson: Always check service method signatures when calling across services!
- 2025-12-30: Created Notification Preferences API ✅
- Created: NotificationPreferences model with user preferences for each notification type
- Created: Database migration `add_notification_preferences.sql`
- Created: NotificationPreferencesService with preference management logic
- Created: API endpoints GET/PUT/POST for notification preferences
- Created: Frontend service `notification-preferences.service.ts`
- Updated: NotificationSettingsScreen to load/save preferences via API
- Added: Loading states and error handling in settings screen
- Result: Users can now save their notification preferences to the backend!
- 2025-12-30: Implemented WebCal/iCal Feed Generation ✅
- Created: ICalService for generating iCalendar format data
- Added: Calendar export endpoint GET `/schedule/calendar/export`
- Implemented: Full RFC 5545 compliant iCal generation
- Features: Event details, recurrence rules, reminders, and status
- Returns: .ics file with proper content type headers
- Result: Users can export their schedule to any calendar application!
- 2025-01-29: Implemented Practice Segment Tracking System 🎼
- Created: PracticeSegment and SegmentClick models for tracking practice segments within pieces
- Extended: Tag model with tag_type, composer, opus_number, difficulty_level fields
- Created: Database migration `add_practice_segments.sql` with triggers and views
- Created: PracticeSegmentService with full CRUD and analytics
- Created: API endpoints for segment management and click tracking
- Features: Piece tracking, segment clicks with history, completion status, analytics view
- Pattern: Tags with type='piece' represent musical pieces, segments belong to pieces
- Result: Students can now track practice progress within specific segments of pieces!
- Frontend Implementation (COMPLETED):
  - ✅ Created practice-segment.service.ts with all API methods
  - ✅ Updated Tag interface to include new fields (maintaining snake_case)
  - ✅ Created PracticeSegment, SegmentClick, PieceProgress types
  - ✅ Created PieceSelectionScreen component with progress visualization
  - ✅ Created SegmentTrackingScreen component with click tracking and completion
  - ✅ Updated navigation types for new screens  
  - ✅ Added both screens to StudentNavigator
  - ✅ Added "Track Musical Pieces" button to HomeScreen
  - Important: Maintained snake_case field names in types to match backend exactly
  - Note: Segment clicks only tracked when practice session is active

### 60. Practice Focus System Complete Redesign 🎼 IN PROGRESS
**Major Understanding Change**: Practice focuses are student-created custom text, NOT predefined options
- **What we're building**:
  - Practice focuses = Custom reminders like "right hand sing more on second movement"
  - Created by students for each piece
  - Clickable during practice with animations
  - Session summary shows what was clicked this session
  - Piece summary shows lifetime analytics when piece is archived
- **Backend Discovery**: 
  - PracticeSegment model already supports everything needed
  - Just needs terminology change: segments → focuses
  - PracticeFocus enum needs to be made optional or removed
- **Implementation Plan**:
  1. Make focus field optional in backend
  2. Move practice focuses into active session view
  3. Add micro-animations for clicks
  4. Create session and piece summaries
  5. Add piece archival functionality
- **Progress**:
  - ✅ Removed PracticeFocus enum from NewSessionScreen
  - ✅ Removed selectedFocus state
  - 🚧 Making focus optional in backend models
- **Lesson**: Always clarify requirements thoroughly - the existing "segments" were almost exactly what was needed!

### 61. Tempo Tracking System for Slow Practice Enforcement 🐌 NEW
**Implemented**: Complete tempo tracking and gamification system
- **Date**: 2025-06-30
- **Purpose**: Track and reward slow practice for better technique development
- **API Endpoints Created**:
  - POST `/api/v1/tempo/{session_id}/tempo-track` - Record single tempo entry
  - POST `/api/v1/tempo/{session_id}/tempo-track/batch` - Record multiple entries  
  - GET `/api/v1/tempo/{session_id}/tempo-stats` - Get session tempo statistics
  - PUT `/api/v1/tempo/{session_id}/target-tempo` - Update session tempo settings
  - GET `/api/v1/tempo/students/{student_id}/tempo-achievements` - Get achievements
  - GET `/api/v1/tempo/students/{student_id}/achievements/{type}/progress` - Get progress
- **Request/Response Formats**:
  - TempoTrackingCreate: `{actual_tempo: int, target_tempo: int, is_under_tempo: bool}`
  - SessionTempoUpdate: `{target_tempo: int, practice_mode: string}`
  - practice_mode values: "normal", "slow_practice", "meditation"
- **Points System**:
  - 1 point per minute under tempo
  - 2 points per minute when 20%+ under tempo
  - 3 points per minute in meditation mode (< 60 BPM)
- **Achievement Types**:
  - first_slow_practice - First time practicing under tempo
  - patience_padawan - 10 minutes total under tempo
  - zen_master - 30 minutes in meditation mode
  - slow_and_steady - 7 day slow practice streak
  - tempo_discipline - 100 total slow practice points
- **Database Changes**:
  - Added target_tempo and practice_mode to practice_sessions
  - Created tempo_tracking table for tempo entries
  - Created tempo_achievements table for gamification
- **Files Created**:
  - `/backend/app/models/tempo.py` - Models
  - `/backend/app/schemas/tempo.py` - Schemas
  - `/backend/app/services/tempo_service.py` - Business logic
  - `/backend/app/api/v1/endpoints/tempo.py` - API endpoints
  - `/backend/migrations/add_tempo_tracking.sql` - Database migration

## 📦 Import Patterns

### Service Files Import Pattern
All service files in `/mobile-app/src/services/` should import apiClient using:
```typescript
import { apiClient } from './api/client';
// or with handleApiError if needed:
import { apiClient, handleApiError } from './api/client';
```

**Common Mistakes**:
- ❌ Wrong: `import apiClient from '../config/api'` 
- ❌ Wrong: `import apiClient from './api/client'` (missing braces)
- ✅ Right: `import { apiClient } from './api/client'`

- 2025-07-01: Forum Related Piece Feature
  - Added: related_piece_id field to forum_posts table
  - Created migration: add_forum_related_piece.sql
  - Updated Post model and schemas with related_piece fields
  - Frontend types updated to support piece-specific discussions
  - Purpose: Enable discussions about specific musical pieces

---

**Remember**: Always update this file when changing any API paths or variable names!