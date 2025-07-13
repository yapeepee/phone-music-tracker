# 🚀 Music Practice Tracker - Current Work

## 📊 Project Status
- **Phases 1-6**: ✅ COMPLETE (100%)
- **Phase 7**: 🚧 IN PROGRESS - Polish & Optimization
- **Stack**: React Native Expo + FastAPI + PostgreSQL/TimescaleDB + MinIO

## 🎯 Active Development Tasks

### 5. Practice Partner Matching System 🤝 (✅ 100% COMPLETE)
**Enable users to find practice partners for the same pieces**

**Progress:**
- ✅ Database schema designed with 5 new tables:
  - user_availability: Weekly practice schedule
  - user_practice_preferences: Partner matching preferences
  - practice_partner_matches: Request/match tracking
  - partner_practice_sessions: Joint practice session tracking
  - compatible_practice_partners: Helper view for discovery
- ✅ Backend models created (UserAvailability, UserPracticePreferences, PracticePartnerMatch)
- ✅ Pydantic schemas for all entities
- ✅ API endpoints implemented:
  - Availability management (GET/POST/DELETE)
  - Preferences management (GET/PUT)
  - Partner discovery with filters (piece, timezone, skill level)
  - Match requests (create, accept/decline, view)
  - Compatible practice time finder
- ✅ Timezone-based filtering implemented
- ✅ SQL migration file created
- ✅ Database migration applied successfully
- ✅ Frontend implementation:
  - Practice partner types created
  - Practice partner service with all API calls
  - Main PracticePartnersScreen with 3 tabs (Discover, Requests, Partners)
  - Navigation added to both Student and Teacher stacks
  - Integration with current pieces for discovery
  - AvailabilityScheduler component with weekly schedule setting
  - PartnerMatchCard reusable component
  - Settings modal with availability management
  - ✅ Practice partner preferences settings screen created
  - ✅ PreferencesSettingsModal component with all preference fields
  - ✅ Integrated preferences tab into main settings modal

**Next Steps:**
1. ✅ Test complete discovery and matching flow (COMPLETE)
2. ✅ Add timezone conversion for compatible times (COMPLETE)
3. ✅ Add real-time notifications for match requests (COMPLETE)
4. ~Implement video call integration~ (EXCLUDED)

**Features:**
1. **Match by Piece**: Find users working on the same musical pieces
2. **Timezone Compatibility**: Filter partners by timezone difference
3. **Skill Level Matching**: Optional skill level filtering
4. **Availability Scheduler**: Define weekly practice availability
5. **Practice Preferences**: Set communication preferences, max partners
6. **Compatible Times**: Automatically find overlapping practice times

### 1. Practice Focus System Redesign 🎼 (✅ 100% COMPLETE)
**Complete paradigm shift in understanding:**
- Practice focuses = **Custom text reminders** by students (NOT predefined options)
- Example: "right hand sing more on second movement"
- Must be clickable during practice with animations

**Progress:**
- ✅ Backend focus field made optional (migration applied)
- ✅ Removed PracticeFocus enum from UI
- ✅ "Add New Focus" button added to session screen
- ✅ Micro-animations implemented (bounce, ripple, celebrations)
- ✅ Session summary modal created
- ✅ Piece archive functionality backend complete
- ✅ Session-specific click tracking implemented
- ✅ Piece closure/archive UI completed
- ✅ Add analytics for practice patterns (COMPLETE)
- ✅ Integrate session summary with archived pieces (COMPLETE - 2025-07-06)
- ✅ Add practice insights dashboard (COMPLETE)

**Integration Details (2025-07-06):**
- SessionSummaryModal now detects when all segments of a piece are completed
- Shows "Piece Completed!" section with trophy icon for 100% completed pieces
- Offers one-click archive functionality with confirmation dialog
- Seamless transition from practice session to archived pieces

