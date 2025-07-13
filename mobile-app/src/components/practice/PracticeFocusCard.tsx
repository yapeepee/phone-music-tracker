import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { PracticeSegment } from '../../types/practice';

interface PracticeFocusCardProps {
  focus: PracticeSegment;
  todayClicks: number;
  onPress: () => void;
  onLongPress: () => void;
}

export const PracticeFocusCard: React.FC<PracticeFocusCardProps> = ({
  focus,
  todayClicks,
  onPress,
  onLongPress,
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        focus.is_completed && styles.completedContainer,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={focus.is_completed}
    >
      <View style={styles.content}>
        <View style={styles.textSection}>
          <Text style={[styles.focusName, focus.is_completed && styles.completedText]}>
            {focus.name}
          </Text>
          {focus.description && (
            <Text style={[styles.description, focus.is_completed && styles.completedText]}>
              {focus.description}
            </Text>
          )}
        </View>
        
        <View style={styles.statsSection}>
          <View style={styles.clickCounter}>
            <Text style={styles.clickCount}>{todayClicks}</Text>
            <Text style={styles.clickLabel}>Today</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.clickCounter}>
            <Text style={[styles.clickCount, styles.totalClickCount]}>{focus.total_click_count}</Text>
            <Text style={styles.clickLabel}>Total</Text>
          </View>
          {focus.is_completed ? (
            <Ionicons name="checkmark-circle" size={32} color={Colors.success} style={styles.completedIcon} />
          ) : (
            <View style={styles.clickButton}>
              <Ionicons name="add-circle" size={40} color={Colors.primary} />
            </View>
          )}
        </View>
      </View>
      
      {!focus.is_completed && focus.total_click_count > 0 && (
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${Math.min((focus.total_click_count / 20) * 100, 100)}%` }
            ]}
          />
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  completedContainer: {
    opacity: 0.7,
    backgroundColor: Colors.backgroundDark,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  textSection: {
    flex: 1,
    marginRight: 16,
  },
  focusName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  statsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clickCounter: {
    alignItems: 'center',
    minWidth: 45,
  },
  clickCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  totalClickCount: {
    color: Colors.text,
  },
  clickLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  clickButton: {
    padding: 4,
    marginLeft: 8,
  },
  completedIcon: {
    marginLeft: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
});