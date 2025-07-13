import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { tagService, TagCreate } from '../../services/tag.service';
import { Tag } from '../../types/practice';

interface CreatePieceModalProps {
  visible: boolean;
  onClose: () => void;
  onPieceCreated: (piece: Tag) => void;
}

const DIFFICULTY_LEVELS = [
  { value: 1, label: 'Beginner' },
  { value: 2, label: 'Elementary' },
  { value: 3, label: 'Easy' },
  { value: 4, label: 'Early Intermediate' },
  { value: 5, label: 'Intermediate' },
  { value: 6, label: 'Late Intermediate' },
  { value: 7, label: 'Advanced' },
  { value: 8, label: 'Very Advanced' },
  { value: 9, label: 'Professional' },
  { value: 10, label: 'Virtuoso' },
];

const PIECE_COLORS = [
  '#5856D6', // Purple
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#FF2D55', // Pink
  '#AF52DE', // Violet
  '#00C7BE', // Teal
  '#FF3B30', // Red
];

export const CreatePieceModal: React.FC<CreatePieceModalProps> = ({
  visible,
  onClose,
  onPieceCreated,
}) => {
  const [pieceName, setPieceName] = useState('');
  const [composer, setComposer] = useState('');
  const [opusNumber, setOpusNumber] = useState('');
  const [difficulty, setDifficulty] = useState(5);
  const [selectedColor, setSelectedColor] = useState(PIECE_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!pieceName.trim()) {
      Alert.alert('Required Field', 'Please enter a piece name');
      return;
    }

    setIsCreating(true);
    try {
      const newPiece: TagCreate = {
        name: pieceName.trim(),
        color: selectedColor,
        tag_type: 'piece',
        composer: composer.trim() || undefined,
        opus_number: opusNumber.trim() || undefined,
        difficulty_level: difficulty,
      };

      const createdPiece = await tagService.createTag(newPiece);
      console.log('[CreatePieceModal] Created piece:', createdPiece);
      
      // Reset form before closing
      resetForm();
      onClose();
      
      // Call onPieceCreated after modal is closed to avoid state issues
      setTimeout(() => {
        onPieceCreated(createdPiece);  // Pass the created piece with real ID
      }, 100);
      
      Alert.alert('Success', `Piece "${createdPiece.name}" created successfully!`);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create piece. Please try again.';
      Alert.alert('Error', errorMessage);
      console.error('Failed to create piece:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setPieceName('');
    setComposer('');
    setOpusNumber('');
    setDifficulty(5);
    setSelectedColor(PIECE_COLORS[0]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create New Piece</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.label}>Piece Name *</Text>
            <Input
              placeholder="e.g., Moonlight Sonata - 1st Movement"
              value={pieceName}
              onChangeText={setPieceName}
              autoFocus
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Composer</Text>
            <Input
              placeholder="e.g., Ludwig van Beethoven"
              value={composer}
              onChangeText={setComposer}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Opus/Catalog Number</Text>
            <Input
              placeholder="e.g., Op. 27 No. 2"
              value={opusNumber}
              onChangeText={setOpusNumber}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Difficulty Level</Text>
            <View style={styles.difficultyContainer}>
              <TouchableOpacity
                onPress={() => setDifficulty(Math.max(1, difficulty - 1))}
                style={styles.difficultyButton}
              >
                <Ionicons name="remove-circle" size={32} color={Colors.primary} />
              </TouchableOpacity>
              <View style={styles.difficultyDisplay}>
                <Text style={styles.difficultyNumber}>{difficulty}</Text>
                <Text style={styles.difficultyLabel}>
                  {DIFFICULTY_LEVELS[difficulty - 1].label}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setDifficulty(Math.min(10, difficulty + 1))}
                style={styles.difficultyButton}
              >
                <Ionicons name="add-circle" size={32} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorGrid}>
              {PIECE_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorOptionSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                >
                  {selectedColor === color && (
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              onPress={handleClose}
              variant="outline"
              style={styles.button}
            />
            <Button
              title="Create Piece"
              onPress={handleCreate}
              disabled={!pieceName.trim() || isCreating}
              loading={isCreating}
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  difficultyButton: {
    padding: 8,
  },
  difficultyDisplay: {
    alignItems: 'center',
    marginHorizontal: 24,
  },
  difficultyNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  difficultyLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginHorizontal: -6,
  },
  colorOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    margin: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  colorOptionSelected: {
    transform: [{ scale: 1.1 }],
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 40,
    gap: 12,
  },
  button: {
    flex: 1,
  },
});