import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Colors } from '../../constants/colors';
import { videoService, VideoMetadata } from '../../services/video.service';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { UploadProgress } from '../upload/UploadProgress';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { selectUploadById } from '../../store/slices/uploadSlice';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface VideoRecorderProps {
  sessionId: string;
  maxDuration?: number; // in seconds
  onVideoRecorded: (video: VideoMetadata, uploadId?: string) => void;
  onCancel: () => void;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
  sessionId,
  maxDuration = 300, // 5 minutes default
  onVideoRecorded,
  onCancel,
}) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [cameraType, setCameraType] = useState<CameraType>('back');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUploadId, setCurrentUploadId] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { uploadFromPath } = useVideoUpload();
  const uploadStatus = useSelector((state: RootState) => 
    currentUploadId ? selectUploadById(state, currentUploadId) : null
  );
  
  // Video player for preview
  const videoPlayer = useVideoPlayer(recordedVideo || '', (player) => {
    if (recordedVideo) {
      player.play();
      player.loop = true;
    }
  });

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  const handleRequestPermission = async () => {
    const [cameraResult, microphoneResult] = await Promise.all([
      requestCameraPermission(),
      requestMicrophonePermission(),
    ]);
    
    if (!cameraResult.granted || !microphoneResult.granted) {
      Alert.alert(
        'Permissions Required',
        'Camera and microphone permissions are required to record videos.',
        [
          { text: 'Cancel', onPress: onCancel, style: 'cancel' },
          { text: 'Try Again', onPress: handleRequestPermission },
        ]
      );
    }
  };

  const startRecording = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 1;
          if (newDuration >= maxDuration) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

      // Start recording
      const video = await cameraRef.current.recordAsync({
        maxDuration,
        quality: '720p',
      });

      if (video) {
        setRecordedVideo(video.uri);
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Recording Error', 'Failed to start recording. Please try again.');
      setIsRecording(false);
    }
  }, [maxDuration]);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      setIsRecording(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      await cameraRef.current.stopRecording();
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  }, [isRecording]);

  const toggleCameraType = () => {
    setCameraType((current) =>
      current === 'back' ? 'front' : 'back'
    );
  };

  const saveVideo = async () => {
    if (!recordedVideo) return;

    try {
      setIsLoading(true);
      const metadata = await videoService.saveVideo(recordedVideo, sessionId);
      
      // Start upload using the saved video URI
      try {
        const uploadId = await uploadFromPath(metadata.uri, metadata.fileName || `session_${sessionId}.mp4`, sessionId);
        setCurrentUploadId(uploadId);
        onVideoRecorded(metadata, uploadId);
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        // Still save video metadata even if upload fails
        onVideoRecorded(metadata);
      }
    } catch (error) {
      console.error('Error saving video:', error);
      Alert.alert('Save Error', 'Failed to save video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const retakeVideo = () => {
    setRecordedVideo(null);
    setRecordingDuration(0);
    setCurrentUploadId(null);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!cameraPermission?.granted || !microphonePermission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.permissionText}>Camera and microphone permissions required</Text>
          <TouchableOpacity style={styles.button} onPress={handleRequestPermission}>
            <Text style={styles.buttonText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (recordedVideo) {
    return (
      <View style={styles.container}>
        <VideoView
          player={videoPlayer}
          style={styles.video}
          contentFit="contain"
        />
        <View style={styles.previewControls}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={retakeVideo}
          >
            <Ionicons name="refresh" size={24} color={Colors.primary} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={saveVideo}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark" size={24} color="white" />
                <Text style={styles.buttonText}>Use Video</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        {uploadStatus && uploadStatus.status !== 'completed' && uploadStatus.status !== 'cancelled' && (
          <View style={styles.uploadProgressContainer}>
            <UploadProgress
              fileName={uploadStatus.fileName}
              progress={uploadStatus.progress}
              bytesUploaded={uploadStatus.bytesUploaded}
              bytesTotal={uploadStatus.bytesTotal}
              speed={uploadStatus.speed}
              status={uploadStatus.status}
              error={uploadStatus.error}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={cameraType}
        mode="video"
        videoQuality="720p"
      />
      
      <View style={styles.overlay}>
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
          <View style={styles.durationContainer}>
            <Text style={styles.durationText}>
              {formatDuration(recordingDuration)} / {formatDuration(maxDuration)}
            </Text>
          </View>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraType}>
            <Ionicons name="camera-reverse" size={32} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomControls}>
          <TouchableOpacity
            style={[styles.recordButton, isRecording && styles.recordingButton]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
          >
            <View style={styles.recordButtonInner} />
          </TouchableOpacity>
          {isRecording && (
            <Text style={styles.recordingText}>Recording...</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  video: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  durationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  recordingButton: {
    borderColor: Colors.error,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.error,
  },
  recordingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: Colors.surface,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: Colors.primary,
  },
});