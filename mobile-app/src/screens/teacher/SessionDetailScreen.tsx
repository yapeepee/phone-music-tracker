import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { SessionResponse } from '../../services/practice.service';
import feedbackService, { Feedback, FeedbackCreate } from '../../services/feedback.service';
import practiceService from '../../services/practice.service';
import videoApiService, { VideoResponse } from '../../services/video-api.service';
import { TeacherStackParamList } from '../../navigation/types';

// Extended types to handle both camelCase and snake_case from API
type SessionResponseFlexible = SessionResponse & {
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  self_rating?: number;
  student_id?: string;
  created_at?: string;
  updated_at?: string;
  // Fields that might exist
  durationMinutes?: number;
};

type FeedbackFlexible = Feedback & {
  createdAt?: string;
};

type VideoResponseFlexible = VideoResponse & {
  duration_seconds?: number;
  file_size_bytes?: number;
};

type SessionDetailRouteProp = RouteProp<TeacherStackParamList, 'SessionDetail'>;
type SessionDetailNavigationProp = StackNavigationProp<TeacherStackParamList, 'SessionDetail'>;

export const SessionDetailScreen: React.FC = () => {
  const route = useRoute<SessionDetailRouteProp>();
  const navigation = useNavigation<SessionDetailNavigationProp>();
  const { sessionId } = route.params;
  
  const [session, setSession] = useState<SessionResponseFlexible | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackFlexible[]>([]);
  const [videos, setVideos] = useState<VideoResponseFlexible[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  // Feedback form state
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      // Load session data first (critical)
      const sessionData = await practiceService.getSession(sessionId);
      if (__DEV__) {
        console.log('Session data received:', sessionData);
      }
      setSession(sessionData);
      
      // Load feedback and videos in parallel (non-critical)
      const promises = await Promise.allSettled([
        feedbackService.getSessionFeedback(sessionId),
        videoApiService.getSessionVideos(sessionId),
      ]);
      
      // Handle feedback result
      if (promises[0].status === 'fulfilled') {
        setFeedbacks(promises[0].value);
      } else {
        console.error('Failed to load feedback:', promises[0].reason);
      }
      
      // Handle videos result
      if (promises[1].status === 'fulfilled') {
        setVideos(promises[1].value);
      } else {
        console.error('Failed to load videos:', promises[1].reason);
        // Don't show error for videos - they might not exist
        setVideos([]);
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
      Alert.alert('Error', 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please enter feedback text');
      return;
    }

    setSubmitting(true);
    try {
      const newFeedback: FeedbackCreate = {
        session_id: sessionId,
        text: feedbackText.trim(),
        rating: feedbackRating || undefined,
      };

      const created = await feedbackService.createFeedback(newFeedback);
      setFeedbacks([created, ...feedbacks]);
      setFeedbackText('');
      setFeedbackRating(null);
      setShowFeedbackForm(false);
      Alert.alert('Success', 'Feedback added successfully');
    } catch (error) {
      console.error('Failed to create feedback:', error);
      Alert.alert('Error', 'Failed to add feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRatingStars = (rating: number | null, onPress?: (rating: number) => void) => {
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
          >
            <Ionicons
              name={rating && star <= rating ? 'star' : 'star-outline'}
              size={24}
              color={rating && star <= rating ? '#FFD700' : '#ccc'}
              style={styles.star}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderFeedbackItem = (feedback: FeedbackFlexible) => {
    return (
      <View key={feedback.id} style={styles.feedbackItem}>
        <View style={styles.feedbackHeader}>
          <Text style={styles.feedbackDate}>
            {(() => {
              const feedbackDate = new Date(feedback.createdAt || feedback.created_at || '');
              const isValid = !isNaN(feedbackDate.getTime());
              return isValid ? 
                feedbackDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                }) : 
                'Date not available';
            })()}
          </Text>
          {feedback.rating && renderRatingStars(feedback.rating)}
        </View>
        <Text style={styles.feedbackText}>{feedback.text}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading session details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Session not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const duration = session.durationMinutes || session.duration_minutes || 0;
  const startTime = session.startTime || session.start_time;
  const sessionDate = new Date(startTime || '');
  const isValidDate = !isNaN(sessionDate.getTime());

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Session Details</Text>
          </View>

          {/* Session Info */}
          <View style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              {session.focus && (
                <View style={styles.focusBadge}>
                  <Ionicons
                    name="flag"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.focusText}>
                    {session.focus}
                  </Text>
                </View>
              )}
              <Text style={styles.duration}>{duration} minutes</Text>
            </View>

            <Text style={styles.sessionDate}>
              {isValidDate ? 
                sessionDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }) : 
                'Date not available'
              }
            </Text>

            <Text style={styles.sessionTime}>
              {isValidDate ? 
                sessionDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                }) : 
                'Time not available'
              }
              {(session.endTime || session.end_time) && isValidDate && 
                ` - ${new Date(session.endTime || session.end_time || '').toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}`
              }
            </Text>

            {(session.selfRating || session.self_rating) && (
              <View style={styles.selfRatingContainer}>
                <Text style={styles.selfRatingLabel}>Student's self-rating:</Text>
                {renderRatingStars(session.selfRating || session.self_rating || null)}
              </View>
            )}

            {session.note && (
              <View style={styles.noteContainer}>
                <Text style={styles.noteLabel}>Student's notes:</Text>
                <Text style={styles.noteText}>{session.note}</Text>
              </View>
            )}

            {session.tags && session.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {session.tags.map((tag, index) => {
                  const tagName = typeof tag === 'string' ? tag : tag.name || tag.tagName || 'Unknown';
                  return (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tagName}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Video Section */}
          {videos.length > 0 && (
            <View style={styles.videoSection}>
              <Text style={styles.sectionTitle}>Practice Videos</Text>
              {videos.map((video) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoItem}
                  onPress={async () => {
                    try {
                      const videoWithUrl = await videoApiService.getVideoWithUrl(video.id);
                      
                      if (!videoWithUrl.url) {
                        Alert.alert('Error', 'Video URL is empty');
                        return;
                      }
                      
                      navigation.navigate('VideoAnnotation', {
                        videoId: video.id,
                        videoUrl: videoWithUrl.url,
                        sessionId: sessionId,
                      });
                    } catch (error) {
                      console.error('Failed to load video:', error);
                      Alert.alert('Error', 'Failed to load video');
                    }
                  }}
                >
                  <View style={styles.videoInfo}>
                    <Ionicons name="videocam" size={24} color={Colors.primary} />
                    <View style={styles.videoDetails}>
                      <Text style={styles.videoTitle}>Practice Video</Text>
                      <Text style={styles.videoMeta}>
                        {(() => {
                          const duration = video.durationSeconds || video.duration_seconds || 0;
                          const fileSize = video.fileSizeBytes || video.file_size_bytes || 0;
                          return `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} • ${(fileSize / 1024 / 1024).toFixed(1)}MB`;
                        })()}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Feedback Section */}
          <View style={styles.feedbackSection}>
            <View style={styles.feedbackHeaderRow}>
              <Text style={styles.sectionTitle}>Feedback</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowFeedbackForm(!showFeedbackForm)}
              >
                <Ionicons
                  name={showFeedbackForm ? 'close' : 'add'}
                  size={24}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </View>

            {showFeedbackForm && (
              <View style={styles.feedbackForm}>
                <Text style={styles.formLabel}>Your feedback:</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your feedback here..."
                  multiline
                  numberOfLines={4}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  textAlignVertical="top"
                />

                <Text style={styles.formLabel}>Rating (optional):</Text>
                {renderRatingStars(feedbackRating, setFeedbackRating)}

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSubmitFeedback}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Feedback</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {feedbacks.length > 0 ? (
              feedbacks.map(renderFeedbackItem)
            ) : (
              <Text style={styles.noFeedbackText}>
                No feedback yet. Tap + to add feedback.
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sessionCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  focusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  focusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 6,
  },
  duration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  sessionDate: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  selfRatingContainer: {
    marginBottom: 16,
  },
  selfRatingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginHorizontal: 2,
  },
  noteContainer: {
    marginBottom: 16,
  },
  noteLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#666',
  },
  feedbackSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    padding: 4,
  },
  feedbackForm: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
    minHeight: 100,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#999',
  },
  feedbackText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  noFeedbackText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
  videoSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  videoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  videoDetails: {
    marginLeft: 12,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  videoMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});