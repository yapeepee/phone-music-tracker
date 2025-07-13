# 🚨 Music Tracker Fix Plan - Quick Reference Card

**PRINT THIS AND KEEP IT VISIBLE WHILE CODING**

## 🔴 CRITICAL: Variable Name Mapping

### Always Convert at API Boundary:
```typescript
// Frontend → Backend (camelCase → snake_case)
const response = await api.post('/sessions', camelToSnake({
  studentId: userId,        // → student_id
  startTime: new Date(),    // → start_time
  pieceId: selectedPiece.id // → piece_id
}));

// Backend → Frontend (snake_case → camelCase)
const session = snakeToCamel(response.data);
// created_at → createdAt
// self_rating → selfRating
```

### ⚠️ Special Cases:
- `communicationPreference` → `preferred_communication` (NOT communication_preference!)
- `pieceTagId` → `piece_id` (pieces are NOT tags anymore!)

## 🟡 Before Creating ANYTHING New

### 1. Check Existing Names:
```bash
# Check if endpoint exists
grep -r "your/endpoint" backend/app/api/

# Check if variable name exists
grep -r "yourVariable" mobile-app/src/

# Check if service method exists
grep -r "yourMethod" mobile-app/src/services/
```

### 2. Check Documentation:
- `API_PATHS_AND_VARIABLES.md` - For ALL endpoints
- `CLAUDE_CRITICAL.md` - For common mistakes
- `CLAUDE_LESSONS.md` - For specific patterns

## 🟢 Daily Development Checklist

### Before Starting:
- [ ] Pull latest changes
- [ ] Read CURRENT_WORK.md
- [ ] Check your variable converters are imported

### While Coding:
- [ ] Use camelCase in frontend ONLY
- [ ] Use snake_case in backend ONLY
- [ ] Convert at service layer boundaries
- [ ] Check for existing implementations

### Before Committing:
- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm test`
- [ ] Check for console errors
- [ ] Verify variable names match

## 🔵 Common Pitfalls to Avoid

### 1. GET Endpoints with Body
```typescript
// ❌ WRONG
await api.get('/sessions', { data: { userId } });

// ✅ CORRECT
await api.get(`/sessions?user_id=${userId}`);
```

### 2. Forgetting Eager Loading
```python
# ❌ WRONG - N+1 Query
posts = await db.execute(select(Post))

# ✅ CORRECT - Eager Load
posts = await db.execute(
    select(Post).options(selectinload(Post.author))
)
```

### 3. Musical Pieces as Tags
```typescript
// ❌ WRONG
import { Tag } from '../types/tag';
const piece: Tag = ...

// ✅ CORRECT
import { Piece } from '../types/practice';
const piece: Piece = ...
```

### 4. Hardcoded Values
```typescript
// ❌ WRONG
const API_URL = 'http://localhost:8000';

// ✅ CORRECT
const API_URL = process.env.EXPO_PUBLIC_API_URL;
```

## 📱 Mobile-Specific Rules

1. **NO MORE OFFLINE MODE**
   - No SQLite
   - No sync logic
   - No NetInfo checks
   - Always require connection

2. **API Calls Pattern**:
```typescript
try {
  setLoading(true);
  const data = await someService.getData();
  setData(data);
} catch (error) {
  Alert.alert('Connection Error', 'Please check your internet connection');
} finally {
  setLoading(false);
}
```

## 🏃 Performance Quick Wins

1. **Add Pagination**:
```typescript
// Always include skip/limit
const sessions = await api.get('/sessions?skip=0&limit=20');
```

2. **Cache Pieces** (they rarely change):
```typescript
const pieces = await cacheService.getOrFetch('pieces', 
  () => pieceService.getAll(),
  3600 // 1 hour
);
```

3. **Batch Operations**:
```typescript
// Instead of multiple calls
await Promise.all(ids.map(id => api.get(`/item/${id}`)));

// Use batch endpoint
await api.post('/items/batch', { ids });
```

## 🔐 Security Checklist

- [ ] No credentials in code
- [ ] Use environment variables
- [ ] Validate all inputs
- [ ] Sanitize user content
- [ ] Check rate limits work

## 🆘 When You're Stuck

1. **Variable Name Error?**
   → Check `API_PATHS_AND_VARIABLES.md`
   → Add console.log to see actual names
   → Use transformer utilities

2. **Performance Issue?**
   → Check for N+1 queries
   → Add pagination
   → Use eager loading

3. **Can't Find Something?**
   → Use global search
   → Check imports
   → Read CLAUDE_LESSONS.md

---

**Remember: Variable consistency prevents 40% of bugs!**