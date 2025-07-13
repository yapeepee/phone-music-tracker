# 🤖 Claude Active Context - Music Practice Tracker

This condensed file contains ONLY critical patterns and current issues. For historical fixes, see `/documentation-archive/`.

## 🎯 Project Overview

**Music Practice Tracker** - Mobile-first React Native Expo + FastAPI backend
- **Current Phase**: Phase 7 (Polish & Optimization) 
- **Critical Principle**: 保持變數的一致性 (Keep variable consistency)

## ⚠️ CRITICAL: Always Check First

1. **API_PATHS_AND_VARIABLES.md** - BEFORE any API changes
2. **Variable names must match exactly** between frontend/backend
3. **SQLAlchemy Reserved Words**: NEVER use `metadata`, `registry`, `mapper`, `table`, `query`

## 🚨 Active Issues & Patterns

### Practice Focus System Redesign (IN PROGRESS) 🎼
- Practice focuses are **custom student text**, NOT predefined enums
- Already supported by PracticeSegment model (just needs renaming)
- Focus field made optional in backend (migration applied)
- Integration into active session view pending

### Slow Practice Enforcer (75% Complete) 🐌
- Backend: tempo tracking infrastructure complete
- Frontend: Components integrated
- ✅ BPM selector moved inside active session
- ✅ AngryMetronome visual feedback integrated
- ✅ Sound playback implemented with expo-av
- ✅ Real-time BPM adjustment during session
- Needs: Points display, achievements UI

### Critical Import Patterns ⚠️
```typescript
// Service files MUST import apiClient like this:
import { apiClient } from './api/client';  // ✅ CORRECT
// NOT: import apiClient from '../config/api' ❌
```

### Database Patterns ⚠️
- Always convert SQLAlchemy models to Pydantic: `Tag.model_validate(tag)`
- Use `selectinload` for async relationship loading
- Never access relationships directly in async context
- Local SQLite needs migration when adding columns

### React Native Specific ⚠️
- Wrap app with GestureHandlerRootView for gestures
- FlatList numColumns can't change dynamically (use unique keys)
- Navigation might be undefined on initial render (use `?.navigate()`)
- Expo Go limitations: No push notifications in SDK 53+

### Common API Pitfalls ⚠️
- GET endpoints NEVER have request bodies (use query params)
- DateTime params need full ISO format: `2025-04-30T16:00:00.000Z`
- Backend returns arrays directly for some endpoints (not paginated objects)
- Check actual response format - don't assume based on other endpoints

## 🔧 Quick Debug Commands

```bash
# Check all services
docker-compose ps

# Backend logs
docker-compose logs -f backend | grep POST

# MinIO files
docker exec musictracker-minio mc ls -r myminio/music-tracker/

# Database schema
docker exec musictracker-db psql -U postgres -d musictracker -c "\d table_name"

# Restart after model changes
docker-compose restart backend celery-worker
```

## 📋 Current Working Features

### ✅ Core Systems Working
- JWT Auth with role-based navigation
- Offline-first with SQLite + sync
- Video recording/upload with MinIO
- Audio analysis with librosa
- Forum with reputation system
- Scheduling with recurrence
- Challenges & achievements

### 🚧 In Development
- Practice Focus System (custom text per piece)
- Slow Practice Enforcer (tempo gamification)
- Piece archive functionality

## 🔄 Update Protocol

When making ANY changes:
1. Update code
2. **IMMEDIATELY update API_PATHS_AND_VARIABLES.md**
3. Test with curl first
4. Update this file if new patterns discovered
5. Document in appropriate .md files

## 🛑 Service Dependencies

All must be running:
```yaml
- postgres (with TimescaleDB)
- redis
- minio (bucket: 'music-tracker')
- backend (with S3 credentials)
- celery-worker
- celery-beat
- flower (monitoring :5555)
```

## 📝 Active Lessons (54-72)

### 54. Circular Dependencies
Use event-driven patterns to break cycles between layers

### 59. Always Check Existing Functions
Don't create duplicates - extend existing methods with optional params

### 61. Local SQLite Migration
Must handle schema changes in mobile database too

### 63. GestureHandlerRootView Required
Wrap entire app for gesture detection

### 65. Modal Conflicts
Ensure only one modal visible at a time, use setTimeout between

### 66. SQLite Column Migration
Check for ALL new columns, handle partial migrations

### 68. Don't Double Count
Understand what backend data includes before combining

### 70. Always Convert SQLAlchemy → Pydantic
`Tag.model_validate(tag)` before returning in API

