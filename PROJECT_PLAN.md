# Music Practice Tracker Phone App - Project Plan & Progress

## 📋 Project Overview
A mobile-first music practice tracking system for students and teachers featuring video recording, analytics, and community features.

### Key Specifications
- **Platforms**: Native iOS + Android (React Native/Expo)
- **Core Features**: Practice logging, video recording, teacher feedback, analytics, community Q&A
- **Performance Targets**: <150ms P50 API, 50k MAU, 5TB video/month
- **Architecture**: Offline-first, resumable uploads, real-time analytics

## 🏗️ Development Phases

### ✅ Phase 1: Foundation Setup (Week 1-2)
**Status**: ✅ COMPLETED

#### Mobile App Tasks
- [x] Initialize React Native Expo project with TypeScript ✅ COMPLETED
- [x] Set up project folder structure and navigation ✅ COMPLETED
- [x] Configure state management (Redux Toolkit + TanStack Query) ✅ COMPLETED
- [x] Implement secure JWT authentication flow ✅ COMPLETED
- [x] Create role-based routing (student/teacher views) ✅ COMPLETED
- [x] Set up offline storage with expo-sqlite ✅ COMPLETED

#### Backend Infrastructure Tasks
- [x] Set up Django/FastAPI backend project structure ✅ COMPLETED
- [x] Configure PostgreSQL with TimescaleDB extension ✅ COMPLETED
- [x] Implement JWT authentication service ✅ COMPLETED
- [x] Create user models (base user, student, teacher roles) ✅ COMPLETED
- [x] Set up Docker containers for development ✅ COMPLETED
- [x] Configure Redis for caching and job queues ✅ COMPLETED

### ✅ Phase 2: Core Student Features (Week 3-5)
**Status**: ✅ COMPLETED (100%)

#### Practice Session Recording
- [x] Implement practice session creation UI ✅ COMPLETED
- [x] Add practice focus selector (technique, musicality, etc.) ✅ COMPLETED
- [x] Create self-rating component (1-5 scale) ✅ COMPLETED
- [x] Integrate tag system for categorization ✅ COMPLETED
- [x] Build offline-first data sync mechanism ✅ COMPLETED
- [x] Create local SQLite queue for offline sessions ✅ COMPLETED

#### Video Recording Module
- [x] Integrate expo-camera for video capture ✅ COMPLETED
- [x] Implement recording controls with duration limits ✅ COMPLETED
- [x] Add preview and re-record functionality ✅ COMPLETED
- [x] Create video storage service ✅ COMPLETED
- [x] Integrate video with practice sessions ✅ COMPLETED
- [x] Set up background upload service with retry logic ✅ COMPLETED
- [x] Implement resumable uploads using TUS protocol ✅ COMPLETED

### ✅ Phase 3: Analytics & Media Processing (Week 6-8)
**Status**: ✅ COMPLETED (100%)

#### Backend Media Pipeline
- [x] Set up S3/CloudFront for video storage ✅ COMPLETED (MinIO)
- [x] Implement presigned URL generation ✅ COMPLETED
- [x] Create Celery workers for video processing ✅ COMPLETED
- [x] Integrate FFmpeg for transcoding ✅ COMPLETED
- [x] Extract audio for analysis ✅ COMPLETED

#### Analytics Engine
- [x] Implement librosa integration for audio analysis ✅ COMPLETED
- [x] Create metrics extraction (tempo, dynamics, vibrato) ✅ COMPLETED
- [x] Store time-series data in TimescaleDB ✅ COMPLETED
- [x] Build materialized views for performance ✅ COMPLETED
- [x] Create API endpoints for analytics data ✅ COMPLETED

#### Mobile Analytics Dashboard
- [x] Build progress charts (Victory Native) ✅ COMPLETED
- [x] Create practice history timeline ✅ COMPLETED
- [x] Implement metric visualizations ✅ COMPLETED
- [x] Add trend analysis displays ✅ COMPLETED

