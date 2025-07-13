import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface ForumVideoPlayerProps {
  source: { uri: string };
  style?: any;
}

export const ForumVideoPlayer: React.FC<ForumVideoPlayerProps> = ({
  source,
  style,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  
  const player = useVideoPlayer(source.uri, (player) => {
    setIsLoading(false);
    setError(false);
  });

  const handlePlayPause = () => {
    if (!player) return;

    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update playback status periodically
  React.useEffect(() => {
    if (!player) return;
    
    const interval = setInterval(() => {
      setDuration(player.duration);
      setPosition(player.currentTime);
      setIsPlaying(player.playing);
    }, 100);
    
    return () => clearInterval(interval);
  }, [player]);

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.errorContainer}>
          <Ionicons name="videocam-off-outline" size={48} color={Colors.textSecondary} />
          <Text style={styles.errorText}>Failed to load video</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
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

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
        >
          <Ionicons
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color="white"
          />
        </TouchableOpacity>

        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: duration > 0 ? `${(position / duration) * 100}%` : '0%',
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  video: {
    width: '100%',
    height: 200,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  errorText: {
    marginTop: 8,
    color: Colors.textSecondary,
    fontSize: 14,
  },
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeInfo: {
    position: 'absolute',
    bottom: 30,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  timeText: {
    color: 'white',
    fontSize: 12,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
});