### 2. Slow Practice Enforcer 🐌 (✅ COMPLETE)
**Gamify practicing under tempo for better technique**

**Completed:**
- ✅ Database: tempo_tracking, tempo_achievements tables
- ✅ Backend API: All tempo endpoints created
- ✅ Core components: AngryMetronome, MeditationMode, metronome.service

**TODO (Days 5-7):**
```typescript
// Day 5: Points System & Basic Integration
- [x] Install: react-native-sound, react-native-haptic-feedback
- [x] Add BPM selector to NewSessionScreen (40-200 range)
- [x] Connect metronome to practice session
- [x] Move BPM selector inside active session (not before start)
- [x] Replace simple toggle with AngryMetronome visual component
- [x] Add sound to metronome using expo-av
- [x] Create InlineBPMSelector for real-time BPM adjustment
- [x] Note about tempo detection limitation added to UI
- [x] Enhanced accent beat animations (eye pop + glow)
- [x] Removed beat count text (as requested)
- [x] Fixed audio initialization errors
- [x] Added clear console beat/measure tracking
- [x] Implement proper audio with sound files (using generated click.mp3/accent.mp3)
- [x] Display real-time points accumulation (shows points in UI and session summary)
- [x] Implement tempo detection from microphone (COMPLETE!)

// Day 6: Meditation Mode & Achievements  
- [x] Create PatienceAchievements component
- [x] Achievement unlock animations (Lottie)
- [x] Integrate MeditationMode (<60 BPM activation)

// Day 7: Integration & Polish
- [x] Session tempo tracking during practice (tracking every 5 seconds)
- [x] Sound effects and haptic feedback (metronome has click sounds)
- [x] Post-session tempo statistics screen (detailed stats beyond points)
```

**Post-Session Tempo Statistics Implementation:**
- ✅ Enhanced SessionSummaryModal with detailed tempo stats
- ✅ Shows average tempo vs target tempo comparison
- ✅ Displays time distribution (under/over tempo)
- ✅ Visual compliance percentage with progress bar
- ✅ Loading states and error handling
- ✅ Color-coded feedback based on performance

### 3. Forum Enhancement - Musical Piece Discussions 🎼 (NEW - IN PROGRESS)
**Enable piece-specific discussions and "currently working on" tracking**

**Phase 1: Add Edit/Delete UI (COMPLETED ✅):**
- [x] Add three-dots menu to PostDetailScreen header (only for post authors)
- [x] Create action menu with Edit/Delete options
- [x] Create EditPostModal component
- [x] Add delete confirmation dialog
- [x] Test edit/delete functionality

**Phase 2: Connect Forum Posts to Musical Pieces (COMPLETE ✅):**
- [x] Backend: Add related_piece_id field to forum_posts table
- [x] Backend: Create database migration
- [x] Backend: Update Post schemas with related_piece_id
- [x] Backend: Update ForumService to handle related_piece
- [x] Frontend: Update forum types with related_piece fields
- [x] Frontend: Add piece selector in CreatePostScreen
- [x] Frontend: Display piece badge on posts
- [x] Frontend: Filter posts by piece

**Phase 3: "Currently Working On" Feature (COMPLETE ✅):**
- [x] Backend: Create user_current_pieces association table
- [x] Backend: Add API endpoints for current pieces management
- [x] Frontend: Add toggle in PieceSelectionScreen
- [x] Frontend: Show "Currently Working On" badges
- [x] Frontend: Add current pieces to dashboard

**Phase 4: Piece-Specific Forums (COMPLETE ✅):**
- [x] Create piece discussion search/discovery (Already implemented in Phase 2)
- [x] Show who's currently working on each piece  
- [x] Pre-populate context when asking questions
- [x] Link forum discussions to practice sessions (via "Ask Question" button)

