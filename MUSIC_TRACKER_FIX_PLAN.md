# 🔧 Music Tracker Comprehensive Fix Plan

**Created**: 2025-01-06  
**Estimated Duration**: 6-8 weeks  
**Priority**: CRITICAL

## 📋 Table of Contents
1. [Overview](#overview)
2. [Phase 1: Remove Offline Mode (Week 1)](#phase-1-remove-offline-mode)
3. [Phase 2: Variable Name Standardization (Week 2)](#phase-2-variable-name-standardization)
4. [Phase 3: Architectural Cleanup (Weeks 3-4)](#phase-3-architectural-cleanup)
5. [Phase 4: Performance Optimization (Week 5)](#phase-4-performance-optimization)
6. [Phase 5: Security Hardening (Week 6)](#phase-5-security-hardening)
7. [Phase 6: Testing & Validation (Weeks 7-8)](#phase-6-testing-validation)

## Overview

### Critical Issues to Fix
1. **Offline mode causing performance issues and complexity**
2. **Variable naming inconsistencies (THE #1 ISSUE)**
3. **Musical pieces as tags (architectural mistake)**
4. **N+1 queries and performance bottlenecks**
5. **Security vulnerabilities**

### Success Criteria
- App works smoothly without offline mode
- Zero variable naming conflicts
- Clean, maintainable architecture
- <200ms API response times
- Passes security audit

---

## Phase 1: Remove Offline Mode (Week 1)

### Day 1-2: Remove SQLite Infrastructure

#### Files to DELETE:
```
mobile-app/src/services/database.service.ts
mobile-app/src/hooks/useOfflineSync.ts
mobile-app/src/components/OfflineSyncProvider.tsx
mobile-app/src/components/DatabaseInitializer.tsx
mobile-app/src/utils/clearOldData.ts
```

#### Update App.tsx:
```typescript
// REMOVE these lines:
import { DatabaseInitializer } from './src/components/DatabaseInitializer';
import { OfflineSyncProvider } from './src/components/OfflineSyncProvider';

// REMOVE wrapper components:
<DatabaseInitializer>
  <OfflineSyncProvider>
    {/* Keep only the inner content */}
  </OfflineSyncProvider>
</DatabaseInitializer>
```

### Day 3: Clean Redux Store

#### Update practiceSlice.ts:
```typescript
// REMOVE these imports:
import NetInfo from '@react-native-community/netinfo';
import { databaseService } from '../services/database.service';

// REMOVE from initialState:
pendingSync: boolean
syncError?: string
is_synced: boolean
sync_error?: string

// REMOVE these thunks:
- createSessionHybrid
- syncPendingSessions
- clearLocalData

// SIMPLIFY createSession to always use API:
export const createSession = createAsyncThunk(
  'practice/createSession',
  async (sessionData: CreateSessionData) => {
    const response = await practiceService.createSession(sessionData);
    return response;
  }
);
```

### Day 4: Simplify Upload Services

#### Update video-upload.service.ts:
```typescript
// REMOVE:
- NetInfo listener
- Offline queue management
- uploadFromQueue method
- offlineQueue array

// SIMPLIFY uploadVideo to always require connection:
async uploadVideo(sessionId: string, video: VideoMetadata): Promise<string> {
  // Direct upload only, no queueing
  return this.performUpload(sessionId, video);
}
```

### Day 5: Clean Type Definitions

#### Update practice.ts types:
```typescript
// REMOVE these fields from PracticeSession:
local_id?: string
pending_sync?: boolean
is_synced: boolean
sync_error?: string
```

#### Remove package dependencies:
```bash
npm uninstall expo-sqlite @react-native-community/netinfo
```

---

## Phase 2: Variable Name Standardization (Week 2)

### The Golden Rule
- **Frontend**: camelCase (JavaScript convention)
- **Backend**: snake_case (Python convention)
- **Conversion**: Always at the API boundary

### Day 1: Create Conversion Utilities

#### Create mobile-app/src/utils/apiTransformers.ts:
```typescript
// Convert backend snake_case to frontend camelCase
export const snakeToCamel = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = snakeToCamel(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};

// Convert frontend camelCase to backend snake_case
export const camelToSnake = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      result[snakeKey] = camelToSnake(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
};
```

### Day 2-3: Update All Services

#### Standard Service Pattern:
```typescript
class SomeService {
  async getSomething(id: string): Promise<Something> {
    const response = await api.get(`/endpoint/${id}`);
    return snakeToCamel(response.data); // Convert on receive
  }
  
  async createSomething(data: CreateSomethingInput): Promise<Something> {
    const response = await api.post('/endpoint', camelToSnake(data)); // Convert on send
    return snakeToCamel(response.data);
  }
}
```

### Day 4: Fix Known Issues

#### Critical Mappings to Fix:
```
Frontend → Backend
studentId → student_id
startTime → start_time
endTime → end_time
selfRating → self_rating
createdAt → created_at
updatedAt → updated_at
pieceTagId → piece_tag_id
sessionId → session_id
clickCount → click_count
isCompleted → is_completed
communicationPreference → preferred_communication (special case!)
```

### Day 5: Add Linting Rules

#### .eslintrc.js additions:
```javascript
rules: {
  'naming-convention': [
    'error',
    {
      selector: 'variable',
      format: ['camelCase', 'PascalCase', 'UPPER_CASE']
    },
    {
      selector: 'property',
      format: ['camelCase']
    }
  ]
}
```

---

## Phase 3: Architectural Cleanup (Weeks 3-4)

### Week 3: Separate Pieces from Tags

#### Day 1-2: Create Proper Pieces Table

##### Backend Migration:
```sql
-- Create pieces table
CREATE TABLE pieces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    composer VARCHAR(255),
    opus_number VARCHAR(100),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 10),
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migrate data from tags where tag_type = 'piece'
INSERT INTO pieces (id, title, composer, opus_number, difficulty_level, created_at, updated_at)
SELECT id, name, composer, opus_number, difficulty_level, created_at, updated_at
FROM tags WHERE tag_type = 'piece';

-- Update foreign keys
ALTER TABLE practice_segments RENAME COLUMN piece_tag_id TO piece_id;
ALTER TABLE practice_segments 
  DROP CONSTRAINT practice_segments_piece_tag_id_fkey,
  ADD CONSTRAINT practice_segments_piece_id_fkey 
  FOREIGN KEY (piece_id) REFERENCES pieces(id);
```

##### Backend Models:
```python
class Piece(Base):
    __tablename__ = "pieces"
    
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    composer: Mapped[Optional[str]] = mapped_column(String(255))
    opus_number: Mapped[Optional[str]] = mapped_column(String(100))
    difficulty_level: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Relationships
    segments: Mapped[List["PracticeSegment"]] = relationship(back_populates="piece")
    current_users: Mapped[List["User"]] = relationship(
        secondary="user_current_pieces",
        back_populates="current_pieces"
    )
```

#### Day 3-4: Update All References

##### Update Imports:
```typescript
// CHANGE:
import { Tag } from '../types/tag';  // When used for pieces

// TO:
import { Piece } from '../types/practice';
```

##### Update Components:
```typescript
// PieceSelector.tsx
interface PieceSelectorProps {
  selectedPiece: Piece | null;  // NOT Tag
  onSelectPiece: (piece: Piece) => void;  // NOT Tag
}
```

### Week 4: Clean Service Layer

#### Day 1-2: Implement Repository Pattern

##### Create Base Repository:
```python
class BaseRepository:
    def __init__(self, db: AsyncSession, model):
        self.db = db
        self.model = model
    
    async def get_by_id(self, id: UUID) -> Optional[Model]:
        result = await self.db.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Model]:
        result = await self.db.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return result.scalars().all()
```

#### Day 3-4: Standardize Error Handling

##### Create Custom Exceptions:
```python
class MusicTrackerException(Exception):
    """Base exception for all app exceptions"""
    pass

class NotFoundError(MusicTrackerException):
    """Resource not found"""
    pass

class ValidationError(MusicTrackerException):
    """Validation failed"""
    pass

class AuthorizationError(MusicTrackerException):
    """User not authorized"""
    pass
```

##### Standard Error Response:
```python
@app.exception_handler(MusicTrackerException)
async def handle_app_exception(request: Request, exc: MusicTrackerException):
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.__class__.__name__,
            "message": str(exc),
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

---

## Phase 4: Performance Optimization (Week 5)

### Day 1-2: Fix N+1 Queries

#### Add Eager Loading:
```python
# BAD - N+1 Query
posts = await db.execute(select(Post))
for post in posts:
    author = await db.execute(select(User).where(User.id == post.author_id))

# GOOD - Eager Loading
posts = await db.execute(
    select(Post)
    .options(selectinload(Post.author))
    .options(selectinload(Post.tags))
)
```

#### Common Patterns to Fix:
```python
# Forum posts with author
select(Post).options(selectinload(Post.author))

# Practice sessions with tags
select(PracticeSession).options(selectinload(PracticeSession.tags))

# Pieces with segments
select(Piece).options(selectinload(Piece.segments))
```

### Day 3: Add Database Indexes

```sql
-- Frequently queried fields
CREATE INDEX idx_sessions_student_id ON practice_sessions(student_id);
CREATE INDEX idx_sessions_created_at ON practice_sessions(created_at DESC);
CREATE INDEX idx_posts_author_id ON forum_posts(author_id);
CREATE INDEX idx_posts_status ON forum_posts(status);
CREATE INDEX idx_segments_piece_id ON practice_segments(piece_id);
CREATE INDEX idx_segments_student_id ON practice_segments(student_id);

-- Composite indexes for common queries
CREATE INDEX idx_sessions_student_date ON practice_sessions(student_id, created_at DESC);
CREATE INDEX idx_posts_status_created ON forum_posts(status, created_at DESC);
```

### Day 4: Implement Caching

#### Redis Caching Strategy:
```python
class CacheService:
    def __init__(self):
        self.redis = redis.from_url(settings.REDIS_URL)
    
    async def get_or_set(self, key: str, getter: Callable, ttl: int = 300):
        # Try cache first
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        
        # Get from source
        value = await getter()
        
        # Cache it
        await self.redis.setex(key, ttl, json.dumps(value))
        return value

# Usage
@router.get("/pieces/{piece_id}")
async def get_piece(piece_id: UUID, cache: CacheService = Depends()):
    return await cache.get_or_set(
        f"piece:{piece_id}",
        lambda: piece_service.get_by_id(piece_id),
        ttl=3600  # Cache for 1 hour
    )
```

### Day 5: Add Pagination Everywhere

```python
class PaginationParams:
    def __init__(self, skip: int = 0, limit: int = 20):
        self.skip = max(0, skip)
        self.limit = min(100, max(1, limit))  # Max 100 items

@router.get("/sessions")
async def get_sessions(
    pagination: PaginationParams = Depends(),
    db: AsyncSession = Depends(get_db)
):
    return await session_service.get_paginated(
        skip=pagination.skip,
        limit=pagination.limit
    )
```

---

## Phase 5: Security Hardening (Week 6)

### Day 1: Environment Variables

#### Create .env.example:
```env
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/musictracker
REDIS_URL=redis://localhost:6379

# S3/MinIO
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET_NAME=music-tracker
S3_ENDPOINT_URL=http://localhost:9000

# JWT
SECRET_KEY=generate-with-openssl-rand-hex-32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Frontend
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Day 2: Implement Proper Rate Limiting

#### Update deps.py:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Apply to routes
@router.post("/auth/login")
@limiter.limit("5/minute")
async def login(request: Request, ...):
    pass
```

### Day 3: Input Validation

#### Strict Pydantic Models:
```python
class PieceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    composer: Optional[str] = Field(None, max_length=255)
    difficulty_level: Optional[int] = Field(None, ge=1, le=10)
    
    @validator('title')
    def validate_title(cls, v):
        if not v.strip():
            raise ValueError('Title cannot be empty')
        return v.strip()
```

### Day 4: SQL Injection Prevention

#### Always Use ORM:
```python
# NEVER DO THIS
query = f"SELECT * FROM users WHERE email = '{email}'"

# ALWAYS DO THIS
result = await db.execute(
    select(User).where(User.email == email)
)
```

### Day 5: API Versioning

#### Implement Version 2:
```python
# main.py
app.include_router(api_v1_router, prefix="/api/v1")
app.include_router(api_v2_router, prefix="/api/v2")  # New cleaned API

# Mark v1 as deprecated
@router.get("/", deprecated=True)
async def old_endpoint():
    pass
```

---

## Phase 6: Testing & Validation (Weeks 7-8)

### Week 7: Integration Tests

#### Create Test Suite:
```python
# tests/test_api_consistency.py
def test_variable_naming():
    """Ensure all API responses use snake_case"""
    response = client.get("/api/v2/sessions")
    data = response.json()
    
    for key in data.keys():
        assert "_" in key or key.islower(), f"Key {key} not in snake_case"

def test_no_n_plus_one():
    """Ensure no N+1 queries"""
    with assert_num_queries(1):
        response = client.get("/api/v2/posts?include=author,tags")
        assert response.status_code == 200
```

### Week 8: Load Testing

#### Performance Benchmarks:
```yaml
# locust/locustfile.py
class MusicTrackerUser(HttpUser):
    wait_time = between(1, 3)
    
    @task
    def view_sessions(self):
        self.client.get("/api/v2/sessions")
    
    @task
    def create_session(self):
        self.client.post("/api/v2/sessions", json={
            "pieceId": "test-piece-id",
            "startTime": datetime.now().isoformat()
        })
```

---

## 🚨 Critical Checkpoints

### Before Each Phase:
1. Create a git branch: `fix/phase-X-description`
2. Run all tests: `npm test && pytest`
3. Backup database: `pg_dump musictracker > backup.sql`

### After Each Phase:
1. Run integration tests
2. Check performance metrics
3. Review with `git diff --stat`
4. Merge only if all tests pass

### Daily Checklist:
- [ ] Check API_PATHS_AND_VARIABLES.md before creating endpoints
- [ ] Use variable name converters for ALL API calls
- [ ] Run linter before committing
- [ ] Test on both iOS and Android

---

## 📊 Success Metrics

### Week 1 (Offline Removal):
- [ ] Zero SQLite references in codebase
- [ ] All sessions create directly via API
- [ ] No sync-related UI elements

### Week 2 (Variable Names):
- [ ] Zero variable name errors in console
- [ ] All services use transformer utilities
- [ ] Linting passes with no warnings

### Week 3-4 (Architecture):
- [ ] Pieces have dedicated table
- [ ] All services follow repository pattern
- [ ] Consistent error handling

### Week 5 (Performance):
- [ ] All API endpoints < 200ms
- [ ] Zero N+1 queries
- [ ] Redis cache hit rate > 80%

### Week 6 (Security):
- [ ] No hardcoded credentials
- [ ] Rate limiting active on all endpoints
- [ ] Security scan passes

### Week 7-8 (Testing):
- [ ] 80% test coverage
- [ ] Load test: 100 concurrent users
- [ ] Zero critical bugs

---

## 🎯 Final Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React Native   │────▶│   FastAPI v2    │────▶│   PostgreSQL    │
│   (camelCase)   │◀────│  (snake_case)   │◀────│  (snake_case)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                         │
         │                       ▼                         │
         │               ┌─────────────────┐              │
         │               │     Redis       │              │
         │               │    (cache)      │              │
         │               └─────────────────┘              │
         │                                                 │
         └─────────────────────────────────────────────────┘
                    Variable name transformation
                         at API boundary

```

## 🔥 Remember

1. **Variable consistency is EVERYTHING**
2. **Check existing code before creating new**
3. **Performance > Features**
4. **Security is not optional**
5. **Test everything twice**

---

*"Code like the next developer is a violent psychopath who knows where you live."*