### ✅ Phase 4: Teacher Tools (Week 9-11)
**Status**: ✅ COMPLETED (100%)

#### Student Management
- [x] Create student list with activity heatmaps ✅ COMPLETED
- [x] Build detailed student profile views ✅ COMPLETED
- [x] Implement practice session browser ✅ COMPLETED
- [x] Add filtering and sorting capabilities ✅ COMPLETED

#### Feedback System
- [x] Create feedback model and schemas ✅ COMPLETED (already existed)
- [x] Build feedback service backend ✅ COMPLETED
- [x] Create feedback API endpoints ✅ COMPLETED
- [x] Build session detail screen ✅ COMPLETED
- [x] Add feedback form with rating ✅ COMPLETED
- [x] Implement timestamp-based comments ✅ COMPLETED (supported in backend)
- [x] Create video player with annotation tools ✅ COMPLETED
- [x] Build notification system for new feedback ✅ COMPLETED

#### Tag & Curriculum Management
- [x] Create custom tag designer ✅ COMPLETED
- [x] Implement color coding system ✅ COMPLETED
- [x] Build tag suggestion engine ✅ COMPLETED (popular tags)
- [x] Add bulk tag assignment ✅ COMPLETED (tag picker)

### 📅 Phase 5: Community Features (Week 12-13)
**Status**: ✅ COMPLETED (100%)

#### Reddit-Style Forum
- [x] Implement post creation (questions/discussions) ✅ COMPLETED
- [x] Add markdown support with syntax highlighting ✅ COMPLETED (backend ready)
- [x] Create voting system ✅ COMPLETED
- [x] Build comment threading ✅ COMPLETED
- [x] Integrate media embedding ✅ COMPLETED (with direct upload support)

#### Search & Discovery
- [x] Implement basic forum search ✅ COMPLETED (SQL ILIKE search)
- [ ] Set up OpenSearch/Elasticsearch (optional for advanced search)
- [x] Create tag-based filtering ✅ COMPLETED (already implemented)
- [x] Implement fuzzy technique search (for practice sessions) ✅ COMPLETED
- [x] Add user reputation system ✅ COMPLETED
- [x] Create leaderboard screen ✅ COMPLETED
- [x] Create practice challenges feature ✅ COMPLETED

### ✅ Phase 6: Scheduling & Notifications (Week 14-15)
**Status**: ✅ COMPLETED (100%)

#### Scheduling System
- [x] Create schedule models and database migration ✅ COMPLETED
- [x] Implement scheduling service backend ✅ COMPLETED
- [x] Create scheduling API endpoints ✅ COMPLETED
- [x] Implement recurring event support ✅ COMPLETED
- [x] Build conflict detection ✅ COMPLETED
- [x] Create frontend schedule service ✅ COMPLETED
- [x] Build calendar UI components ✅ COMPLETED
- [x] Create ScheduleScreen with calendar/list views ✅ COMPLETED
- [x] Build EventCard component ✅ COMPLETED
- [x] Create EventDetailsScreen ✅ COMPLETED
- [x] Add upcoming lessons to student HomeScreen ✅ COMPLETED
- [x] Build CreateEventScreen ✅ COMPLETED
- [x] Implement recurrence rule UI ✅ COMPLETED
- [x] Add conflict resolution interface ✅ COMPLETED
- [x] Add WebCal feed generation ✅ COMPLETED

#### Push Notifications
- [x] Configure expo-notifications ✅ COMPLETED
- [x] Implement notification service ✅ COMPLETED
- [x] Create notification preferences UI ✅ COMPLETED
- [x] Add in-app notification center ✅ COMPLETED
- [x] Create backend API for notification preferences ✅ COMPLETED

### 📅 Phase 7: Polish & Optimization (Week 16-18)
**Status**: 🚀 READY TO START

#### Performance & UX
- [ ] Implement dark mode
- [ ] Optimize bundle size
- [ ] Add loading states and skeletons
- [ ] Improve offline experience
- [ ] Create onboarding flow

