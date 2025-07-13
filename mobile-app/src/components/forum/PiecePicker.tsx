import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Tag } from '../../types/practice';
import { tagService } from '../../services/tag.service';
import { Button } from '../common/Button';
import { CreatePieceModal } from '../practice/CreatePieceModal';
import { currentPiecesService } from '../../services/current-pieces.service';

interface PiecePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectPiece: (piece: Tag | null) => void;
  selectedPiece?: Tag | null;
}

export const PiecePicker: React.FC<PiecePickerProps> = ({
  visible,
  onClose,
  onSelectPiece,
  selectedPiece,
}) => {
  const [pieces, setPieces] = useState<Tag[]>([]);
  const [filteredPieces, setFilteredPieces] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(
    selectedPiece?.id || null
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (visible) {
      loadPieces();
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = pieces.filter(piece =>
        piece.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        piece.composer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        piece.opus_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPieces(filtered);
    } else {
      setFilteredPieces(pieces);
    }
  }, [searchQuery, pieces]);

  const loadPieces = async () => {
    setLoading(true);
    try {
      // Try to load both independently to see which one fails
      let pieceTags: Tag[] = [];
      let counts: Record<string, number> = {};
      
      try {
        pieceTags = await tagService.getPieceTags();
        console.log('Loaded piece tags:', pieceTags.length);
      } catch (error) {
        console.error('Failed to load piece tags:', error);
        // Continue without pieces if this fails
      }
      
      try {
        counts = await currentPiecesService.getPieceUserCounts();
        console.log('Loaded user counts:', Object.keys(counts).length);
      } catch (error) {
        console.error('Failed to load user counts:', error);
        // Continue without counts if this fails
      }
      
      // Filter out archived pieces for forum posts
      const activePieces = pieceTags.filter(piece => !piece.is_archived);
      setPieces(activePieces);
      setFilteredPieces(activePieces);
      setUserCounts(counts);
      
      if (pieceTags.length === 0 && Object.keys(counts).length === 0) {
        Alert.alert('Error', 'Failed to load pieces. Please try again.');
      }
    } catch (error) {
      console.error('Unexpected error in loadPieces:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPiece = (piece: Tag) => {
    setSelectedPieceId(piece.id);
  };

  const handleConfirm = () => {
    const selected = pieces.find(piece => piece.id === selectedPieceId);
    onSelectPiece(selected || null);
    onClose();
  };

  const handleClearSelection = () => {
    setSelectedPieceId(null);
    onSelectPiece(null);
    onClose();
  };

  const handlePieceCreated = (newPiece: Tag) => {
    setPieces([...pieces, newPiece]);
    setSelectedPieceId(newPiece.id);
    setShowCreateModal(false);
  };

  const getDifficultyColor = (level?: number) => {
    if (!level) return Colors.textSecondary;
    if (level <= 3) return Colors.success;
    if (level <= 6) return Colors.warning;
    return Colors.error;
  };

  const renderPiece = ({ item }: { item: Tag }) => {
    const isSelected = selectedPieceId === item.id;
    const userCount = userCounts[item.id] || 0;
    
    return (
      <TouchableOpacity
        style={[styles.pieceItem, isSelected && styles.selectedPieceItem]}
        onPress={() => handleSelectPiece(item)}
        activeOpacity={0.7}
      >
        <View style={styles.pieceInfo}>
          <Text style={styles.pieceName} numberOfLines={1}>{item.name}</Text>
          {item.composer && (
            <Text style={styles.composer} numberOfLines={1}>{item.composer}</Text>
          )}
          <View style={styles.pieceMetadata}>
            {item.opus_number && (
              <Text style={styles.opusNumber}>{item.opus_number}</Text>
            )}
            {item.difficulty_level && (
              <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty_level) + '20' }]}>
                <Text style={[styles.difficultyText, { color: getDifficultyColor(item.difficulty_level) }]}>
                  Lvl {item.difficulty_level}
                </Text>
              </View>
            )}
            {userCount > 0 && (
              <View style={styles.userCountBadge}>
                <Ionicons name="people" size={12} color={Colors.primary} />
                <Text style={styles.userCountText}>{userCount}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.rightContent}>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Musical Piece</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={Colors.textSecondary} />
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

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.createButtonText}>Create New Piece</Text>
          </TouchableOpacity>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredPieces}
              keyExtractor={item => item.id}
              renderItem={renderPiece}
              contentContainerStyle={styles.pieceList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="musical-notes-outline" size={48} color={Colors.textSecondary} />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No pieces found' : 'No pieces yet'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? 'Try a different search' : 'Create your first piece to get started'}
                  </Text>
                </View>
              }
            />
          )}

          <View style={styles.footer}>
            <Button
              title="Clear Selection"
              onPress={handleClearSelection}
              variant="outline"
              style={{ marginRight: 12 }}
            />
            <Button
              title="Confirm"
              onPress={handleConfirm}
              disabled={!selectedPieceId}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </Modal>

      <CreatePieceModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPieceCreated={handlePieceCreated}
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    height: 44,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: Colors.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  createButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pieceList: {
    paddingVertical: 8,
  },
  pieceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  selectedPieceItem: {
    backgroundColor: Colors.primary + '10',
  },
  pieceInfo: {
    flex: 1,
    marginRight: 12,
  },
  pieceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  composer: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  pieceMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  opusNumber: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  userCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  userCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  rightContent: {
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});