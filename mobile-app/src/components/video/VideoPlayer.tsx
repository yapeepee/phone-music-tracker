import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { VideoMetadata, videoService } from '../../services/video.service';

const { width: screenWidth } = Dimensions.get('window');

interface VideoPlayerProps {
  video: VideoMetadata;
  showControls?: boolean;
  autoPlay?: boolean;
  onDelete?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  showControls = true,
  autoPlay = false,
  onDelete,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const player = useVideoPlayer(video.uri, (player) => {
    if (autoPlay) {
      player.play();
    }
  });

  // Update playback status periodically
  React.useEffect(() => {
    if (!player) return;
    
    const interval = setInterval(() => {
      setIsLoading(false);
      setDuration(player.duration / 1000);
      setPosition(player.currentTime / 1000);
      setIsPlaying(player.playing);
    }, 100);
    
    return () => clearInterval(interval);
  }, [player]);

  const togglePlayPause = () => {
    if (!player) return;

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleDelete = async () => {
    const success = await videoService.deleteVideo(video.uri);
    if (success && onDelete) {
      onDelete();
    }
    setShowDeleteConfirm(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoInfo = () => {
    const sizeStr = videoService.formatFileSize(video.size);
    const recordedDate = new Date(video.timestamp).toLocaleDateString();
    return `${sizeStr} • ${recordedDate}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
        />

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {showControls && !isLoading && (
          <TouchableOpacity
            style={styles.playPauseOverlay}
            onPress={togglePlayPause}
            activeOpacity={0.8}
          >
            <View style={styles.playPauseButton}>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="white"
              />
            </View>
          </TouchableOpacity>
        )}
      </View>

      {showControls && (
        <View style={styles.controls}>
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(position / duration) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>{getVideoInfo()}</Text>
            {onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => setShowDeleteConfirm(true)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {showDeleteConfirm && (
        <View style={styles.deleteConfirmOverlay}>
          <View style={styles.deleteConfirmDialog}>
            <Text style={styles.deleteConfirmTitle}>Delete Video?</Text>
            <Text style={styles.deleteConfirmText}>
              This action cannot be undone.
            </Text>
            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.deleteConfirmButton]}
                onPress={handleDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Colors.background,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playPauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    padding: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    minWidth: 40,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  deleteButton: {
    padding: 8,
  },
  deleteConfirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteConfirmDialog: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    width: screenWidth - 80,
    alignItems: 'center',
  },
  deleteConfirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  deleteConfirmText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteConfirmButton: {
    backgroundColor: Colors.error,
  },
  cancelButtonText: {
    color: Colors.text,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});