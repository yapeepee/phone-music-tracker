# 🔍 Video Upload 500 Error - Complete Root Cause Analysis

## 🐛 Multiple Root Causes Found (Ultrathinking Analysis)

### 1. **Wrong API Endpoint Path** ❌ CRITICAL
- **Frontend called**: `/api/v1/videos/upload-multipart/{session_id}`
- **Backend expects**: `/api/v1/video-processing/upload-multipart/{session_id}`
- **Fixed**: Changed `video-upload.service.ts` line 298

### 2. **MinIO Bucket Didn't Exist** ❌ CRITICAL
- StorageService constructor calls `_ensure_bucket_exists()`
- This was failing because bucket `music-tracker` didn't exist
- MinIO was running but had no buckets created
- **Fixed**: Created bucket with `mc mb myminio/music-tracker`

### 3. **Service Dependencies Not Met** ❌
- Backend depends on MinIO being healthy
- MinIO was started AFTER backend initially
- This caused initialization failures
- **Fixed**: Proper service startup order

## 📊 Complete Error Flow Analysis

```
1. User presses "Use Video" button
   ↓
2. VideoRecorder calls uploadFromPath()
   ↓
3. VideoUploadService creates upload task
   ↓
4. Constructs URL: /api/v1/videos/upload-multipart/{sessionId} ❌ WRONG PATH
   ↓
5. Backend receives request at wrong endpoint → 404 initially
   ↓
6. Even if path was correct, StorageService.__init__() would fail
   ↓
7. _ensure_bucket_exists() tries to check bucket
   ↓
8. MinIO bucket "music-tracker" doesn't exist → boto3 error
   ↓
9. Returns 500 Internal Server Error to frontend
```

## ✅ All Fixes Applied

### 1. Fixed API Endpoint Path
```typescript
// Before:
process.env.EXPO_PUBLIC_API_URL + '/videos/upload'

// After:
process.env.EXPO_PUBLIC_API_URL + '/video-processing/upload'
```

### 2. Created MinIO Bucket
```bash
docker exec musictracker-minio mc mb --ignore-existing myminio/music-tracker
```

### 3. Ensured Proper Service Order
```yaml
backend:
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
    minio:
      condition: service_healthy  # Added this
```

### 4. Added S3 Credentials to Backend
```yaml
backend:
  environment:
    - S3_ENDPOINT_URL=http://minio:9000
    - S3_ACCESS_KEY=minioadmin
    - S3_SECRET_KEY=minioadmin
    - S3_BUCKET_NAME=music-tracker
```

## 🧪 Verification Steps

1. **Check all services are running**:
```bash
docker-compose ps
# All should show (healthy) status
```

2. **Verify bucket exists**:
```bash
docker exec musictracker-minio mc ls myminio/
# Should show: music-tracker/
```

3. **Test backend S3 connection**:
```bash
docker exec musictracker-backend python -c "
import boto3
client = boto3.client('s3', 
    endpoint_url='http://minio:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin'
)
print(client.list_buckets())
"
```

4. **Monitor upload in real-time**:
```bash
# Terminal 1 - Backend logs
docker-compose logs -f backend

# Terminal 2 - MinIO logs  
docker-compose logs -f minio

# Terminal 3 - Check uploaded files
docker exec musictracker-minio mc ls -r myminio/music-tracker/
```

## 🎯 Why It Failed Repeatedly

The error kept happening because:
1. **URL mismatch** - Frontend was hitting non-existent endpoint
2. **Bucket didn't exist** - Even with correct URL, storage would fail
3. **Service initialization order** - Backend started before MinIO was ready
4. **Missing environment variables** - Initially backend had no S3 credentials

All four issues needed to be fixed for upload to work!

## 📝 Lessons Learned

1. **Always verify endpoint paths match** between frontend and backend
2. **Initialize storage buckets** as part of deployment
3. **Check service dependencies** are properly configured
4. **Test each component individually** before integration
5. **Read the FULL error stack** - boto3 errors were key

## 🚀 Next Steps

Your video upload should now work! The complete flow:
1. Video recorded → Saved locally
2. Upload initiated → Correct endpoint `/api/v1/video-processing/upload-multipart`
3. Backend receives file → Stores in MinIO bucket
4. Returns success → Frontend updates UI
5. Celery worker → Processes video asynchronously

## 🔧 Debugging Commands

If issues persist:
```bash
# Check MinIO Console
open http://localhost:9001
# Login: minioadmin/minioadmin

# Check Flower (Celery monitor)
open http://localhost:5555

# Watch all logs
docker-compose logs -f

# Test S3 connection manually
docker exec -it musictracker-backend python
>>> from app.services.storage import StorageService
>>> from app.core.config import settings
>>> storage = StorageService(
...     bucket_name="music-tracker",
...     endpoint_url="http://minio:9000",
...     access_key="minioadmin",
...     secret_key="minioadmin"
... )
>>> # Should not raise any errors
```