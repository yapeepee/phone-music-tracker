# 🤖 Claude Project Knowledge

This file contains critical project knowledge for Claude to understand the codebase and avoid common errors.

## 🎯 Project Overview

**Music Practice Tracker** - A mobile-first music practice tracking system with:
- React Native Expo frontend (TypeScript)
- FastAPI backend (Python)
- PostgreSQL + TimescaleDB
- Redis + Celery for async tasks
- MinIO for video storage
- Docker Compose for development

## ⚠️ Critical Information

### 1. Always Check API_PATHS_AND_VARIABLES.md
Before making ANY changes to API calls, paths, or variable names, consult `/API_PATHS_AND_VARIABLES.md`. This prevents hours of debugging path mismatches.

### 2. Video Upload Path
```
Frontend: /api/v1/videos/upload-multipart/{sessionId}
Backend: @router.post("/upload-multipart/{session_id}")
Router prefix: "/videos" (NOT "/video-processing")
```

### 3. Common Issues Already Fixed
- ✅ React Native doesn't have crypto.getRandomValues → use react-native-get-random-values
- ✅ React Native doesn't support Blob API → use Expo FileSystem
- ✅ TUS protocol doesn't work well with React Native → use multipart upload
- ✅ Session IDs can be UUID or timestamp → backend accepts both as string
- ✅ processing_status field is NOT optional → always use ProcessingStatus.PENDING

### 4. Service Dependencies
```bash
# All these must be running:
- postgres (with TimescaleDB)
- redis
- minio (with bucket 'music-tracker')
- backend (with S3 credentials)
- celery-worker
- celery-beat
- flower (monitoring on :5555)
```

### 5. Environment Variables
Backend needs these for video upload:
```yaml
- S3_ENDPOINT_URL=http://minio:9000
- S3_ACCESS_KEY=minioadmin
- S3_SECRET_KEY=minioadmin
- S3_BUCKET_NAME=music-tracker
```

### 6. SQLAlchemy Reserved Words ⚠️
**NEVER use these as field names in models:**
- ❌ `metadata` → use `extra_data` or similar
- ❌ `registry`, `mapper`, `table`, `query`
- **Error**: "Attribute name 'metadata' is reserved when using the Declarative API"

### 7. Backend Dependencies for Audio Analysis
Backend container now requires:
```
librosa==0.10.1  # Audio analysis
numpy==1.24.3    # Numerical operations
scipy==1.11.4    # Signal processing
```
**Important**: Don't import `librosa.display` - it requires matplotlib

### 8. Celery Task UUID Type Mismatch ⚠️
**Fixed Issue**: Video processing was failing with "column 'id' is of type integer but expression is of type uuid"
- **Root Cause**: `process_video` task expected `session_id: int` but received UUID strings
- **Fix**: Changed all task signatures to accept `Union[str, uuid.UUID]` for session_id and user_id
- **Files Modified**: `/backend/app/tasks/video_tasks.py`
- **Always restart Celery after changes**: `docker-compose restart celery-worker`

### 9. Temporary Session Processing ✅
**Fixed Issue**: Videos with timestamp session IDs (like "1750991604496") couldn't be processed
- **Root Cause**: Database queries failed because timestamps aren't valid UUIDs
- **Fix**: Modified `update_processing_status()` and `send_processing_notification()` to skip DB operations for non-UUID sessions
- **Result**: Video processing now works for offline/temporary sessions
- **Note**: Processed files are stored in MinIO and can be linked when session syncs to DB

### 10. Hybrid Session Creation 🆕
**Improvement**: Sessions now get UUIDs immediately when online
- **Previous**: Always created local sessions with timestamp IDs
- **Now**: Check network → Online? Create on backend (UUID) : Create locally (timestamp)
- **Benefits**: Videos uploaded while online are linked to real sessions immediately
- **Implementation**: `createSessionHybrid` thunk in `practiceSlice.ts`
- **Variable Consistency**: Maintained student_id, created_at, updated_at naming

## 🚀 Quick Commands

### Start Everything
```bash
docker-compose up -d
docker exec musictracker-minio mc mb --ignore-existing myminio/music-tracker
```

### Debug Video Upload
```bash
# Watch backend logs
docker-compose logs -f backend | grep POST

# Check MinIO files
docker exec musictracker-minio mc ls -r myminio/music-tracker/

# Test endpoint
curl -X POST http://localhost:8000/api/v1/videos/upload-multipart/test \
  -H "Authorization: Bearer {token}" \
  -F "video=@test.mp4"
```

### Mobile App Development
```bash
cd mobile-app
npm install
npm start

# Use physical device IP in .env:
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000/api/v1
```

## 📁 Key Files

### Frontend
- `/mobile-app/src/services/video-upload.service.ts` - Video upload logic
- `/mobile-app/src/components/video/VideoRecorder.tsx` - Recording UI
- `/mobile-app/src/hooks/useVideoUpload.ts` - Upload hook

### Backend
- `/backend/app/api/v1/endpoints/video_processing.py` - Upload endpoints
- `/backend/app/api/v1/api.py` - Router configuration
- `/backend/app/services/storage.py` - MinIO/S3 service

## 🐛 Debugging Tips

1. **Always check if user is logged in first** - No auth = 401 error
2. **Reload mobile app after code changes** - Shake device → Reload
3. **Check all services are healthy** - `docker-compose ps`
4. **Read the FULL error message** - Pydantic errors show exact field issues
5. **Test with curl first** - Isolates frontend vs backend issues

## 📝 Lessons Learned

1. **Variable consistency is critical** - Same names everywhere
2. **Check schemas carefully** - Optional vs Required fields matter
3. **React Native has limitations** - No crypto, no Blob, special handling needed
4. **Docker service order matters** - Dependencies must be healthy
5. **Always create buckets first** - MinIO needs manual bucket creation

## 🔄 Update Protocol

When making changes:
1. Update the code
2. Update `/API_PATHS_AND_VARIABLES.md` if paths/variables changed
3. Update this file if new patterns/issues discovered
4. Test with curl before testing in app
5. Document any new fixes in appropriate .md files

### 10. Import Name Consistency ⚠️ NEW
**Common Error**: `TypeError: cannot read property 'primary' of undefined`
- **Root Cause**: Using wrong case for imports (e.g., `colors` instead of `Colors`)
- **Fix**: Always check the actual export name in the source file
- **Example**: 
  - ❌ Wrong: `import { colors } from '../constants/colors'`
  - ✅ Right: `import { Colors } from '../constants/colors'`
- **Lesson**: Check existing code patterns before creating new imports!

### 11. Don't Assume Library APIs ⚠️ NEW
**Common Error**: `cannot read property 'material' of undefined`
- **Root Cause**: Using library features that don't exist (e.g., `VictoryTheme.material`)
- **Fix**: Check library documentation before using APIs
- **Example**:
  - ❌ Wrong: `<VictoryChart theme={VictoryTheme.material}>`
  - ✅ Right: `<VictoryChart>` (no theme if not supported)
- **Lesson**: Don't copy patterns from other libraries without verifying!

### 12. Always Check Existing Functions Before Creating New Ones ⚠️ CRITICAL
**Common Error**: Creating duplicate methods when existing ones can be extended
- **Root Cause**: Not checking what already exists in the codebase
- **Example**:
  - ❌ Wrong: Created `getSessionsByDateRange()` and `getSessionsByDate()`
  - ✅ Right: Extended existing `getSessions()` to accept optional parameters
- **Lesson**: ALWAYS check if existing methods can be modified instead of creating new ones!
- **How to check**:
  1. Use Grep to search for similar function names
  2. Read the existing implementation
  3. Check backend endpoints to understand what's supported
  4. Modify existing methods to accept optional parameters instead of creating duplicates

### 13. FastAPI DateTime Query Parameters Need Full ISO Format ⚠️
**Common Error**: Sending YYYY-MM-DD format for datetime parameters
- **Root Cause**: FastAPI datetime type expects full ISO format in query strings
- **Example**:
  - ❌ Wrong: `?start_date=2025-04-30` → 422 Unprocessable Entity
  - ✅ Right: `?start_date=2025-04-30T00:00:00.000Z` → 200 OK
- **Lesson**: Always use `.toISOString()` for datetime query parameters
- **How to debug**: Check backend logs to see what format returns 200 vs 422

### 14. Use Native JavaScript Date Methods, Not External Libraries ⚠️ NEW
**Common Error**: Using date-fns or moment.js without checking if they're installed
- **Root Cause**: Assuming date libraries are available
- **Fix**: Use native JavaScript Date methods
- **Example**:
  - ❌ Wrong: `import { format } from 'date-fns'`
  - ✅ Right: `date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })`
- **Pattern in codebase**:
  - Dates: `toLocaleDateString()` with options
  - Times: `toLocaleTimeString()` with options
  - Custom relative time functions when needed
- **Lesson**: Check existing patterns before adding dependencies!

### 15. Always Use Timezone-Aware Datetime in Backend ⚠️ CRITICAL
**Common Error**: `TypeError: can't compare offset-naive and offset-aware datetimes`
- **Root Cause**: Using `datetime.now()` creates timezone-naive datetime, but database stores timezone-aware
- **Example**:
  - ❌ Wrong: `datetime.now()` → timezone-naive
  - ✅ Right: `datetime.now(timezone.utc)` → timezone-aware
