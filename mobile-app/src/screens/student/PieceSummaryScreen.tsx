import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { practiceSegmentService } from '../../services/practice-segment.service';
import { PieceArchiveSummary } from '../../types/practice';

// Early return styles
const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  text: {
    fontSize: 16,
    color: Colors.text,
  },
});

export const PieceSummaryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Ensure params exist
  if (!route.params) {
    return (
      <View style={errorStyles.container}>
        <Text style={errorStyles.text}>Error: No parameters provided</Text>
      </View>
    );
  }
  
  const params = route.params as { 
    pieceId: string; 
    pieceName: string;
    isArchived?: boolean;
  };
  
  console.log('[PieceSummaryScreen] Params:', params);
  
  const pieceId = params?.pieceId || '';
  const pieceName = params?.pieceName || '';
  const isArchived = params?.isArchived || false;
  
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<PieceArchiveSummary | null>(null);
  const [showingSummary, setShowingSummary] = useState(false);

  useEffect(() => {
    if (isArchived) {
      loadArchivedPieceSummary();
    }
  }, [isArchived, pieceId]);

  const loadArchivedPieceSummary = async () => {
    setLoading(true);
    try {
      // Get full archived piece details including segments
      const archivedPieceDetails = await practiceSegmentService.getArchivedPieceDetails(pieceId);
      console.log('[PieceSummaryScreen] Archived Piece Details:', JSON.stringify(archivedPieceDetails, null, 2));
      console.log('[PieceSummaryScreen] Summary object:', archivedPieceDetails.summary);
      console.log('[PieceSummaryScreen] completionPercentage:', archivedPieceDetails.summary?.completionPercentage);
      setSummary(archivedPieceDetails);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load piece details');
    } finally {
      setLoading(false);
    }
  };

  const handleArchivePiece = async () => {
    Alert.alert(
      'Archive Piece?',
      `Are you sure you want to archive "${pieceName}"? You can unarchive it later if needed.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: archivePiece,
        },
      ]
    );
  };

  const archivePiece = async () => {
    setLoading(true);
    try {
      const archiveSummary = await practiceSegmentService.archivePiece(pieceId);
      console.log('[PieceSummaryScreen] Archive Summary Received:', JSON.stringify(archiveSummary, null, 2));
      console.log('[PieceSummaryScreen] Summary object:', archiveSummary.summary);
      console.log('[PieceSummaryScreen] completionPercentage:', archiveSummary.summary?.completionPercentage);
      setSummary(archiveSummary);
      setShowingSummary(true);
      Alert.alert(
        'Piece Archived',
        'This piece has been archived successfully. Great work on your practice!',
        [
          {
            text: 'OK',
            // Don't navigate away - let user view the summary
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to archive piece');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (firstPracticed?: string, lastPracticed?: string) => {
    if (!firstPracticed || !lastPracticed) return 'N/A';
    
    const first = new Date(firstPracticed);
    const last = new Date(lastPracticed);
    const days = Math.floor((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '1 day';
    if (days === 1) return '2 days';
    return `${days + 1} days`;
  };

  const formatTimerDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>
          {isArchived ? 'Loading piece details...' : 'Archiving piece...'}
        </Text>
      </View>
    );
  }

  if (summary) {
    // Show archive summary after archiving
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          <Text style={styles.title}>Piece Archived!</Text>
          <Text style={styles.subtitle}>{summary.piece.name || ''}</Text>
          {summary.piece.composer ? (
            <Text style={styles.composer}>by {summary.piece.composer}</Text>
          ) : null}
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Practice Summary</Text>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Completion</Text>
            <Text style={styles.statValue}>
              {(summary.summary.completionPercentage || 0).toFixed(0)}%
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Practice Focuses</Text>
            <Text style={styles.statValue}>
              {`${summary.summary.completedSegments || 0}/${summary.summary.totalSegments || 0} completed`}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Clicks</Text>
            <Text style={styles.statValue}>{String(summary.summary.totalClicks || 0)}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Sessions</Text>
            <Text style={styles.statValue}>{String(summary.summary.sessionsPracticed || 0)}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>
              {formatDuration(summary.summary.firstPracticed, summary.summary.lastPracticed)}
            </Text>
          </View>

          {summary.summary.totalPracticeSeconds && summary.summary.totalPracticeSeconds > 0 ? (
            <>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Practice Time</Text>
                <Text style={styles.statValue}>
                  {formatTimerDuration(summary.summary.totalPracticeSeconds)}
                </Text>
              </View>

              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Average Session Time</Text>
                <Text style={styles.statValue}>
                  {formatTimerDuration(summary.summary.avgPracticeSeconds || 0)}
                </Text>
              </View>
            </>
          ) : null}

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Started</Text>
            <Text style={styles.statValue}>{formatDate(summary.summary.firstPracticed)}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statValue}>{formatDate(summary.summary.lastPracticed)}</Text>
          </View>
        </View>

        <View style={styles.focusesContainer}>
          <Text style={styles.sectionTitle}>Practice Focus Details</Text>
          {summary.segments && summary.segments.length > 0 ? summary.segments.map((segment) => (
            <View key={segment.id} style={styles.focusItem}>
              <View style={styles.focusInfo}>
                <Text style={styles.focusName}>{segment.name || ''}</Text>
                {segment.description ? (
                  <Text style={styles.focusDescription}>{segment.description}</Text>
                ) : null}
                <Text style={styles.focusStats}>
                  {`${segment.totalClickCount || 0} clicks • ${segment.isCompleted ? 'Completed' : 'Not completed'}`}
                </Text>
              </View>
              {segment.isCompleted ? (
                <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
              ) : null}
            </View>
          )) : null}
        </View>
      </ScrollView>
    );
  }

  // Show pre-archive summary (only if not already archived)
  if (!isArchived) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="musical-notes" size={64} color={Colors.primary} />
          <Text style={styles.title}>{pieceName || 'Unknown Piece'}</Text>
          <Text style={styles.subtitle}>Ready to archive this piece?</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Archiving a piece marks it as completed and removes it from your active practice list.
          </Text>
          <Text style={styles.infoText}>
            You'll receive a summary of your practice journey with this piece.
          </Text>
          <Text style={styles.infoText}>
            You can always unarchive the piece later if you want to practice it again.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.archiveButton}
          onPress={handleArchivePiece}
          disabled={loading}
        >
          <Ionicons name="archive" size={24} color={Colors.white} />
          <Text style={styles.archiveButtonText}>Archive Piece</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // If we get here, something went wrong
  return (
    <View style={styles.container}>
      <Text>Error loading piece data</Text>
    </View>
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
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  composer: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  infoContainer: {
    padding: 20,
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 12,
  },
  statsContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statLabel: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  focusesContainer: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  focusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  focusInfo: {
    flex: 1,
  },
  focusName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  focusDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  focusStats: {
    fontSize: 14,
    color: Colors.primary,
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  archiveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
    marginLeft: 8,
  },
  cancelButton: {
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 32,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});