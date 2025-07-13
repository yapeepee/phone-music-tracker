# Video Recording Testing Guide 📹

## Prerequisites
1. ✅ Backend services running (`docker-compose up -d`)
2. ✅ Mobile app environment configured with your IP (172.26.153.150)
3. ✅ Phone connected to same network as your computer

## Step-by-Step Testing Instructions

### 1. Restart Backend to Apply CORS Changes
```bash
cd /home/dialunds/music-tracker
docker-compose restart backend
```

### 2. Start Mobile App
```bash
cd mobile-app
npm start
```

### 3. Connect Your Phone
- Install **Expo Go** app from App Store/Play Store
- Open Expo Go and scan the QR code from terminal
- Make sure your phone is on the same WiFi network

### 4. Test Video Recording Flow

#### A. Initial Setup
1. **Register/Login**
   - Register as a new student user
   - Email: `video.test@example.com`
   - Password: `password123`
   - Role: Student

#### B. Create Practice Session
1. From home screen, tap **"Start Practice Session"**
2. Select a practice focus (e.g., "Technique")
3. Add some tags (e.g., "Scales", "Arpeggios")
4. Tap **"Start Session"**

#### C. Test Video Recording
1. **First Recording Test**:
   - Tap **"Record Video"** button
   - Grant camera and microphone permissions when prompted
   - You should see:
     - Camera preview
     - Duration counter (0:00 / 5:00)
     - Record button (red circle)
     - Flip camera button
     - Close button (X)

2. **Record a Short Video**:
   - Tap the record button
   - Record for 5-10 seconds
   - Watch the duration counter increment
   - Tap the record button again to stop

3. **Preview Video**:
   - Video should auto-play in preview
   - You should see:
     - "Retake" button
     - "Use Video" button
   - Test playback controls

4. **Test Retake**:
   - Tap "Retake"
   - Record another video
   - This time record for 30+ seconds to test minimum duration

5. **Save Video**:
   - Tap "Use Video"
   - Video should appear in the session screen
   - Play the video to verify it saved correctly

#### D. Complete Session
1. Add a self-rating (1-5 stars)
2. Add session notes
3. Tap **"End Session"**
4. Confirm ending the session
5. You should see "Session Saved" alert

### 5. Verify Video Storage

The video should be stored locally on the device. To verify:

1. **Check Redux State**:
   - Shake device to open developer menu
   - Enable "Debug Remote JS"
   - Check browser console for Redux logs

2. **Check Local Storage**:
   - Videos are stored in: `DocumentDirectory/videos/`
   - Each video named: `{sessionId}_practice_video_{timestamp}.mp4`

### 6. Test Edge Cases

#### A. Permission Denial
1. Go to phone settings
2. Deny camera/microphone permissions for Expo Go
3. Try to record video
4. Should show permission request screen

#### B. Duration Limits
1. Try recording less than 30 seconds
2. Try recording more than 5 minutes
3. Video should stop automatically at 5 minutes

#### C. Multiple Videos
1. Create another session
2. Record video
3. Verify previous video still exists

### 7. Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot connect to backend" | Check IP address in .env matches your machine |
| "Network request failed" | Ensure phone is on same WiFi network |
| "Camera permission denied" | Go to Settings > Expo Go > Permissions |
| "Video not playing" | Check video player component logs |
| "Storage full" | App includes cleanup for videos >30 days old |

### 8. Performance Checks

1. **Recording Performance**:
   - Camera preview should be smooth
   - No lag when starting/stopping recording
   - Duration counter updates every second

2. **Playback Performance**:
   - Video loads quickly
   - Smooth playback without stuttering
   - Progress bar updates correctly

3. **Storage Usage**:
   - Check video file sizes (displayed in player)
   - 1 minute ≈ 10-20MB depending on quality

### 9. Debugging Commands

```bash
# Check backend logs
docker-compose logs -f backend

# Check if API is accessible from your IP
curl http://172.26.153.150:8000/health

# Monitor backend requests
docker-compose logs -f backend | grep "POST\|GET\|PUT"
```

### 10. Next Steps After Testing

If all tests pass:
1. ✅ Video recording works
2. ✅ Video preview/playback works
3. ✅ Videos save with sessions
4. ✅ Permissions handled correctly
5. ✅ Duration limits enforced

Next: Implement video upload service for cloud backup

## Troubleshooting Tips

### Video Not Recording
```javascript
// Check console for errors:
console.log('Camera ref:', cameraRef.current);
console.log('Recording state:', isRecording);
```

### Permission Issues
- iOS: Settings > Expo Go > Camera/Microphone
- Android: Settings > Apps > Expo Go > Permissions

### Network Issues
```bash
# Test from your computer
ping 172.26.153.150
curl http://172.26.153.150:8000/health
```

Remember to test with **extreme care** and report any issues! 🎯