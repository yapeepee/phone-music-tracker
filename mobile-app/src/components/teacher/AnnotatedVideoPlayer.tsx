import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Feedback } from '../../services/feedback.service';

interface AnnotatedVideoPlayerProps {
  videoUrl: string;
  existingFeedback: Feedback[];
  onAddFeedback: (timestamp: number, text: string, rating?: number) => Promise<void>;
  onUpdateFeedback: (feedbackId: string, text: string, rating?: number) => Promise<void>;
  onDeleteFeedback: (feedbackId: string) => Promise<void>;
}

export const AnnotatedVideoPlayer: React.FC<AnnotatedVideoPlayerProps> = ({
  videoUrl,
  existingFeedback,
  onAddFeedback,
  onUpdateFeedback,
  onDeleteFeedback,
}) => {
  console.log('AnnotatedVideoPlayer received videoUrl:', videoUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [selectedTimestamp, setSelectedTimestamp] = useState(0);
  const [annotationText, setAnnotationText] = useState('');
  const [annotationRating, setAnnotationRating] = useState<number | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<Feedback | null>(null);
  
  const player = useVideoPlayer(videoUrl, (player) => {
    console.log('Video player initialized');
  });

  // Update playback status periodically
  React.useEffect(() => {
    if (!player) return;
    
    const interval = setInterval(() => {
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

  const seekToTime = (seconds: number) => {
    if (!player) return;
    player.currentTime = seconds * 1000;
  };

  const handleTimelinePress = async (event: any) => {
    const { locationX } = event.nativeEvent;
    const timelineWidth = event.target.getBoundingClientRect?.()?.width || 300;
    const clickedTime = (locationX / timelineWidth) * duration;
    await seekToTime(clickedTime);
  };

  const handleAddAnnotation = () => {
    setSelectedTimestamp(Math.floor(position));
    setAnnotationText('');
    setAnnotationRating(null);
    setEditingFeedback(null);
    setShowAnnotationModal(true);
  };

  const handleEditAnnotation = (feedback: Feedback) => {
    setSelectedTimestamp(feedback.timestamp_seconds || 0);
    setAnnotationText(feedback.text);
    setAnnotationRating(feedback.rating || null);
    setEditingFeedback(feedback);
    setShowAnnotationModal(true);
  };

  const handleSaveAnnotation = async () => {
    if (!annotationText.trim()) {
      Alert.alert('Error', 'Please enter feedback text');
      return;
    }

    try {
      if (editingFeedback) {
        await onUpdateFeedback(editingFeedback.id, annotationText, annotationRating || undefined);
      } else {
        await onAddFeedback(selectedTimestamp, annotationText, annotationRating || undefined);
      }
      setShowAnnotationModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save annotation');
    }
  };

  const handleDeleteAnnotation = async (feedbackId: string) => {
    Alert.alert(
      'Delete Annotation',
      'Are you sure you want to delete this annotation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await onDeleteFeedback(feedbackId);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete annotation');
            }
          }
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderAnnotationMarker = (feedback: Feedback) => {
    const timestampSeconds = feedback.timestamp_seconds || 0;
    const leftPercent = (timestampSeconds / duration) * 100;
    
    if (leftPercent < 0 || leftPercent > 100) return null;

    return (
      <TouchableOpacity
        key={feedback.id}
        style={[styles.annotationMarker, { left: `${leftPercent}%` }]}
        onPress={() => seekToTime(timestampSeconds)}
      >
        <View style={styles.markerDot} />
      </TouchableOpacity>
    );
  };

  const renderAnnotationList = () => {
    const timestampedFeedback = existingFeedback
      .filter(f => f.timestamp_seconds !== null && f.timestamp_seconds !== undefined)
      .sort((a, b) => (a.timestamp_seconds || 0) - (b.timestamp_seconds || 0));

    return timestampedFeedback.map(feedback => (
      <TouchableOpacity
        key={feedback.id}
        style={styles.annotationItem}
        onPress={() => seekToTime(feedback.timestamp_seconds || 0)}
      >
        <View style={styles.annotationHeader}>
          <Text style={styles.annotationTime}>
            {formatTime(feedback.timestamp_seconds || 0)}
          </Text>
          <View style={styles.annotationActions}>
            <TouchableOpacity
              style={styles.annotationAction}
              onPress={() => handleEditAnnotation(feedback)}
            >
              <Ionicons name="pencil" size={16} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.annotationAction}
              onPress={() => handleDeleteAnnotation(feedback.id)}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.annotationText}>{feedback.text}</Text>
        {feedback.rating && (
          <View style={styles.annotationRating}>
            {[1, 2, 3, 4, 5].map(star => (
              <Ionicons
                key={star}
                name={star <= feedback.rating! ? 'star' : 'star-outline'}
                size={12}
                color="#FFD700"
              />
            ))}
          </View>
        )}
      </TouchableOpacity>
    ));
  };

  return (
    <View style={styles.container}>
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
        />

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
      </View>

      {/* Timeline with annotations */}
      <View style={styles.timelineContainer}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
        <TouchableOpacity 
          style={styles.timeline}
          onPress={handleTimelinePress}
          activeOpacity={0.9}
        >
          <View style={styles.timelineTrack}>
            <View
              style={[
                styles.timelineProgress,
                { width: `${(position / duration) * 100}%` },
              ]}
            />
          </View>
          {existingFeedback
            .filter(f => f.timestamp_seconds !== null && f.timestamp_seconds !== undefined)
            .map(renderAnnotationMarker)}
        </TouchableOpacity>
        <Text style={styles.timeText}>{formatTime(duration)}</Text>
      </View>

      {/* Add Annotation Button */}
      <TouchableOpacity
        style={styles.addAnnotationButton}
        onPress={handleAddAnnotation}
      >
        <Ionicons name="add-circle-outline" size={20} color="white" />
        <Text style={styles.addAnnotationText}>Add Annotation at {formatTime(position)}</Text>
      </TouchableOpacity>

      {/* Annotations List */}
      <ScrollView style={styles.annotationsList}>
        <Text style={styles.annotationsTitle}>Annotations</Text>
        {renderAnnotationList()}
      </ScrollView>

      {/* Annotation Modal */}
      <Modal
        visible={showAnnotationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAnnotationModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingFeedback ? 'Edit' : 'Add'} Annotation at {formatTime(selectedTimestamp)}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAnnotationModal(false)}
              >
                <Ionicons name="close" size={24} color={Colors.text.primary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.annotationInput}
              placeholder="Enter your feedback..."
              placeholderTextColor={Colors.text.secondary}
              value={annotationText}
              onChangeText={setAnnotationText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.ratingContainer}>
              <Text style={styles.ratingLabel}>Rating (optional):</Text>
              <View style={styles.ratingStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setAnnotationRating(star === annotationRating ? null : star)}
                  >
                    <Ionicons
                      name={star <= (annotationRating || 0) ? 'star' : 'star-outline'}
                      size={28}
                      color="#FFD700"
                      style={styles.ratingStar}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveAnnotation}
            >
              <Text style={styles.saveButtonText}>
                {editingFeedback ? 'Update' : 'Save'} Annotation
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
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
  timelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  timeline: {
    flex: 1,
    height: 40,
    marginHorizontal: 12,
    justifyContent: 'center',
  },
  timelineTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'visible',
  },
  timelineProgress: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  annotationMarker: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -6 }, { translateX: -6 }],
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: 'white',
  },
  timeText: {
    fontSize: 12,
    color: Colors.text.secondary,
    minWidth: 40,
  },
  addAnnotationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
  },
  addAnnotationText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  annotationsList: {
    flex: 1,
    padding: 16,
  },
  annotationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  annotationItem: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  annotationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  annotationTime: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  annotationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  annotationAction: {
    padding: 4,
  },
  annotationText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  annotationRating: {
    flexDirection: 'row',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  annotationInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text.primary,
    minHeight: 100,
    marginBottom: 16,
  },
  ratingContainer: {
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  ratingStars: {
    flexDirection: 'row',
  },
  ratingStar: {
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});