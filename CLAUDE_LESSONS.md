# 📚 CLAUDE LESSONS - Categorized Patterns

**Last Updated**: 2025-01-15
**Purpose**: Categorized lessons from development experience

## 🗂️ Table of Contents
1. [SQLAlchemy & Database Patterns](#sqlalchemy--database-patterns)
2. [React Native Specific Issues](#react-native-specific-issues)
3. [API & Backend Patterns](#api--backend-patterns)
4. [Authentication & Navigation](#authentication--navigation)
5. [Frontend State Management](#frontend-state-management)

---

## SQLAlchemy & Database Patterns

### Reserved Words & Field Names
- **NEVER** use `metadata` as field name → use `extra_data`
- Reserved: `registry`, `mapper`, `table`, `query`
- Error: "Attribute name 'metadata' is reserved"

### Async Relationship Loading
```python
# ❌ WRONG - Lazy loading in async
event.participants  # MissingGreenlet error

# ✅ CORRECT - Eager loading
.options(selectinload(Post.media_files))
```

### Greenlet Error with New Objects (2025-01-07)
```python
# ❌ WRONG - Accessing relationship on new object
db_post = Post(...)
self.db.add(db_post)
await self.db.flush()
db_post.tags.append(tag)  # MissingGreenlet error!

# ✅ CORRECT - Use direct table operations
from sqlalchemy import insert
await self.db.execute(
    insert(post_tags).values([
        {"post_id": db_post.id, "tag_id": tag_id}
        for tag_id in tag_ids
    ])
)
```
- Commit parent object before manipulating relationships
- Direct inserts into association tables avoid lazy loading

### Loading Nested Relationships (2025-01-07)
```python
# ❌ WRONG - Missing nested relationship loading
.options(
    selectinload(Post.comments).options(
        selectinload(Comment.author)
    )
)
# Later: comment.children causes lazy loading error

# ✅ CORRECT - Load all nested levels
.options(
    selectinload(Post.comments).options(
        selectinload(Comment.author),
        selectinload(Comment.children).options(
            selectinload(Comment.author),
            selectinload(Comment.children)
        )
    )
)
```
- Always eagerly load all relationships that will be accessed
- Nested structures need recursive loading

### Model to Pydantic Conversion
```python
# Always convert before returning in API
return [Tag.model_validate(tag) for tag in tags]
```

### Enum Type Conflicts
- SQLAlchemy auto-creates enum types that persist
- Solution: Use String fields instead of Enum when conflicts arise
- Check existing types: `\dt *type*` in psql

### Database Triggers
- Don't duplicate trigger logic in frontend
- Example: total_click_count auto-incremented by trigger

---

## React Native Specific Issues

### Missing APIs
1. **crypto.getRandomValues**
   - Install: `react-native-get-random-values`
   - Import before other crypto-using libraries

2. **Blob API**
   - Use Expo FileSystem instead
   - Convert to base64 or use upload streams

3. **Date Libraries**
   - Use native JS Date methods
   - Avoid date-fns/moment unless already installed

### Expo Compatibility

#### Expo Go Limitations (SDK 53+)
- No push notifications
- No native modules requiring linking
- Check with `Constants.appOwnership === 'expo'`

#### Package Migrations
- `expo-av` → `expo-video`
- Different API: `Video` → `VideoView`
- Use `useVideoPlayer` hook

### FlatList Issues
```javascript
// numColumns cannot change - use key prop
<FlatList 
  key={`list-${numColumns}-columns`}
  numColumns={numColumns}
/>
```

### Module Resolution
- Check package.json exports field syntax
- Common issue: `"imports"` should be `"import"`
- Use patch-package for third-party fixes

---

## API & Backend Patterns

### GET Endpoints Rules
```python
# ❌ WRONG - No request body in GET
async def get_items(request: ItemRequest, ...)

# ✅ CORRECT - Use query parameters
async def get_items(
    skip: int = Query(0),
    limit: int = Query(100)
)
```

### DateTime Handling
```python
# Backend expects full ISO format in query strings
# ❌ "2025-04-30"
# ✅ "2025-04-30T00:00:00.000Z"
```

### Router Registration
```python
# Must register in api.py
from app.api.v1.endpoints import new_endpoint
api_router.include_router(
    new_endpoint.router,
    prefix="/new-endpoint",
    tags=["new-endpoint"]
)
```

### Import Paths
```python
# ✅ CORRECT
from app.api import deps

# ❌ WRONG
from app.core.deps import get_current_user
```

---

## Authentication & Navigation

### Redux Auth State
```typescript
// No useAuth hook - use Redux
import { useAppSelector } from '../hooks/redux';
const { user, isAuthenticated } = useAppSelector(state => state.auth);
```

### Safe Navigation
```typescript
// Navigation might be undefined during init
navigation?.navigate('Screen');
// Or use safeNavigate hook
```

### Type-Safe Navigation
```typescript
// Cross-stack navigation
navigation.navigate('Challenges' as never);
```

---

## Frontend State Management

### Circular Dependencies
- Use event emitters to break cycles
- Example: auth-events.ts pattern

### Promise Error Handling
```javascript
// Use allSettled for partial failures
Promise.allSettled([api1(), api2()])
  .then(results => {
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        // Handle success
      }
    });
  });
```

### Local Database Updates
- Remember to update SQLite schema
- Add migration logic for existing databases
- Handle both new installs and updates

---

## 🔍 Quick Debug Checklist

1. **404 Error**: Check api.py router registration
2. **500 Error**: Check field name consistency
3. **Serialization Error**: Convert SQLAlchemy → Pydantic
4. **Import Error**: Verify module compatibility with RN/Expo
5. **Navigation Error**: Check if inside NavigationContainer
6. **AttributeError**: Check service method names match exactly

## 🎵 Audio & Tempo Detection (Lessons 74-75)

### Lesson 74: Tempo Multiple Detection
**Problem**: Musicians play at different multiples of metronome (e.g., 60 BPM metronome, 120 BPM notes)
**Solution**: Implement ratio checking (0.25x, 0.5x, 1x, 2x, 4x) with 15% tolerance
```typescript
const ratios = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
for (const ratio of ratios) {
  const adjustedBPM = detectedBPM / ratio;
  if (Math.abs(adjustedBPM - targetBPM) < targetBPM * 0.15) {
    // Found matching ratio
  }
}
```

### Lesson 75: React Native Audio Recording
**Problem**: Can't use Web Audio API in React Native
**Solution**: Use expo-av Audio.Recording with proper configuration
```typescript
const recordingOptions = {
  android: { sampleRate: 44100, numberOfChannels: 1 },
  ios: { sampleRate: 44100, numberOfChannels: 1, linearPCMBitDepth: 16 }
};
```
**Note**: Real-time audio data access limited, use periodic analysis instead

---

## 📝 Maintenance Notes

- Lessons 1-53: Historical fixes (archived)
- Lessons 54-73: Current patterns still relevant
- Review monthly and archive resolved issues
- Add new patterns as CRITICAL if they appear 3+ times

---

## Audio Implementation Patterns

### Metronome Audio Generation
When implementing audio features like metronome:
1. Generate simple audio files programmatically:
   ```python
   # Use numpy to generate sine waves with envelope
   # Convert to WAV, then use ffmpeg for MP3
   # Script: /backend/scripts/generate_metronome_sounds.py
   ```
2. Store in `/mobile-app/src/assets/sounds/`
3. Load with expo-av:
   ```typescript
   const { sound } = await Audio.Sound.createAsync(
     require('../assets/sounds/click.mp3')
   );
   ```

### Audio Best Practices
- Always set audio mode for iOS silent mode
- Unload sounds in cleanup to prevent memory leaks
- Reset position before replaying sounds
- Handle initialization errors gracefully
- Use separate sounds for accent vs regular beats

---

## Service Method Naming Patterns

### SessionService Methods
When using SessionService, the correct method names are:
- `get_session_by_id(session_id)` - NOT get_session()
- `create_session(student_id, session_data)`
- `update_session(session_id, update_data)`
- `get_sessions(student_id, skip, limit)`

Always check the actual service implementation for exact method names!