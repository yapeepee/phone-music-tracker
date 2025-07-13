import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { SessionResponse } from '../../services/practice.service';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SessionDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  session: SessionResponse | null;
}

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  visible,
  onClose,
  session,
}) => {
  // Animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Animate in with spring effect
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      // Animate out
      scale.value = withTiming(0, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedModalStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const animatedOverlayStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  if (!session) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDuration = () => {
    if (!session.endTime) return 'In progress';
    const start = new Date(session.startTime);
    const end = new Date(session.endTime);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTags = () => {
    if (!session.tags || session.tags.length === 0) return null;
    return session.tags.join(', ');
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.modalOverlay, animatedOverlayStyle]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.modalContent, animatedModalStyle]}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Session Details</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                {/* Date & Time Card */}
                <View style={styles.card}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{formatDate(session.createdAt)}</Text>
                    <Text style={styles.cardSubtitle}>
                      {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : 'Ongoing'}
                    </Text>
                  </View>
                </View>

                {/* Duration Card */}
                <View style={styles.card}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="time-outline" size={24} color={Colors.secondary} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>Duration</Text>
                    <Text style={styles.cardSubtitle}>{getDuration()}</Text>
                  </View>
                </View>

                {/* Focus Area */}
                {session.focus && (
                  <View style={styles.card}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="flag-outline" size={24} color="#FF6B6B" />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>Focus Area</Text>
                      <Text style={styles.cardSubtitle}>{session.focus}</Text>
                    </View>
                  </View>
                )}

                {/* Self Rating */}
                {session.selfRating !== null && session.selfRating !== undefined && (
                  <View style={styles.card}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="star" size={24} color="#FFD700" />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>Self Rating</Text>
                      <View style={styles.ratingContainer}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Ionicons
                            key={star}
                            name={star <= session.selfRating! ? "star" : "star-outline"}
                            size={20}
                            color="#FFD700"
                            style={styles.star}
                          />
                        ))}
                        <Text style={styles.ratingText}>{session.selfRating}/5</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Tags */}
                {getTags() && (
                  <View style={styles.card}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="pricetag-outline" size={24} color="#4ECDC4" />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>Tags</Text>
                      <Text style={styles.cardSubtitle}>{getTags()}</Text>
                    </View>
                  </View>
                )}

                {/* Notes */}
                {session.notes && (
                  <View style={styles.notesCard}>
                    <View style={styles.notesHeader}>
                      <Ionicons name="document-text-outline" size={24} color={Colors.primary} />
                      <Text style={styles.notesTitle}>Practice Notes</Text>
                    </View>
                    <Text style={styles.notesText}>{session.notes}</Text>
                  </View>
                )}

                {/* Video Count */}
                {session.videoCount !== undefined && session.videoCount > 0 && (
                  <View style={styles.card}>
                    <View style={styles.iconContainer}>
                      <Ionicons name="videocam-outline" size={24} color="#9B59B6" />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>Videos Recorded</Text>
                      <Text style={styles.cardSubtitle}>{session.videoCount} video{session.videoCount > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: screenHeight * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  star: {
    marginRight: 2,
  },
  ratingText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  notesCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 8,
  },
  notesText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
});