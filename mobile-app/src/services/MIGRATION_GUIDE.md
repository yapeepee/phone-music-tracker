# Service Migration Guide - Variable Name Transformation

## Overview
All services need to be updated to use the new BaseService class which automatically handles variable name transformations between frontend (camelCase) and backend (snake_case).

## Step-by-Step Migration

### 1. Update Service Class to Extend BaseService

**Before:**
```typescript
import { apiClient, handleApiError } from './api/client';

class SomeService {
  async getItems() {
    const response = await apiClient.get('/items');
    // Manual conversion needed
    return response.data.map(item => ({
      id: item.id,
      itemName: item.item_name, // Manual mapping
      createdAt: item.created_at, // Manual mapping
    }));
  }
}
```

**After:**
```typescript
import { BaseService } from './base.service';

class SomeService extends BaseService {
  constructor() {
    super('/items'); // Set base path
  }

  async getItems() {
    // Automatic conversion!
    return this.get<Item[]>('');
  }
}
```

### 2. Update Interface Definitions

**Before:**
```typescript
export interface CreateSessionRequest {
  focus?: string;
  start_time: string;  // Backend field name
  self_rating?: number; // Backend field name
}
```

**After:**
```typescript
export interface CreateSessionData {
  focus?: string;
  startTime: string;    // Frontend field name
  selfRating?: number;  // Frontend field name
}
```

### 3. Remove Manual Conversions

**Before:**
```typescript
async createSession(data: CreateSessionData) {
  const requestData = {
    start_time: data.startTime,
    end_time: data.endTime,
    self_rating: data.selfRating,
    // ... manual mapping
  };
  
  const response = await apiClient.post('/sessions', requestData);
  
  return {
    id: response.data.id,
    startTime: response.data.start_time,
    endTime: response.data.end_time,
    // ... manual mapping back
  };
}
```

**After:**
```typescript
async createSession(data: CreateSessionData): Promise<PracticeSession> {
  // Automatic conversion both ways!
  return this.post<PracticeSession>('', data);
}
```

### 4. Services to Migrate (Priority Order)

1. **practice.service.ts** ✅ (example created as practice.service.refactored.ts)
2. **auth.service.ts** - Critical for login/register
3. **forum.service.ts** - Has complex nested data
4. **video.service.ts** - File uploads need special handling
5. **tag.service.ts** - Will become piece.service.ts
6. **schedule.service.ts** - Date handling important
7. **notification.service.ts**
8. **practice-segment.service.ts**
9. **teacher.service.ts**
10. **analytics.service.ts**

### 5. Special Cases

#### File Uploads
```typescript
async uploadVideo(sessionId: string, video: VideoMetadata) {
  const formData = new FormData();
  formData.append('video', video.file);
  formData.append('session_id', sessionId); // Still use snake_case for FormData
  
  return this.post<VideoUploadResponse>(`/upload/${sessionId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
}
```

#### Query Parameters with Arrays
```typescript
async getPostsByTags(tagIds: string[]) {
  // Arrays are handled correctly
  return this.get<Post[]>('', {
    params: { tagIds } // Will become tag_ids[]=value1&tag_ids[]=value2
  });
}
```

#### Special Field Mappings
```typescript
// Remember: communicationPreference -> preferred_communication (NOT communication_preference)
interface UserPreferences {
  communicationPreference: string; // Will map to preferred_communication
  maxPartners: number; // Will map to max_partners
}
```

### 6. Testing the Migration

After migrating each service:

1. **Check Console Logs** (in DEV mode):
   ```
   === API Transform (toSnake) ===
   Original: { "startTime": "2025-01-06T10:00:00Z" }
   Transformed: { "start_time": "2025-01-06T10:00:00Z" }
   ```

2. **Verify Network Tab**:
   - Request payload should be snake_case
   - Response should be transformed to camelCase in your code

3. **Run Tests**:
   ```bash
   npm test -- practice.service.test.ts
   ```

### 7. Common Mistakes to Avoid

❌ **Don't double-transform:**
```typescript
// WRONG - apiClient already transforms
const data = camelToSnake(requestData);
await apiClient.post('/endpoint', data);
```

❌ **Don't mix conventions in interfaces:**
```typescript
// WRONG
interface User {
  userId: string;      // camelCase
  created_at: string;  // snake_case - DON'T MIX!
}
```

✅ **Use consistent camelCase in frontend:**
```typescript
// CORRECT
interface User {
  userId: string;
  createdAt: string;
}
```

### 8. Gradual Migration Strategy

1. **Phase 1**: Migrate one service at a time
2. **Phase 2**: Update components using the service
3. **Phase 3**: Run integration tests
4. **Phase 4**: Remove old service file
5. **Phase 5**: Update imports across the app

### 9. Rollback Plan

If issues occur:
1. Keep old service files with `.old.ts` extension
2. Can quickly revert imports
3. API client transformers can be disabled by commenting out interceptors

### 10. Success Checklist

- [ ] Service extends BaseService
- [ ] Interfaces use camelCase only
- [ ] No manual field mapping in service
- [ ] Tests pass
- [ ] Console shows transformations in DEV
- [ ] No TypeScript errors
- [ ] Component using service still works