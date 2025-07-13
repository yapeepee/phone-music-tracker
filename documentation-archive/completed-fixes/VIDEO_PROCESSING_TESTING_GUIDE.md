# Video Processing Pipeline Testing Guide

## 🎬 Overview

This guide covers testing the complete video processing pipeline that includes:
- Video upload with TUS protocol
- Asynchronous processing with Celery
- FFmpeg transcoding to multiple qualities
- Thumbnail generation
- Audio extraction
- Status tracking and notifications

## 🚀 Prerequisites

1. **All services running:**
   ```bash
   cd /home/dialunds/music-tracker
   docker-compose ps
   ```
   
   Should show all services as "healthy":
   - backend
   - postgres
   - redis
   - minio
   - celery-worker
   - celery-beat
   - flower

2. **Flower monitoring available:**
   - Open http://localhost:5555 in browser
   - Shows Celery task monitoring interface

3. **MinIO console available:**
   - Open http://localhost:9001
   - Login: minioadmin / minioadmin

## 🧪 Test Scenarios

### 1. Basic Video Processing Flow

1. **Upload a video through the API:**
   ```bash
   # First, get auth token
   TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "student@example.com", "password": "password123"}' \
     | jq -r '.access_token')
   
   # Upload video (replace with actual video file)
   curl -X POST "http://localhost:8000/api/v1/videos/upload/session123" \
     -H "Authorization: Bearer $TOKEN" \
     -F "file=@test-video.mp4"
   ```

2. **Monitor processing in Flower:**
   - Go to http://localhost:5555
   - Click on "Tasks" tab
   - Watch "process_video" task progress
   - Should see subtasks for transcoding, thumbnails, audio

3. **Check processing status:**
   ```bash
   curl -X GET "http://localhost:8000/api/v1/videos/session123/status" \
     -H "Authorization: Bearer $TOKEN"
   ```
   
   Response should show:
   - processing_status: "processing" → "completed"
   - processing_progress: 0.0 → 1.0
   - processing_results: quality levels, thumbnails, audio URL

4. **Verify in MinIO:**
   - Go to http://localhost:9001
   - Navigate to `music-tracker` bucket
   - Check folders:
     - `videos/originals/` - Original uploads
     - `videos/processed/` - Transcoded versions
     - `videos/thumbnails/` - Generated thumbnails
     - `videos/audio/` - Extracted audio files

### 2. Multiple Quality Transcoding Test

1. **Upload a high-quality video (1080p+)**
2. **Wait for processing to complete**
3. **Download different qualities:**
   ```bash
   # Get download URLs
   curl -X POST "http://localhost:8000/api/v1/videos/session123/download" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"quality": "720p"}'
   ```
4. **Verify each quality:**
   - 360p: Low quality, small file
   - 720p: Medium quality
   - 1080p: High quality (if source supports)

### 3. Thumbnail Generation Test

1. **After video processing completes**
2. **Check thumbnail URLs in processing results**
3. **Verify 5 thumbnails generated:**
   - Should be evenly distributed through video
   - JPG format
   - Reasonable file sizes

### 4. Audio Extraction Test

1. **Check audio_url in processing results**
2. **Download extracted audio:**
   ```bash
   # Get audio URL from processing results
   AUDIO_URL=$(curl -X GET "http://localhost:8000/api/v1/videos/session123/status" \
     -H "Authorization: Bearer $TOKEN" | jq -r '.processing_results.audio_url')
   
   # Download audio file
   curl -o extracted_audio.mp3 "$AUDIO_URL"
   ```
3. **Verify audio:**
   - MP3 format
   - 192kbps bitrate
   - Same duration as video

### 5. Error Handling Test

1. **Upload corrupted video file:**
   ```bash
   # Create a fake video file
   echo "not a video" > fake.mp4
   
   # Try to upload
   curl -X POST "http://localhost:8000/api/v1/videos/upload/session456" \
     -H "Authorization: Bearer $TOKEN" \
     -F "file=@fake.mp4"
   ```

