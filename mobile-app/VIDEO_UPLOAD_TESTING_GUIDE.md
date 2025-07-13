# Video Recording & Upload Testing Guide

## 🎯 Testing Overview

This guide covers testing the complete video recording and upload flow that we've just implemented.

## 📋 Prerequisites

1. **Backend Services Running**
   ```bash
   cd /home/dialunds/music-tracker
   docker-compose up -d
   ```

2. **Mobile App Running**
   ```bash
   cd /home/dialunds/music-tracker/mobile-app
   npm start
   ```

3. **Phone Connected**
   - Using Expo Go app
   - Connected to same network as development machine
   - Or using tunnel mode if on different networks

## 🧪 Test Scenarios

### 1. Basic Video Recording & Upload Flow

1. **Login as Student**
   - Register a new student account or login with existing
   - Verify successful authentication

2. **Start Practice Session**
   - Tap "Start Practice Session"
   - Fill in session details (instrument, focus, etc.)
   - Tap "Record Video"

3. **Record Video**
   - Grant camera and microphone permissions if prompted
   - Record a short video (10-30 seconds for testing)
   - Stop recording
   - Preview the video
   - Tap "Use Video"

4. **Monitor Upload Progress**
   - Upload should start automatically
   - Progress bar should appear in VideoRecorder
   - Check upload percentage and speed
   - Video should continue playing while uploading

5. **Complete Session**
   - Fill in remaining session details
   - Add self-rating
   - Tap "End Session"
   - Upload progress should transfer to session screen

6. **Check Upload Status**
   - From Home screen, tap the upload icon (shows badge with count)
   - View all active uploads in Uploads screen
   - Verify upload completes successfully

### 2. Network Interruption Test

1. **Start Recording & Upload**
   - Follow steps 1-4 above
   
2. **Interrupt Network**
   - Turn on airplane mode
   - Upload should pause automatically
   - Status should show "Paused"

3. **Restore Network**
   - Turn off airplane mode
   - Upload should resume automatically
   - Progress should continue from where it left off

### 3. Background Upload Test

1. **Start Upload**
   - Record and start uploading a video
   
2. **Background the App**
   - Press home button or switch apps
   - Wait 10-20 seconds

3. **Return to App**
   - Upload should have continued in background
   - Progress should reflect background upload

### 4. Multiple Upload Queue Test

1. **Create Multiple Sessions**
   - Record 3-4 practice sessions with videos
   - Don't wait for uploads to complete

2. **Check Upload Queue**
   - Go to Uploads screen
   - Should see multiple uploads
   - Maximum 2 should be active simultaneously
   - Others should be queued

3. **Verify Queue Processing**
   - As uploads complete, queued items should start
   - All uploads should eventually complete

### 5. Error Handling Test

1. **Cancel Upload**
   - Start an upload
   - Tap cancel button in upload progress
   - Upload should stop
   - Can retry from Uploads screen

2. **Large Video Test**
   - Record maximum duration video (5 minutes)
   - Monitor upload progress
   - Should handle large file without issues

## 🔍 What to Verify

### Upload Progress UI
- [ ] Progress bar updates smoothly
- [ ] Upload speed is displayed
- [ ] Percentage is accurate
- [ ] Status changes (uploading, paused, completed, failed)
- [ ] Action buttons work (pause, resume, cancel, retry)

### Backend Integration
- [ ] Videos appear in MinIO storage after upload
- [ ] Database records are updated with upload status
- [ ] Presigned URLs work for playback
- [ ] TUS protocol headers are correct

### Error States
- [ ] Network errors show appropriate messages
- [ ] Failed uploads can be retried
- [ ] Canceled uploads can be resumed
- [ ] Storage errors are handled gracefully

## 📱 Checking Backend Storage

1. **Access MinIO Console**
   ```
   http://localhost:9001
   Username: minioadmin
   Password: minioadmin
   ```

2. **Check Uploaded Videos**
   - Navigate to `music-tracker` bucket
   - Look for videos in `videos/` folder
   - Files should be named with upload IDs

3. **Verify Database Records**
   ```bash
   docker-compose exec -T postgres psql -U postgres -d musictracker -c "SELECT id, filename, upload_completed, upload_offset, file_size FROM videos ORDER BY created_at DESC LIMIT 5;"
   ```

## 🐛 Common Issues

### Upload Not Starting
- Check network connectivity
- Verify backend is running
- Check API URL in .env file
- Look for errors in console

### Upload Stuck
- Check MinIO is running: `docker-compose ps`
- Verify storage space available
- Check backend logs: `docker-compose logs -f backend`

### Permission Errors
- Ensure both camera AND microphone permissions granted
- Reset permissions in phone settings if needed

## 📊 Performance Expectations

- **Upload Speed**: Depends on network, typically 1-5 MB/s
- **5min Video Size**: ~50-100MB (720p)
- **Upload Time**: 10-100 seconds for typical video
- **Background Performance**: Should continue at ~80% speed

## ✅ Success Criteria

The video upload system is working correctly when:
1. Videos upload reliably with progress tracking
2. Uploads resume after network interruptions
3. Multiple uploads queue properly
4. Background uploads work
5. All UI states display correctly
6. Videos are playable after upload
7. No data loss occurs during interruptions

---

Happy testing! 🎥📤