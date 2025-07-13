import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Tag } from '../../types/practice';
import { tagService } from '../../services/tag.service';
import { useFocusEffect } from '@react-navigation/native';

interface PieceSelectorProps {
  onSelectPiece: (piece: Tag) => void;
  onCreatePiece: () => void;
}

export const PieceSelector: React.FC<PieceSelectorProps> = ({
  onSelectPiece,
  onCreatePiece,
}) => {
  const [pieces, setPieces] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPieces, setFilteredPieces] = useState<Tag[]>([]);

  // Load pieces when component is focused (e.g., after creating a new piece)
  useFocusEffect(
    useCallback(() => {
      loadPieces();
    }, [])
  );

  useEffect(() => {
    // Filter pieces based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = pieces.filter(piece => 
        piece.name.toLowerCase().includes(query) ||
        piece.composer?.toLowerCase().includes(query) ||
        piece.opusNumber?.toLowerCase().includes(query)
      );
      setFilteredPieces(filtered);
    } else {
      setFilteredPieces(pieces);
    }
  }, [searchQuery, pieces]);

  const loadPieces = async () => {
    try {
      const pieceTags = await tagService.getPieceTags();
      console.log('[PieceSelector] Loaded pieces:', pieceTags.length);
      // Sort pieces so archived ones appear at the bottom
      const sortedPieces = pieceTags.sort((a, b) => {
        if (a.isArchived === b.isArchived) {
          return a.name.localeCompare(b.name);
        }
        return a.isArchived ? 1 : -1;
      });
      setPieces(sortedPieces);
    } catch (error) {
      console.error('Failed to load pieces:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPieces();
  };

  const getDifficultyColor = (level?: number) => {
    if (!level) return Colors.textSecondary;
    if (level <= 3) return Colors.success;
    if (level <= 6) return Colors.warning;
    return Colors.error;
  };

  const renderPieceCard = (piece: Tag) => (
    <TouchableOpacity
      key={piece.id}
      style={[
        styles.pieceCard,
        piece.isArchived && styles.archivedPieceCard
      ]}
      onPress={() => onSelectPiece(piece)}
      activeOpacity={0.7}
    >
      {piece.isArchived && (
        <View style={styles.archivedBanner}>
          <Ionicons name="archive" size={14} color={Colors.textSecondary} />
          <Text style={styles.archivedText}>ARCHIVED</Text>
        </View>
      )}
      <View style={styles.pieceHeader}>
        <View style={styles.pieceInfo}>
          <Text style={[
            styles.pieceName,
            piece.isArchived && styles.archivedPieceName
          ]} numberOfLines={2}>
            {piece.name}
          </Text>
          {piece.composer && (
            <Text style={[
              styles.composer,
              piece.isArchived && styles.archivedComposer
            ]} numberOfLines={1}>
              {piece.composer}
            </Text>
          )}
          {piece.opusNumber && (
            <Text style={[
              styles.opusNumber,
              piece.isArchived && styles.archivedOpusNumber
            ]}>
              {piece.opusNumber}
            </Text>
          )}
        </View>
        {piece.difficultyLevel && (
          <View style={[
            styles.difficultyBadge, 
            { backgroundColor: piece.isArchived ? Colors.lightGray : getDifficultyColor(piece.difficultyLevel) + '20' }
          ]}>
            <Text style={[
              styles.difficultyText, 
              { color: piece.isArchived ? Colors.textSecondary : getDifficultyColor(piece.difficultyLevel) }
            ]}>
              Lvl {piece.difficultyLevel}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.pieceFooter}>
        <Ionicons 
          name="chevron-forward" 
          size={20} 
          color={piece.isArchived ? Colors.disabled : Colors.textSecondary} 
        />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading pieces...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select a Piece</Text>
        <Text style={styles.subtitle}>Choose what you'll be practicing today</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search pieces, composers..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredPieces.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No pieces found' : 'No pieces yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Create your first piece to get started'}
            </Text>
          </View>
        ) : (
          <View style={styles.piecesList}>
            {filteredPieces.map(renderPieceCard)}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.createButton}
        onPress={onCreatePiece}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={24} color={Colors.surface} />
        <Text style={styles.createButtonText}>Create New Piece</Text>
      </TouchableOpacity>
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  piecesList: {
    paddingHorizontal: 20,
  },
  pieceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pieceHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  pieceInfo: {
    flex: 1,
    marginRight: 12,
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
    marginBottom: 2,
  },
  opusNumber: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pieceFooter: {
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  createButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
    marginLeft: 8,
  },
  archivedPieceCard: {
    opacity: 0.7,
    backgroundColor: Colors.lightGray,
    borderColor: Colors.disabled,
  },
  archivedBanner: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.textSecondary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopRightRadius: 12,
    borderBottomLeftRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  archivedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  archivedPieceName: {
    color: Colors.textSecondary,
  },
  archivedComposer: {
    color: Colors.disabled,
  },
  archivedOpusNumber: {
    color: Colors.disabled,
  },
});