2. **Check processing status:**
   - Should show "failed" status
   - Error message in processing_results

3. **Verify in Flower:**
   - Task should show as failed
   - Error traceback available

### 6. Batch Processing Test

1. **Upload multiple videos quickly:**
   ```bash
   for i in {1..5}; do
     curl -X POST "http://localhost:8000/api/v1/videos/upload/session_$i" \
       -H "Authorization: Bearer $TOKEN" \
       -F "file=@test-video.mp4" &
   done
   ```

2. **Monitor in Flower:**
   - Should see multiple tasks queued
   - Processing happens in parallel (based on worker count)

3. **Check individual statuses:**
   ```bash
   for i in {1..5}; do
     echo "Session $i:"
     curl -X GET "http://localhost:8000/api/v1/videos/session_$i/status" \
       -H "Authorization: Bearer $TOKEN" | jq '.processing_status'
   done
   ```

## 🔍 What to Verify

### Processing Pipeline
- [ ] Video uploads successfully
- [ ] Processing starts automatically
- [ ] Progress updates in real-time
- [ ] All quality levels generated
- [ ] Thumbnails created at correct timestamps
- [ ] Audio extracted successfully
- [ ] Processing completes without errors

### Storage
- [ ] Original video stored in MinIO
- [ ] Processed versions in correct folders
- [ ] Thumbnails accessible via URLs
- [ ] Audio files playable
- [ ] Cleanup of temporary files

### Database
- [ ] Processing status updated
- [ ] Progress tracked accurately
- [ ] Results stored in JSON
- [ ] Timestamps recorded

### Performance
- [ ] Processing time reasonable (1-2x video duration)
- [ ] Multiple videos process concurrently
- [ ] Memory usage stable
- [ ] No resource leaks

## 📊 Monitoring Commands

### Check Celery Workers
```bash
docker-compose exec celery-worker celery -A app.core.celery_app inspect active
```

### View Worker Stats
```bash
docker-compose exec celery-worker celery -A app.core.celery_app inspect stats
```

### Check Redis Queue
```bash
docker-compose exec redis redis-cli LLEN celery
```

### View Backend Logs
```bash
docker-compose logs -f backend celery-worker
```

### Database Processing Stats
```bash
docker-compose exec postgres psql -U postgres -d musictracker -c \
  "SELECT processing_status, COUNT(*) FROM videos GROUP BY processing_status;"
```

## 🐛 Common Issues

### Processing Stuck
1. Check Celery worker logs: `docker-compose logs celery-worker`
2. Restart worker: `docker-compose restart celery-worker`
3. Check Redis connection

### FFmpeg Errors
- Verify video format is supported
- Check available codecs: `docker-compose exec celery-worker ffmpeg -codecs`
- Ensure sufficient disk space

### Slow Processing
- Check CPU usage: `docker stats`
- Increase worker count in docker-compose.yml
- Verify source video isn't unnecessarily large

### MinIO Access Issues
- Verify MinIO is running: `docker-compose ps minio`
- Check bucket permissions
- Ensure correct access keys in .env

## ✅ Success Criteria

The video processing pipeline is working correctly when:
1. Videos process automatically after upload
2. All quality levels are generated
3. Thumbnails display correctly
4. Audio extraction completes
5. Progress tracking is accurate
6. Errors are handled gracefully
7. Multiple videos process concurrently
8. Storage is organized correctly
9. Notifications are sent on completion

## 🎯 Performance Benchmarks

For a 5-minute 1080p video:
- Upload time: 10-30 seconds
- Processing start: < 5 seconds
- Total processing: 2-10 minutes
- Thumbnail generation: 10-20 seconds
- Audio extraction: 20-40 seconds
- Storage used: ~200MB (all versions)

---

Happy testing! 🎬🚀