**Progress Log:**
- 2025-07-01: Analyzed existing code - found edit/delete methods already exist in forum service
- 2025-07-01: Starting Phase 1 - Adding UI elements
- 2025-07-01: Completed Phase 1 - Added edit/delete UI with action menu and edit modal
- 2025-07-01: Phase 2 Backend Complete - Added related_piece_id field, migration, schemas, and service updates
- 2025-07-01: Fixed forum serialization error - all endpoints now include related_piece fields
- 2025-07-01: Phase 2 Frontend Complete - Added PiecePicker component, piece selection in CreatePostScreen, piece badges display, and piece filtering
- 2025-07-01: Phase 3 Backend Complete - Created user_current_pieces table, models, schemas, and API endpoints for current pieces management
- 2025-07-01: Phase 3 Frontend Complete - Added current pieces service, toggle in PieceSelectionScreen with star icon, "Working On" badges, and current pieces section in HomeScreen dashboard
- 2025-07-01: Fixed 422 validation error - Removed redundant piece_id field from CurrentPieceAdd schema (piece_id is passed as URL parameter, not in request body)
- 2025-07-01: Fixed UI overlap - Moved "Working On" badge below piece name to prevent star icon blocking
- 2025-07-01: Phase 4 Progress - Found piece search/discovery already implemented; added user count display showing number of users working on each piece in PiecePicker
- 2025-07-01: Fixed "failed to load pieces" error - Created missing /tags/pieces backend endpoint, fixed incorrect import path (Tag from types/tag → types/practice), improved error handling with fallback
- 2025-07-01: Fixed 422 error on /piece-user-counts - Route order issue: moved specific routes before dynamic /{piece_id} routes in FastAPI (pattern #13)
- 2025-07-01: Phase 4 Pre-populate Context - Added route params to CreatePost, pre-populate piece & title when navigating from forum with filter or from SegmentTrackingScreen with "Ask Question" button
- 2025-07-02: Implemented metronome audio with generated click.mp3/accent.mp3 files
- 2025-07-02: Added real-time tempo points accumulation display - tracks tempo every 5 seconds, shows points badge during practice and in session summary
- 2025-07-02: Fixed tempo tracking 500 error - SessionService method was `get_session_by_id()` not `get_session()`
- 2025-07-02: Implemented real-time tempo detection with multiple handling (2x, 0.5x speeds) and accuracy calculation
- 2025-07-02: Added AngryMetronome face expressions based on tempo accuracy (happy/neutral/annoyed/angry)
- 2025-07-02: Added visual accuracy ring indicator around metronome face
- 2025-07-02: Created PatienceAchievements component with 6 achievement types
- 2025-07-02: Added AchievementUnlockModal with Lottie confetti animations
- 2025-07-02: Integrated MeditationMode - automatically activates when BPM < 60
- 2025-07-02: Implemented post-session tempo statistics screen with detailed analytics
- 2025-07-02: Practice Partner Matching System - Designed database schema with 5 tables for partner discovery
- 2025-07-02: Created backend models and API endpoints for practice partner matching
- 2025-07-02: Implemented timezone-based partner filtering and availability scheduling
- 2025-07-02: Fixed login issue - missing TIMESTAMP import and incorrect schema references
- 2025-07-02: Created frontend types and service for practice partner system
- 2025-07-02: Implemented PracticePartnersScreen with discover/requests/partners tabs
- 2025-07-02: Added practice partner navigation to both student and teacher interfaces
- 2025-07-02: Applied database migration for practice partner matching tables
- 2025-07-02: Created AvailabilityScheduler component for setting weekly practice times
- 2025-07-02: Created PartnerMatchCard reusable component for partner discovery
- 2025-07-02: Added settings modal to PracticePartnersScreen for availability management
- 2025-07-02: Fixed practice partner discovery Internal Server Error - removed interval timezone calculations
- 2025-07-02: Fixed column name mismatch: communication_preference → preferred_communication
- 2025-07-02: Created test data script with 3 test users having different availability schedules
- 2025-07-02: Fixed SQLAlchemy text() query with asyncpg - added CAST() for NULL parameter comparisons
- 2025-07-02: Practice partner discovery now fully functional - returns all compatible partners
- 2025-07-02: Fixed method name mismatches in AvailabilityScheduler:
  - getAvailability → getUserAvailability
  - deleteAvailability → deleteAvailabilitySlot  
  - addAvailability → addAvailabilitySlot
- 2025-07-02: Fixed Pydantic v2 field validator syntax in UserAvailabilityBase schema
  - Changed from values dict to info.data.get() for validation
  - Added is_active field to availability creation request
- 2025-07-06: Created Practice Partner Preferences Settings functionality
  - Created PreferencesSettingsModal component with all UserPracticePreferences fields
  - Integrated with existing PracticePartnersScreen using tabs (Availability/Preferences)
  - All field names match backend schema exactly: is_available_for_partners, preferred_communication, skill_level, practice_goals, languages, max_partners
  - Practice Partner Matching System now 95% complete
- 2025-07-06: Tested Forum Edit/Delete functionality (Phase 1 complete)
  - Verified PostDetailScreen correctly shows action menu only for post authors
  - Confirmed EditPostModal allows updating title and content
  - Verified delete confirmation dialog and navigation after deletion
  - All API endpoints match backend specification (/forum/posts/{id})
  - Forum Enhancement Phase 1 is now 100% complete
- 2025-07-06: Replaced Analytics with Practice Focus Analytics
  - Created new backend endpoint `/practice-segments/analytics/overview` for overall segment analytics
  - Completely replaced AnalyticsScreen with practice focus insights
  - Shows practice consistency, most practiced segments, segments needing attention
  - Added daily activity chart and all segments view
  - Removed useless technical audio metrics (tempo, pitch, dynamics)
  - Analytics now shows meaningful data for students: which focuses they practice, how often, and practice patterns
- 2025-07-06: Completed Practice Partner Matching System Testing and Timezone Support
  - Fixed critical bug: Pydantic User schema overriding SQLAlchemy UserModel in practice_partners.py
  - Tested complete discovery flow: filtering by piece, skill level, and creating match requests
  - Implemented proper timezone conversion in compatible times endpoint
  - Enhanced compatible times to show both users' local times with UTC reference
  - Updated test data with different timezones (Bob in Europe/London)
  - Practice Partner Matching System now 98% complete (only notifications and video call remaining)
- 2025-07-06: Implemented Real-time Notifications for Practice Partner Matching
  - Added new NotificationType enum values: PARTNER_REQUEST_RECEIVED, PARTNER_REQUEST_ACCEPTED, PARTNER_REQUEST_DECLINED
  - Created notification service methods for partner notifications
  - Integrated notifications into match creation and update endpoints
  - Fixed enum value case mismatch (uppercase in database)
  - Tested complete notification flow: request -> notification -> accept -> notification
  - Practice Partner Matching System now 100% COMPLETE (video calls excluded per user request)
- 2025-07-06: Completed Practice Focus System Integration with Archived Pieces
  - Enhanced SessionSummaryModal to detect 100% piece completion
  - Added archive option UI with trophy icon and congratulations message
  - Implemented one-click archive functionality with confirmation dialog
  - Practice Focus System now 100% COMPLETE

### 4. Phase 7 Remaining Tasks 📋

**Performance & UX:**
- [ ] Implement dark mode theme
- [ ] Optimize bundle size and code splitting
- [ ] Add loading states and skeleton screens
- [ ] Improve offline experience with better caching
- [ ] Create onboarding flow for new users

**Security & Compliance:**
- [ ] Implement certificate pinning
- [ ] Add field-level encryption for PII
- [ ] Create GDPR compliance tools
- [ ] Implement content moderation

**Store Deployment:**
- [ ] Prepare App Store/Play Store assets
- [ ] Configure app signing certificates
- [ ] Set up CI/CD pipelines
- [ ] Implement crash reporting (Sentry)
- [ ] Create production monitoring

## 📝 Recently Completed

### Last Week:
- ✅ Forum media upload with S3 integration
- ✅ Reputation system with leaderboard
- ✅ Practice challenges & achievements
- ✅ Schedule system with recurrence
- ✅ Push notifications setup (limited by Expo Go)
- ✅ WebCal/iCal export functionality

### This Week:
- ✅ Practice segment tracking system
- ✅ Practice focus animations with Lottie
- ✅ Session summary modal
- ✅ Database migrations for tempo tracking
- ✅ Fixed circular dependency issues
- ✅ Documentation optimization (76% reduction)
- ✅ Fixed archived pieces data aggregation (SQL JOIN multiplication issue)
- ✅ Fixed piece creation tag name conflicts (now checks within tag_type only)
- ✅ Fixed archived piece details showing wrong counts (SQL JOIN multiplication in get_archived_piece_details)
- ✅ Added session details modal with micro-animation for student recent sessions
- ✅ Fixed forum post creation error (ResponseValidationError - wrong model/schema conversion)
- ✅ Fixed forum media upload authentication error (fetch API needs token from SecureStore)
- ✅ Fixed forum update/get post serialization errors (proper SQLAlchemy to Pydantic conversion)
- ✅ Made all challenges auto-active (no manual start required)
- ✅ Removed redundant "Active" tab from challenges screen (only All/Completed now)
- ✅ Fixed challenge progress tracking (sessions now sync to backend on end)
- ✅ Added BPM selector component with practice mode selection
- ✅ Integrated tempo tracking into session creation
- ✅ Connected metronome to practice session with toggle control

## 🔧 Development Commands

```bash
# Start everything
docker-compose up -d
docker exec musictracker-minio mc mb --ignore-existing myminio/music-tracker

# Mobile development
cd mobile-app
npm start

# Watch logs
docker-compose logs -f backend

# Test API
curl -X GET http://localhost:8000/api/v1/sessions \
  -H "Authorization: Bearer {token}"
```

## ⚠️ Critical Reminders

1. **ALWAYS** update API_PATHS_AND_VARIABLES.md immediately
2. Test with curl before testing in app
3. Check existing functions before creating new ones
4. Variable consistency is everything (變數一致性)
5. SQLAlchemy models → Pydantic schemas before returning

## 🎵 Tempo Detection Implementation Details

### Overview
Implemented real-time tempo detection that handles musicians playing at different multiples of the metronome tempo (e.g., 60 BPM metronome but playing at 120 BPM notes).

### Key Features:
1. **Multiple Detection**: Automatically detects and adjusts for common tempo ratios (0.25x, 0.5x, 1x, 2x, 4x)
2. **Accuracy Calculation**: Measures timing consistency as a percentage (0-100%)
3. **Visual Feedback**: AngryMetronome face changes based on tempo accuracy
4. **Accuracy Ring**: Visual indicator shows accuracy percentage around metronome

### Technical Implementation:
- Uses expo-av Audio.Recording API for microphone access
- Analyzes inter-beat intervals to calculate tempo
- Adjusts for tempo multiples with 15% tolerance
- Updates UI every 100ms for responsive feedback

### Files Modified:
- `/services/tempo-detection.service.ts`: Core tempo detection logic
- `/screens/student/NewSessionScreen.tsx`: Integration with practice session
- `/components/practice/AngryMetronome.tsx`: Visual feedback based on tempo

### Future Enhancements:
- Native module for real-time FFT analysis
- Instrument-specific detection modes
- Machine learning for improved beat detection

## 📊 Progress Tracking Protocol

Throughout development, continuously update:
1. **API_PATHS_AND_VARIABLES.md** - Document EVERY endpoint/variable
2. **CLAUDE_ACTIVE.md** - Add new critical patterns discovered
3. **This file** - Mark completed tasks and adjust priorities
4. **Todo list** - Use TodoWrite tool for task tracking

## 🔒 Security & Performance Phase (2025-07-06)

### Security Fixes Completed ✅
1. **SQL Injection Fix** - Rewrote practice partner discovery endpoint using SQLAlchemy ORM instead of raw SQL
2. **XSS Protection** - Added markdown sanitization for all forum posts and comments
3. **Rate Limiting** - Implemented in-memory rate limiting for critical endpoints:
   - Auth: 5 logins/minute, 3 registrations/hour
   - Forum: 5 posts/minute, 10 comments/minute, 30 votes/minute
   - Video: 5 uploads/hour
   - Partner discovery: 10 requests/minute
4. **Redis Caching** - Created caching infrastructure with cache invalidation patterns

### Files Modified:
- `/backend/app/api/v1/endpoints/practice_partners.py` - Fixed SQL injection
- `/backend/app/utils/sanitization.py` - Created XSS protection utilities
- `/backend/app/services/forum/forum_service.py` - Added content sanitization
- `/backend/app/core/rate_limit.py` - Created rate limiting system
- `/backend/app/api/deps.py` - Added rate limit dependencies
- `/backend/app/core/cache.py` - Created Redis caching utilities
- `/backend/requirements.txt` - Added bleach, markdown, slowapi (pending install)

### Next Security/Performance Tasks:
- [ ] Fix view count increments to be async/rate-limited
- [ ] Optimize challenge activation queries  
- [ ] Add proper transaction handling for denormalized counters
- [ ] Install security packages (bleach, markdown) via Docker rebuild
- [ ] Add input validation for all user inputs
- [ ] Implement CSRF protection
- [ ] Add API key authentication for external services

---

## 🔧 Major Refactoring: Variable Name Consistency Fix (2025-01-06)

### Phase 1: Offline Mode Removal ✅ COMPLETE
- Discovered offline mode was never fully implemented
- No SQLite, NetInfo, or sync logic found in codebase
- Phase 1 tasks marked complete as no action needed

### Phase 2: Variable Name Transformation System 🚧 IN PROGRESS

**Completed Today:**
1. ✅ Created `/mobile-app/src/utils/apiTransformers.ts`
   - Automatic camelCase ↔️ snake_case conversion
   - Special case handling (e.g., communicationPreference → preferred_communication)
   - Debug logging for development
   - Complete field mapping documentation

2. ✅ Enhanced API Client (`/mobile-app/src/services/api/client.ts`)
   - Added automatic request transformation (camelCase → snake_case)
   - Added automatic response transformation (snake_case → camelCase)
   - Integrated with existing auth interceptors
   - Added special auth endpoint debug logging

3. ✅ Created Base Service Class (`/mobile-app/src/services/base.service.ts`)
   - All services should extend this class
   - Handles all HTTP methods with automatic transformation
   - Includes pagination support
   - Consistent error handling

4. ✅ Created Example Refactored Service
   - `/mobile-app/src/services/practice.service.refactored.ts`
   - Shows how to migrate from old pattern to new pattern

5. ✅ Created Migration Guide
   - `/mobile-app/src/services/MIGRATION_GUIDE.md`
   - Step-by-step instructions for migrating all services
   - Common pitfalls and best practices

6. ✅ Migrated auth.service.ts to use BaseService
   - Added validation for token presence
   - Enhanced error handling and logging
   - Fixed SecureStore string validation issue

7. ✅ Fixed variable naming inconsistencies across the app
   - Updated HomeScreen to use camelCase properties
   - Fixed all service interfaces (notification, schedule, practice, current-pieces)
   - Updated all type definitions in practice.ts
   - Fixed SessionDetailsModal property access
   - Removed offline sync code from practice.service.ts
   - Fixed AnalyticsScreen to use camelCase properties
   - Fixed PracticeHistoryScreen to use camelCase for API calls
   - Updated practice-segment.service interfaces to camelCase
   - Fixed forum.service interfaces to use camelCase
   - Fixed reputation.service interfaces to use camelCase
   - Added defensive checks for undefined values in reputation service
   - Fixed ForumListScreen to use camelCase properties
   - Removed excessive debug logging from API client
   - Fixed LeaderboardScreen to use camelCase properties
   - Added defensive checks in formatPoints() for undefined values
   - Fixed key warnings by using proper keys instead of array indices
   - Removed unsupported CSS gap properties

**Next Steps:**
1. Migrate all services to use BaseService (Priority order):
   - [x] auth.service.ts (COMPLETE)
   - [x] forum.service.ts (COMPLETE - 2025-01-07)
   - [x] video-api.service.ts (COMPLETE - 2025-01-07)
   - [x] tag.service.ts (COMPLETE - 2025-01-07)
   - [x] schedule.service.ts (COMPLETE - 2025-01-08)
   - [ ] notification.service.ts
   - [ ] practice-segment.service.ts
   - [ ] All remaining services

2. Update all components to use refactored services
3. Remove old service files after verification
4. Add linting rules to enforce conventions

**Critical Documentation Created:**
- `MUSIC_TRACKER_FIX_PLAN.md` - Comprehensive 6-8 week fix plan
- `FIX_PLAN_QUICK_REFERENCE.md` - Daily development checklist

---

## 🔧 Forum Greenlet Error Fix (2025-01-07) ✅ COMPLETE

### Issue
"Failed to load posts: [AxiosError: Request failed with status code 500]" - Forum endpoints failing with greenlet errors

### Root Causes Identified & Fixed:
1. **Pydantic ValidationError** - Missing fields in related_piece objects
   - Added: owner_teacher_id, estimated_mastery_sessions, is_archived, archived_at
   
2. **SQLAlchemy Greenlet Error** - Lazy loading in async context
   - Error occurred when accessing `db_post.tags.append(tag)`
   - Fixed by using direct insert into association table instead of ORM relationship

### Solution Details:
```python
# OLD - Causes greenlet error
db_post.tags.append(tag)

# NEW - Works correctly
await self.db.execute(
    insert(post_tags).values([
        {"post_id": db_post.id, "tag_id": tag_id}
        for tag_id in tag_ids
    ])
)
```

### Files Modified:
- `/backend/app/services/forum/forum_service.py` - Fixed tag handling, reordered commits
- `/backend/app/api/v1/endpoints/forum.py` - Re-enabled ForumService (removed temporary bypasses)

### Key Learnings:
1. Be careful with relationship access on newly created objects in async SQLAlchemy
2. Lazy loading can cause greenlet errors in async context
3. Direct table operations can be more reliable than ORM relationships
4. Commit order matters - committing parent before manipulating relationships helps

### Test Results:
- ✅ All forum endpoints working (list, create, get single post)
- ✅ Tag associations working correctly
- ✅ Cache operations re-enabled and functioning
- ✅ Comment creation and nested comments working
- ✅ Post reload after commenting fixed

### Additional Fix (Same Day):
Fixed "failed to load post" error after creating comments by adding eager loading for nested comment relationships in ForumService.get_post(). The issue was similar - lazy loading of comment.children in async context.

### Additional Progress (2025-01-07):
Fixed "failed to load post" after creating comments:
- Added eager loading for nested comment relationships in ForumService.get_post()
- Fixed lazy loading of comment.children causing greenlet errors

### Service Migrations (2025-01-07):
Successfully migrated the following services to use BaseService:
1. **forum.service.ts** - Already using BaseService and camelCase
2. **video-api.service.ts** - Migrated from apiClient to BaseService
   - Updated interfaces: VideoResponse, VideoWithUrl to use camelCase
   - Fixed SessionDetailScreen.tsx to use durationSeconds, fileSizeBytes
3. **tag.service.ts** - Migrated from apiClient to BaseService
   - Updated interfaces: TagCreate, TagUpdate, PopularTag to use camelCase
   - Changed snake_case to camelCase: tag_type→tagType, opus_number→opusNumber, etc.

### Service Migration (2025-01-08):
4. **schedule.service.ts** - Migrated from apiClient to BaseService
   - Extended BaseService with '/schedule' base path
   - Updated all API methods to use BaseService methods (get, post, put, delete)
   - Fixed query parameters: include_conflicts→includeConflicts, update_series→updateSeries, delete_series→deleteSeries, days_ahead→daysAhead
   - Updated helper methods to use camelCase properties: start_datetime→startDatetime, end_datetime→endDatetime
   - Fixed ScheduleScreen.tsx to use camelCase parameters in API calls
   - All interfaces were already using camelCase (no changes needed)

### Bug Fix: Teacher Students List Key Prop Error (2025-01-08)
Fixed "Each child in a list should have a unique key prop" error in StudentsListScreen:
- Added defensive handling for both camelCase and snake_case variable names from API
- Created StudentActivityFlexible type to handle both naming conventions
- Updated keyExtractor to handle userId, user_id, or fallback to index
- Added unique student filtering to prevent duplicate keys
- Updated all property access to check both camelCase and snake_case versions

Root cause: API transformation causing variable name inconsistencies between camelCase/snake_case

### Bug Fix: Student Profile Empty Data & Invalid Date (2025-01-08)
Fixed "invalid date" and empty data issues in StudentProfileScreen:
- Created StudentProfileFlexible and SessionResponseFlexible types to handle both naming conventions
- Added defensive property access for nested user data (student.user.fullName vs full_name)
- Fixed date formatting with validation check for invalid dates
- Updated all stats cards to check both camelCase and snake_case field names
- Added console logging for debugging API response structure
- Handled multiple possible data structure formats from API transformation

Root issues:
1. API transformation converting snake_case to camelCase inconsistently
2. Nested objects (student.user) not being accessed with proper fallbacks
3. Date fields being undefined or in wrong format
4. Teacher service still using old apiClient pattern while transformation is active

### Bug Fix: Teacher Session Detail Invalid Dates & Missing Data (2025-01-08)
Fixed "invalid date" and missing focus/tags in teacher's SessionDetailScreen:
- Created SessionResponseFlexible and FeedbackFlexible types to handle both naming conventions
- Fixed date validation with proper checks for invalid dates
- Updated all date displays to show "Date not available" for invalid dates
- Fixed focus display to show actual custom text (not enum-based icons)
- Fixed tag display to handle both string and object tag formats
- Added support for both camelCase and snake_case field access throughout
- Updated SessionResponse interface to include missing fields (durationMinutes, etc.)
- Added console logging for debugging API responses

Key changes:
1. Date fields: Check both startTime and start_time with validation
2. Focus: Simplified to show custom text with generic flag icon
3. Tags: Handle both string[] and object[] formats
4. Self rating: Check both selfRating and self_rating
5. Duration: Check both durationMinutes and duration_minutes

Root cause: Practice service using old apiClient with inconsistent field naming from API transformation

### Bug Fix: Session Creation Internal Server Error (2025-01-08)
Fixed "Internal Server Error" when creating practice session in student account:

**Root Cause Found:**
The backend SessionService.create_session was missing the target_tempo and practice_mode fields when creating a new session.

**Fixed:**
1. Updated SessionService.create_session to include target_tempo and practice_mode fields
2. Updated the session creation endpoint to include these fields in the response
3. Both fields were already in the database model and schemas

**Changes Made:**
- `/backend/app/services/practice/session_service.py` - Added target_tempo and practice_mode to session creation
- `/backend/app/api/v1/sessions.py` - Added these fields to the response dict

The session creation should now work correctly. The backend was expecting these fields but wasn't saving them to the database.

---
**Last Updated**: 2025-01-08