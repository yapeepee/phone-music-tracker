# Video Playback Fix Summary

## Problem
Videos were visible in the session details but wouldn't play when clicked.

## Root Causes Found

### 1. Field Name Mismatch (Fixed First)
- **Issue**: Backend returned `presigned_url` but frontend expected `url`
- **Fix**: Changed `VideoWithPresignedUrl` schema to use `url` field

### 2. Internal Docker URL in Presigned URLs (Main Issue)
- **Issue**: Presigned URLs contained `http://minio:9000` which is only accessible within Docker network
- **Symptom**: Video URL was generated but not accessible from mobile app
- **Fix**: Added URL replacement logic to convert internal URLs to external URLs

## Solution Applied

1. **Updated VideoService** (`/backend/app/services/media/video_service.py`):
   - Added logic to replace `http://minio:9000` with external URL
   - Uses `S3_EXTERNAL_URL` environment variable

2. **Updated docker-compose.yml**:
   - Added `S3_EXTERNAL_URL=http://192.168.8.196:9000` to all services
   - Uses the same IP as the mobile app's API URL

3. **Added Debug Logging**:
   - Console logs in SessionDetailScreen to see actual URLs
   - Playback status logging in AnnotatedVideoPlayer

## Testing Steps

1. Restart backend: `docker-compose restart backend`
2. Open the app and navigate to a session with videos
3. Check console logs for the generated URL
4. Click on a video - it should now play correctly

## Important Notes

- The 10-second video duration is NOT an issue (min is >0, max is 300 seconds)
- MinIO is running on ports 9000-9001 and is healthy
- The IP address in S3_EXTERNAL_URL must match your network configuration
- If accessing from a different device/network, update the IP accordingly

## Lessons Learned

1. **Always consider network accessibility** when generating URLs for external clients
2. **Internal Docker hostnames** (like `minio`) are not accessible from outside
3. **Field name consistency** between backend and frontend is critical
4. **Debug with console logs** to see actual data being passed

---

*Fixed on 2025-06-27*