- **Pattern**: Always import `timezone` and use `datetime.now(timezone.utc)`
- **Files Fixed**: `/backend/app/api/v1/endpoints/teachers.py`
- **Lesson**: Follow existing patterns - check security.py for datetime handling!

### 16. Don't Use Non-Existent SQLAlchemy Attributes ⚠️ NEW  
**Common Error**: `AttributeError: 'PracticeSession' object has no attribute 'awaitable_attrs'`
- **Root Cause**: Trying to use SQLAlchemy async patterns that don't exist
- **Example**:
  - ❌ Wrong: `await session.awaitable_attrs.student`
  - ✅ Right: Load relationships with `selectinload` in query
- **Pattern**: Use `selectinload` when building queries to eagerly load relationships
- **Files Fixed**: `/backend/app/api/v1/sessions.py` line 144
- **Lesson**: Check how existing services load relationships before inventing new patterns!

### 17. Always Register API Routers in api.py ⚠️ CRITICAL
**Common Error**: `404 Not Found` for endpoints that exist in code
- **Root Cause**: Created router file but forgot to include it in `/backend/app/api/v1/api.py`
- **Example**:
  - ❌ Wrong: Only import the router without including it
  - ✅ Right: Both import AND include_router in api.py
- **Pattern**: 
  ```python
  from app.api.v1 import videos  # Import
  api_router.include_router(videos.router, prefix="/videos", tags=["videos"])  # Include
  ```
- **Files Fixed**: `/backend/app/api/v1/api.py` - added videos router
- **Lesson**: Always check api.py when endpoints return 404!

### 18. Use Promise.allSettled for Partial Failure Handling ⚠️ NEW
**Common Error**: Entire data loading fails when one API call fails
- **Root Cause**: Using Promise.all which fails fast on any error
- **Example**:
  - ❌ Wrong: `Promise.all([api1(), api2(), api3()])` - fails if any fails
  - ✅ Right: `Promise.allSettled([api1(), api2(), api3()])` - handles partial failures
- **Pattern**: Use allSettled for non-critical parallel requests, check status
- **Files Fixed**: `/mobile-app/src/screens/teacher/SessionDetailScreen.tsx`
- **Lesson**: Critical data first, non-critical with allSettled!

### 19. Video Upload Must Create Database Records ⚠️ CRITICAL FIX
**Fixed Issue**: Videos uploaded successfully but not visible in session details
- **Root Cause**: Upload endpoint only saved video to MinIO, not to `videos` table
- **Symptom**: `/videos/session/{id}` returns empty array despite successful uploads
- **Fix**: Modified `/upload-multipart/{session_id}` to create `Video` record
- **Files Modified**: `/backend/app/api/v1/endpoints/video_processing.py`
- **Key Learning**: Always create database records for uploaded files, not just S3/MinIO storage

### 20. Database Schema Must Match SQLAlchemy Models ⚠️ CRITICAL
**Fixed Issue**: 500 error on video upload with "column upload_metadata is of type jsonb but expression is of type character varying"
- **Root Cause**: Model defined `upload_metadata` as `Text` but database column is `JSONB`
- **Symptom**: SQLAlchemy type mismatch error when inserting records
- **Fix**: Changed model from `mapped_column(Text)` to `mapped_column(JSON)`
- **Files Modified**: `/backend/app/models/practice.py`
- **How to check**: `docker-compose exec postgres psql -U postgres -d musictracker -c "\d table_name"`
- **Lesson**: Always verify database schema matches model definitions!

### 21. S3 Client Must Use Consistent Credential Variables ⚠️ CRITICAL
**Fixed Issue**: "NoCredentialsError: Unable to locate credentials" when loading videos
- **Root Cause**: VideoService only checked `AWS_ACCESS_KEY_ID` but MinIO uses `S3_ACCESS_KEY`
- **Symptom**: 500 error when clicking videos in session details
- **Fix**: Updated VideoService to use fallback pattern: `S3_ACCESS_KEY or AWS_ACCESS_KEY_ID`
- **Files Modified**: `/backend/app/services/media/video_service.py`
- **Pattern**: Always check both S3_* and AWS_* credential variables with fallback
- **Lesson**: Keep credential handling consistent across all services!

### 22. Video Playback Field Name Must Match Frontend ⚠️ CRITICAL
**Fixed Issue**: Videos visible but won't play
- **Root Cause**: Backend schema used `presigned_url` but frontend expected `url`
- **Symptom**: Videos listed correctly but playback fails with undefined URL
- **Fix**: Changed VideoWithPresignedUrl schema field from `presigned_url` to `url`
- **Files Modified**: `/backend/app/schemas/video.py`, `/backend/app/services/media/video_service.py`
- **Lesson**: Always check field names in API responses match frontend expectations!

