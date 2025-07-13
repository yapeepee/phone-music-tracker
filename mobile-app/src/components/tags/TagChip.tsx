import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface TagChipProps {
  name: string;
  color: string;
  onPress?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const TagChip: React.FC<TagChipProps> = ({
  name,
  color,
  onPress,
  onRemove,
  selected = false,
  size = 'medium'
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 8,
          paddingVertical: 4,
          fontSize: 12,
        };
      case 'large':
        return {
          paddingHorizontal: 16,
          paddingVertical: 8,
          fontSize: 16,
        };
      default:
        return {
          paddingHorizontal: 12,
          paddingVertical: 6,
          fontSize: 14,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const chipContent = (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: selected ? color : color + '20',
          borderColor: color,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: selected ? '#FFFFFF' : color,
            fontSize: sizeStyles.fontSize,
          },
        ]}
      >
        {name}
      </Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          style={styles.removeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.removeText, { color: selected ? '#FFFFFF' : color }]}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {chipContent}
      </TouchableOpacity>
    );
  }

  return chipContent;
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  text: {
    fontWeight: '500',
  },
  removeButton: {
    marginLeft: 4,
  },
  removeText: {
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
});