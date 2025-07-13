import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { reputationService } from '../../services/reputation.service';

interface ReputationBadgeProps {
  points: number | undefined | null;
  level: string | undefined | null;
  size?: 'small' | 'medium' | 'large';
  showPoints?: boolean;
}

export const ReputationBadge: React.FC<ReputationBadgeProps> = ({
  points,
  level,
  size = 'medium',
  showPoints = true,
}) => {
  const levelColor = reputationService.getLevelColor(level);
  const iconName = reputationService.getLevelIcon(level);
  const formattedPoints = reputationService.formatPoints(points);

  const iconSize = size === 'small' ? 16 : size === 'medium' ? 20 : 24;
  const fontSize = size === 'small' ? 10 : size === 'medium' ? 12 : 14;

  return (
    <View style={[styles.container, styles[size]]}>
      <MaterialCommunityIcons
        name={iconName as any}
        size={iconSize}
        color={levelColor}
      />
      {showPoints && (
        <Text style={[styles.points, { fontSize, color: levelColor }]}>
          {formattedPoints}
        </Text>
      )}
      <Text style={[styles.level, { fontSize: fontSize - 2, color: levelColor }]}>
        {level || 'Newcomer'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  medium: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  large: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  points: {
    fontWeight: '600',
    marginLeft: 4,
  },
  level: {
    textTransform: 'capitalize',
    marginLeft: 4,
  },
});