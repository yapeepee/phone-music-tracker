import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import { useVideoUpload, useVideoSelector } from '../../hooks/useVideoUpload';
import { UploadQueue } from './UploadQueue';

export const VideoUploadExample: React.FC = () => {
  const [isSelecting, setIsSelecting] = useState(false);
  const { uploadFromCameraRoll, uploadMultiple, hasActiveUploads } = useVideoUpload();
  const { selectVideos } = useVideoSelector();

  const handleSelectSingle = async () => {
    try {
      setIsSelecting(true);
      const videos = await selectVideos({ multiple: false });
      
      if (videos.length > 0) {
        await uploadFromCameraRoll(videos[0]);
        Alert.alert('Success', 'Video upload started');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to select video');
    } finally {
      setIsSelecting(false);
    }
  };

  const handleSelectMultiple = async () => {
    try {
      setIsSelecting(true);
      const videos = await selectVideos({ multiple: true });
      
      if (videos.length > 0) {
        await uploadMultiple(videos);
        Alert.alert('Success', `${videos.length} video(s) added to upload queue`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to select videos');
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Video Upload</Text>
        <Text style={styles.subtitle}>
          Upload your practice videos to track your progress
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleSelectSingle}
          disabled={isSelecting}
        >
          <Ionicons name="videocam" size={24} color="#FFF" />
          <Text style={styles.buttonText}>Select Video</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleSelectMultiple}
          disabled={isSelecting}
        >
          <Ionicons name="albums" size={24} color="#007AFF" />
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Select Multiple
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.queueSection}>
        <UploadQueue />
      </View>

      {hasActiveUploads && (
        <View style={styles.notice}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.noticeText}>
            Uploads will continue in the background
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  actions: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  queueSection: {
    flex: 1,
    minHeight: 400,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
  },
});