### 72. Data Aggregation
Always filter by correct user - never aggregate all users' data

### 73. SQL JOIN Multiplication ⚠️ NEW
- JOINs can multiply aggregated values if not careful
- Use CTEs to aggregate data separately before joining
- Example: Segment total_clicks was multiplied by number of segment_clicks records
- Fix: Aggregate segments first, then join with click statistics

### 74. Tag Name Conflicts Between Types ⚠️ NEW
- Tags table stores both general tags AND musical pieces (tag_type='piece')
- Original code checked for duplicate names across ALL tag types
- Fix: Only check for duplicates within the same tag_type
- Error: "Tag with name 'Dvorak violin concerto' already exists"
- Solution: Modified create_tag to check Tag.tag_type == tag_type

### 75. SQL JOIN Multiplication in Archived Piece Details ⚠️ NEW
- get_archived_piece_details had JOIN between PracticeSegment and SegmentClick
- Caused segment counts to multiply by number of click records
- Symptom: Practice focuses showing inflated numbers (same as total clicks)
- Fix: Separate queries - one for segment stats, one for click stats
- Files: `/backend/app/services/practice/practice_segment_service.py`
- Lesson: Always use separate queries when counting different entities to avoid multiplication

### 76. Session Details Modal Implementation ✅ NEW
- Added SessionDetailsModal component with spring animations using react-native-reanimated
- Integrated in both HomeScreen and PracticeHistoryScreen for students
- Modal shows session details without page navigation (better UX)
- HomeScreen directly shows selected session, PracticeHistoryScreen fetches full details
- Files: `/mobile-app/src/components/practice/SessionDetailsModal.tsx`
- Pattern: Use modal popups instead of navigation for quick views

### 77. Forum Post Creation Serialization Error ⚠️ FIXED
- create_post endpoint tried to set author fields on SQLAlchemy model
- Error: "ResponseValidationError" when returning the response
- Root cause: Trying to set Pydantic schema fields on SQLAlchemy model
- Fix: Convert SQLAlchemy model to dict and create Pydantic schema properly
- Files: `/backend/app/api/v1/endpoints/forum.py`
- Lesson: Never set Pydantic-only fields on SQLAlchemy models - convert properly

### 78. Forum Media Upload Authentication Error ⚠️ FIXED
- Forum media upload failed with "Not authenticated" error
- Root cause: Trying to get auth token from `apiClient.defaults.headers.common['Authorization']`
- Problem: apiClient uses interceptors, doesn't store token in defaults.headers
- Fix: Get token directly from SecureStore using `await SecureStore.getItemAsync('access_token')`
- Files: `/mobile-app/src/services/forum-media.service.ts`
- Lesson: When using native fetch instead of apiClient, get auth token from SecureStore directly

### 79. Forum Update/Get Post Serialization Errors ⚠️ FIXED
- Multiple 500 errors: update_post and get_post endpoints failing
- Same issue as create_post: Setting Pydantic fields on SQLAlchemy models
- Fixed update_post: Convert to dict and create Post schema
- Fixed get_post: More complex - convert post and all comments recursively
- Files: `/backend/app/api/v1/endpoints/forum.py`
- Lesson: ALWAYS convert SQLAlchemy models to dicts before creating Pydantic schemas

### 80. Forum Media Not Loading (Empty media_files Arrays) ⚠️ FIXED
- User reported: Media uploads work but images show "failed to load" and videos don't play
- Root cause: Forum endpoints returning empty `media_files` arrays (TODO comments)
- ForumMediaService had presigned URL generation but endpoints weren't using it
- Fix: Created `convert_media_files_to_urls()` helper to generate presigned URLs
- Applied to get_posts, get_post (with comments), and update_post endpoints
- S3_EXTERNAL_URL already configured correctly (192.168.8.196)
- Files: `/backend/app/api/v1/endpoints/forum.py`
- Lesson: Always check if services exist before assuming TODO needs implementation!

### 81. Mobile App Network Connectivity Issues ⚠️ NEW
- Symptom: NotificationBadge shows "Network error. Please check your connection."
- Root cause: Mobile device cannot reach backend server
- Evidence: All backend logs show requests from Docker network (172.19.0.1), none from 192.168.x.x
- handleApiError returns "Network error" when request made but no response received
- Common causes:
  1. IP address changed (router DHCP)
  2. Phone on different WiFi network
  3. Firewall blocking port 8000
  4. Wrong IP in mobile-app/.env file