#### Security & Compliance
- [ ] Implement certificate pinning
- [ ] Add field-level encryption for PII
- [ ] Create GDPR compliance tools
- [ ] Implement content moderation

#### Store Deployment
- [ ] Prepare App Store assets
- [ ] Configure app signing
- [ ] Set up CI/CD pipelines
- [ ] Implement crash reporting (Sentry)
- [ ] Create production monitoring

## 🛠️ Technical Stack

### Frontend
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Redux Toolkit + TanStack Query
- **Navigation**: React Navigation
- **Charts**: Victory Native
- **Video**: expo-camera, expo-av, react-native-video-processing
- **Storage**: expo-sqlite, expo-secure-store

### Backend
- **API**: Django REST Framework / FastAPI
- **Database**: PostgreSQL + TimescaleDB
- **Cache**: Redis
- **Queue**: Celery
- **Storage**: S3 + CloudFront
- **Search**: OpenSearch
- **Auth**: JWT with refresh tokens

### DevOps
- **CI/CD**: GitHub Actions
- **Containers**: Docker + Kubernetes (EKS/GKE)
- **Monitoring**: Prometheus + Grafana
- **Errors**: Sentry
- **Logs**: CloudWatch/Loki

## 📊 Progress Tracking

### Current Sprint Focus
- Phase 1 Foundation COMPLETE ✅ (100%)
- Phase 2 Core Student Features COMPLETE ✅ (100%)
- Phase 3 Analytics & Media Processing COMPLETE ✅ (100%)
- Phase 4 Teacher Tools COMPLETE ✅ (100%)
- Phase 5 Community Features COMPLETE ✅ (100%)
- Phase 6 Scheduling & Notifications COMPLETE ✅ (100%)
- Recently Completed:
  ✅ Created NotificationPreferences model and migration
  ✅ Built NotificationPreferencesService for preference management
  ✅ Created API endpoints for notification preferences (GET/PUT/POST)
  ✅ Added frontend notification-preferences.service.ts
  ✅ Integrated API with NotificationSettingsScreen
  ✅ Added loading states and error handling for preferences
  ✅ NotificationsScreen already exists with full functionality
  ✅ Notification badge already integrated in HomeScreen
  ✅ Push notification setup complete with expo-notifications
  ✅ Created ICalService for WebCal feed generation
  ✅ Added calendar export endpoint with iCal format support
  ✅ Phase 6 is now 100% complete!
  ✅ **Practice Segment Tracking System (Phase 7 Enhancement) - COMPLETED**:
    - Created PracticeSegment and SegmentClick models
    - Extended Tag model with piece tracking fields (tag_type, composer, etc.)
    - Created comprehensive database migration with triggers and analytics view
    - Built PracticeSegmentService with full CRUD operations
    - Created 8 new API endpoints for segment management
    - Updated API_PATHS_AND_VARIABLES.md with all new endpoints
    - **Frontend Implementation (COMPLETED)**:
      - ✅ Updated Tag interface with new fields (maintaining snake_case)
      - ✅ Created PracticeSegment, SegmentClick, PieceProgress types
      - ✅ Created practice-segment.service.ts with all API integrations
  ✅ **Practice Focus Animations (Phase 7 Enhancement) - COMPLETED**:
    - Installed lottie-react-native for celebration animations
    - Created AnimatedPracticeFocusCard with micro-animations:
      - Scale bounce effect on click
      - Ripple effect expanding from center
      - Number flip animation for click counts
      - Milestone celebrations at 10, 20, 50, 100 clicks
    - Used react-native-reanimated v3 for 60fps performance
    - Integrated gesture handlers for tap and long-press
    - Updated NewSessionScreen to use animated components
  ✅ **Session Summary Modal (Phase 7 Enhancement) - COMPLETED**:
    - Created SessionSummaryModal component showing session statistics
    - Displays session duration with start/end times
    - Shows practice focus activity with click counts
    - Integrated into endSession flow for better UX
    - Allows users to continue editing or confirm session end
    - Slide-up modal design with success messaging
  🚧 **Slow Practice Enforcer System (Phase 7 Enhancement) - IN PROGRESS (~60%)**:
    - ✅ Created tempo tracking backend infrastructure:
      - Database tables: tempo_tracking, tempo_achievements
      - TempoService with points calculation and achievement tracking
      - Full API endpoints for tempo tracking and statistics
      - Achievement types: first_slow_practice, patience_padawan, zen_master, etc.
    - ✅ Updated API_PATHS_AND_VARIABLES.md with all tempo endpoints
    - ✅ Created frontend services and components:
      - tempo.service.ts - API integration for tempo tracking
      - metronome.service.ts - Beat generation with drift correction
      - AngryMetronome.tsx - Emotional metronome (😊😐😠😡)
      - MeditationMode.tsx - Zen mode for <60 BPM
    - ✅ Fixed database migration for tempo columns
    - ⏳ Frontend integration pending:
      - Add BPM selector to NewSessionScreen
      - Integrate metronome during practice
      - Create achievement UI components
      - Add sound and haptic feedback
      - ✅ Updated tag.service.ts with piece-specific methods
      - ✅ Created PieceSelectionScreen component with progress visualization
      - ✅ Created SegmentTrackingScreen component with click tracking
      - ✅ Updated navigation types for new screens
      - ✅ Added both screens to StudentNavigator
      - ✅ Added "Track Musical Pieces" button to HomeScreen
      - ⏳ Micro-interaction animations (pending - lower priority)
