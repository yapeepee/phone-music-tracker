import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { Tag } from '../../types/practice';
import { TagChip } from './TagChip';
import { Colors } from '../../constants/colors';

interface TagDisplayProps {
  tags: Tag[];
  onTagPress?: (tag: Tag) => void;
  onTagRemove?: (tag: Tag) => void;
  emptyMessage?: string;
  size?: 'small' | 'medium' | 'large';
  scrollable?: boolean;
}

export const TagDisplay: React.FC<TagDisplayProps> = ({
  tags,
  onTagPress,
  onTagRemove,
  emptyMessage = 'No tags selected',
  size = 'medium',
  scrollable = false,
}) => {
  if (tags.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  const content = (
    <View style={styles.tagContainer}>
      {tags.map(tag => (
        <TagChip
          key={tag.id}
          name={tag.name}
          color={tag.color}
          onPress={onTagPress ? () => onTagPress(tag) : undefined}
          onRemove={onTagRemove ? () => onTagRemove(tag) : undefined}
          size={size}
        />
      ))}
    </View>
  );

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {content}
      </ScrollView>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  scrollContent: {
    paddingRight: 16,
  },
  emptyContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
});