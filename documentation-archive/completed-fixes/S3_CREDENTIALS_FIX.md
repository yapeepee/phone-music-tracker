# 🔥 S3/MinIO Credentials Error - Fixed!

## 🐛 Root Cause
The backend service was missing S3/MinIO credentials in docker-compose.yml, causing:
```
botocore.exceptions.NoCredentialsError: Unable to locate credentials
```

## ✅ Fix Applied
Added MinIO credentials to backend service environment:
```yaml
- S3_ENDPOINT_URL=http://minio:9000
- S3_ACCESS_KEY=minioadmin
- S3_SECRET_KEY=minioadmin
- S3_BUCKET_NAME=music-tracker
```

## 🎯 Result
- Backend can now connect to MinIO storage
- Video uploads will be stored successfully
- No more 500 errors when pressing "use video"

## 🧪 Test Now
1. Try uploading a video again
2. Should work without any 500 errors!

## 📝 Lesson Learned
Always ensure ALL services that need S3/MinIO access have the credentials in their environment variables, not just the Celery workers.