- Next priorities:
  1. 🚧 **Practice Focus System Redesign** - IN PROGRESS
     - Complete overhaul based on new understanding
     - Practice focuses are custom student-created text, not predefined options
     - Currently updating backend to make focus field optional
     - Will integrate focuses directly into active session view
  2. Add micro-interaction animations with react-native-reanimated
  3. Continue Phase 7 Polish & Optimization tasks:
     - Implement dark mode
     - Optimize bundle size
     - Add loading states and skeletons
     - Improve offline experience

### Completed Items
- ✅ Project plan created
- ✅ Technical specifications reviewed
- ✅ React Native Expo project initialized with TypeScript
- ✅ Project folder structure created with clean architecture
- ✅ Redux Toolkit and TanStack Query configured
- ✅ Basic store slices created (auth, practice, user)
- ✅ JWT authentication service implemented with secure token storage
- ✅ Login and Register screens created with form validation
- ✅ Common UI components created (Button, Input)
- ✅ Role-based navigation implemented (Auth, Student, Teacher flows)
- ✅ Student Home and Teacher Dashboard screens created
- ✅ Tab navigation configured for both roles
- ✅ Profile screen with logout functionality
- ✅ Offline storage implemented with expo-sqlite
- ✅ Database service for local practice session storage
- ✅ Offline sync hook with network state detection
- ✅ New practice session screen with full offline support
- ✅ Auto-sync functionality when network becomes available

**Backend Infrastructure:**
- ✅ FastAPI backend with domain-driven architecture
- ✅ PostgreSQL + TimescaleDB configuration in Docker
- ✅ User models (User, Teacher, Student) with relationships
- ✅ Practice session models (Session, Tag, Video, Metric, Feedback)
- ✅ JWT authentication with access/refresh tokens
- ✅ Pydantic schemas for request/response validation
- ✅ User service with authentication methods
- ✅ Auth API endpoints (register, login, refresh, me)
- ✅ Docker Compose setup with all services
- ✅ Redis integration for caching and Celery
- ✅ MinIO for local S3-compatible storage
- ✅ Development and production Dockerfiles
- ✅ Makefile for common development tasks

