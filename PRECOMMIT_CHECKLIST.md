# 📋 Pre-Commit Checklist

**STOP! Before committing any code, verify:**

## 1. Variable Naming ✓

- [ ] Frontend uses **camelCase** ONLY
  ```typescript
  // ✅ CORRECT
  interface User {
    userId: string;
    createdAt: string;
    selfRating: number;
  }
  ```

- [ ] Backend uses **snake_case** ONLY
  ```python
  # ✅ CORRECT
  class User(BaseModel):
      user_id: UUID
      created_at: datetime
      self_rating: int
  ```

- [ ] Services use BaseService with automatic transformation
  ```typescript
  // ✅ CORRECT
  class MyService extends BaseService {
    async getData() {
      return this.get<Data>('/endpoint'); // Auto transforms!
    }
  }
  ```

## 2. API Endpoints ✓

- [ ] NO GET endpoints with request body
  ```typescript
  // ❌ WRONG
  await api.get('/sessions', { data: { userId } });
  
  // ✅ CORRECT
  await api.get('/sessions', { params: { userId } });
  ```

- [ ] Check endpoint doesn't already exist
  ```bash
  grep -r "your/new/endpoint" backend/app/api/
  ```

## 3. Database Changes ✓

- [ ] Created migration file for schema changes
- [ ] Migration tested on local database
- [ ] Foreign keys properly defined
- [ ] Indexes added for frequently queried fields

## 4. Type Safety ✓

- [ ] TypeScript interfaces match API responses
- [ ] No `any` types without explicit reason
- [ ] Enums match between frontend and backend

## 5. Error Handling ✓

- [ ] All API calls wrapped in try-catch
- [ ] User-friendly error messages
- [ ] No sensitive data in error responses

## 6. Performance ✓

- [ ] No N+1 queries (use eager loading)
- [ ] Pagination for list endpoints
- [ ] Large data sets have loading states

## 7. Testing ✓

- [ ] Run linter: `npm run lint`
- [ ] Run tests: `npm test`
- [ ] Manual test on iOS/Android
- [ ] Check browser console for errors

## 8. Documentation ✓

- [ ] Update API_PATHS_AND_VARIABLES.md if adding endpoints
- [ ] Add JSDoc comments for complex functions
- [ ] Update CURRENT_WORK.md with progress

## Quick Commands

```bash
# Check for variable naming issues
grep -r "snake_case_in_frontend" mobile-app/src/
grep -r "camelCaseInBackend" backend/app/

# Find duplicate endpoints
grep -r "router\.(get|post|put|delete)" backend/app/api/

# Check for console errors
npm run lint

# Run tests
npm test
```

## Red Flags 🚩

If you see any of these, STOP and fix:

1. **Mixed naming in same file**
   ```typescript
   // 🚩 BAD
   const user_id = getUserId();  // snake_case in JS
   const createdAt = created_at;  // Mixed!
   ```

2. **Manual field mapping in services**
   ```typescript
   // 🚩 BAD - Use BaseService instead!
   return {
     userId: response.data.user_id,
     createdAt: response.data.created_at
   };
   ```

3. **Hardcoded values**
   ```typescript
   // 🚩 BAD
   const API_URL = 'http://localhost:8000';
   ```

4. **GET with body**
   ```typescript
   // 🚩 BAD
   apiClient.get('/endpoint', { data: payload });
   ```

## Final Check

- [ ] Code follows patterns in CLAUDE_CRITICAL.md
- [ ] No new technical debt introduced
- [ ] Would you be happy debugging this at 3 AM?

**If all checked ✓, you may commit!**