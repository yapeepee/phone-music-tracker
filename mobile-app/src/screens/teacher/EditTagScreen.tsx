import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { TagChip } from '../../components/tags/TagChip';
import { tagService } from '../../services/tag.service';
import { Tag } from '../../types/practice';
import { TeacherNavigatorScreenProps } from '../../navigation/types';

type EditTagScreenProps = TeacherNavigatorScreenProps<'EditTag'>;

const colorOptions = [
  '#007AFF', '#34C759', '#FF3B30', '#FF9500', '#AF52DE',
  '#5856D6', '#00C7BE', '#FF2D55', '#A2845E', '#32ADE6',
  '#5AC8FA', '#4CD964', '#FFCC00', '#FF6482', '#8E8E93',
];

export const EditTagScreen: React.FC = () => {
  const navigation = useNavigation<EditTagScreenProps['navigation']>();
  const route = useRoute<EditTagScreenProps['route']>();
  const { tagId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tag, setTag] = useState<Tag | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#007AFF');
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => {
    loadTag();
  }, [tagId]);

  const loadTag = async () => {
    try {
      const [tagData, usageData] = await Promise.all([
        tagService.getTag(tagId),
        tagService.getTagUsageCount(tagId),
      ]);
      
      setTag(tagData);
      setName(tagData.name);
      setSelectedColor(tagData.color);
      setUsageCount(usageData.usage_count);
    } catch (error) {
      Alert.alert('Error', 'Failed to load tag', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    // Check if anything changed
    if (tag && name === tag.name && selectedColor === tag.color) {
      navigation.goBack();
      return;
    }

    setSaving(true);
    try {
      await tagService.updateTag(tagId, {
        name: name.trim(),
        color: selectedColor,
      });
      
      Alert.alert('Success', 'Tag updated successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update tag');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!tag) {
    return null;
  }

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

      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          This tag is used in {usageCount} practice {usageCount === 1 ? 'session' : 'sessions'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="outline"
          fullWidth
        />
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={!name.trim() || saving}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
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
  infoSection: {
    backgroundColor: Colors.info + '20',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: Colors.info,
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 16,
  },
});