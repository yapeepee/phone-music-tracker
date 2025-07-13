import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { PracticeSegment, Tag } from '../../types/practice';
import { tempoService, TempoStats } from '../../services/tempo.service';
import { practiceSegmentService } from '../../services/practice-segment.service';

interface SessionSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sessionDuration: number; // in minutes
  practiceSegments: PracticeSegment[];
  segmentClicks: Record<string, number>;
  sessionStartTime: string;
  sessionEndTime?: string;
  timerSeconds?: number;
  timerEvents?: Array<{ type: 'pause' | 'resume', timestamp: string }>;
  tempoPoints?: number;
  sessionId?: string;
  selectedPiece?: Tag | null;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  visible,
  onClose,
  onConfirm,
  sessionDuration,
  practiceSegments,
  segmentClicks,
  sessionStartTime,
  sessionEndTime,
  timerSeconds = 0,
  timerEvents = [],
  tempoPoints = 0,
  sessionId,
  selectedPiece,
}) => {
  const [tempoStats, setTempoStats] = useState<TempoStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [showArchiveOption, setShowArchiveOption] = useState(false);
  
  // Fetch tempo stats when modal opens
  useEffect(() => {
    if (visible && sessionId && tempoPoints && tempoPoints > 0) {
      const fetchTempoStats = async () => {
        setLoadingStats(true);
        setStatsError(null);
        try {
          const stats = await tempoService.getSessionTempoStats(sessionId);
          setTempoStats(stats);
        } catch (error) {
          console.error('Failed to fetch tempo stats:', error);
          setStatsError('Failed to load tempo statistics');
        } finally {
          setLoadingStats(false);
        }
      };
      
      fetchTempoStats();
    }
  }, [visible, sessionId, tempoPoints]);
  
  // Check if piece is completed (all segments marked as completed)
  useEffect(() => {
    if (visible && selectedPiece && practiceSegments.length > 0) {
      const allCompleted = practiceSegments.every(segment => segment.is_completed);
      const hasSegments = practiceSegments.length > 0;
      setShowArchiveOption(allCompleted && hasSegments);
    }
  }, [visible, selectedPiece, practiceSegments]);
  
  console.log('SessionSummaryModal render, visible:', visible);
  console.log('sessionDuration:', sessionDuration);
  console.log('practiceSegments length:', practiceSegments?.length);
  // Calculate total clicks for this session
  const totalClicks = segmentClicks && typeof segmentClicks === 'object'
    ? Object.values(segmentClicks).reduce((sum, clicks) => sum + (clicks || 0), 0)
    : 0;
  
  // Filter segments that were clicked
  const clickedSegments = practiceSegments && Array.isArray(practiceSegments)
    ? practiceSegments.filter(segment => 
        segmentClicks && segmentClicks[segment.id] && segmentClicks[segment.id] > 0
      )
    : [];

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.error('Error formatting time:', error);
      return '';
    }
  };

  const formatTimerDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  // Calculate pause time
  const calculatePauseTime = (): number => {
    let pauseTime = 0;
    let pauseStart: string | null = null;

    timerEvents.forEach(event => {
      if (event.type === 'pause') {
        pauseStart = event.timestamp;
      } else if (event.type === 'resume' && pauseStart) {
        const pauseDuration = new Date(event.timestamp).getTime() - new Date(pauseStart).getTime();
        pauseTime += pauseDuration / 1000; // Convert to seconds
        pauseStart = null;
      }
    });

    return Math.round(pauseTime);
  };

  const formatSeconds = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getComplianceColor = (percentage: number): string => {
    if (percentage >= 80) return Colors.success;
    if (percentage >= 60) return Colors.warning;
    return Colors.error;
  };
  
  const handleArchivePiece = async () => {
    if (!selectedPiece) return;
    
    Alert.alert(
      'Archive Piece?',
      `Congratulations on completing "${selectedPiece.name}"! Would you like to archive this piece? You can always unarchive it later if needed.`,
      [
        {
          text: 'Not Now',
          style: 'cancel',
        },
        {
          text: 'Archive',
          onPress: async () => {
            setArchiving(true);
            try {
              await practiceSegmentService.archivePiece(selectedPiece.id);
              Alert.alert(
                'Success',
                `"${selectedPiece.name}" has been archived successfully!`,
                [{ 
                  text: 'OK', 
                  onPress: () => {
                    // Close the modal and end session
                    onConfirm();
                  }
                }]
              );
            } catch (error) {
              console.error('Failed to archive piece:', error);
              Alert.alert('Error', 'Failed to archive piece. Please try again later.');
            } finally {
              setArchiving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Session Summary</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Duration Section */}
            <View style={styles.section}>
              <View style={styles.durationCard}>
                <Ionicons name="time-outline" size={32} color={Colors.primary} />
                <View style={styles.durationInfo}>
                  <Text style={styles.durationText}>{formatDuration(sessionDuration)}</Text>
                  <Text style={styles.timeRange}>
                    {formatTime(sessionStartTime)} - {sessionEndTime && sessionEndTime !== '' ? formatTime(sessionEndTime) : 'Now'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Timer Section */}
            {timerSeconds > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Practice Timer</Text>
                <View style={styles.timerCard}>
                  <View style={styles.timerRow}>
                    <Text style={styles.timerLabel}>Active Practice Time:</Text>
                    <Text style={styles.timerValue}>{formatTimerDuration(timerSeconds)}</Text>
                  </View>
                  {timerEvents.length > 0 && (
                    <>
                      <View style={styles.timerRow}>
                        <Text style={styles.timerLabel}>Pause Count:</Text>
                        <Text style={styles.timerValue}>
                          {timerEvents.filter(e => e.type === 'pause').length}
                        </Text>
                      </View>
                      <View style={styles.timerRow}>
                        <Text style={styles.timerLabel}>Total Pause Time:</Text>
                        <Text style={styles.timerValue}>
                          {formatTimerDuration(calculatePauseTime())}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* Tempo Statistics Section */}
            {tempoPoints > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tempo Practice Statistics</Text>
                
                {loadingStats ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Loading tempo statistics...</Text>
                  </View>
                ) : statsError ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={24} color={Colors.error} />
                    <Text style={styles.errorText}>{statsError}</Text>
                  </View>
                ) : tempoStats ? (
                  <>
                    {/* Points Summary */}
                    <View style={styles.pointsContainer}>
                      <Ionicons name="star" size={32} color={Colors.warning} />
                      <View style={styles.pointsInfo}>
                        <Text style={styles.pointsValue}>{tempoStats.total_points_earned} Points Earned!</Text>
                        <Text style={styles.pointsDescription}>
                          Great job practicing under tempo!
                        </Text>
                      </View>
                    </View>

                    {/* Tempo Comparison */}
                    <View style={styles.statsCard}>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Target Tempo</Text>
                          <Text style={styles.statValue}>{Math.round(tempoStats.target_tempo)} BPM</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Average Tempo</Text>
                          <Text style={styles.statValue}>{Math.round(tempoStats.average_tempo)} BPM</Text>
                        </View>
                      </View>
                    </View>

                    {/* Time Distribution */}
                    <View style={styles.statsCard}>
                      <Text style={styles.statsCardTitle}>Time Distribution</Text>
                      <View style={styles.timeStats}>
                        <View style={styles.timeStatRow}>
                          <Ionicons name="trending-down" size={20} color={Colors.success} />
                          <Text style={styles.timeStatLabel}>Under Tempo:</Text>
                          <Text style={[styles.timeStatValue, { color: Colors.success }]}>
                            {formatSeconds(tempoStats.time_under_tempo_seconds)}
                          </Text>
                        </View>
                        <View style={styles.timeStatRow}>
                          <Ionicons name="trending-up" size={20} color={Colors.error} />
                          <Text style={styles.timeStatLabel}>Over Tempo:</Text>
                          <Text style={[styles.timeStatValue, { color: Colors.error }]}>
                            {formatSeconds(tempoStats.time_over_tempo_seconds)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Compliance Percentage */}
                    <View style={styles.complianceCard}>
                      <Text style={styles.complianceTitle}>Tempo Compliance</Text>
                      <View style={styles.complianceContent}>
                        <View style={styles.complianceCircle}>
                          <Text style={[styles.compliancePercentage, { color: getComplianceColor(tempoStats.compliance_percentage) }]}>
                            {Math.round(tempoStats.compliance_percentage)}%
                          </Text>
                        </View>
                        <View style={styles.complianceBarContainer}>
                          <View style={styles.complianceBarBackground}>
                            <View 
                              style={[
                                styles.complianceBarFill, 
                                { 
                                  width: `${tempoStats.compliance_percentage}%`,
                                  backgroundColor: getComplianceColor(tempoStats.compliance_percentage)
                                }
                              ]} 
                            />
                          </View>
                          <Text style={styles.complianceMessage}>
                            {tempoStats.compliance_percentage >= 80 
                              ? "Excellent tempo control!" 
                              : tempoStats.compliance_percentage >= 60 
                              ? "Good effort, keep practicing!" 
                              : "Keep working on your tempo control"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </>
                ) : (
                  /* Fallback to simple points display if stats not loaded */
                  <View style={styles.pointsContainer}>
                    <Ionicons name="star" size={32} color={Colors.warning} />
                    <View style={styles.pointsInfo}>
                      <Text style={styles.pointsValue}>{tempoPoints} Points Earned!</Text>
                      <Text style={styles.pointsDescription}>
                        Great job practicing under tempo!
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Practice Focuses Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Practice Focus Activity</Text>
              
              {clickedSegments.length > 0 ? (
                <>
                  <View style={styles.statsRow}>
                    <Text style={styles.statsText}>Total clicks this session:</Text>
                    <Text style={styles.statsValue}>{totalClicks}</Text>
                  </View>
                  
                  <View style={styles.focusList}>
                    {clickedSegments.map((segment) => (
                      <View key={segment.id} style={styles.focusItem}>
                        <View style={styles.focusInfo}>
                          <Text style={styles.focusName}>{segment.name}</Text>
                          {segment.description && (
                            <Text style={styles.focusDescription}>{segment.description}</Text>
                          )}
                        </View>
                        <View style={styles.clickCount}>
                          <Text style={styles.clickNumber}>{segmentClicks[segment.id]}</Text>
                          <Text style={styles.clickLabel}>clicks</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.noFocusText}>
                  No practice focuses were tracked during this session.
                </Text>
              )}
            </View>

            {/* Summary Message */}
            <View style={styles.section}>
              <View style={styles.summaryCard}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={40} 
                  color={Colors.success} 
                />
                <Text style={styles.summaryText}>
                  Great practice session! Your progress has been saved.
                </Text>
              </View>
            </View>
            
            {/* Archive Piece Option */}
            {showArchiveOption && selectedPiece && (
              <View style={styles.section}>
                <View style={styles.archiveCard}>
                  <View style={styles.archiveHeader}>
                    <Ionicons 
                      name="trophy" 
                      size={32} 
                      color={Colors.warning} 
                    />
                    <View style={styles.archiveTextContainer}>
                      <Text style={styles.archiveTitle}>Piece Completed!</Text>
                      <Text style={styles.archiveSubtitle}>
                        All practice focuses for "{selectedPiece.name}" have been completed
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.archiveButton, archiving && styles.archiveButtonDisabled]}
                    onPress={handleArchivePiece}
                    disabled={archiving}
                  >
                    {archiving ? (
                      <ActivityIndicator size="small" color={Colors.surface} />
                    ) : (
                      <>
                        <Ionicons name="archive-outline" size={20} color={Colors.surface} />
                        <Text style={styles.archiveButtonText}>Archive Piece</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
              <Text style={styles.secondaryButtonText}>Continue Editing</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={onConfirm}>
              <Text style={styles.primaryButtonText}>End Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  body: {
    paddingHorizontal: 24,
    maxHeight: 400,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  durationInfo: {
    flex: 1,
  },
  durationText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  timeRange: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsText: {
    fontSize: 16,
    color: Colors.text,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  focusList: {
    gap: 12,
  },
  focusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
  },
  focusInfo: {
    flex: 1,
    marginRight: 16,
  },
  focusName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  focusDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  clickCount: {
    alignItems: 'center',
    minWidth: 60,
  },
  clickNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  clickLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  noFocusText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  summaryCard: {
    backgroundColor: Colors.success + '15',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
  timerCard: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  timerValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.warning + '10',
    padding: 16,
    borderRadius: 12,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.warning,
  },
  pointsDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.error + '10',
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 16,
    color: Colors.error,
  },
  statsCard: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  statsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  timeStats: {
    gap: 12,
  },
  timeStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeStatLabel: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  timeStatValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  complianceCard: {
    backgroundColor: Colors.background,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  complianceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  complianceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  complianceCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compliancePercentage: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  complianceBarContainer: {
    flex: 1,
  },
  complianceBarBackground: {
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  complianceBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  complianceMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  archiveCard: {
    backgroundColor: Colors.warning + '10',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  archiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  archiveTextContainer: {
    flex: 1,
  },
  archiveTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  archiveSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  archiveButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  archiveButtonDisabled: {
    opacity: 0.6,
  },
  archiveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});