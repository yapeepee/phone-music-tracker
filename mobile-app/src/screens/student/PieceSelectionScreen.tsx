import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { useAppSelector } from '../../hooks/redux';
import { useStudentNavigation } from '../../hooks/navigation';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { practiceSegmentService, PieceWithSegmentInfo } from '../../services/practice-segment.service';
import { tagService, TagCreate } from '../../services/tag.service';
import { currentPiecesService, CurrentPieceWithDetails } from '../../services/current-pieces.service';

export const PieceSelectionScreen: React.FC = () => {
  const navigation = useStudentNavigation();
  const user = useAppSelector((state) => state.auth.user);
  
  const [pieces, setPieces] = useState<PieceWithSegmentInfo[]>([]);
  const [currentPieces, setCurrentPieces] = useState<CurrentPieceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);
  const [togglingPieces, setTogglingPieces] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPieces();
  }, [showCompleted]);

  const loadPieces = async () => {
    try {
      const [piecesData, currentPiecesData] = await Promise.all([
        practiceSegmentService.getStudentPieces(showCompleted),
        currentPiecesService.getCurrentPieces()
      ]);
      setPieces(piecesData);
      setCurrentPieces(currentPiecesData);
    } catch (error) {
      console.error('Failed to load pieces:', error);
      Alert.alert('Error', 'Failed to load your pieces. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPieces();
  };

  const toggleCurrentPiece = async (pieceId: string) => {
    // Prevent multiple simultaneous toggles
    if (togglingPieces.has(pieceId)) return;
    
    setTogglingPieces(prev => new Set(prev).add(pieceId));
    
    try {
      const isCurrentlyWorking = currentPieces.some(cp => cp.pieceId === pieceId);
      
      if (isCurrentlyWorking) {
        // Remove from current pieces
        await currentPiecesService.removeCurrentPiece(pieceId);
        setCurrentPieces(prev => prev.filter(cp => cp.pieceId !== pieceId));
      } else {
        // Add to current pieces
        const newCurrentPiece = await currentPiecesService.addCurrentPiece(pieceId);
        setCurrentPieces(prev => [...prev, newCurrentPiece]);
      }
    } catch (error: any) {
      console.error('Failed to toggle current piece:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update currently working on status.';
      Alert.alert('Error', errorMessage);
    } finally {
      setTogglingPieces(prev => {
        const newSet = new Set(prev);
        newSet.delete(pieceId);
        return newSet;
      });
    }
  };

  const handlePiecePress = (piece: PieceWithSegmentInfo) => {
    navigation?.navigate('SegmentTracking', {
      pieceId: piece.piece.id,
      pieceName: piece.piece.name
    });
  };

  const handleAddPiece = () => {
    // Navigate to create piece screen or show modal
    Alert.alert(
      'Add New Piece',
      'Would you like to add a new musical piece to practice?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Add Piece', 
          onPress: () => {
            // TODO: Navigate to piece creation screen
            Alert.alert('Coming Soon', 'Piece creation screen will be implemented next.');
          }
        }
      ]
    );
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return Colors.success;
    if (percentage >= 75) return Colors.primary;
    if (percentage >= 50) return Colors.warning;
    return Colors.text;
  };

  const renderPieceCard = (item: PieceWithSegmentInfo) => {
    const { piece, totalSegments, completedSegments, totalClicks } = item;
    const progressPercentage = totalSegments > 0 
      ? Math.round((completedSegments / totalSegments) * 100)
      : 0;
    
    const isCurrentPiece = currentPieces.some(cp => cp.pieceId === piece.id);
    const isToggling = togglingPieces.has(piece.id);

    return (
      <TouchableOpacity
        key={piece.id}
        style={styles.pieceCard}
        onPress={() => handlePiecePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.pieceHeader}>
          <View style={styles.pieceInfo}>
            <Text style={styles.pieceName}>{piece.name}</Text>
            {isCurrentPiece && (
              <View style={styles.currentBadge}>
                <Ionicons name="star" size={12} color="#FFF" />
                <Text style={styles.currentBadgeText}>Working On</Text>
              </View>
            )}
            {piece.composer && (
              <Text style={styles.composer}>{piece.composer}</Text>
            )}
            {piece.opusNumber && (
              <Text style={styles.opusNumber}>Op. {piece.opusNumber}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.currentToggle,
                isCurrentPiece && styles.currentToggleActive
              ]}
              onPress={(e) => {
                e.stopPropagation();
                toggleCurrentPiece(piece.id);
              }}
              disabled={isToggling}
            >
              {isToggling ? (
                <ActivityIndicator size="small" color={isCurrentPiece ? "#FFF" : Colors.primary} />
              ) : (
                <Ionicons 
                  name={isCurrentPiece ? "star" : "star-outline"} 
                  size={20} 
                  color={isCurrentPiece ? "#FFF" : Colors.primary} 
                />
              )}
            </TouchableOpacity>
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>
                Level {piece.difficultyLevel || '?'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progressPercentage}%`,
                  backgroundColor: getProgressColor(progressPercentage)
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {completedSegments}/{totalSegments} segments completed
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="musical-notes" size={16} color={Colors.textSecondary} />
            <Text style={styles.statText}>{totalSegments} segments</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="hand-left" size={16} color={Colors.textSecondary} />
            <Text style={styles.statText}>{totalClicks} clicks</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.textSecondary} />
            <Text style={styles.statText}>{progressPercentage}%</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your pieces...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Your Musical Pieces</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setShowCompleted(!showCompleted)}
          >
            <Ionicons 
              name={showCompleted ? "eye" : "eye-off"} 
              size={20} 
              color={Colors.primary} 
            />
            <Text style={styles.filterText}>
              {showCompleted ? 'All' : 'Active'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.archiveButton}
            onPress={() => navigation?.navigate('ArchivedPieces' as any)}
          >
            <Ionicons 
              name="archive" 
              size={20} 
              color={Colors.primary} 
            />
            <Text style={styles.filterText}>
              Archived
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {pieces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>No pieces yet</Text>
          <Text style={styles.emptySubtext}>
            Add your first piece to start tracking practice segments
          </Text>
          <Button
            title="Add Your First Piece"
            onPress={handleAddPiece}
            style={styles.addFirstButton}
          />
        </View>
      ) : (
        <>
          <View style={styles.piecesList}>
            {pieces.map(renderPieceCard)}
          </View>
          <Button
            title="Add New Piece"
            onPress={handleAddPiece}
            variant="outline"
            style={styles.addButton}
            icon={<Ionicons name="add-circle-outline" size={20} color={Colors.primary} />}
          />
        </>
      )}
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  filterText: {
    fontSize: 14,
    color: Colors.primary,
  },
  piecesList: {
    padding: 16,
    gap: 12,
  },
  pieceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pieceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pieceInfo: {
    flex: 1,
  },
  pieceName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  composer: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  opusNumber: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  difficultyBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.backgroundDark,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
    marginBottom: 24,
  },
  addFirstButton: {
    paddingHorizontal: 32,
  },
  addButton: {
    marginHorizontal: 16,
    marginBottom: 32,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  currentBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});