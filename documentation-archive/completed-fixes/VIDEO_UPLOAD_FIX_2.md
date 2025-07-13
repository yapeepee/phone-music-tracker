# 🎥 Video Upload Fix - File Not Found Error

## 🐛 Issue
"File does not exist" error when trying to upload video

## 🔍 Root Cause
The video file was being moved from temporary location to app storage, but the upload was trying to use the old temporary URI that no longer existed.

## ✅ Fix Applied

### VideoRecorder.tsx (Line 142)
```javascript
// Before:
const uploadId = await uploadFromPath(recordedVideo, sessionId);

// After:
const uploadId = await uploadFromPath(metadata.uri, metadata.fileName || `session_${sessionId}.mp4`);
```

### video-upload.service.ts (Line 323)
```javascript
// Before:
process.env.EXPO_PUBLIC_API_URL + '/api/videos/upload'

// After:
process.env.EXPO_PUBLIC_API_URL + '/api/v1/videos/upload'
```

## 🧪 Test Again

1. **Reload the app** - Pull down to refresh or restart Expo
2. **Record a new video**
3. **The upload should work now!**

## 🔄 What Happens Now

1. Camera records to temporary location
2. Video is saved/moved to app storage  
3. Upload uses the new saved location (not temp)
4. TUS protocol handles resumable upload

## 📝 Debug Tips

If still having issues:
```bash
# Check backend logs
docker-compose logs -f backend

# Verify TUS endpoint
curl -X OPTIONS http://192.168.8.196:8000/api/v1/videos/upload
```

The video upload should work correctly now!