# 🎵 Audio Analysis Testing Guide

## What to Test After Audio Analysis Integration

### 1. 📹 Video Upload & Processing Flow

**Test Steps:**
1. Login to the mobile app
2. Create a new practice session
3. Record a video (with audio!)
4. Upload the video
5. Monitor the processing status

**Expected Results:**
- Video uploads successfully
- Processing status shows "processing"
- After completion, check if audio analysis was performed

**How to Monitor:**
```bash
# Watch Celery worker logs for audio analysis
docker-compose logs -f celery-worker | grep -E "Analyzing audio|Audio analysis"

# Check Flower UI for task status
open http://localhost:5555

# Watch backend logs for any errors
docker-compose logs -f backend
```

### 2. 📊 Check Analysis Results in Database

**After video processing completes:**
```bash
# Connect to database
docker exec -it musictracker-db psql -U postgres -d musictracker

# Check if analysis results were saved
SELECT * FROM analysis_results ORDER BY analyzed_at DESC LIMIT 1;

# Check if time-series metrics were saved
SELECT COUNT(*), metric_type 
FROM practice_metrics 
WHERE session_id = (SELECT id FROM practice_sessions ORDER BY created_at DESC LIMIT 1)
GROUP BY metric_type;

# View sample metrics
SELECT time, metric_type, value, confidence 
FROM practice_metrics 
WHERE session_id = (SELECT id FROM practice_sessions ORDER BY created_at DESC LIMIT 1)
LIMIT 20;
```

### 3. 🎯 Analysis Metrics to Look For

The audio analysis extracts these metrics:

| Metric Type | What It Measures | Expected Values |
|-------------|------------------|-----------------|
| **Tempo** | BPM, tempo stability | 60-200 BPM typical |
| **Pitch** | Pitch accuracy, stability | Frequency in Hz |
| **Dynamics** | Volume variations, dynamic range | dB values |
| **Vibrato** | Vibrato rate and consistency | 4-8 Hz typical |
| **Note Onsets** | Note timing, rhythm accuracy | Timestamps |

### 4. 🔍 Common Issues to Watch For

#### ❌ **No Audio in Video**
- **Symptom**: Analysis completes but all metrics are 0
- **Check**: Make sure video has audio track
- **Test**: `ffprobe your_video.mp4` should show audio stream

#### ❌ **Analysis Takes Too Long**
- **Symptom**: Video processing stuck at analysis step
- **Check**: File size - very long videos take time
- **Monitor**: `docker stats musictracker-celery-worker`

#### ❌ **Database Errors**
- **Symptom**: Analysis completes but no data saved
- **Check**: TimescaleDB hypertables created
- **Fix**: Run the init script:
```bash
docker exec musictracker-backend python scripts/init_timescaledb.py
```

### 5. 📈 Test Different Music Types

Try uploading videos with different characteristics:

1. **Solo instrument** (guitar, piano, violin)
   - Should detect clear pitch and note onsets
   
2. **Vocal practice**
   - Should detect vibrato and pitch variations
   
3. **Rhythmic practice** (drums, percussion)
   - Should focus on tempo and onset detection
   
4. **Silent/noise only**
   - Should handle gracefully with low confidence scores

### 6. 🛠️ Debug Commands

```bash
# Check if librosa is installed in worker
docker exec musictracker-celery-worker python -c "import librosa; print(librosa.__version__)"

# Test audio analysis directly
docker exec -it musictracker-celery-worker python
>>> from app.services.analytics import AudioAnalysisService
>>> service = AudioAnalysisService()
>>> # Test with a sample audio file

# View processing errors
docker-compose logs celery-worker | grep ERROR

# Check task queue
docker exec musictracker-redis redis-cli
> LLEN celery
> LRANGE celery 0 10
```

### 7. 📊 Performance Metrics

**Expected Processing Times:**
- 30-second video: ~5-10 seconds for analysis
- 2-minute video: ~20-30 seconds for analysis
- 5-minute video: ~60-90 seconds for analysis

**Resource Usage:**
- CPU: May spike to 100% during analysis
- Memory: ~200-500MB additional during processing

### 8. 🔄 API Response Changes

The video processing result now includes:
```json
{
  "video_info": {...},
  "transcoded_videos": {...},
  "thumbnails": [...],
  "audio_track": {...},
  "preview_clip": {...},
  "audio_analysis": {
    "tempo": {
      "bpm": 120.5,
      "tempo_stability": 0.85,
      "beat_times": [...]
    },
    "pitch": {
      "pitch_stability": 0.92,
      "pitch_range": {
        "min_hz": 220.0,
        "max_hz": 880.0,
        "min_note": "A3",
        "max_note": "A5"
      }
    },
    "dynamics": {
      "dynamic_range_db": 24.5,
      "dynamics_stability": 0.78
    },
    "overall_metrics": {
      "overall_consistency": 85.5,
      "tempo_score": 82.0,
      "pitch_score": 88.0,
      "dynamics_score": 79.0,
      "technical_proficiency": 86.5,
      "musical_expression": 81.0
    }
  }
}
```

### 9. ✅ Success Indicators

You'll know the audio analysis is working when:
1. ✅ Celery logs show "Analyzing audio for practice metrics"
2. ✅ `analysis_results` table has a new row
3. ✅ `practice_metrics` table has time-series data
4. ✅ No errors in celery-worker logs
5. ✅ Processing completes without hanging

### 10. 🚨 When to Alert

Contact for help if:
- ❗ Backend crashes on startup
- ❗ Video processing hangs indefinitely
- ❗ Database connection errors persist
- ❗ Memory usage exceeds 2GB for worker

---

## Quick Test Checklist

- [ ] Backend starts without errors
- [ ] Can login successfully
- [ ] Can upload a video with audio
- [ ] Video processing completes
- [ ] Audio analysis results saved to DB
- [ ] No errors in logs
- [ ] Metrics look reasonable (not all zeros)

Happy testing! 🎶