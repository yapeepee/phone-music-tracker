# Practice History Debugging

## Error
When pressing the Practice button, getting error:
`Failed to load practice history: Error: [object Object], [object Object]`

## Investigation

### Backend Logs
```
GET /api/v1/sessions?start_date=2025-04-30&end_date=2025-07-30 HTTP/1.1" 422 Unprocessable Entity
```

### Findings
1. Backend endpoint `/sessions` does support `start_date` and `end_date` parameters
2. Backend expects `datetime` type for these parameters
3. We're sending dates in ISO format but getting 422 validation error

### Current Test
- Temporarily using `getSessions()` without date parameters to test if basic API call works
- If this works, then issue is specifically with date parameter format
- If this fails, then there might be authentication or other issues

### Possible Issues
1. Date format mismatch - Backend expects different format than ISO string
2. Authentication issue - User might not be logged in
3. Parameter validation - Backend might have additional validation rules

### Resolution
1. ✅ Basic getSessions() call works without parameters
2. ✅ The issue was creating duplicate methods instead of using existing ones
3. ✅ Extended existing getSessions() to accept optional parameters
4. ✅ Backend already supported date filtering on the /sessions endpoint
5. ✅ Date format issue: Backend expects full ISO datetime, not YYYY-MM-DD

### Final Fix
- Changed from `toISOString().split('T')[0]` to just `toISOString()`
- Backend logs showed:
  - ❌ `2025-04-30` → 422 error
  - ✅ `2025-04-30T16:00:00.000Z` → 200 OK

### Lesson Learned
1. Always check existing functions before creating new ones
2. Check backend logs to see the exact format that works
3. FastAPI datetime parameters need full ISO format when passed as query strings