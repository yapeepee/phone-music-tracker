# 🚨 CLAUDE CRITICAL - Check These First!

**Last Updated**: 2025-07-01
**Purpose**: Quick reference for most critical patterns to avoid common errors

## ⚡ Variable Consistency Rule #1
**保持變數的一致性 (Keep variable consistency)** - The user's key insight!
- Frontend/backend variable names MUST match EXACTLY
- Service method names must match between components and services
- ALWAYS check `/API_PATHS_AND_VARIABLES.md` before making changes
- Common mismatches: student_id/studentId, created_at/createdAt
- Method name mismatches: getAvailability vs getUserAvailability

## 🔥 Top 10 Critical Patterns (90% of errors)

### 1. SQLAlchemy → Pydantic Conversion
```python
# ❌ WRONG - Returns SQLAlchemy model
return tags

# ✅ CORRECT - Convert to Pydantic
return [Tag.model_validate(tag) for tag in tags]
```

### 2. GET Endpoints Cannot Have Request Body
```python
# ❌ WRONG
async def get_events(request: CalendarRequest, ...)

# ✅ CORRECT  
async def get_events(start_date: date = Query(...), ...)
```

### 3. DateTime Query Parameters Need ISO Format
```javascript
// ❌ WRONG
`?start_date=2025-04-30`

// ✅ CORRECT
`?start_date=${date.toISOString()}`
```

### 4. Optional Fields in Schemas
```python
# ❌ WRONG - Forgetting optional
focus: PracticeFocus  # Will fail if null

# ✅ CORRECT
focus: Optional[PracticeFocus] = None
```

### 5. React Native Module Issues
- No crypto.getRandomValues → use react-native-get-random-values
- No Blob API → use Expo FileSystem
- expo-av deprecated → use expo-video
- Check Expo Go compatibility first!

### 6. Database Migration Required
When adding fields to models:
1. Create migration SQL file
2. Apply migration to database
3. Update local SQLite schema too!

### 7. Import Patterns
```python
# Backend deps
from app.api import deps  # NOT app.core.deps

# Frontend auth
const { user } = useAppSelector(state => state.auth)  # NOT useAuth hook
```

### 8. Timezone Awareness
```python
# ❌ WRONG
datetime.now()

# ✅ CORRECT
datetime.now(timezone.utc)
```

### 9. API Router Registration
New endpoint 404? Check `/backend/app/api/v1/api.py`:
```python
api_router.include_router(videos.router, prefix="/videos")
```

### 10. Forum Media S3 Keys
- Internal URL: http://minio:9000
- External URL: http://localhost:9000
- Must replace URLs for frontend access

### 11. Path Parameters vs Request Body
```python
# ❌ WRONG - Path param in body schema
class CurrentPieceAdd(BaseModel):
    piece_id: UUID  # Already in path!
    notes: Optional[str]

# ✅ CORRECT - Only body fields
class CurrentPieceAdd(BaseModel):
    notes: Optional[str]
    priority: int = 3
```

### 12. Musical Pieces = Tags with type='piece'
- Pieces ARE tags in the database (tag_type='piece')
- Creating a piece means creating a tag with special fields
- Import Tag from '../types/practice' NOT '../types/tag'
- Use /tags/pieces endpoint for piece-specific queries

### 13. FastAPI Route Order Matters!
```python
# ❌ WRONG - Dynamic route before specific route
@router.get("/{id}")  # Catches everything!
@router.get("/stats")  # Never reached!

# ✅ CORRECT - Specific routes first
@router.get("/stats")  # Specific path
@router.get("/{id}")   # Dynamic catch-all
```
- 422 errors can occur when "stats" is validated as UUID
- Always define specific paths before dynamic parameters

### 14. SQLAlchemy text() with asyncpg Type Casting
```python
# ❌ WRONG - Named parameters without type casting
query = text("WHERE (:param::uuid IS NULL OR field = :param)")

# ✅ CORRECT - Use CAST() for NULL comparisons
query = text("WHERE (CAST(:param AS UUID) IS NULL OR field = CAST(:param AS UUID))")
```
- asyncpg needs explicit type casting when parameters could be NULL
- Error: "could not determine data type of parameter $N"

### 15. Pydantic v2 Field Validators
```python
# ❌ WRONG - Pydantic v1 syntax
@field_validator('end_time')
def validate_time_range(cls, v, values):
    if 'start_time' in values and v <= values['start_time']:
        raise ValueError('end_time must be after start_time')
    return v

# ✅ CORRECT - Pydantic v2 syntax
@field_validator('end_time')
def validate_time_range(cls, v, info):
    if info.data.get('start_time') and v <= info.data.get('start_time'):
        raise ValueError('end_time must be after start_time')
    return v
```
- In Pydantic v2, `values` is now `info` (ValidationInfo object)
- Use `info.data.get()` instead of `values[]`
- Error: "argument of type 'ValidationInfo' is not iterable"

## 📍 Active Work Status

### Practice Focus System ✅
- Custom text reminders (NOT predefined)
- Phase 5 complete: Archive functionality done

### Forum Enhancement ✅
- Phase 2: ✅ Piece connections complete
- Phase 3: ✅ Backend for "Currently Working On" complete
- Phase 4: ✅ Frontend pre-populate context complete

### Practice Partner Matching (NEW) 🤝
- Database: 5 new tables for partner discovery
- API: `/practice-partners/*` endpoints
- Features: Timezone filtering, skill matching, availability scheduling
- Next: Frontend UI implementation

### Slow Practice Enforcer ✅
- ✅ Backend complete
- ✅ Metronome with audio (click.mp3/accent.mp3)
- ✅ Real-time points display
- ✅ Tempo detection from microphone (COMPLETE!)
- ✅ PatienceAchievements component with animations
- ✅ MeditationMode integrated (<60 BPM activation)
- Points calculation:
  - 1 point/minute under tempo
  - 2 points/minute when 20%+ under tempo
  - 3 points/minute in meditation mode (<60 BPM)

## 🆘 When Stuck

1. **Check API_PATHS_AND_VARIABLES.md** for endpoint details
2. **Search existing code** before creating new functions
3. **Read error messages carefully** - they usually tell exact issue
4. **Test with curl first** before debugging frontend
5. **Check Docker logs**: `docker-compose logs -f backend`

## 📂 Key Files Reference

- `/API_PATHS_AND_VARIABLES.md` - All endpoints and parameters
- `/CURRENT_WORK.md` - Active development tasks
- `/backend/app/models/` - Database models
- `/backend/app/schemas/` - Pydantic schemas
- `/mobile-app/src/services/` - Frontend API services

---
**Remember**: 變數一致性 (variable consistency) is everything!