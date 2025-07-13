import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { StudentStackParamList } from '../../navigation/types';
import { useAppSelector } from '../../hooks/redux';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { 
  practiceSegmentService, 
  PieceProgress,
  PracticeSegment,
  CreatePracticeSegmentInput
} from '../../services/practice-segment.service';

type SegmentTrackingScreenRouteProp = RouteProp<StudentStackParamList, 'SegmentTracking'>;
type SegmentTrackingScreenNavigationProp = StackNavigationProp<StudentStackParamList, 'SegmentTracking'>;

interface Props {
  route: SegmentTrackingScreenRouteProp;
  navigation: SegmentTrackingScreenNavigationProp;
}

export const SegmentTrackingScreen: React.FC<Props> = ({ route, navigation }) => {
  const { pieceId, pieceName } = route.params;
  const currentSession = useAppSelector((state) => state.practice.currentSession);
  
  const [segments, setSegments] = useState<PracticeSegment[]>([]);
  const [pieceProgress, setPieceProgress] = useState<PieceProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clickedSegments, setClickedSegments] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [newSegmentDescription, setNewSegmentDescription] = useState('');
  const [savingSegment, setSavingSegment] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: pieceName,
      headerStyle: {
        backgroundColor: Colors.surface,
      },
      headerTintColor: Colors.text,
      headerTitleStyle: {
        fontWeight: '600',
      },
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('PieceSummary' as any, { pieceId, pieceName })}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="archive-outline" size={24} color={Colors.text} />
        </TouchableOpacity>
      ),
    });
    
    loadData();
  }, [pieceId, pieceName, navigation]);

  const loadData = async () => {
    try {
      const [segmentsData, progressData] = await Promise.all([
        practiceSegmentService.getPieceSegments(pieceId),
        practiceSegmentService.getPieceProgress(pieceId)
      ]);
      
      setSegments(segmentsData);
      setPieceProgress(progressData);
    } catch (error) {
      console.error('Failed to load segment data:', error);
      Alert.alert('Error', 'Failed to load practice segments. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSegmentClick = async (segment: PracticeSegment) => {
    if (!currentSession) {
      Alert.alert(
        'No Active Session',
        'Please start a practice session first to track segment clicks.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Add visual feedback
    setClickedSegments(prev => new Set([...prev, segment.id]));
    setTimeout(() => {
      setClickedSegments(prev => {
        const next = new Set(prev);
        next.delete(segment.id);
        return next;
      });
    }, 300);

    try {
      await practiceSegmentService.recordSegmentClick({
        segment_id: segment.id,
        session_id: currentSession.id,
        click_count: 1
      });
      
      // Update local state optimistically
      setSegments(prev => prev.map(s => 
        s.id === segment.id 
          ? { ...s, total_click_count: s.total_click_count + 1, last_clicked_at: new Date().toISOString() }
          : s
      ));
    } catch (error) {
      console.error('Failed to record segment click:', error);
      // Fail silently to not interrupt practice flow
    }
  };

  const handleSegmentComplete = async (segment: PracticeSegment) => {
    try {
      await practiceSegmentService.updateSegment(segment.id, {
        is_completed: !segment.is_completed
      });
      
      // Update local state
      setSegments(prev => prev.map(s => 
        s.id === segment.id 
          ? { ...s, is_completed: !s.is_completed, completed_at: !s.is_completed ? new Date().toISOString() : undefined }
          : s
      ));
      
      // Update progress
      if (pieceProgress) {
        setPieceProgress({
          ...pieceProgress,
          completed_segments: segment.is_completed 
            ? pieceProgress.completed_segments - 1 
            : pieceProgress.completed_segments + 1,
          completion_percentage: segment.is_completed
            ? Math.round(((pieceProgress.completed_segments - 1) / pieceProgress.total_segments) * 100)
            : Math.round(((pieceProgress.completed_segments + 1) / pieceProgress.total_segments) * 100)
        });
      }
    } catch (error) {
      console.error('Failed to update segment completion:', error);
      Alert.alert('Error', 'Failed to update segment. Please try again.');
    }
  };

  const handleAddSegment = async () => {
    if (!newSegmentName.trim()) {
      Alert.alert('Error', 'Please enter a segment name.');
      return;
    }

    setSavingSegment(true);
    try {
      const newSegment = await practiceSegmentService.createSegment({
        piece_tag_id: pieceId,
        name: newSegmentName.trim(),
        description: newSegmentDescription.trim() || undefined,
        display_order: segments.length
      });
      
      setSegments(prev => [...prev, newSegment]);
      setShowAddModal(false);
      setNewSegmentName('');
      setNewSegmentDescription('');
      
      // Update progress
      if (pieceProgress) {
        setPieceProgress({
          ...pieceProgress,
          total_segments: pieceProgress.total_segments + 1,
          completion_percentage: Math.round((pieceProgress.completed_segments / (pieceProgress.total_segments + 1)) * 100)
        });
      }
    } catch (error) {
      console.error('Failed to create segment:', error);
      Alert.alert('Error', 'Failed to create segment. Please try again.');
    } finally {
      setSavingSegment(false);
    }
  };

  const renderSegmentCard = (segment: PracticeSegment) => {
    const isClicked = clickedSegments.has(segment.id);
    const lastClickedDate = segment.last_clicked_at 
      ? new Date(segment.last_clicked_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null;

    return (
      <View key={segment.id} style={styles.segmentCard}>
        <TouchableOpacity
          style={[
            styles.segmentContent,
            isClicked && styles.segmentClicked,
            segment.is_completed && styles.segmentCompleted
          ]}
          onPress={() => handleSegmentClick(segment)}
          activeOpacity={0.7}
        >
          <View style={styles.segmentHeader}>
            <View style={styles.segmentInfo}>
              <Text style={[styles.segmentName, segment.is_completed && styles.completedText]}>
                {segment.name}
              </Text>
              {segment.description && (
                <Text style={styles.segmentDescription}>{segment.description}</Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.completeButton, segment.is_completed && styles.completeButtonActive]}
              onPress={() => handleSegmentComplete(segment)}
            >
              <Ionicons 
                name={segment.is_completed ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={24} 
                color={segment.is_completed ? Colors.success : Colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.segmentStats}>
            <View style={styles.stat}>
              <Ionicons name="hand-left" size={14} color={Colors.textSecondary} />
              <Text style={styles.statText}>{segment.total_click_count} clicks</Text>
            </View>
            {lastClickedDate && (
              <View style={styles.stat}>
                <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                <Text style={styles.statText}>Last: {lastClickedDate}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading segments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {pieceProgress && (
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Overall Progress</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${pieceProgress.completion_percentage}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {pieceProgress.completed_segments} of {pieceProgress.total_segments} segments completed ({pieceProgress.completion_percentage}%)
          </Text>
        </View>
      )}

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {segments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="layers-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No segments yet</Text>
            <Text style={styles.emptySubtext}>
              Break down this piece into manageable practice segments
            </Text>
          </View>
        ) : (
          <View style={styles.segmentsList}>
            {segments.map(renderSegmentCard)}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButtons}>
          <Button
            title="Ask Question"
            onPress={() => {
              navigation.navigate('CreatePost' as any, {
                relatedPieceId: pieceId,
                relatedPieceName: pieceName,
                initialContent: `I'm practicing ${pieceName} and have a question about...\n\n`,
              });
            }}
            variant="outline"
            icon={<Ionicons name="help-circle-outline" size={20} color={Colors.primary} />}
            style={styles.askButton}
          />
          <Button
            title="Add Segment"
            onPress={() => setShowAddModal(true)}
            icon={<Ionicons name="add-circle-outline" size={20} color={Colors.white} />}
            style={styles.addButton}
          />
        </View>
        {currentSession && (
          <Text style={styles.sessionIndicator}>
            <Ionicons name="radio-button-on" size={12} color={Colors.success} /> Practice session active
          </Text>
        )}
      </View>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Segment</Text>
            
            <Text style={styles.inputLabel}>Segment Name *</Text>
            <TextInput
              style={styles.input}
              value={newSegmentName}
              onChangeText={setNewSegmentName}
              placeholder="e.g., Measures 1-16, Development section"
              placeholderTextColor={Colors.textSecondary}
            />

            <Text style={styles.inputLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newSegmentDescription}
              onChangeText={setNewSegmentDescription}
              placeholder="Notes about this segment..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => {
                  setShowAddModal(false);
                  setNewSegmentName('');
                  setNewSegmentDescription('');
                }}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title="Add Segment"
                onPress={handleAddSegment}
                loading={savingSegment}
                disabled={!newSegmentName.trim() || savingSegment}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
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
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  progressHeader: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: Colors.backgroundDark,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  segmentsList: {
    padding: 16,
    gap: 12,
  },
  segmentCard: {
    marginBottom: 12,
  },
  segmentContent: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentClicked: {
    transform: [{ scale: 0.98 }],
    backgroundColor: Colors.primary + '10',
  },
  segmentCompleted: {
    backgroundColor: Colors.success + '10',
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  segmentInfo: {
    flex: 1,
    marginRight: 12,
  },
  segmentName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  completedText: {
    color: Colors.success,
  },
  segmentDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  completeButton: {
    padding: 4,
  },
  completeButtonActive: {
    transform: [{ scale: 1.1 }],
  },
  segmentStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  askButton: {
    flex: 1,
  },
  addButton: {
    flex: 1,
  },
  sessionIndicator: {
    fontSize: 12,
    color: Colors.success,
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});