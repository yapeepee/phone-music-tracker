import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { 
  scheduleService, 
  ScheduleEventWithConflicts,
  EventStatus,
} from '../../services/schedule.service';
import { useAppSelector } from '../../hooks/redux';

type EventDetailsRouteProp = RouteProp<{ EventDetails: { eventId: string } }, 'EventDetails'>;

export const EventDetailsScreen: React.FC = () => {
  const route = useRoute<EventDetailsRouteProp>();
  const navigation = useNavigation();
  const user = useAppSelector((state) => state.auth.user);
  
  const { eventId } = route.params;
  
  const [event, setEvent] = useState<ScheduleEventWithConflicts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(null);

  useEffect(() => {
    loadEventDetails();
  }, [eventId]);

  const loadEventDetails = async () => {
    try {
      setError(null);
      const eventData = await scheduleService.getEvent(eventId, true);
      setEvent(eventData);
    } catch (error) {
      console.error('Failed to load event details:', error);
      setError('Failed to load event details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = () => {
    // Navigate to edit event screen
    // navigation.navigate('EditEvent', { eventId });
    console.log('Edit event');
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      'Cancel Event',
      'Are you sure you want to cancel this event?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel Event',
          style: 'destructive',
          onPress: async () => {
            try {
              await scheduleService.deleteEvent(eventId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel event. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleResolveConflict = async (conflictId: string, status: 'resolved' | 'ignored') => {
    Alert.alert(
      status === 'resolved' ? 'Resolve Conflict' : 'Ignore Conflict',
      status === 'resolved' 
        ? 'Mark this conflict as resolved? This indicates you have addressed the scheduling issue.'
        : 'Ignore this conflict? You can still address it later if needed.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setResolvingConflict(conflictId);
              await scheduleService.resolveConflict(conflictId, {
                resolution_status: status,
                resolution_note: status === 'resolved' 
                  ? 'Conflict resolved by teacher'
                  : 'Conflict acknowledged and ignored',
              });
              // Reload event details to get updated conflict status
              await loadEventDetails();
            } catch (error) {
              Alert.alert('Error', 'Failed to update conflict status. Please try again.');
            } finally {
              setResolvingConflict(null);
            }
          },
        },
      ],
    );
  };

  const handleJoinOnlineEvent = () => {
    if (event?.meeting_url) {
      // Open meeting URL in browser
      console.log('Open meeting URL:', event.meeting_url);
    }
  };

  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error || 'Event not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadEventDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const startDateTime = formatDateTime(event.start_datetime);
  const endDateTime = formatDateTime(event.end_datetime);
  const isTeacher = user?.role === 'teacher' && event.teacher_id === user.id;
  const isPast = scheduleService.isPast(event);
  const isUpcoming = !isPast;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          {isTeacher && (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleEditEvent} style={styles.headerButton}>
                <MaterialIcons name="edit" size={24} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteEvent} style={styles.headerButton}>
                <MaterialIcons name="delete" size={24} color={Colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Event Type Badge */}
        <View style={styles.typeBadgeContainer}>
          <View style={[styles.typeBadge, { backgroundColor: event.color || Colors.primary }]}>
            <MaterialIcons 
              name={scheduleService.getEventTypeIcon(event.event_type) as any} 
              size={20} 
              color="white" 
            />
            <Text style={styles.typeBadgeText}>
              {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
            </Text>
          </View>
          {event.status !== EventStatus.SCHEDULED && (
            <View style={[
              styles.statusBadge,
              { backgroundColor: scheduleService.getEventStatusColor(event.status) }
            ]}>
              <Text style={styles.statusBadgeText}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Title and Description */}
        <Text style={styles.title}>{event.title}</Text>
        {event.description && (
          <Text style={styles.description}>{event.description}</Text>
        )}

        {/* Date and Time */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <MaterialIcons name="event" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{startDateTime.date}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="access-time" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoText}>
              {startDateTime.time} - {endDateTime.time}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="timer" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{event.duration_minutes} minutes</Text>
          </View>
        </View>

        {/* Location */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <MaterialIcons 
              name={event.is_online ? "videocam" : "location-on"} 
              size={20} 
              color={Colors.textSecondary} 
            />
            <Text style={styles.infoText}>
              {event.is_online ? 'Online Lesson' : event.location || 'Location not specified'}
            </Text>
          </View>
          {event.is_online && event.meeting_url && isUpcoming && (
            <Button
              title="Join Online Lesson"
              onPress={handleJoinOnlineEvent}
              variant="primary"
              style={styles.joinButton}
              icon={<MaterialIcons name="videocam" size={20} color="white" />}
            />
          )}
        </View>

        {/* Participants */}
        {event.participants && event.participants.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Participants</Text>
            {event.participants.map((participant) => (
              <View key={participant.id} style={styles.participantRow}>
                <MaterialIcons name="person" size={20} color={Colors.textSecondary} />
                <Text style={styles.participantName}>{participant.full_name}</Text>
                <Text style={styles.participantEmail}>{participant.email}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recurrence Info */}
        {event.recurrence_rule && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Recurrence</Text>
            <View style={styles.infoRow}>
              <MaterialIcons name="repeat" size={20} color={Colors.textSecondary} />
              <Text style={styles.infoText}>
                {event.recurrence_rule.recurrence_type.charAt(0).toUpperCase() + 
                 event.recurrence_rule.recurrence_type.slice(1)} event
              </Text>
            </View>
          </View>
        )}

        {/* Conflicts */}
        {event.conflicts && event.conflicts.length > 0 && (
          <View style={styles.infoSection}>
            <Text style={[styles.sectionTitle, { color: Colors.error }]}>Conflicts</Text>
            {event.conflicts.map((conflict) => {
              const isResolving = resolvingConflict === conflict.id;
              const isResolved = conflict.resolution_status === 'resolved';
              const isIgnored = conflict.resolution_status === 'ignored';
              
              return (
                <View key={conflict.id} style={styles.conflictCard}>
                  <MaterialIcons 
                    name={isResolved ? "check-circle" : "warning"} 
                    size={20} 
                    color={isResolved ? Colors.success : Colors.error} 
                  />
                  <View style={styles.conflictContent}>
                    <Text style={[
                      styles.conflictType,
                      isResolved && { color: Colors.success }
                    ]}>
                      {conflict.conflict_type.replace(/_/g, ' ').charAt(0).toUpperCase() + 
                       conflict.conflict_type.replace(/_/g, ' ').slice(1)}
                      {isResolved && ' (Resolved)'}
                      {isIgnored && ' (Ignored)'}
                    </Text>
                    {conflict.conflicting_event && (
                      <Text style={styles.conflictDetails}>
                        With: {conflict.conflicting_event.title}
                      </Text>
                    )}
                    {!isResolved && !isIgnored && (
                      <View style={styles.conflictActions}>
                        <TouchableOpacity
                          style={[styles.conflictButton, styles.resolveButton]}
                          onPress={() => handleResolveConflict(conflict.id, 'resolved')}
                          disabled={isResolving}
                        >
                          {isResolving ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <>
                              <MaterialIcons name="check" size={16} color="white" />
                              <Text style={styles.conflictButtonText}>Resolve</Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.conflictButton, styles.ignoreButton]}
                          onPress={() => handleResolveConflict(conflict.id, 'ignored')}
                          disabled={isResolving}
                        >
                          {isResolving ? (
                            <ActivityIndicator size="small" color={Colors.textSecondary} />
                          ) : (
                            <>
                              <MaterialIcons name="close" size={16} color={Colors.textSecondary} />
                              <Text style={[styles.conflictButtonText, { color: Colors.textSecondary }]}>Ignore</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Reminder Settings */}
        {isUpcoming && event.reminder_minutes > 0 && (
          <View style={styles.reminderSection}>
            <MaterialIcons name="notifications" size={20} color={Colors.primary} />
            <Text style={styles.reminderText}>
              Reminder set for {event.reminder_minutes} minutes before
            </Text>
          </View>
        )}
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  typeBadgeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 24,
    lineHeight: 24,
  },
  infoSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  joinButton: {
    marginTop: 12,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  participantName: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  participantEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  conflictCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  conflictContent: {
    flex: 1,
  },
  conflictType: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.error,
  },
  conflictDetails: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  conflictActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  conflictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  resolveButton: {
    backgroundColor: Colors.success,
  },
  ignoreButton: {
    backgroundColor: Colors.border,
  },
  conflictButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
  },
  reminderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  reminderText: {
    fontSize: 14,
    color: Colors.primary,
    flex: 1,
  },
});