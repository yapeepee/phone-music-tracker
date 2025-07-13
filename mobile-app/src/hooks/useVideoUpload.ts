import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import {
  startUpload,
  syncUploadStatus,
  selectAllUploads,
  selectActiveUploads,
} from '../store/slices/uploadSlice';
import { videoUploadService } from '../services/video-upload.service';

interface UseVideoUploadOptions {
  autoRetry?: boolean;
  maxConcurrentUploads?: number;
  syncInterval?: number;
}

export const useVideoUpload = (options: UseVideoUploadOptions = {}) => {
  const {
    autoRetry = true,
    maxConcurrentUploads = 2,
    syncInterval = 1000, // Sync every second
  } = options;

  const dispatch = useDispatch<AppDispatch>();
  const uploads = useSelector(selectAllUploads);
  const activeUploads = useSelector(selectActiveUploads);
  const authToken = useSelector((state: RootState) => state.auth?.accessToken);
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef(AppState.currentState);

  // Set auth token when it changes
  useEffect(() => {
    if (authToken) {
      videoUploadService.setAuthToken(authToken);
    }
  }, [authToken]);

  // Handle app state changes for background uploads
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to foreground, sync upload status
        dispatch(syncUploadStatus());
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [dispatch]);

  // Sync upload status periodically
  useEffect(() => {
    const startSync = () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      syncIntervalRef.current = setInterval(() => {
        if (activeUploads.length > 0) {
          dispatch(syncUploadStatus());
        }
      }, syncInterval);
    };

    if (activeUploads.length > 0) {
      startSync();
    } else if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [activeUploads.length, syncInterval, dispatch]);

  // Upload video from camera roll
  const uploadFromCameraRoll = useCallback(
    async (asset: MediaLibrary.Asset) => {
      try {
        const id = uuidv4();
        
        // Get file info
        const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
        if (!assetInfo.localUri) {
          throw new Error('No local URI for asset');
        }

        // Copy to app's document directory for reliable access
        const fileName = assetInfo.filename || `video_${Date.now()}.mp4`;
        const destPath = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.copyAsync({
          from: assetInfo.localUri,
          to: destPath,
        });

        // Get file size
        const fileInfo = await FileSystem.getInfoAsync(destPath);
        const fileSize = fileInfo.size || 0;

        // Start upload
        await dispatch(
          startUpload({
            id,
            filePath: destPath,
            fileName,
            fileSize,
            metadata: {
              duration: assetInfo.duration?.toString() || '0',
              width: assetInfo.width?.toString() || '0',
              height: assetInfo.height?.toString() || '0',
              creationTime: assetInfo.creationTime?.toString() || Date.now().toString(),
            },
          })
        ).unwrap();

        return id;
      } catch (error) {
        console.error('Failed to start upload:', error);
        throw error;
      }
    },
    [dispatch]
  );

  // Upload video from file path
  const uploadFromPath = useCallback(
    async (filePath: string, fileName?: string, sessionId?: string) => {
      try {
        const id = uuidv4();
        
        // Get file info
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (!fileInfo.exists) {
          throw new Error('File does not exist');
        }

        const name = fileName || filePath.split('/').pop() || `video_${Date.now()}.mp4`;
        const fileSize = fileInfo.size || 0;

        // Start upload
        await dispatch(
          startUpload({
            id,
            filePath,
            fileName: name,
            fileSize,
            metadata: sessionId ? { session_id: sessionId } : undefined,
          })
        ).unwrap();

        return id;
      } catch (error) {
        console.error('Failed to start upload:', error);
        throw error;
      }
    },
    [dispatch]
  );

  // Upload multiple videos
  const uploadMultiple = useCallback(
    async (assets: MediaLibrary.Asset[]) => {
      const uploadIds: string[] = [];
      
      for (const asset of assets) {
        try {
          const id = await uploadFromCameraRoll(asset);
          uploadIds.push(id);
        } catch (error) {
          console.error('Failed to upload asset:', asset.id, error);
        }
      }

      return uploadIds;
    },
    [uploadFromCameraRoll]
  );

  // Get upload progress for a specific upload
  const getUploadProgress = useCallback(
    (uploadId: string) => {
      const upload = uploads.find((u) => u.id === uploadId);
      return upload ? upload.progress : 0;
    },
    [uploads]
  );

  // Check if any uploads are in progress
  const hasActiveUploads = activeUploads.length > 0;

  // Get total upload progress across all uploads
  const getTotalProgress = useCallback(() => {
    if (uploads.length === 0) return 0;

    const totalBytes = uploads.reduce((sum, upload) => sum + upload.bytesTotal, 0);
    const uploadedBytes = uploads.reduce((sum, upload) => sum + upload.bytesUploaded, 0);

    return totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;
  }, [uploads]);

  // Clean up completed uploads older than specified time
  const cleanupOldUploads = useCallback(
    (olderThanMs: number = 24 * 60 * 60 * 1000) => {
      // Default: 24 hours
      const now = Date.now();
      const oldUploads = uploads.filter(
        (upload) =>
          upload.status === 'completed' &&
          upload.completedAt &&
          now - upload.completedAt > olderThanMs
      );

      oldUploads.forEach((upload) => {
        // Clean up local file if it exists
        FileSystem.deleteAsync(upload.filePath, { idempotent: true }).catch(
          console.error
        );
      });
    },
    [uploads]
  );

  return {
    uploadFromCameraRoll,
    uploadFromPath,
    uploadMultiple,
    getUploadProgress,
    getTotalProgress,
    hasActiveUploads,
    cleanupOldUploads,
    uploads,
    activeUploads,
  };
};

// Hook for selecting videos from camera roll
export const useVideoSelector = () => {
  const requestPermission = useCallback(async () => {
    if (Platform.OS === 'web') return true;
    
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  }, []);

  const selectVideos = useCallback(
    async (options: { multiple?: boolean; mediaTypes?: MediaLibrary.MediaTypeValue[] } = {}) => {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        throw new Error('Media library permission denied');
      }

      const { multiple = false, mediaTypes = [MediaLibrary.MediaType.video] } = options;

      // Get videos from camera roll
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: mediaTypes,
        first: multiple ? 100 : 1,
        sortBy: MediaLibrary.SortBy.creationTime,
      });

      return media.assets;
    },
    [requestPermission]
  );

  return {
    requestPermission,
    selectVideos,
  };
};