**Phase 2 Progress:**
- ✅ Mobile app connected to backend API
- ✅ Axios client with automatic token refresh
- ✅ API error handling and network state detection
- ✅ Practice service for session CRUD operations
- ✅ Updated types to match backend response structure
- ✅ Fixed auth flow to use correct token fields
- ✅ Practice session API endpoints implemented
- ✅ Session service with full CRUD operations
- ✅ Practice statistics endpoint
- ✅ Teacher access control for student sessions
- ✅ Tag management system
- ✅ Streak calculation algorithm

**Video Recording & Upload Implementation:**
- ✅ Video recording service with permissions handling
- ✅ VideoRecorder component with camera controls
- ✅ VideoPlayer component with playback features
- ✅ Video storage in local file system
- ✅ Video metadata management
- ✅ Integration with practice session flow
- ✅ Preview and re-record functionality
- ✅ Duration limits enforcement (30s-5min)
- ✅ File size and storage management utilities
- ✅ TUS protocol backend implementation
- ✅ Video upload endpoints with resumable support
- ✅ Mobile video upload service with TUS client
- ✅ Upload progress tracking UI components
- ✅ Background upload queue management
- ✅ Network-aware upload handling
- ✅ Retry logic with exponential backoff
- ✅ Upload management screen
- ✅ Integration with video recording flow

**Video Processing Pipeline:**
- ✅ Celery configuration with Redis broker
- ✅ FFmpeg integration for video transcoding
- ✅ Multiple quality levels (360p, 720p, 1080p)
- ✅ H.264/AAC codec standardization
- ✅ Thumbnail generation (5 timestamps)
- ✅ Audio extraction to MP3 (192kbps)
- ✅ Processing progress tracking
- ✅ Error handling with retries
- ✅ MinIO/S3 storage integration
- ✅ Presigned URL generation
- ✅ Flower monitoring UI (port 5555)
- ✅ Batch processing support
- ✅ Scheduled cleanup tasks
- ✅ Database status updates
- ✅ User notifications on completion

**Mobile App Debugging & Fixes:**
- ✅ Fixed WSL2 networking issues for phone testing
- ✅ Resolved StyleSheet import errors
- ✅ Fixed database initialization errors
- ✅ Corrected type mismatches (studentId → student_id)
- ✅ Updated all services to use new PracticeSession types
- ✅ Created DatabaseInitializer component
- ✅ Fixed offline sync functionality
- ✅ Fixed Redux selector warnings with memoization
- ✅ Updated expo-camera to v16 API
- ✅ Added ErrorBoundary for better error handling
- ✅ Created safe navigation hooks
- ✅ Fixed all import and type consistency issues
- ✅ Fixed camera and microphone permissions
- ✅ Resolved CameraView children warning
- ✅ Fixed invalid icon names

### Blockers
- None currently

### Next Steps
1. Complete Expo project initialization
2. Set up folder structure following clean architecture
3. Begin backend project setup in parallel

