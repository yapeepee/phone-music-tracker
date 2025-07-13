import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { practiceSegmentService } from '../../services/practice-segment.service';
import { ArchivedPieceInfo } from '../../types/practice';

export const ArchivedPiecesScreen = () => {
  const navigation = useNavigation();
  const [archivedPieces, setArchivedPieces] = useState<ArchivedPieceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadArchivedPieces();
  }, []);

  const loadArchivedPieces = async () => {
    try {
      const pieces = await practiceSegmentService.getArchivedPieces();
      console.log('Archived Pieces Received:', JSON.stringify(pieces, null, 2));
      setArchivedPieces(pieces);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load archived pieces');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadArchivedPieces();
  };

  const handleUnarchive = async (piece: ArchivedPieceInfo) => {
    Alert.alert(
      'Unarchive Piece?',
      `Do you want to move "${piece.pieceName}" back to your active practice list?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unarchive',
          onPress: async () => {
            try {
              await practiceSegmentService.unarchivePiece(piece.pieceId);
              setArchivedPieces(archivedPieces.filter(p => p.pieceId !== piece.pieceId));
              Alert.alert('Success', 'Piece has been moved back to your active list');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unarchive piece');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderPieceItem = ({ item }: { item: ArchivedPieceInfo }) => {
    const completionColor = 
      item.completionPercentage >= 80 ? Colors.success :
      item.completionPercentage >= 50 ? Colors.warning :
      Colors.error;

    return (
      <TouchableOpacity
        style={styles.pieceCard}
        onPress={() => {
          navigation.navigate('PieceSummary' as never, {
            pieceId: item.pieceId,
            pieceName: item.pieceName,
            isArchived: true
          } as never);
        }}
        onLongPress={() => handleUnarchive(item)}
      >
        <View style={styles.pieceHeader}>
          <View style={styles.pieceInfo}>
            <Text style={styles.pieceName}>{item.pieceName}</Text>
            {item.composer && (
              <Text style={styles.composer}>by {item.composer}</Text>
            )}
            <Text style={styles.archivedDate}>
              Archived {formatDate(item.archivedAt)}
            </Text>
          </View>
          <View style={styles.completionContainer}>
            <Text style={[styles.completionPercentage, { color: completionColor }]}>
              {(item.completionPercentage || 0).toFixed(0)}%
            </Text>
            <Text style={styles.completionLabel}>Complete</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="flag" size={16} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {item.completedSegments}/{item.totalSegments}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="hand-left" size={16} color={Colors.textSecondary} />
            <Text style={styles.statText}>{item.totalClicks}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar" size={16} color={Colors.textSecondary} />
            <Text style={styles.statText}>{item.sessionsPracticed}</Text>
          </View>
        </View>

        <View style={styles.difficultyContainer}>
          {item.difficultyLevel && (
            <View style={styles.difficultyBadge}>
              <Text style={styles.difficultyText}>
                Level {item.difficultyLevel}
              </Text>
            </View>
          )}
          {item.opusNumber && (
            <Text style={styles.opusText}>{item.opusNumber}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (archivedPieces.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="archive-outline" size={64} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>No Archived Pieces</Text>
        <Text style={styles.emptyText}>
          Pieces you archive will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={archivedPieces}
        renderItem={renderPieceItem}
        keyExtractor={(item) => item.pieceId}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerText}>
              Long press any piece to unarchive it
            </Text>
          </View>
        }
      />
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  pieceCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pieceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pieceInfo: {
    flex: 1,
  },
  pieceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  composer: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  archivedDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  completionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionPercentage: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  completionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: Colors.text,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  difficultyBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  opusText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});