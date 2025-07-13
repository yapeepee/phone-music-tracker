import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { TagChip } from '../../components/tags/TagChip';
import { tagService } from '../../services/tag.service';
import { TeacherNavigatorScreenProps } from '../../navigation/types';

type CreateTagScreenProps = TeacherNavigatorScreenProps<'CreateTag'>;

const colorOptions = [
  '#007AFF', '#34C759', '#FF3B30', '#FF9500', '#AF52DE',
  '#5856D6', '#00C7BE', '#FF2D55', '#A2845E', '#32ADE6',
  '#5AC8FA', '#4CD964', '#FFCC00', '#FF6482', '#8E8E93',
];

export const CreateTagScreen: React.FC = () => {
  const navigation = useNavigation<CreateTagScreenProps['navigation']>();
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#007AFF');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    setLoading(true);
    try {
      await tagService.createTag({
        name: name.trim(),
        color: selectedColor,
      });
      
      Alert.alert('Success', 'Tag created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create tag');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.label}>Tag Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter tag name"
          placeholderTextColor={Colors.textSecondary}
          maxLength={50}
          autoFocus
        />
        <Text style={styles.charCount}>{name.length}/50</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Preview</Text>
        <View style={styles.previewContainer}>
          <TagChip
            name={name || 'Tag Preview'}
            color={selectedColor}
            size="large"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Select Color</Text>
        <View style={styles.colorGrid}>
          {colorOptions.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selectedColor === color && styles.selectedColor,
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="outline"
          fullWidth
        />
        <Button
          title="Create Tag"
          onPress={handleCreate}
          loading={loading}
          disabled={!name.trim() || loading}
          fullWidth
          style={{ marginTop: 12 }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
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
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.card,
  },
  charCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  previewContainer: {
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'transparent',
    margin: 6,
  },
  selectedColor: {
    borderColor: Colors.text,
  },
  buttonContainer: {
    marginTop: 16,
  },
});