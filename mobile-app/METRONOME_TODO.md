# Metronome Implementation TODO

## Current Status
- ✅ Visual feedback with animated face
- ✅ Real-time BPM adjustment during practice
- ✅ Practice mode selection
- ❌ Audio playback (disabled due to quality issues)
- ❌ Tempo detection from user's playing

## Audio Implementation Options

### Option 1: Add Sound Files (Recommended)
1. Create/obtain metronome click sounds:
   - `click-normal.mp3` - Regular beat sound
   - `click-accent.mp3` - Accent beat sound
2. Add to `/mobile-app/assets/sounds/`
3. Load sounds on initialization:
   ```typescript
   this.normalSound = await Audio.Sound.createAsync(
     require('../assets/sounds/click-normal.mp3')
   );
   ```

### Option 2: Use Tone.js or Similar Library
1. Install web audio synthesis library
2. Generate clicks programmatically with better quality
3. More flexible but adds dependency

### Option 3: Platform-Specific Solutions
1. iOS: Use system sounds (UIKit)
2. Android: Use SoundPool
3. Requires native modules

## Tempo Detection Implementation

### Requirements
1. Microphone permission
2. Real-time audio analysis
3. Beat detection algorithm

### Implementation Approach
1. **Audio Input**: Use expo-av Recording API
2. **Processing Options**:
   - Client-side: Use Web Audio API for FFT analysis
   - Server-side: Stream audio chunks to backend
   - Hybrid: Basic detection on client, refined on server

3. **Algorithm**:
   ```
   Audio Input → Onset Detection → Beat Tracking → Tempo Calculation
   ```

4. **UI Updates**:
   - Show actual tempo next to target
   - Update face expression based on difference
   - Display confidence level

### Backend Integration
The backend already has audio analysis capabilities:
- `/backend/app/services/audio_analysis_service.py`
- Uses librosa for tempo detection
- Could add endpoint: `POST /api/v1/tempo/analyze-stream`

## Quick Fixes for Now

1. **Better Audio Logging**:
   - Show beat numbers visually
   - Flash screen on beats
   - Use console with emojis

2. **Manual Tempo Input**:
   - Add "Tap Tempo" button
   - User taps to indicate their actual tempo
   - Calculate BPM from tap intervals

3. **Visual-Only Mode**:
   - Emphasize the animated face
   - Add beat counter display
   - Show measures/bars

## Implementation Priority

1. **High Priority**: Add proper sound files
2. **Medium Priority**: Basic tempo detection
3. **Low Priority**: Advanced analysis features

## Estimated Time
- Sound files: 2-3 hours
- Basic tempo detection: 1-2 days
- Full implementation: 3-5 days