- Created TEST_CONNECTIVITY.md with troubleshooting steps
- Lesson: "Network error" usually means the device literally can't reach the server!

### 82. Challenge Auto-Activation System ✅ NEW
- User request: All challenges should be active without users needing to start them
- Implementation:
  1. Added `ensure_user_challenges_active()` method to ChallengeService
  2. Called from auth endpoints (register/login) for students
  3. Called from `track_practice_session()` before tracking progress
  4. Method handles NOT_STARTED → IN_PROGRESS conversion
  5. Handles repeatable challenges by resetting completed ones past cooldown
- Frontend changes:
  1. Removed "Start Challenge" button and handler
  2. Changed "Available" tab to "All" tab
  3. All challenges show progress immediately
  4. Removed "Active" tab completely (redundant with auto-activation)
  5. Now only "All" and "Completed" tabs remain
- Files modified:
  - `/backend/app/services/practice/challenge_service.py`
  - `/backend/app/api/v1/auth.py`
  - `/mobile-app/src/screens/common/ChallengesScreen.tsx`
- Lesson: Auto-activation improves UX by removing unnecessary steps!

### 83. Challenge Progress Not Tracking - Session End Sync Issue ⚠️ FIXED
- Issue: Challenges showed 0% progress even after practice sessions
- Root Cause: Sessions were not synced to backend when ended
- Investigation:
  1. Backend only tracks challenges when session has end_time
  2. Frontend was only updating local state, not backend
  3. Challenge tracking happens on backend, not frontend
- Fixes Applied:
  1. Created `endSessionAndSync` async thunk in practiceSlice
  2. Updates session on backend when online
  3. Fixed NotificationCreate parameter issue in ChallengeService
  4. Fixed tag serialization in update_session endpoint
- Files modified:
  - `/mobile-app/src/store/slices/practiceSlice.ts`
  - `/mobile-app/src/screens/student/NewSessionScreen.tsx`
  - `/backend/app/services/practice/challenge_service.py`
  - `/backend/app/api/v1/sessions.py`
- Result: Challenge progress now tracks correctly when sessions end!
- Lesson: Always sync state changes to backend for server-side features!

### 84. Metronome Integration with Visual & Sound Feedback 🎵 PARTIAL
- User Request: Metronome inside session with adjustable BPM, sound + visual > vibration
- Implementation:
  1. ✅ Moved BPM selector from pre-session to inside active session
  2. ✅ Created InlineBPMSelector for real-time tempo adjustment
  3. ✅ Integrated AngryMetronome component with face animations
  4. ✅ Enhanced accent beats with eye pop & glow animations
  5. ⚠️ Audio disabled - needs real sound files
  6. ✅ Reduced haptic feedback priority
- Visual Enhancements:
  - Removed beat count text display
  - Accent beats: Eyes scale to 1.5x + face glows + larger bounce
  - Regular beats: Eyes blink (scale to 0.8x)
  - More dramatic face rotation on accents
- Audio Issues Fixed:
  1. Removed invalid interruptionModeIOS/Android settings
  2. Removed invalid base64 audio data
  3. Now logs beats clearly in console
- Current Limitations:
  1. **No tempo detection**: App doesn't know if you're rushing/dragging
  2. **No audio**: Requires actual .mp3/.wav files in assets/sounds/
  3. Face always shows "happy" (no actual tempo detection)
- Files created/modified:
  - `/mobile-app/src/components/practice/InlineBPMSelector.tsx` - New inline BPM control
  - `/mobile-app/src/services/metronome.service.ts` - Fixed audio initialization
  - `/mobile-app/src/screens/student/NewSessionScreen.tsx` - Integrated components
  - `/mobile-app/src/components/practice/AngryMetronome.tsx` - Enhanced animations
  - `/mobile-app/src/services/tempo-detection.service.ts` - Placeholder for future
  - `/mobile-app/src/assets/sounds/README.md` - Instructions for adding sounds
- Lesson: Expo Audio requires real sound files - base64 audio doesn't work reliably!

### 85. WSL Network IP vs Windows Host IP ⚠️ CRITICAL
- Issue: Mobile app can't connect when using WSL internal IP address
- WSL Ubuntu has its own IP (172.26.x.x) that's not accessible from external devices
- Mobile devices need the Windows host IP (192.168.x.x) to connect
- Common pattern:
  - WSL IP: 172.26.153.150 (internal, not accessible from phone)
  - Windows IP: 192.168.8.196 (on local network, accessible from phone)
