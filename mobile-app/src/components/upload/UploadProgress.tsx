import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatBytes, formatSpeed } from '../../services/video-upload.service';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  bytesUploaded: number;
  bytesTotal: number;
  speed: number;
  status: 'queued' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled';
  error?: Error;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  fileName,
  progress,
  bytesUploaded,
  bytesTotal,
  speed,
  status,
  error,
  onPause,
  onResume,
  onCancel,
  onRetry,
}) => {
  const progressAnimation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return <Ionicons name="time-outline" size={24} color="#666" />;
      case 'uploading':
        return <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />;
      case 'paused':
        return <Ionicons name="pause-circle-outline" size={24} color="#FFA500" />;
      case 'completed':
        return <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />;
      case 'failed':
        return <Ionicons name="alert-circle" size={24} color="#F44336" />;
      case 'cancelled':
        return <Ionicons name="close-circle" size={24} color="#666" />;
      default:
        return null;
    }
  };

  const getActionButton = () => {
    switch (status) {
      case 'uploading':
        return (
          <TouchableOpacity onPress={onPause} style={styles.actionButton}>
            <Ionicons name="pause" size={20} color="#007AFF" />
          </TouchableOpacity>
        );
      case 'paused':
        return (
          <TouchableOpacity onPress={onResume} style={styles.actionButton}>
            <Ionicons name="play" size={20} color="#007AFF" />
          </TouchableOpacity>
        );
      case 'failed':
        return (
          <TouchableOpacity onPress={onRetry} style={styles.actionButton}>
            <Ionicons name="refresh" size={20} color="#F44336" />
          </TouchableOpacity>
        );
      case 'queued':
        return (
          <TouchableOpacity onPress={onCancel} style={styles.actionButton}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusIcon}>{getStatusIcon()}</View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {fileName}
          </Text>
          <View style={styles.statsRow}>
            {status === 'uploading' && (
              <>
                <Text style={styles.statsText}>
                  {formatBytes(bytesUploaded)} / {formatBytes(bytesTotal)}
                </Text>
                <Text style={styles.separator}>•</Text>
                <Text style={styles.statsText}>{formatSpeed(speed)}</Text>
                <Text style={styles.separator}>•</Text>
              </>
            )}
            <Text style={styles.statsText}>{Math.round(progress)}%</Text>
          </View>
        </View>
        <View style={styles.actions}>
          {getActionButton()}
          {status !== 'completed' && status !== 'cancelled' && (
            <TouchableOpacity onPress={onCancel} style={styles.actionButton}>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {status !== 'completed' && status !== 'cancelled' && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressWidth,
                  backgroundColor: status === 'failed' ? '#F44336' : '#007AFF',
                },
              ]}
            />
          </View>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
  },
  separator: {
    marginHorizontal: 6,
    color: '#666',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 4,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
  },
});