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
import { TagChip } from './TagChip';
import { Button } from '../common/Button';

interface TagPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectTags: (tags: Tag[]) => void;
  selectedTags: Tag[];
  allowCreate?: boolean;
}

export const TagPicker: React.FC<TagPickerProps> = ({
  visible,
  onClose,
  onSelectTags,
  selectedTags,
  allowCreate = false,
}) => {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    new Set(selectedTags.map(tag => tag.id))
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#007AFF');

  // Predefined colors for tag creation
  const colorOptions = [
    '#007AFF', '#34C759', '#FF3B30', '#FF9500', '#AF52DE',
    '#5856D6', '#00C7BE', '#FF2D55', '#A2845E', '#32ADE6'
  ];

  useEffect(() => {
    if (visible) {
      loadTags();
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = allTags.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTags(filtered);
    } else {
      setFilteredTags(allTags);
    }
  }, [searchQuery, allTags]);

  const loadTags = async () => {
    setLoading(true);
    try {
      const tags = await tagService.getTags();
      setAllTags(tags);
      setFilteredTags(tags);
    } catch (error) {
      Alert.alert('Error', 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = (tag: Tag) => {
    const newSelectedIds = new Set(selectedTagIds);
    if (newSelectedIds.has(tag.id)) {
      newSelectedIds.delete(tag.id);
    } else {
      newSelectedIds.add(tag.id);
    }
    setSelectedTagIds(newSelectedIds);
  };

  const handleConfirm = () => {
    const selected = allTags.filter(tag => selectedTagIds.has(tag.id));
    onSelectTags(selected);
    onClose();
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    try {
      const newTag = await tagService.createTag({
        name: newTagName.trim(),
        color: newTagColor,
      });
      
      // Add to local state
      setAllTags([...allTags, newTag]);
      setSelectedTagIds(new Set([...selectedTagIds, newTag.id]));
      
      // Reset form
      setNewTagName('');
      setNewTagColor('#007AFF');
      setShowCreateForm(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create tag');
    }
  };

  const renderTag = ({ item }: { item: Tag }) => (
    <TouchableOpacity
      style={styles.tagItem}
      onPress={() => handleToggleTag(item)}
      activeOpacity={0.7}
    >
      <TagChip
        name={item.name}
        color={item.color}
        selected={selectedTagIds.has(item.id)}
        size="medium"
      />
      {selectedTagIds.has(item.id) && (
        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
      )}
    </TouchableOpacity>
  );

  const renderCreateForm = () => (
    <View style={styles.createForm}>
      <Text style={styles.createFormTitle}>Create New Tag</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Tag name"
        value={newTagName}
        onChangeText={setNewTagName}
        maxLength={50}
      />
      
      <Text style={styles.colorLabel}>Select Color:</Text>
      <View style={styles.colorOptions}>
        {colorOptions.map(color => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              newTagColor === color && styles.selectedColor,
            ]}
            onPress={() => setNewTagColor(color)}
          />
        ))}
      </View>
      
      <View style={styles.createFormButtons}>
        <Button
          title="Cancel"
          onPress={() => {
            setShowCreateForm(false);
            setNewTagName('');
            setNewTagColor('#007AFF');
          }}
          variant="outline"
          style={{ flex: 1 }}
        />
        <Button
          title="Create"
          onPress={handleCreateTag}
          style={{ flex: 1, marginLeft: 12 }}
        />
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Tags</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tags..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {allowCreate && !showCreateForm && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateForm(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.createButtonText}>Create New Tag</Text>
          </TouchableOpacity>
        )}

        {showCreateForm && renderCreateForm()}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredTags}
            keyExtractor={item => item.id}
            renderItem={renderTag}
            contentContainerStyle={styles.tagList}
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.footer}>
          <Button
            title={`Confirm (${selectedTagIds.size} selected)`}
            onPress={handleConfirm}
            fullWidth
          />
        </View>
      </View>
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
    backgroundColor: Colors.gray + '20',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginVertical: 8,
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
  },
  createButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  createForm: {
    backgroundColor: Colors.card,
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  createFormTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
  },
  colorLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    margin: 4,
  },
  selectedColor: {
    borderColor: Colors.text,
  },
  createFormButtons: {
    flexDirection: 'row',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
});