- Always use Windows host IP in mobile-app/.env for EXPO_PUBLIC_API_URL
- To find Windows IP: Run `ipconfig` in Windows CMD/PowerShell
- Lesson: WSL networking is isolated - external devices must connect through Windows!

### 86. Practice Session Timer with Pause/Resume ⏱️ NEW

### 87. Forum Serialization Error After Adding related_piece ⚠️ FIXED
- Issue: ForumListScreen failed with "Internal Server Error" after adding related_piece_id
- Root Cause: Forum endpoints weren't including related_piece_id and related_piece in response dicts
- Error: Pydantic validation failed because required fields were missing
- Fix Applied: Updated all forum endpoint responses to include:
  - `'related_piece_id': post.related_piece_id`
  - `'related_piece': post.related_piece`
- Files Modified:
  - `/backend/app/api/v1/endpoints/forum.py` - All post endpoints (create, get_posts, get_post, update_post)
- Lesson: When adding new fields to Pydantic schemas, ALL endpoints must include them in response dicts!

### 86. Practice Session Timer with Pause/Resume ⏱️ NEW
- User Request: Timer that can pause/resume, shows in session summary and archived pieces
- Implementation:
  1. ✅ Created SessionTimer component with pause/resume functionality
  2. ✅ Added timer tracking to session workflow
  3. ✅ Integrated timer data in session summary modal
  4. ✅ Added timer statistics to archived piece summaries
- Backend Architecture:
  - session_timers table: Tracks timer state per session
  - timer_events table: Records pause/resume events with timestamps
  - Automatic timer creation when session starts
  - Events saved on pause/resume, final state saved on session end
- Frontend Features:
  - Visual timer display with play/pause button
  - Real-time pause/resume tracking
  - Session summary shows: active time, pause count, total pause time
  - Archived pieces show: total practice time, average session time
- Files created/modified:
  - `/backend/migrations/add_timer_tracking.sql` - Database schema
  - `/backend/app/models/timer.py` - Timer models
  - `/backend/app/schemas/timer.py` - API schemas
  - `/backend/app/services/timer_service.py` - Business logic
  - `/backend/app/api/v1/endpoints/timer.py` - API endpoints
  - `/mobile-app/src/components/practice/SessionTimer.tsx` - UI component
  - `/mobile-app/src/services/timer.service.ts` - Frontend service
  - `/backend/app/services/practice/practice_segment_service.py` - Added timer stats to archive
- API Endpoints:
  - POST `/timer/sessions/{session_id}/timer` - Create timer
  - GET `/timer/sessions/{session_id}/timer` - Get timer state
  - PUT `/timer/sessions/{session_id}/timer` - Update timer
  - POST `/timer/sessions/{session_id}/timer/events` - Add pause/resume event
  - GET `/timer/sessions/{session_id}/timer/summary` - Get timer summary
- Lesson: Follow existing patterns (segment clicks) for consistency in tracking features!

### 86. Login Failure After Timer Implementation ⚠️ FIXED
- Issue: Login stopped working after adding timer feature
- User correctly rejected IP address as the cause
- Root Causes Found:
  1. **Password hash mismatch in database** (primary issue)
  2. **Timezone bugs in timer code** (would cause errors later)
  3. **Wrong IP in .env file** - Was using WSL IP (172.x) instead of Windows IP (192.168.x)
- Investigation revealed:
  - Passwords in DB didn't match login attempts
  - Timer service used `datetime.utcnow()` (timezone-naive) with timezone-aware columns
  - Mobile app was pointing to WSL internal IP which isn't accessible from phone
- Fixes Applied:
  1. Updated password hashes to match "test123"
  2. Changed all `datetime.utcnow()` → `datetime.now(timezone.utc)`
  3. Fixed .env to use Windows host IP: 192.168.8.196
- Files fixed:
  - `/backend/app/models/timer.py` - Fixed timezone in default values
  - `/backend/app/services/timer_service.py` - Fixed timezone in updates
  - `/mobile-app/.env` - Changed from WSL IP to Windows IP
- Working credentials:
  - student@example.com / test123
  - teacher@example.com / test123
- Lesson: WSL has its own IP (172.x) but mobile devices need Windows host IP (192.168.x)!

## 📱 Environment Setup

```bash
# Mobile development
cd mobile-app
npm install
npm start

# For physical device
EXPO_PUBLIC_API_URL=http://YOUR_IP:8000/api/v1
```

---
**Remember**: 保持變數的一致性 - Check API_PATHS_AND_VARIABLES.md FIRST!