### 23. MinIO Presigned URLs Need External URL Replacement ⚠️ CRITICAL
**Fixed Issue**: Videos won't play even with correct field names
- **Root Cause**: Presigned URLs contained internal Docker hostname (http://minio:9000)
- **Symptom**: Video URLs generated but not accessible from mobile app
- **Fix**: Replace internal MinIO URL with external URL (localhost:9000) in presigned URLs
- **Implementation**: Added S3_EXTERNAL_URL env var and URL replacement in get_video_with_url()
- **Files Modified**: `/backend/app/services/media/video_service.py`, `/docker-compose.yml`
- **Lesson**: Always consider network accessibility when generating URLs for external clients!

### 24. Backend Import Paths Must Use app.api.deps ⚠️ CRITICAL
**Fixed Issue**: Backend crashed with network errors after adding tag endpoints
- **Root Cause**: Used `from app.core.deps import get_current_user` (non-existent module)
- **Symptom**: "ModuleNotFoundError: No module named 'app.core.deps'" in backend logs
- **Fix**: Use `from app.api import deps` then `Depends(deps.get_current_user)`
- **Files Modified**: `/backend/app/api/v1/endpoints/tags.py`
- **Lesson**: Always use `app.api.deps` for FastAPI dependencies, never `app.core.deps`!

### 25. Always Convert SQLAlchemy Models to Pydantic Schemas ⚠️ CRITICAL
**Fixed Issue**: Tag endpoints failed with serialization errors
- **Root Cause**: Returning raw SQLAlchemy models instead of Pydantic schemas
- **Symptom**: "PydanticSerializationError: Unable to serialize unknown type: <class 'app.models.practice.Tag'>"
- **Fix**: Use `Tag.model_validate(tag)` to convert SQLAlchemy models to Pydantic schemas
- **Files Modified**: `/backend/app/api/v1/endpoints/tags.py` - popular tags endpoint
- **Lesson**: FastAPI cannot serialize SQLAlchemy models directly - always convert to Pydantic!

### 26. React Native FlatList numColumns Cannot Change Dynamically ⚠️
**Fixed Issue**: FlatList crashed when switching between tag views
- **Root Cause**: Changing numColumns prop on the fly is not supported
- **Symptom**: "Invariant Violation: Changing numColumns on the fly is not supported"
- **Fix**: Add unique `key` prop to FlatList when numColumns changes
- **Example**: `<FlatList key="popular-tags-2-columns" numColumns={2} ...>`
- **Files Modified**: `/mobile-app/src/screens/teacher/TagManagementScreen.tsx`
- **Lesson**: Use different keys for FlatLists with different numColumns values!

### 27. Navigation.navigate is Not a Function Error ⚠️ NEW
**Fixed Issue**: "TypeError: navigation.navigate is not a function (it is undefined)"
- **Root Cause**: Components trying to use navigation before NavigationContainer is ready
- **Symptoms**: App crashes on launch with navigation undefined error
- **Fixes Applied**:
  1. ForumListScreen: Use `safeNavigate` from `useSafeNavigation` hook
  2. NotificationsScreen: Use `safeNavigate` instead of direct navigation
  3. HomeScreen: Add optional chaining `navigation?.navigate()`
  4. DashboardScreen: Add optional chaining `navigation?.navigate()`
- **Pattern**: Always use `navigation?.navigate()` or `safeNavigate` for safer navigation
- **Lesson**: Navigation might be undefined during initial render!

### 28. Forum Media Embedding Implementation ✅ NEW
**Feature Added**: Markdown rendering with image and video embedding support
- **Libraries Used**: react-native-markdown-display v7.0.2
- **Components Created**:
  - ImageViewer: Displays images with fullscreen modal support
  - ForumVideoPlayer: Simplified video player for inline playback
  - MarkdownRenderer: Custom markdown renderer with media support
  - MediaUploadButton: Prepared for future file upload (not connected to backend)
- **Media Syntax**:
  - Images: `![alt text](image-url)`
  - Videos: `[video](video-url)`
  - YouTube: Auto-detected from URLs
- **Current Limitation**: Only URL-based embedding supported (no file upload)
- **Performance**: Used stripMarkdown utility for post previews in list view
- **Bug Fixed**: MarkdownRenderer text style was using undefined styles.text
- **Files Modified**: PostDetailScreen, ForumListScreen, CreatePostScreen
- **Lesson**: Reuse existing components (VideoPlayer) when possible!

### 29. Forum Post Content Display Issue ⚠️ INVESTIGATION
**Issue**: Post content not showing in PostDetailScreen
- **Symptom**: Only author info visible, no post content displayed
- **Investigation Steps**:
  1. Confirmed backend schemas include content field
  2. Verified API returns content properly
  3. Fixed MarkdownRenderer style bug (styles.text → markdownStyles.body)
  4. Added debug logging to track data flow
- **Note**: Need to verify with actual app testing if content displays after fix
- **Lesson**: Always check for undefined styles/variables in render components!

### 30. Forum Media Upload Implementation ✅ NEW
**Implemented**: Direct media upload for forum posts and comments
- **Backend Components**:
  - ForumMedia model with relationships to posts/comments
  - Forum media service for S3 uploads and presigned URLs
  - API endpoints: `/forum/media/upload/{entity_type}/{entity_id}`
  - Database migration: `add_forum_media_table.sql`
- **Frontend Components**:
  - ForumMediaService for handling uploads
  - Image/video picker in CreatePostScreen
  - Automatic markdown generation for uploaded media
  - Preview functionality before post creation
- **Key Pattern**: Upload media after post creation, then update post content with markdown links
- **Supported Formats**: Images (.jpg, .png, .gif, .webp) and Videos (.mp4, .mov, .avi, .webm)
- **Files Created**:
  - `/backend/app/models/forum_media.py`
  - `/backend/app/services/media/forum_media_service.py`
  - `/backend/app/api/v1/endpoints/forum_media.py`
  - `/mobile-app/src/services/forum-media.service.ts`
- **Lesson**: Follow existing patterns (video upload) but adapt for different use cases!

### 31. Service Import Path Consistency ⚠️ CRITICAL
**Fixed Issue**: "Unable to resolve '../config/api' from src/services/forum-media.service.ts"
- **Root Cause**: Incorrect import path and import type
- **Symptom**: Android bundling failed with module resolution error
- **Fix Applied**:
  - ❌ Wrong: `import apiClient from '../config/api'`
  - ✅ Right: `import { apiClient } from './api/client'`
- **Pattern**: All services import from `'./api/client'` not `'../config/api'`
- **Also Fixed**: Removed unused `import * as FileSystem from 'expo-file-system'`
- **Lesson**: Always check existing service files for correct import patterns!

### 32. SQLAlchemy Async Lazy Loading Error ⚠️ CRITICAL
**Fixed Issue**: "Failed to load posts: [Error: Internal Server Error]"
- **Root Cause**: media_files relationship not being eagerly loaded in async queries
- **Symptom**: "MissingGreenlet: greenlet_spawn has not been called; can't call await_only()"
- **Fix Applied**: Added `selectinload(Post.media_files)` to all queries that return posts/comments
- **Files Modified**: `/backend/app/services/forum/forum_service.py`
  - get_posts(): Added selectinload for media_files
  - get_post(): Added selectinload for media_files
  - get_comments(): Added selectinload for media_files
  - get_post(): Added nested selectinload for comment media_files
- **Pattern**: Always eagerly load ALL relationships in async SQLAlchemy queries
- **Lesson**: When adding new relationships to models, update ALL queries to include them!

### 33. Forum Post Content Not Displaying ✅ FIXED
**Fixed Issue**: Post content not showing in PostDetailScreen, only author info visible
- **Investigation Steps**:
  1. Verified API returns content correctly
  2. Added debug logging - content was being passed to MarkdownRenderer
  3. Added debug styling - content was inside the red box
  4. Identified issue with container styling
- **Root Cause**: MarkdownRenderer container had `flex: 1` which can prevent content display
- **Fix Applied**: Removed `flex: 1` from container style in MarkdownRenderer
- **Files Modified**: `/mobile-app/src/components/forum/MarkdownRenderer.tsx`
- **Lesson**: Be careful with flex: 1 in nested components - it can hide content!

### 34. Forum Search Implementation ✅ NEW
**Feature Added**: Full-text search functionality for forum posts
- **Backend Implementation**:
  - Added `search` query parameter to GET /forum/posts/ endpoint
  - Implemented case-insensitive search using SQL ILIKE operator
  - Searches both title and content fields with pattern matching
  - Pattern: `%{search_query}%` for substring matching
- **Frontend Implementation**:
  - Added search bar UI component with clear button
  - Implemented 500ms debounce for search input to reduce API calls
  - Search triggers automatic refresh of posts list
  - Used existing patterns: TextInput with icon, debounced handlers
- **Files Modified**:
  - `/backend/app/api/v1/endpoints/forum.py` - Added search parameter
  - `/backend/app/services/forum/forum_service.py` - Implemented search logic
  - `/mobile-app/src/services/forum.service.ts` - Added search to params
  - `/mobile-app/src/screens/common/ForumListScreen.tsx` - Added search UI
- **Lesson**: Follow existing patterns for consistency - use ILIKE for search, debounce UI inputs!

### 35. User Reputation System Implementation ✅ NEW
**Feature Added**: Complete reputation system with points and levels
- **Database Design**:
  - Added `reputation_points` and `reputation_level` fields to User model
  - Created `ReputationHistory` table to track all reputation changes
  - Used denormalized pattern (like vote_score) for performance
  - Created SQL function `update_user_reputation()` for atomic updates
- **Reputation Levels**:
  - newcomer (0-99), contributor (100-499), intermediate (500-1999)
  - advanced (2000-4999), veteran (5000-9999), expert (10000+)
- **Point System**:
  - Post upvote: +5, downvote: -2
  - Comment upvote: +2, downvote: -1
  - Answer accepted: +15 (answerer), +2 (asker)
  - Practice session: +1, Feedback given: +3
- **Service Architecture**:
  - Created `ReputationService` in `services/community/`
  - Separate methods for each reputation event type
  - Handles duplicate prevention with unique constraints
- **API Endpoints**:
  - GET `/reputation/users/{user_id}/reputation` - View user reputation
  - GET `/reputation/users/{user_id}/reputation/history` - View history (own only)
  - GET `/reputation/leaderboard` - Global leaderboard
- **Files Created/Modified**:
  - `/backend/migrations/add_reputation_system.sql`
  - `/backend/app/models/user.py` - Added reputation fields
  - `/backend/app/models/reputation.py` - New model
  - `/backend/app/services/community/reputation_service.py`
  - `/backend/app/api/v1/endpoints/reputation.py`
  - `/backend/app/schemas/reputation.py`
- **Lesson**: Design for atomic operations and denormalize for performance!

### 36. SQLAlchemy Enum Type Conflict Resolution ⚠️ CRITICAL FIX
**Fixed Issue**: Login failed with 500 error after adding reputation system
- **Root Cause**: SQLAlchemy auto-created enum type with UPPERCASE values but data was lowercase
- **Error**: "LookupError: 'newcomer' is not among the defined enum values"
- **Investigation**: Found existing 'reputationlevel' enum type in database with UPPERCASE values
- **Fix Applied**: Changed reputation_level from Enum to String(20) to avoid conflicts
- **Files Modified**:
  - `/backend/app/models/user.py` - Changed Enum to String field
  - `/backend/app/services/community/reputation_service.py` - Removed enum import, use strings
- **Commands Run**:
  - `DROP TYPE IF EXISTS reputationlevel CASCADE;`
  - `docker-compose restart backend`
- **Lesson**: Be careful with SQLAlchemy Enum types - they can persist and cause conflicts!

### 37. Forum Voting Reputation Integration ✅ NEW
**Implemented**: Connected reputation system to forum voting events
- **Changes Made**:
  - ForumService imports ReputationService
  - vote_post() calls handle_post_vote() for reputation updates
  - vote_comment() calls handle_comment_vote() for reputation updates
  - accept_answer() calls handle_answer_accepted() for both users
  - create_post() gives "first_post_daily" bonus for first post each day
- **Important**: No reputation changes for self-voting (voting on own content)
- **Files Modified**: `/backend/app/services/forum/forum_service.py`
- **Lesson**: Service integration often requires careful handling of edge cases!

### 38. Reputation UI Implementation ✅ NEW
**Implemented**: Frontend display of user reputation throughout the app
- **Backend Changes**:
  - Added reputation fields to User schema (`reputation_points`, `reputation_level`)
  - Extended Post and Comment schemas with author reputation fields
  - Updated all forum endpoints to include reputation data
- **Frontend Components**:
  - Created `ReputationBadge` component with level colors and icons
  - Created `reputation.service.ts` for API calls
  - Added reputation display in forum post items
  - Added reputation section in ProfileScreen
- **Updated Types**:
  - User interface in authSlice includes reputation fields
  - AuthResponse type includes reputation fields
  - Post/Comment interfaces include author reputation
- **Design Patterns**:
  - Badge colors: gray (newcomer) → green (contributor) → blue → purple → amber → red (expert)
  - Size variants: small (forum posts), medium, large (profile)
  - Points formatting: 10000+ displays as "10.0k"
- **Lesson**: Always update types and schemas in sync when adding fields!

### 39. Leaderboard Response Format Mismatch ⚠️ FIXED
**Fixed Issue**: "Cannot read property 'length' of undefined" when loading leaderboard
- **Root Cause**: Frontend expected paginated response object with `items` property, but backend returns array directly
- **Symptom**: `response.items.length` failed because response was array, not object
- **Backend Response**: `[{user_id, full_name, reputation_points, reputation_level}, ...]`
- **Frontend Expected**: `{items: [...], total: number, page: number, page_size: number}`
- **Fix Applied**: 
  - Updated reputation service to handle array response
  - Modified LeaderboardScreen to work with array directly
  - Added rank calculation on frontend (skip + index + 1)
- **Files Modified**: 
  - `/mobile-app/src/services/reputation.service.ts`
  - `/mobile-app/src/screens/common/LeaderboardScreen.tsx`
- **Lesson**: Always verify actual API response format - don't assume based on other endpoints!

### 40. Practice Challenges & Achievements Implementation 🎯 NEW
**Implemented**: Complete gamification system for practice motivation
- **Architecture**:
  - Created Challenge and Achievement models with many-to-many relationships
  - Built ChallengeService handling all challenge logic and progress tracking
  - Integrated with existing SessionService and video processing pipeline
- **Challenge Types**:
  - Streak challenges (7-day, 30-day practice streaks)
  - Session count challenges (complete X sessions)
  - Score threshold challenges (achieve X% in metrics)
  - Duration challenges (practice X minutes total)
  - Focus-specific challenges (X sessions with specific focus)
  - Time-based challenges (practice at specific times)
  - Weekly goals (complete X sessions per week)
- **Integration Points**:
  - SessionService tracks challenges when session is created/updated with end_time
  - Video processing tracks score-based challenges when analysis completes
  - Special achievements (like "First Steps") checked automatically
- **Files Created**:
  - `/backend/app/models/challenge.py` - All challenge/achievement models
  - `/backend/app/schemas/challenge.py` - Request/response schemas
  - `/backend/app/services/practice/challenge_service.py` - Business logic
  - `/backend/app/api/v1/endpoints/challenges.py` - API endpoints
  - `/backend/migrations/add_challenges_achievements.sql` - Database setup
- **Pattern**: Use async service in sync context with event loop for Celery integration
- **Lesson**: Design challenges to work with existing data flow - don't create separate tracking!

### 41. Navigation Type Safety in React Navigation ⚠️ NEW
**Fixed Issue**: TypeScript navigation type errors when using navigation.navigate
- **Problem**: `navigation.navigate('Challenges')` shows type errors even when route exists
- **Fix**: Use type assertion `navigation.navigate('Challenges' as never)` for cross-stack navigation
- **Frontend Implementation**:
  - Created challenge.service.ts with all endpoints and type-safe enums
  - Built ChallengesScreen with Available/Active/Completed tabs
  - Added achievements display in ProfileScreen
  - Integrated navigation from Community tab
- **Files Created/Modified**:
  - `/mobile-app/src/services/challenge.service.ts` - Complete service with types
  - `/mobile-app/src/screens/common/ChallengesScreen.tsx` - Main challenges UI
  - `/mobile-app/src/screens/common/ProfileScreen.tsx` - Added achievements section
  - `/mobile-app/src/navigation/types.ts` - Added Challenges route
  - Both Student and Teacher navigators updated
- **Lesson**: Always update navigation types in types.ts when adding new screens!

### 42. Fuzzy Technique Search Implementation 🔍 NEW
**Implemented**: Full-text search for practice sessions by technique
- **Search Targets**: Focus field, note field, and tag names
- **Backend Implementation**:
  - Added `search_sessions()` method to SessionService
  - Uses PostgreSQL ILIKE for case-insensitive fuzzy matching
  - Searches across multiple fields with OR condition
  - Tag search uses EXISTS subquery for efficient join
- **API Endpoint**: GET `/sessions/search?q={query}`
  - Required parameter: `q` (search query)
  - Optional: `skip`, `limit` for pagination
  - Students search their own sessions, teachers search all
- **Technical Details**:
  - Cast enum to string for ILIKE comparison: `func.cast(PracticeSession.focus, String)`
  - Tag search through many-to-many relationship
  - Efficient query with selectinload for relationships
- **Files Modified**:
  - `/backend/app/services/practice/session_service.py` - Added search method
  - `/backend/app/api/v1/sessions.py` - Added search endpoint
  - `/API_PATHS_AND_VARIABLES.md` - Documented new endpoint
- **Lesson**: Use PostgreSQL's ILIKE for simple fuzzy search before adding complex search engines!

### 43. Schedule System Implementation Phase 6 📅 NEW
**Implemented**: Complete scheduling system backend for lessons and events
- **Architecture**:
  - Created ScheduleEvent, RecurrenceRule, and ScheduleConflict models
  - Built comprehensive ScheduleService with recurrence and conflict detection
  - Used event_participants association table for many-to-many relationships
- **Event Types**: lesson, practice, masterclass, recital, other
- **Recurrence Support**:
  - Daily, weekly, biweekly, monthly patterns
  - Exception dates for skipping specific occurrences
  - End conditions: by date or occurrence count
  - Parent-child event relationships for series
- **Key Features**:
  - Automatic conflict detection (time overlap, participant conflicts)
  - Calendar view with day grouping
  - WebCal/iCal feed support (schema prepared)
  - Timezone awareness throughout
  - Color coding and reminder settings
- **Files Created**:
  - `/backend/app/models/schedule.py` - All scheduling models
  - `/backend/app/schemas/schedule.py` - Request/response schemas with forward refs
  - `/backend/app/services/scheduling/schedule_service.py` - Business logic
  - `/backend/app/api/v1/endpoints/schedule.py` - API endpoints
  - `/backend/migrations/add_schedule_system.sql` - Database with triggers
  - `/mobile-app/src/services/schedule.service.ts` - Frontend service
- **Pydantic Forward Reference Pattern**:
  - Use quoted strings for forward references: `Optional['RecurrenceRule']`
  - Call `model_rebuild()` after all class definitions
  - UserBasic must be defined before use in type hints
- **Lesson**: Always define Pydantic models in dependency order or use forward references!

### 44. Schedule Calendar UI Implementation 📅 NEW
**Implemented**: Complete calendar UI for schedule management
- **Components Created**:
  - `ScheduleCalendar`: Calendar view with event indicators
  - `EventCard`: Reusable event display card
  - `ScheduleScreen`: Teacher's main schedule interface
  - `EventDetailsScreen`: Detailed event view with actions
  - Updated `HomeScreen`: Added upcoming lessons for students
- **Calendar Features**:
  - Month navigation with touch support
  - Event dots with color coding
  - Selected day event list
  - Calendar/list view toggle
  - Pull-to-refresh functionality
- **Design Patterns**:
  - Reused PracticeCalendar structure for consistency
  - Event indicators show up to 3 dots + count
  - Past events shown with reduced opacity
  - Status badges for event states
  - Online event indicators with video icons
- **Navigation Integration**:
  - Added EventDetails to navigation types
  - Updated TeacherNavigator with new screens
  - Students see upcoming lessons on home screen
- **Files Created/Modified**:
  - `/mobile-app/src/components/schedule/ScheduleCalendar.tsx`
  - `/mobile-app/src/components/schedule/EventCard.tsx`
  - `/mobile-app/src/screens/teacher/ScheduleScreen.tsx`
  - `/mobile-app/src/screens/teacher/EventDetailsScreen.tsx`
  - `/mobile-app/src/screens/student/UpcomingLessonsScreen.tsx`
  - Updated student HomeScreen with events section
- **Lesson**: Follow existing component patterns for consistency - users expect similar UX!

### 45. GET Endpoints Should Not Have Request Bodies ⚠️ CRITICAL FIX
**Fixed Issue**: Schedule calendar endpoint failed with "Field required" in body error
- **Root Cause**: GET endpoint `/schedule/calendar` was expecting a request body (CalendarRequest)
- **Error**: `[{"input": null, "loc": ["body"], "msg": "Field required", "type": "missing"}]`
- **Fix Applied**: Changed endpoint to accept query parameters instead of request body
- **Changed From**:
  ```python
  async def get_calendar_view(
      request: CalendarRequest,  # ❌ Wrong - expects body
      db: Annotated[AsyncSession, Depends(deps.get_db)],
      current_user: Annotated[User, Depends(deps.get_current_active_user)]
  ```
- **Changed To**:
  ```python
  async def get_calendar_view(
      db: Annotated[AsyncSession, Depends(deps.get_db)],
      current_user: Annotated[User, Depends(deps.get_current_active_user)],
      start_date: date = Query(...),  # ✅ Correct - query params
      end_date: date = Query(...),
      include_cancelled: bool = Query(False)
  ```
- **Additional Fix**: Changed date query parameters from `datetime` to `date` type
  - Frontend sends YYYY-MM-DD format, backend now accepts `date` type
  - Converts date to datetime internally when needed for service calls
  - Applied to `/schedule/`, `/schedule/calendar`, and `/schedule/students/{id}/events`
- **Files Modified**: `/backend/app/api/v1/endpoints/schedule.py`
- **Lesson**: GET endpoints should NEVER have request bodies - always use query parameters! Also, accept appropriate types based on frontend format.

### 46. CreateEventScreen Implementation & Date Picker Fix ✅ UPDATED
**Implemented**: Event creation form for teachers to schedule lessons and events
- **Initial Issues Fixed**:
  1. **Backend Error**: NotificationService.create_notification was being called with wrong arguments
     - Error: MissingGreenlet async issue
     - Fix: Create NotificationCreate object instead of passing keyword arguments
  2. **UX Issue**: Date/time input was too cumbersome (繁瑣跟複雜) requiring manual typing
     - Fix: Installed react-native-date-picker and replaced text inputs with date picker UI
- **Components Created**:
  - `CreateEventScreen`: Full form for creating scheduled events  
  - Date picker integration with TouchableOpacity buttons
  - Event type selector with icons
  - Online/offline toggle with dynamic location/URL field
  - Color picker for event visualization
  - Reminder time configuration
- **Form Validation**:
  - Required fields: title, start/end date and time
  - Online events require meeting URL
  - End time must be after start time
  - Auto-adjust end time when start time changes
- **Files Created/Modified**:
  - `/mobile-app/src/screens/teacher/CreateEventScreen.tsx` - Main form component
  - `/mobile-app/src/navigation/TeacherNavigator.tsx` - Added screen to navigation
  - `/mobile-app/src/screens/teacher/ScheduleScreen.tsx` - Updated navigation call
  - `/backend/app/services/scheduling/schedule_service.py` - Fixed notification call
- **Packages Added**: react-native-date-picker v5.0.13
- **Lesson**: Always check service method signatures when calling across services! Use proper UI components for better UX.

### 47. Expo Notifications Configuration ✅ NEW
**Implemented**: Push notification support with expo-notifications
- **Backend Changes**:
  - Added push_token and push_platform fields to User model
  - Created migration: `add_push_token_to_users.sql`
  - Added PUT `/auth/push-token` endpoint for token updates
  - Notification endpoints already existed at `/notifications/`
- **Frontend Implementation**:
  - Installed expo-notifications and expo-device
  - Enhanced existing notification.service.ts with push capabilities
  - Created NotificationProvider for app-wide notification handling
  - Configured notification handler for foreground alerts
  - Set up Android notification channel
- **Navigation Integration**:
  - Handle notification taps to navigate to relevant screens
  - Support for session, event, and feedback notifications
  - Type-safe navigation with proper type assertions
- **Configuration**:
  - Added expo-notifications plugin to app.json
  - NotificationProvider wrapped inside NavigationContainer
  - Automatic push token registration on login
- **Files Created/Modified**:
  - `/backend/migrations/add_push_token_to_users.sql`
  - `/backend/app/models/user.py` - Added push fields
  - `/backend/app/api/v1/auth.py` - Added push-token endpoint
  - `/mobile-app/src/services/notification.service.ts` - Enhanced with push
  - `/mobile-app/src/components/NotificationProvider.tsx` - New provider
  - `/mobile-app/app.json` - Added expo-notifications plugin
- **Lesson**: Always check if services already exist before creating new ones - enhance existing code!

### 48. Authentication State Access Pattern ⚠️ CRITICAL
**Fixed Issue**: "Unable to resolve '../hooks/useAuth' from NotificationProvider.tsx"
- **Root Cause**: Tried to import non-existent `useAuth` hook
- **Investigation**: Found that auth state is stored in Redux, not a custom hook
- **Pattern in Codebase**:
  - ❌ Wrong: `import { useAuth } from '../hooks/useAuth'`
  - ✅ Right: `import { useAppSelector } from '../hooks/redux'`
  - ❌ Wrong: `const { isAuthenticated } = useAuth()`
  - ✅ Right: `const { isAuthenticated } = useAppSelector((state) => state.auth)`
- **Example from RootNavigator.tsx**:
  ```typescript
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  ```
- **Files Fixed**: `/mobile-app/src/components/NotificationProvider.tsx`
- **Lesson**: Always check existing patterns before assuming hook names - auth state is in Redux!

### 49. Expo Go Compatibility with SDK 53 ⚠️ NEW
**Fixed Issue**: expo-notifications not supported in Expo Go starting with SDK 53
- **Error**: "expo-notifications: Android Push notifications functionality was removed from Expo Go"
- **Root Cause**: Expo SDK 53 removed push notification support from Expo Go app
- **Solution**: Made push notifications conditional based on app ownership
- **Implementation**:
  ```typescript
  // Check if running in Expo Go
  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    console.log('Push notifications not supported in Expo Go');
    return;
  }
  ```
- **Files Modified**:
  - `/mobile-app/src/components/NotificationProvider.tsx` - Added Expo Go check
  - `/mobile-app/src/services/notification.service.ts` - Made registration conditional
- **Also Found**: expo-av is deprecated, will need replacement with expo-video in SDK 54
- **Temporary Solution**: Install expo-video package, started migration in VideoPlayer.tsx
- **Lesson**: Always check for Expo Go limitations when using native features!

### 50. Complete expo-av to expo-video Migration ✅ CRITICAL
**Fixed Issue**: "Failed to get the SHA-1 for expo-av/build/index.js" bundling error
- **Root Cause**: expo-av was uninstalled but files were still importing it
- **Investigation**: Found 3 components still using expo-av:
  1. VideoRecorder.tsx (preview section)
  2. ForumVideoPlayer.tsx
  3. AnnotatedVideoPlayer.tsx
- **Migration Steps**:
  1. Installed expo-video package
  2. Changed imports from `expo-av` to `expo-video`
  3. Updated component usage:
     - `<Video>` → `<VideoView>`
     - `ref={videoRef}` → `player={player}`
     - `resizeMode={ResizeMode.CONTAIN}` → `contentFit="contain"`
     - Added `useVideoPlayer` hook for each video
  4. Updated playback control methods:
     - `pauseAsync()` → `pause()`
     - `playAsync()` → `play()`
     - `setPositionAsync()` → `player.currentTime = value`
  5. Removed expo-av from package.json
- **Files Modified**: 
  - `/mobile-app/src/components/video/VideoPlayer.tsx`
  - `/mobile-app/src/components/video/VideoRecorder.tsx`
  - `/mobile-app/src/components/forum/ForumVideoPlayer.tsx`
  - `/mobile-app/src/components/teacher/AnnotatedVideoPlayer.tsx`
- **Lesson**: When removing a package, always grep for ALL imports first!

### 51. Victory Native Module Resolution Fix ✅ NEW
**Fixed Issue**: "Attempted to import the module victory-native... no match was resolved for this request (platform = android)"
- **Root Cause**: Two issues combined:
  1. Missing peer dependency `@shopify/react-native-skia`
  2. Malformed `exports` field in victory-native package.json
- **Investigation Steps**:
  1. Found victory-native imports in LineChart.tsx
  2. Checked package.json - victory-native@41.17.4 installed
  3. Discovered missing @shopify/react-native-skia peer dependency
  4. Found victory-native package.json has incorrect `"imports"` instead of `"import"` in exports field
- **Fix Applied**:
  1. Installed `@shopify/react-native-skia@2.0.0-next.4` (Expo SDK 53 compatible version)
  2. Fixed victory-native package.json exports field:
     ```json
     // ❌ Wrong
     "exports": {
       ".": [{
         "imports": "./dist/index.js",
         "types": "./dist/index.d.ts"
       }, "./dist/index.js"]
     }
     // ✅ Correct
     "exports": {
       ".": {
         "import": "./dist/index.js",
         "types": "./dist/index.d.ts",
         "default": "./dist/index.js"
       }
     }
     ```
  3. Created patch file with patch-package for permanent fix
  4. Added postinstall script to apply patch automatically
- **Files Created/Modified**:
  - `/mobile-app/patches/victory-native+41.17.4.patch` - Permanent fix
  - `/mobile-app/package.json` - Added postinstall script
- **Lesson**: Check peer dependencies AND verify package.json exports syntax when debugging module resolution!

### 52. Circular Dependency Resolution ✅ NEW
**Fixed Issue**: "Require cycle: store/index.ts → practiceSlice.ts → practice.service.ts → api/client.ts → store/index.ts"
- **Root Cause**: api/client.ts was importing store directly to dispatch Redux actions
- **Fix Applied**: Event-driven architecture to decouple API client from Redux store
- **Implementation**:
  1. Created `auth-events.ts` with EventEmitter for auth events
  2. Modified `api/client.ts` to emit events instead of dispatching actions:
     - `authEvents.emit({ type: 'TOKEN_UPDATED', payload })` instead of `store.dispatch(updateTokens())`
     - `authEvents.emit({ type: 'LOGOUT' })` instead of `store.dispatch(logout())`
  3. Created `auth-listener.ts` to subscribe to events and dispatch Redux actions
  4. Set up listener in App.tsx with useEffect
- **Files Created/Modified**:
  - `/mobile-app/src/utils/auth-events.ts` - Event emitter
  - `/mobile-app/src/utils/auth-listener.ts` - Event listener
  - `/mobile-app/src/services/api/client.ts` - Removed store import
  - `/mobile-app/App.tsx` - Added auth listener setup
- **Lesson**: Use event-driven patterns to break circular dependencies between layers!

### 53. Expo Notifications Import Error Fix ✅ NEW
**Fixed Issue**: "expo-notifications: Android Push notifications functionality was removed from Expo Go" error at import level
- **Root Cause**: expo-notifications was being imported at module level before runtime checks could prevent it
- **Error Location**: notification.service.ts:1 import statement triggered before Expo Go check
- **Call Stack Analysis**:
  - notification.service.ts:1 → NotificationBadge.tsx:4 → HomeScreen.tsx:10 → StudentNavigator → RootNavigator → App
- **Fix Applied**: Lazy loading pattern with dynamic imports
- **Implementation**:
  1. Created safe wrapper service that avoids importing expo-notifications at module level
  2. Used dynamic imports (`await import()`) only when not in Expo Go
  3. Moved original service to notification.service.full.ts
  4. Safe wrapper provides all API methods without expo-notifications dependency
  5. Updated NotificationProvider to use dynamic imports for listeners
- **Files Modified**:
  - `/mobile-app/src/services/notification.service.ts` - Now safe wrapper
  - `/mobile-app/src/services/notification.service.full.ts` - Original with expo imports
  - `/mobile-app/src/components/NotificationProvider.tsx` - Dynamic imports
  - All components using notification service - Updated imports
- **Key Pattern**:
  ```typescript
  // Instead of top-level import
  import * as Notifications from 'expo-notifications';
  
  // Use dynamic import when needed
  if (!isExpoGo) {
    const Notifications = await import('expo-notifications');
  }
  ```
- **Lesson**: Module-level imports execute immediately - use dynamic imports for conditional dependencies!

### 54. Database Migration Not Applied Error ⚠️ NEW
**Fixed Issue**: Login failed with 500 error - "column users.push_token does not exist"
- **Root Cause**: Database migration for push_token fields was created but not applied
- **Error**: `sqlalchemy.exc.ProgrammingError: column users.push_token does not exist`
- **Investigation Steps**:
  1. Checked backend logs: Found SQLAlchemy trying to query non-existent columns
  2. Verified migration file exists: `/backend/migrations/add_push_token_to_users.sql`
  3. Checked database schema: Columns were missing
- **Fix Applied**:
  ```sql
  ALTER TABLE users 
  ADD COLUMN push_token VARCHAR(255), 
  ADD COLUMN push_platform VARCHAR(20);
  
  CREATE INDEX idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;
  ```
- **Commands Used**:
  - Check logs: `docker-compose logs backend | tail -50`
  - Check schema: `docker exec musictracker-db psql -U postgres -d musictracker -c "\d users"`
  - Apply migration: `docker exec musictracker-db psql -U postgres -d musictracker -c "ALTER TABLE..."`
- **Lesson**: Always run database migrations after adding new fields to models! Check if migration needs to be applied when getting column not found errors.

### 55. Native Module Incompatibility with Expo Go ⚠️ NEW
**Fixed Issue**: "TypeError: Cannot read property 'openPicker' of null" in CreateEventScreen
- **Root Cause**: react-native-date-picker is a native module that requires linking, incompatible with Expo Go
- **Error Location**: CreateEventScreen.tsx using DatePicker from react-native-date-picker
- **Investigation Steps**:
  1. Found error relates to `openPicker` method
  2. Identified react-native-date-picker import on line 16
  3. Confirmed this is a native module requiring linking
  4. Expo Go doesn't support native modules that require linking
- **Fix Applied**: Replaced with Expo-compatible alternative
  1. Uninstalled `react-native-date-picker`
  2. Installed `@react-native-community/datetimepicker` (Expo-compatible)
  3. Rewrote date picker logic to handle platform differences:
     - iOS: Shows spinner-style picker
     - Android: Shows native date/time dialogs separately
  4. Added proper state management for date vs time mode
- **Key Differences**:
  - No `modal` prop - displays differently per platform
  - Must handle date and time selection separately on Android
  - Different onChange event structure
- **Files Modified**:
  - `/mobile-app/src/screens/teacher/CreateEventScreen.tsx` - Complete rewrite of date picker
  - `/mobile-app/package.json` - Replaced dependency
- **Lesson**: Always check if packages are Expo-compatible before using! Native modules requiring linking won't work in Expo Go.

### 56. Schedule Event Creation SQLAlchemy Async Error ⚠️ NEW
**Fixed Issue**: Event creation failed with 500 error - "MissingGreenlet" in async context
- **Root Cause**: Lazy loading relationships in async SQLAlchemy context
- **Error**: `sqlalchemy.exc.MissingGreenlet: greenlet_spawn has not been called`
- **Location**: `_check_and_record_conflicts` method accessing `event.participants`
- **Investigation Steps**:
  1. Checked backend logs: Found MissingGreenlet error in schedule service
  2. Traced to _check_and_record_conflicts at line 452
  3. Issue: Accessing `event.participants` triggers lazy load in async context
  4. Also found similar issue with notifications accessing participants
- **Fix Applied**:
  1. Modified conflict checking to query association table directly:
     ```python
     # Instead of accessing event.participants
     participant_check = await self.db.execute(
         select(event_participants.c.student_id).where(
             event_participants.c.event_id == event.id
         )
     )
     participant_ids = participant_check.scalars().all()
     ```
  2. Updated participant iteration to use IDs instead of objects
  3. Temporarily disabled notifications to avoid similar issues
- **Files Modified**:
  - `/backend/app/services/scheduling/schedule_service.py` - Fixed async relationship access
- **Result**: Events now create successfully (200 OK)
- **Lesson**: Never access SQLAlchemy relationships directly in async context - always use explicit queries!

### 57. Extending Models with Related Features ✅ NEW
**Implemented**: Practice Segment Tracking System
- **Approach**: Extended existing Tag model instead of creating completely new system
- **Pattern**: Tags with tag_type='piece' represent musical pieces
- **Database Design**:
  - Extended Tag model with: tag_type, composer, opus_number, difficulty_level
  - Created PracticeSegment model that belongs to piece tags
  - Created SegmentClick model for tracking individual clicks
  - Used database triggers for automatic click count updates
- **Key Design Decisions**:
  - Reused existing tag infrastructure for piece management
  - Separate tables for segments and clicks for flexibility
  - Analytics view for aggregated data without complex queries
- **Files Created**:
  - `/backend/migrations/add_practice_segments.sql`
  - `/backend/app/models/practice_segment.py`
  - `/backend/app/services/practice/practice_segment_service.py`
  - `/backend/app/api/v1/endpoints/practice_segments.py`
- **Lesson**: When adding features, first check if existing models can be extended rather than creating entirely new systems!

### 58. Students Can Create Musical Pieces ⚠️ CRITICAL FIX
**Fixed Issue**: "Only teachers can create tags" error when students try to create pieces
- **Root Cause**: Backend restricted all tag creation to teachers only
- **Context**: Musical pieces are stored as tags with tag_type='piece'
- **Fix Applied**: Modified create_tag endpoint to allow students to create tags when tag_type='piece'
- **Files Modified**: `/backend/app/api/v1/endpoints/tags.py`
  - Changed permission check to allow students to create pieces
  - Students can only create tags with tag_type='piece'
  - Teachers can still create any type of tag
- **API Documentation Updated**: Updated API_PATHS_AND_VARIABLES.md with new access rules
- **Lesson**: Check user requirements carefully - students need to create their own practice pieces!

### 59. Practice Segments Loading Error Fix ⚠️ CRITICAL FIX
**Fixed Issue**: "Failed to load practice segments: [Error: [object Object]]"
- **Root Cause**: CreatePieceModal was passing the wrong object after piece creation
- **Error Details**: Backend returned 422 for invalid piece ID "temp-1751211212903"
- **Investigation**: Backend expects UUID for piece_tag_id, but frontend was using temporary ID
- **Fix Applied**: 
  - CreatePieceModal now passes the created piece (with real ID) instead of the input data
  - Updated interface to use Tag type instead of TagCreate for callback
  - Removed temporary ID generation in handlePieceCreated
- **Files Modified**: 
  - `/mobile-app/src/components/practice/CreatePieceModal.tsx` - Pass createdPiece instead of newPiece
  - `/mobile-app/src/screens/student/NewSessionScreen.tsx` - Handle real Tag object
- **Lesson**: Always use the response from the backend, not the request data!

### 60. Practice Focus System Complete Redesign ✅ PHASE 1 & 2 COMPLETED
**Major Understanding Change**: Practice focuses are student-created custom text, NOT predefined options
- **What the user wants**:
  - Practice focuses = Custom reminders like "right hand sing more on second movement"
  - Created by students during practice sessions
  - Clickable with micro-animations and count tracking
  - Session summary showing what was clicked during that session
  - Piece summary showing lifetime analytics when piece is archived
- **Implementation Progress**:
  - ✅ Made focus field optional in backend (migration applied)
  - ✅ Updated all schemas and types to support optional focus
  - ✅ Removed PracticeFocus enum selection from UI
  - ✅ Renamed "segments" → "practice focuses" in UI
  - ✅ Added "Add New Focus" button with modal during sessions
  - ✅ Practice focuses now integrated in active session view
- **Files Modified**:
  - `/backend/migrations/make_focus_optional.sql` - Database migration
  - `/backend/app/models/practice.py` - Made focus nullable
  - `/backend/app/schemas/practice.py` - Made focus optional
  - `/mobile-app/src/types/practice.ts` - Made focus optional
  - `/mobile-app/src/store/slices/practiceSlice.ts` - Updated to not require focus
  - `/mobile-app/src/screens/student/NewSessionScreen.tsx` - Complete UI overhaul
- **Next Steps**: Add session-specific click tracking and micro-animations
- **Lesson**: Always clarify requirements - "practice segments" were almost exactly what was needed!

### 61. Local SQLite Database Focus Field Migration ⚠️ CRITICAL FIX
**Fixed Issue**: "NOT NULL constraint failed: practice_sessions.focus" when saving sessions locally
- **Root Cause**: Local SQLite database still had NOT NULL constraint on focus field
- **Context**: Backend made focus optional, frontend types updated, but local DB schema wasn't migrated
- **Fix Applied**:
  1. Updated CREATE TABLE to make focus nullable for new installations
  2. Added migrateDatabase() method to handle existing databases
  3. Migration recreates table with nullable focus (SQLite doesn't support ALTER COLUMN)
  4. Updated savePracticeSession to convert undefined focus to NULL
- **Files Modified**:
  - `/mobile-app/src/services/database.service.ts` - Added migration and nullable focus
- **Technical Details**:
  - Uses PRAGMA table_info to check if migration needed
  - Creates new table, copies data, drops old, renames new
  - Handles migration failures gracefully with try-catch
- **Lesson**: When making fields optional, remember to update ALL data layers including local databases!

### 62. Practice Focus Animations Implementation ✅ NEW
**Implemented**: Enhanced practice focus cards with micro-animations
- **Features Added**:
  1. Scale bounce animation on click using react-native-reanimated
  2. Ripple effect that expands from center on tap
  3. Number flip animation when click count increases
  4. Completion celebration with Lottie confetti animation
- **Technical Implementation**:
  - Created AnimatedPracticeFocusCard component with gesture handlers
  - Used react-native-reanimated v3 for performant animations
  - Integrated react-native-gesture-handler for tap/long-press detection
  - Added lottie-react-native for celebration animations
  - Milestone celebrations at 10, 20, 50, 100 clicks
- **Files Created/Modified**:
  - `/mobile-app/src/components/practice/AnimatedPracticeFocusCard.tsx` - New animated component
  - `/mobile-app/src/assets/animations/confetti.json` - Celebration animation
  - `/mobile-app/src/screens/student/NewSessionScreen.tsx` - Updated to use animated card
- **Animation Details**:
  - Scale: 0.95 → 1.05 → 1.0 with spring physics
  - Ripple: Expands to 2x size while fading out over 600ms
  - Number: Scales to 1.4x then back with bounce
  - Progress bar: Animated width changes with timing function
- **Lesson**: Use worklets for animations to keep them on UI thread for 60fps performance!

### 63. GestureHandlerRootView Required for Gesture Detection ⚠️ CRITICAL FIX
**Fixed Issue**: "GestureDetector must be used as a descendant of GestureHandlerRootView"
- **Root Cause**: react-native-gesture-handler requires GestureHandlerRootView at app root
- **Error**: App crashed when using AnimatedPracticeFocusCard with gesture detection
- **Fix Applied**: Wrapped entire app with GestureHandlerRootView in App.tsx
- **Implementation**:
  ```tsx
  import { GestureHandlerRootView } from 'react-native-gesture-handler';
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        {/* Rest of app */}
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
  ```
- **Files Modified**: `/mobile-app/App.tsx`
- **Important**: GestureHandlerRootView must be at the highest level with style={{ flex: 1 }}
- **Lesson**: Always wrap app with GestureHandlerRootView when using react-native-gesture-handler!

### 64. Session Summary Modal Implementation ✅ NEW
**Implemented**: Summary modal that shows practice session statistics before ending
- **Features Added**:
  1. SessionSummaryModal component with session overview
  2. Duration display with start/end times
  3. Practice focus activity tracking
  4. Click counts per focus for the session
  5. Continue editing vs End session options
- **Integration Flow**:
  - Modified handleEndSession to show modal instead of directly ending
  - Created handleConfirmEndSession for actual session ending
  - Modal shows only focuses that were clicked during session
  - Calculates session duration dynamically
- **Files Created/Modified**:
  - `/mobile-app/src/components/practice/SessionSummaryModal.tsx` - New modal component
  - `/mobile-app/src/screens/student/NewSessionScreen.tsx` - Integrated modal into flow
- **UI Details**:
  - Slide-up modal with rounded top corners
  - Duration card with time icon
  - Focus list showing clicks per focus
  - Success message with checkmark icon
  - Two-button footer for user choice
- **Lesson**: Present meaningful summaries to users before important actions!

### 65. App Freeze on End Session - Modal Conflicts Fixed ⚠️ CRITICAL FIX
**Fixed Issue**: App froze when pressing "End Practice Session" button
- **Debugging Steps Taken**:
  1. Added console logging throughout the flow
  2. Temporarily replaced with simple test modal
  3. Removed AnimatedPracticeFocusCard to eliminate gesture conflicts
  4. Simplified modal rendering logic
- **Root Causes Identified**:
  1. Multiple modals potentially conflicting
  2. GestureDetector in AnimatedPracticeFocusCard may conflict with modals
  3. Inline calculations causing re-renders
  4. Type mismatches in Redux actions
- **Fixes Applied**:
  1. **Closed Other Modals Before Opening Summary**:
     ```tsx
     // Make sure other modals are closed
     setShowVideoRecorder(false);
     setShowAddFocusModal(false);
     setShowCreatePieceModal(false);
     
     // Add delay before opening summary modal
     setTimeout(() => {
       setShowSummaryModal(true);
     }, 100);
     ```
  2. **Replaced AnimatedPracticeFocusCard with PracticeFocusCard**:
     - Temporarily removed gesture animations to eliminate conflicts
     - GestureDetector may conflict with modal rendering
  3. **Added Debug Logging**:
     - Console logs to track modal states
     - Helps identify where the freeze occurs
  4. **Simplified Modal Test**:
     - Created simple test modal to isolate issue
     - Helps determine if issue is with SessionSummaryModal specifically
  5. **Fixed Previous Issues**:
     - Memoized duration calculation
     - Fixed tag type mismatch (Tag[] → string[])
     - Added error handling in formatTime
     - Made modal rendering conditional
- **Files Modified**: 
  - `/mobile-app/src/screens/student/NewSessionScreen.tsx`
  - `/mobile-app/src/components/practice/SessionSummaryModal.tsx`
- **Lesson**: When debugging freezes:
  1. Add console logs to track execution flow
  2. Test with simplified components to isolate issues
  3. Check for modal conflicts - ensure only one modal is visible at a time
  4. Be aware that GestureDetector components may conflict with modals
  5. Use setTimeout to ensure state updates complete before showing modals

### 66. SQLite Database Migration for New Columns ⚠️ CRITICAL FIX
**Fixed Issue**: "table practice_sessions has no column named target_tempo" when saving sessions
- **Root Cause**: Existing SQLite databases don't have the new tempo columns added for Slow Practice Enforcer
- **Error**: `ERR_INTERNAL_SQLITE_ERROR: Call to function 'NativeDatabase.prepareAsync' has been rejected`
- **Investigation Steps**:
  1. Error showed missing target_tempo column
  2. Database migration only checked for focus column NOT NULL
  3. Users with already-migrated databases wouldn't get tempo columns
- **Fix Applied**: Enhanced migration logic to check for tempo columns:
  1. Check table info for both focus and tempo columns
  2. Try ALTER TABLE ADD COLUMN first (simpler approach)
  3. Fall back to table recreation if ALTER fails
  4. Handle column list explicitly in INSERT to avoid missing column errors
- **Additional Issue**: "table practice_sessions_new already exists" from failed migrations
- **Additional Fix**: Added cleanup for leftover temporary tables:
  1. Drop practice_sessions_new at start of migration
  2. Drop before each CREATE in migration SQL
  3. Handle cleanup errors gracefully
- **Files Modified**: `/mobile-app/src/services/database.service.ts`
  - Added checks for target_tempo and practice_mode columns
  - Added separate migration path for tempo columns
  - Created recreateTableWithTempoColumns method
  - Explicit column mapping in INSERT statements
  - Added DROP TABLE IF EXISTS for cleanup
- **Pattern**: Always check for ALL new columns in migration logic, not just the first change
- **Lesson**: When adding new fields to SQLite, ensure migration covers all scenarios:
  1. Fresh installations (CREATE TABLE)
  2. Existing databases without new columns (ALTER or recreate)
  3. Partially migrated databases (check each column individually)
  4. Failed migration cleanup (DROP temporary tables)

### 67. Practice Focus Total Click Count Double Increment Fix ⚠️ CRITICAL
**Fixed Issue**: Total click count was increasing by 2 when clicking once
- **Root Cause**: Both frontend and backend were incrementing the total_click_count
- **Details**:
  1. Frontend optimistically updated total_click_count by 1
  2. Database trigger automatically incremented total_click_count by 1
  3. Result: Total increased by 2 for each click
- **Fix Applied**: Removed optimistic update for total_click_count
  - Now only update today's click count optimistically
  - Refetch segments after successful click to get accurate total from database
  - Database trigger handles the total count increment
- **Files Modified**: `/mobile-app/src/screens/student/NewSessionScreen.tsx`
- **Pattern**: When database has triggers, don't duplicate the logic in frontend
- **Lesson**: Always check if backend has automatic updates before adding optimistic updates

### 68. Practice Focus Card Double Counting Today's Clicks ⚠️ CRITICAL FIX
**Fixed Issue**: Total click count displayed as 2x the actual value
- **Root Cause**: Frontend was adding today's clicks to total_click_count, but total_click_count already includes today's clicks
- **Investigation Steps**:
  1. Found duplicate click handlers initially (was a red herring)
  2. Traced backend flow - database trigger updates total_click_count
  3. Discovered PracticeFocusCard was displaying `focus.total_click_count + todayClicks`
- **The Problem**:
  - Database trigger increments total_click_count when clicks are recorded
  - total_click_count in database = ALL clicks including today's
  - Frontend was adding today's clicks again: `focus.total_click_count + todayClicks`
  - Result: If actual total is 1, display showed 1 + 1 = 2
- **Fix Applied**: Display only `focus.total_click_count` for total
  - Removed: `const totalClicks = focus.total_click_count + todayClicks`
  - Changed display from `{focus.total_click_count + todayClicks}` to `{focus.total_click_count}`
  - Updated progress bar calculation to use `focus.total_click_count` directly
- **Files Modified**: `/mobile-app/src/components/practice/PracticeFocusCard.tsx`
- **Lesson**: Always understand what data includes before combining values - avoid double counting!

### 66. Database Initialization Race Condition Fix ⚠️ NEW
**Fixed Issue**: "NativeDatabase.prepareAsync has been rejected" with NullPointerException
- **Root Cause**: Race condition where sessions were trying to be saved before database was fully initialized
- **Error Details**: Internal SQLite error when executing statements on null database connection
- **Fixes Applied**:
  1. **Enhanced Database Service Initialization**:
     - Added initialization tracking with isInitializing flag
     - Prevent multiple concurrent initializations
     - Store initialization promise for reuse
  2. **Added Database Check in savePracticeSession**:
     - Check if database is initialized before attempting save
     - Auto-initialize if not ready
     - Better error logging with session data
  3. **Updated useOfflineSync Hook**:
     - Added database initialization check before saving
     - Added 100ms delay to ensure proper initialization
     - Better error handling with detailed logging
  4. **Fixed Type Inconsistencies**:
     - Made focus optional in CreateSessionRequest interface
     - Made focus optional in SessionResponse interface
     - Fixed type mismatch in useOfflineSync
- **Files Modified**:
  - `/mobile-app/src/services/database.service.ts` - Enhanced initialization
  - `/mobile-app/src/hooks/useOfflineSync.ts` - Added safeguards
  - `/mobile-app/src/services/practice.service.ts` - Fixed types
- **Lesson**: Always ensure async resources are initialized before use! Use initialization tracking to prevent race conditions.

### 69. Practice Focus Phase 5: Piece Archive Implementation ✅ NEW
**Implemented**: Complete archive functionality for musical pieces
- **Backend Implementation**:
  - Added `is_archived` and `archived_at` fields to Tag model and schema
  - Created three new endpoints:
    - POST `/practice-segments/pieces/{piece_id}/archive` - Archive a piece
    - POST `/practice-segments/pieces/{piece_id}/unarchive` - Unarchive a piece  
    - GET `/practice-segments/pieces/archived` - Get all archived pieces
  - Implemented archive methods in PracticeSegmentService
  - Created database view `piece_archive_summary` for efficient queries
  - Added automatic timestamp trigger for archive date
- **Frontend Implementation**:
  - Created `PieceSummaryScreen` - Shows piece statistics before archiving
  - Created `ArchivedPiecesScreen` - Lists all archived pieces
  - Added archive button to SegmentTrackingScreen header
  - Added "Archived" button to PieceSelectionScreen
  - Updated Tag type with archive fields
  - Added archive methods to practice-segment.service.ts
- **Database Migration**:
  - Applied migration to add archive fields to tags table
  - Note: Tags table uses `owner_teacher_id` (null = student piece)
- **Files Created/Modified**:
  - `/backend/migrations/add_piece_archive_fields.sql`
  - `/backend/app/models/practice.py` - Added archive fields to Tag model
  - `/backend/app/schemas/practice.py` - Added archive fields to schemas
  - `/backend/app/api/v1/endpoints/practice_segments.py` - Added 3 new endpoints
  - `/backend/app/services/practice/practice_segment_service.py` - Added archive methods
  - `/mobile-app/src/screens/student/PieceSummaryScreen.tsx` - New screen
  - `/mobile-app/src/screens/student/ArchivedPiecesScreen.tsx` - New screen
  - `/mobile-app/src/types/practice.ts` - Added archive types
  - `/mobile-app/src/services/practice-segment.service.ts` - Added archive methods
  - `/mobile-app/src/navigation/types.ts` - Added new screens
  - `/mobile-app/src/navigation/StudentNavigator.tsx` - Added new screens
- **Lesson**: When implementing archive features, create comprehensive summaries and make the archive/unarchive process reversible!

### 70. Practice Segments Endpoint SQLAlchemy to Pydantic Conversion ⚠️ CRITICAL FIX
**Fixed Issue**: "Failed to load pieces: [Error: Internal Server Error]" when accessing practice segments
- **Root Cause**: GET `/practice-segments/pieces` endpoint was returning raw SQLAlchemy Tag models
- **Error**: `PydanticSerializationError: Unable to serialize unknown type: <class 'app.models.practice.Tag'>`
- **Investigation Steps**:
  1. Checked frontend - calling `practiceSegmentService.getStudentPieces()`
  2. Found API call to `/practice-segments/pieces`
  3. Backend logs showed Pydantic serialization error
  4. Service returned `List[Tag]` (SQLAlchemy models)
  5. Endpoint put raw models in response dictionary
- **Fix Applied**: 
  - Import Tag schema: `from app.schemas.practice import Tag`
  - Convert each piece: `Tag.model_validate(piece)`
  - Changed line 53: `"piece": piece` → `"piece": Tag.model_validate(piece)`
- **Files Modified**: `/backend/app/api/v1/endpoints/practice_segments.py`
- **Lesson**: Always convert SQLAlchemy models to Pydantic schemas before returning in API responses!

### 71. Archive Piece Multiple Issues Fixed ⚠️ CRITICAL FIX
**Fixed Issue**: "Internal Server Error" when trying to archive a piece - Multiple problems
- **Root Causes**: 
  1. Wrong field name `order_index` instead of `display_order`
  2. Incorrect row to dictionary conversion for SQLAlchemy results
  3. Missing logic to mark segments as completed
  4. Setting archived_at manually when database has trigger
- **Errors**: 
  1. `AttributeError: type object 'PracticeSegment' has no attribute 'order_index'`
  2. `TypeError: cannot convert dictionary update sequence element #0 to a sequence`
- **Investigation Steps**:
  1. User reported error when clicking archive button
  2. Checked backend logs for POST `/practice-segments/pieces/{id}/archive`
  3. Found AttributeError in line 346
  4. Fixed field name, then found row conversion error
  5. Fixed row conversion, then noticed missing segment completion logic
- **Fixes Applied**: 
  1. Changed line 346: `.order_by(PracticeSegment.order_index` → `.order_by(PracticeSegment.display_order`
  2. Changed line 350: `segments = [dict(row) for row in segments_result]` → `segments = [row._asdict() for row in segments_result]`
  3. Added UPDATE query to mark all segments as completed when archiving
  4. Removed manual setting of archived_at (let trigger handle it)
- **Files Modified**: `/backend/app/services/practice/practice_segment_service.py`
- **Lesson**: When debugging complex methods, fix one error at a time and check for missing business logic!

### 72. Archive System Data Aggregation Issues ⚠️ CRITICAL FIX
**Fixed Issues**: Multiple problems with archived pieces display
- **User Reported Issues**: 
  1. Archived pieces showing wrong data (100% → 60%, 251 clicks → 25733 clicks)
  2. Cannot click to see archived piece details
  3. Archived pieces still appear in piece selection
  4. Archive summary disappears after clicking OK
- **Root Causes**: 
  1. Database view `piece_archive_summary` aggregates data from ALL students
  2. Empty onPress handler in ArchivedPiecesScreen
  3. get_student_pieces() not filtering out archived pieces
  4. Alert navigation dismissing the summary screen
- **Investigation Steps**:
  1. Checked ArchivedPiecesScreen - found empty onPress handler
  2. Examined database view - no student_id filtering in JOIN
  3. Confirmed view aggregates ALL practice segments regardless of student
  4. Found alert onPress navigating away from summary
- **Fixes Applied**: 
  1. Rewrote get_archived_pieces() query to filter by student_id in JOIN
  2. Added navigation to PieceSummary in ArchivedPiecesScreen onPress
  3. Added `Tag.is_archived == False` filter to get_student_pieces()
  4. Updated PieceSummaryScreen to handle isArchived parameter
  5. Added useEffect to load summary for already archived pieces
  6. Removed navigation from archive success alert
  7. Added loading state handling for archived vs archiving
- **Files Modified**: 
  - `/backend/app/services/practice/practice_segment_service.py` - Fixed queries
  - `/mobile-app/src/screens/student/ArchivedPiecesScreen.tsx` - Added navigation
  - `/mobile-app/src/screens/student/PieceSummaryScreen.tsx` - Handle archived state
- **Lesson**: Always verify database queries filter by the correct user/student - aggregating all users' data is a serious bug!

### 📊 Progress Tracking Protocol

**CRITICAL**: Throughout the development session, continuously update:

1. **[API_PATHS_AND_VARIABLES.md](./API_PATHS_AND_VARIABLES.md)** ⚠️ MOST CRITICAL
   - Document EVERY new endpoint immediately when created
   - Update variable mappings as soon as they're defined
   - Add any path changes or discoveries
   - Document field name mappings between frontend/backend
   - This prevents hours of debugging later!

2. **[PROJECT_PLAN.md](./PROJECT_PLAN.md)** 
   - Mark tasks as completed with [x]
   - Update phase percentages
   - Move items to "Recently Completed"

3. **[NEXT_STEPS.md](./NEXT_STEPS.md)**
   - Adjust priorities based on discoveries
   - Add new tasks found during development
   - Update "Currently Working On"

4. **Todo List** (using `TodoWrite` tool)
   - Mark items as in_progress/completed
   - Add new discovered tasks

**Remember**: Variable consistency (變數一致性) is everything - document paths/variables IMMEDIATELY!

---

**Remember**: 保持變數的一致性 (Keep variable consistency) - The user's key insight!