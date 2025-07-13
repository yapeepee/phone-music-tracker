import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { useStudentNavigation } from '../../hooks/navigation';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { selectRecentSessions } from '../../store/selectors/practice.selectors';
import { loadSessions } from '../../store/slices/practiceSlice';
import { Ionicons } from '@expo/vector-icons';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { NotificationBadge } from '../../components/notifications/NotificationBadge';
import { scheduleService, ScheduleEvent } from '../../services/schedule.service';
import { SessionDetailsModal } from '../../components/practice/SessionDetailsModal';
import { SessionResponse } from '../../services/practice.service';
import { currentPiecesService, CurrentPieceWithDetails } from '../../services/current-pieces.service';

export const HomeScreen: React.FC = () => {
  const navigation = useStudentNavigation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const recentSessions = useAppSelector(selectRecentSessions);
  const { activeUploads } = useVideoUpload();
  const hasActiveUploads = activeUploads.length > 0;
  
  const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionResponse | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [currentPieces, setCurrentPieces] = useState<CurrentPieceWithDetails[]>([]);
  const [currentPiecesLoading, setCurrentPiecesLoading] = useState(true);

  useEffect(() => {
    loadUpcomingEvents();
    loadCurrentPieces();
    // Load practice sessions from backend
    dispatch(loadSessions({ limit: 20 }));
  }, [dispatch]);

  const loadUpcomingEvents = async () => {
    try {
      const events = await scheduleService.getMyUpcomingEvents(7); // Next 7 days
      setUpcomingEvents(events.slice(0, 3)); // Show only first 3 events
    } catch (error) {
      console.error('Failed to load upcoming events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadCurrentPieces = async () => {
    try {
      const pieces = await currentPiecesService.getCurrentPieces(0, 3); // Show only first 3
      setCurrentPieces(pieces);
    } catch (error) {
      console.error('Failed to load current pieces:', error);
    } finally {
      setCurrentPiecesLoading(false);
    }
  };

  const handleSessionPress = (session: SessionResponse) => {
    setSelectedSession(session);
    setShowSessionDetails(true);
  };

  const handleCloseModal = () => {
    setShowSessionDetails(false);
    // Delay clearing session to avoid flicker during close animation
    setTimeout(() => setSelectedSession(null), 200);
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Hello, {user?.fullName || 'Student'}!</Text>
          <Text style={styles.subtitle}>Ready to practice today?</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation?.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
            <NotificationBadge size="small" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => navigation?.navigate('Uploads')}
          >
            <Ionicons name="cloud-upload-outline" size={24} color={Colors.primary} />
            {hasActiveUploads && (
              <View style={styles.uploadBadge}>
                <Text style={styles.uploadBadgeText}>{activeUploads.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Button
          title="Start Practice Session"
          onPress={() => navigation?.navigate('NewSession')}
          size="large"
          style={styles.primaryButton}
        />
        <Button
          title="Track Musical Pieces"
          onPress={() => navigation?.navigate('PieceSelection')}
          variant="outline"
          size="medium"
          style={styles.secondaryButton}
          icon={<Ionicons name="musical-notes-outline" size={20} color={Colors.primary} />}
        />
        <Button
          title="Find Practice Partners"
          onPress={() => navigation?.navigate('PracticePartners')}
          variant="outline"
          size="medium"
          style={styles.secondaryButton}
          icon={<Ionicons name="people-outline" size={20} color={Colors.primary} />}
        />
      </View>

      {/* Upcoming Lessons Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Lessons</Text>
          <TouchableOpacity onPress={() => navigation?.navigate('Notifications')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        
        {eventsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : upcomingEvents.length > 0 ? (
          upcomingEvents.map((event) => (
            <TouchableOpacity 
              key={event.id} 
              style={styles.eventCard}
              onPress={() => console.log('Event pressed:', event.id)}
            >
              <View style={[styles.eventIndicator, { backgroundColor: event.color || Colors.primary }]} />
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                <View style={styles.eventDetails}>
                  <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.eventTime}>
                    {new Date(event.startDatetime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })} at {new Date(event.startDatetime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>
                </View>
                {event.isOnline && (
                  <View style={styles.eventDetails}>
                    <Ionicons name="videocam-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.eventLocation}>Online Lesson</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No upcoming lessons</Text>
            <Text style={styles.emptySubtext}>Your teacher will schedule lessons for you</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
        {recentSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No practice sessions yet</Text>
            <Text style={styles.emptySubtext}>Start your first session to track your progress</Text>
          </View>
        ) : (
          recentSessions.map((session) => (
            <TouchableOpacity 
              key={session.id} 
              style={styles.sessionCard}
              onPress={() => handleSessionPress(session)}
            >
              <View style={styles.sessionHeader}>
                {session.focus && <Text style={styles.sessionFocus}>{session.focus}</Text>}
                <Text style={styles.sessionDate}>
                  {new Date(session.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.sessionFooter}>
                <Text style={styles.sessionRating}>Rating: {session.selfRating}/5</Text>
                <Text style={styles.sessionDuration}>
                  {session.endTime && (
                    `${Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)} min`
                  )}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Currently Working On Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Currently Working On</Text>
          <TouchableOpacity onPress={() => navigation?.navigate('PieceSelection')}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>
        
        {currentPiecesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : currentPieces.length > 0 ? (
          currentPieces.map((currentPiece) => (
            <TouchableOpacity 
              key={currentPiece.pieceId} 
              style={styles.currentPieceCard}
              onPress={() => navigation?.navigate('SegmentTracking', {
                pieceId: currentPiece.piece.id,
                pieceName: currentPiece.piece.name
              })}
            >
              <View style={styles.currentPieceContent}>
                <View style={styles.currentPieceInfo}>
                  <Text style={styles.currentPieceName}>{currentPiece.piece.name}</Text>
                  {currentPiece.piece.composer && (
                    <Text style={styles.currentPieceComposer}>{currentPiece.piece.composer}</Text>
                  )}
                  {currentPiece.notes && (
                    <Text style={styles.currentPieceNotes} numberOfLines={1}>{currentPiece.notes}</Text>
                  )}
                </View>
                <View style={styles.currentPiecePriority}>
                  <Ionicons 
                    name="star" 
                    size={16} 
                    color={currentPiece.priority <= 2 ? Colors.warning : Colors.textSecondary} 
                  />
                  <Text style={styles.priorityText}>P{currentPiece.priority}</Text>
                </View>
              </View>
              {currentPiece.lastPracticedAt && (
                <Text style={styles.lastPracticedText}>
                  Last practiced: {new Date(currentPiece.lastPracticedAt).toLocaleDateString()}
                </Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No pieces selected</Text>
            <Text style={styles.emptySubtext}>Mark pieces you're currently working on</Text>
            <TouchableOpacity 
              style={styles.selectPiecesButton}
              onPress={() => navigation?.navigate('PieceSelection')}
            >
              <Text style={styles.selectPiecesButtonText}>Select Pieces</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Goal</Text>
        <View style={styles.goalCard}>
          <Text style={styles.goalText}>Practice 5 days this week</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '40%' }]} />
          </View>
          <Text style={styles.goalProgress}>2/5 days completed</Text>
        </View>
      </View>
      </ScrollView>
      
      <SessionDetailsModal
        visible={showSessionDetails}
        onClose={handleCloseModal}
        session={selectedSession}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingTop: 48,
  },
  headerContent: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    position: 'relative',
    padding: 8,
    marginLeft: 8,
  },
  uploadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  quickActions: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  primaryButton: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    marginTop: 12,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  eventCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  eventDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  eventTime: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sessionFocus: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    textTransform: 'capitalize',
  },
  sessionDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sessionRating: {
    fontSize: 14,
    color: Colors.primary,
  },
  sessionDuration: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  goalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
  },
  goalText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.inputBackground,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 4,
  },
  goalProgress: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  currentPieceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currentPieceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentPieceInfo: {
    flex: 1,
  },
  currentPieceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  currentPieceComposer: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  currentPieceNotes: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  currentPiecePriority: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.backgroundDark,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  lastPracticedText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  selectPiecesButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  selectPiecesButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});