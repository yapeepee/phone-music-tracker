import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../../constants/colors';
import { AnnotatedVideoPlayer } from '../../components/teacher/AnnotatedVideoPlayer';
import feedbackService, { Feedback, FeedbackCreate } from '../../services/feedback.service';
import { TeacherStackParamList } from '../../navigation/types';

type VideoAnnotationRouteProp = RouteProp<TeacherStackParamList, 'VideoAnnotation'>;
type VideoAnnotationNavigationProp = StackNavigationProp<TeacherStackParamList, 'VideoAnnotation'>;

export const VideoAnnotationScreen: React.FC = () => {
  const route = useRoute<VideoAnnotationRouteProp>();
  const navigation = useNavigation<VideoAnnotationNavigationProp>();
  const { videoId, videoUrl, sessionId } = route.params;
  
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideoFeedback();
  }, [videoId]);

  const loadVideoFeedback = async () => {
    try {
      const feedbackData = await feedbackService.getVideoFeedback(videoId);
      setFeedbacks(feedbackData);
    } catch (error) {
      console.error('Failed to load video feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeedback = async (timestamp: number, text: string, rating?: number) => {
    try {
      const newFeedback: FeedbackCreate = {
        video_id: videoId,
        text,
        rating,
        timestamp_seconds: timestamp,
      };

      const created = await feedbackService.createFeedback(newFeedback);
      setFeedbacks([...feedbacks, created]);
      Alert.alert('Success', 'Annotation added successfully');
    } catch (error) {
      console.error('Failed to add annotation:', error);
      throw error;
    }
  };

  const handleUpdateFeedback = async (feedbackId: string, text: string, rating?: number) => {
    try {
      const updated = await feedbackService.updateFeedback(feedbackId, { text, rating });
      setFeedbacks(feedbacks.map(f => f.id === feedbackId ? updated : f));
      Alert.alert('Success', 'Annotation updated successfully');
    } catch (error) {
      console.error('Failed to update annotation:', error);
      throw error;
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    try {
      await feedbackService.deleteFeedback(feedbackId);
      setFeedbacks(feedbacks.filter(f => f.id !== feedbackId));
    } catch (error) {
      console.error('Failed to delete annotation:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Video Annotation</Text>
        <Text style={styles.subtitle}>
          Tap on the video timeline or use the button to add annotations
        </Text>
      </View>

      <AnnotatedVideoPlayer
        videoUrl={videoUrl}
        existingFeedback={feedbacks}
        onAddFeedback={handleAddFeedback}
        onUpdateFeedback={handleUpdateFeedback}
        onDeleteFeedback={handleDeleteFeedback}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  header: {
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
});