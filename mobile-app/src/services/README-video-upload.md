# Video Upload Service Implementation

## Overview

This implementation provides a comprehensive video upload service for React Native using TUS protocol for resumable uploads. It handles background uploads, network interruptions, and provides a complete UI for managing upload queues.

## Key Features

- **Resumable Uploads**: Uses TUS protocol via tus-js-client for reliable uploads
- **Background Uploads**: Continues uploading even when app is in background
- **Network Resilience**: Automatically pauses/resumes based on network connectivity
- **Progress Tracking**: Real-time progress with speed calculations
- **Upload Queue**: Manages multiple concurrent uploads with configurable limits
- **Retry Logic**: Automatic retry with exponential backoff
- **State Management**: Redux integration for centralized upload state
- **UI Components**: Ready-to-use components for upload progress and queue management

## Architecture

### 1. Video Upload Service (`video-upload.service.ts`)
- Core service handling TUS upload logic
- Network monitoring with automatic pause/resume
- Concurrent upload management
- File blob conversion for cross-platform compatibility
- Auth token integration

### 2. Redux Store (`uploadSlice.ts`)
- Centralized upload state management
- Actions for pause/resume/cancel/retry operations
- Selectors for filtering uploads by status
- Progress tracking and statistics

### 3. React Hook (`useVideoUpload.ts`)
- Convenient API for components
- Camera roll integration
- Background state handling
- Automatic status synchronization
- Cleanup utilities

### 4. UI Components
- `UploadProgress.tsx`: Individual upload progress display
- `UploadQueue.tsx`: Complete queue management interface
- `VideoUploadExample.tsx`: Example implementation

## Usage

### Basic Upload

```typescript
import { useVideoUpload } from './hooks/useVideoUpload';

function MyComponent() {
  const { uploadFromPath, uploadFromCameraRoll } = useVideoUpload();

  // Upload from file path
  const handleUploadFile = async (filePath: string) => {
    const uploadId = await uploadFromPath(filePath, 'my-video.mp4');
    console.log('Upload started:', uploadId);
  };

  // Upload from camera roll
  const handleUploadFromGallery = async (asset: MediaLibrary.Asset) => {
    const uploadId = await uploadFromCameraRoll(asset);
    console.log('Upload started:', uploadId);
  };
}
```

### Display Upload Queue

```typescript
import { UploadQueue } from './components/upload/UploadQueue';

function MyScreen() {
  return (
    <View style={{ flex: 1 }}>
      <UploadQueue />
    </View>
  );
}
```

### Monitor Upload Progress

```typescript
import { useSelector } from 'react-redux';
import { selectUploadById } from './store/slices/uploadSlice';

function UploadMonitor({ uploadId }: { uploadId: string }) {
  const upload = useSelector(selectUploadById(uploadId));

  if (!upload) return null;

  return (
    <View>
      <Text>Status: {upload.status}</Text>
      <Text>Progress: {upload.progress}%</Text>
      <Text>Speed: {formatSpeed(upload.speed)}</Text>
    </View>
  );
}
```

## Configuration

### Environment Variables

Set your upload endpoint in your environment:

```bash
EXPO_PUBLIC_API_URL=https://your-api.com
```

### Store Integration

Add the upload reducer to your Redux store:

```typescript
import uploadReducer from './slices/uploadSlice';

export const store = configureStore({
  reducer: {
    // ... other reducers
    upload: uploadReducer,
  },
});
```

### Authentication

The service automatically uses the auth token from Redux state:

```typescript
// The service looks for: state.auth.accessToken
// Make sure your auth slice provides this
```

## API Reference

### useVideoUpload Hook

```typescript
const {
  uploadFromCameraRoll,  // Upload MediaLibrary asset
  uploadFromPath,        // Upload from file path
  uploadMultiple,        // Upload multiple assets
  getUploadProgress,     // Get progress for specific upload
  getTotalProgress,      // Get overall progress
  hasActiveUploads,      // Check if uploads are active
  cleanupOldUploads,     // Clean completed uploads
  uploads,              // All uploads array
  activeUploads,        // Active uploads array
} = useVideoUpload(options);
```

### Upload States

- `queued`: Waiting to start
- `uploading`: Currently uploading
- `paused`: Manually or automatically paused
- `completed`: Successfully uploaded
- `failed`: Upload failed (will retry)
- `cancelled`: Manually cancelled

### Redux Actions

- `startUpload`: Initialize new upload
- `pauseUpload`: Pause active upload
- `resumeUpload`: Resume paused upload
- `cancelUpload`: Cancel and remove upload
- `retryUpload`: Retry failed upload
- `clearCompleted`: Remove completed uploads
- `syncUploadStatus`: Sync with service state

## Best Practices

1. **File Management**: The service copies files to app's document directory for reliable access
2. **Cleanup**: Use `cleanupOldUploads()` periodically to remove old files
3. **Error Handling**: Always wrap upload operations in try-catch blocks
4. **Permissions**: Ensure media library permissions before selecting videos
5. **Network**: The service handles network changes automatically
6. **Background**: Uploads continue in background automatically

## Troubleshooting

### Common Issues

1. **Upload not starting**: Check auth token and network connectivity
2. **Permission denied**: Request media library permissions first
3. **File not found**: Ensure file path is absolute and exists
4. **Memory issues**: Implement cleanup for old uploads

### Debug Tips

```typescript
// Enable TUS debug logging
window.tus = require('tus-js-client');
window.tus.enableDebugLog = true;
```

## Dependencies

- `tus-js-client`: TUS protocol implementation
- `@react-native-community/netinfo`: Network monitoring
- `expo-file-system`: File operations
- `expo-media-library`: Camera roll access
- `@reduxjs/toolkit`: State management
- `uuid`: Unique ID generation