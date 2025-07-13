# Video Session Link Fix

## Problem
Videos uploaded while online were still using timestamp IDs instead of UUID session IDs, preventing proper linkage to backend sessions.

## Root Cause
In `video-upload.service.ts`, the regex pattern to extract session ID from filename was incorrect:
- Expected pattern: `session_{sessionId}`
- Actual pattern: `{sessionId}_practice_video_{timestamp}.mp4`

## Solution
Updated the regex pattern in `video-upload.service.ts` line 122-123:

```typescript
// OLD (incorrect)
options.fileName.match(/session_([a-f0-9-]+|\d+)/i)?.[1]

// NEW (correct)
options.fileName.match(/^([a-f0-9-]+|\d+)_practice_video/i)?.[1]
```

## Result
- Videos uploaded while online now correctly use UUID session IDs
- Session ID is properly extracted from the filename pattern created by `videoService.saveVideo()`
- Videos are correctly linked to backend sessions

## Data Flow
1. `VideoRecorder` receives `sessionId` from Redux `currentSession.id`
2. `videoService.saveVideo()` creates filename: `{sessionId}_practice_video_{timestamp}.mp4`
3. `useVideoUpload.uploadFromPath()` passes `sessionId` in metadata
4. `video-upload.service.ts` extracts session ID from metadata or filename
5. Upload endpoint receives correct session ID: `/videos/upload-multipart/{sessionId}`

## Testing
Test by:
1. Creating a new session while online (should get UUID)
2. Recording and uploading a video
3. Checking backend logs to confirm UUID is used in upload path
4. Verifying video is linked to the session in the database