## 🔗 Key Resources
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Best Practices](https://reactnative.dev/docs/performance)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- **[NEXT_STEPS.md](./NEXT_STEPS.md)** - Detailed guide for continuing development

## 📝 Notes
- Following mobile-first approach as specified
- Core functionality before visual polish
- Offline-first architecture is critical
- Maintain <150ms API response times
- Design for 50k MAU scalability from start

## 📁 Current Project Structure
```
music-tracker/
├── PROJECT_PLAN.md
├── Makefile
├── docker-compose.yml
├── docker-compose.dev.yml
├── NEXT_STEPS.md
├── TESTING_GUIDE.md
├── INTEGRATION_STATUS.md
├── must-read/
│   ├── Below is a phone-first, end-to-end.md
│   └── ✅ 調整後的開發流程方向：.md
├── mobile-app/
    ├── App.tsx
    ├── src/
    │   ├── components/
    │   │   ├── auth/
    │   │   ├── common/
    │   │   │   ├── Button.tsx
    │   │   │   └── Input.tsx
    │   │   ├── practice/
    │   │   └── analytics/
    │   ├── screens/
    │   │   ├── auth/
    │   │   │   ├── LoginScreen.tsx
    │   │   │   └── RegisterScreen.tsx
    │   │   ├── student/
    │   │   │   ├── HomeScreen.tsx
    │   │   │   └── NewSessionScreen.tsx
    │   │   ├── teacher/
    │   │   │   └── DashboardScreen.tsx
    │   │   └── common/
    │   │       └── ProfileScreen.tsx
    │   ├── navigation/
    │   │   ├── types.ts
    │   │   ├── RootNavigator.tsx
    │   │   ├── AuthNavigator.tsx
    │   │   ├── StudentNavigator.tsx
    │   │   └── TeacherNavigator.tsx
    │   ├── services/
    │   │   ├── api/
    │   │   │   └── client.ts
    │   │   ├── auth.service.ts
    │   │   ├── database.service.ts
    │   │   ├── practice.service.ts
    │   │   └── queryClient.ts
    │   ├── store/
    │   │   ├── index.ts
    │   │   └── slices/
    │   │       ├── authSlice.ts
    │   │       ├── practiceSlice.ts
    │   │       └── userSlice.ts
    │   ├── components/
    │   │   ├── common/
    │   │   │   ├── Button.tsx
    │   │   │   └── Input.tsx
    │   │   └── OfflineSyncProvider.tsx
    │   ├── hooks/
    │   │   ├── redux.ts
    │   │   ├── navigation.ts
    │   │   └── useOfflineSync.ts
    │   ├── types/
    │   │   └── auth.ts
    │   └── constants/
    │       └── colors.ts
    ├── package.json
    ├── tsconfig.json
    ├── .env
    └── .env.example
└── backend/
    ├── app/
    │   ├── api/
    │   │   ├── deps.py
    │   │   └── v1/
    │   │       ├── api.py
    │   │       ├── auth.py
    │   │       └── sessions.py
    │   ├── core/
    │   │   ├── config.py
    │   │   └── security.py
    │   ├── db/
    │   │   ├── base_class.py
    │   │   └── session.py
    │   ├── models/
    │   │   ├── user.py
    │   │   └── practice.py
    │   ├── schemas/
    │   │   ├── auth.py
    │   │   ├── user.py
    │   │   └── practice.py
    │   ├── services/
    │   │   ├── auth/
    │   │   │   └── user_service.py
    │   │   └── practice/
    │   │       └── session_service.py
    │   └── main.py
    ├── Dockerfile
    ├── Dockerfile.dev
    ├── requirements.txt
    ├── requirements-dev.txt
    ├── test_api.py
    ├── .env.example
    └── README.md
```

### Documentation Created
- ✅ API_PATHS_AND_VARIABLES.md - Single source of truth for all paths/variables
- ✅ CLAUDE.md - AI assistant knowledge base
- ✅ QUICK_REFERENCE.md - One-page cheat sheet
- ✅ VIDEO_PROCESSING_FLOW.md - Complete processing documentation
- ✅ DOCUMENTATION_INDEX.md - Navigation guide
- ✅ Multiple troubleshooting guides for specific issues

**Analytics Endpoints Created:**
- ✅ GET /sessions/{session_id}/analytics - Get analysis results
- ✅ GET /sessions/{session_id}/metrics - Get time-series metrics
- ✅ GET /analytics/summary - Get user analytics summary
- ✅ GET /analytics/trends - Get metric trend analysis

**Mobile Analytics Dashboard Created:**
- ✅ Victory Native charts integrated
- ✅ LineChart, ScoreCard, TrendIndicator components
- ✅ Analytics service with all endpoints
- ✅ Complete dashboard screen with period selection
- ✅ Trend analysis visualization

**Practice History Timeline Created:**
- ✅ PracticeCalendar component with month navigation
- ✅ SessionListItem component for session details
- ✅ PracticeHistoryScreen replacing Practice tab
- ✅ Service methods for date range queries
- ✅ Types for history data structures

---
Last Updated: 2025-06-28 (Phase 4 IN PROGRESS - 90%)