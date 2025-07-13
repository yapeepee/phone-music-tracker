import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface ScoreCardProps {
  title: string;
  score: number;
  previousScore?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  format?: 'percentage' | 'grade';
  color?: string;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  title,
  score,
  previousScore,
  icon = 'analytics',
  format = 'percentage',
  color = Colors.primary,
}) => {
  // Calculate improvement
  const improvement = previousScore !== undefined ? score - previousScore : 0;
  const improvementPercent = previousScore ? (improvement / previousScore) * 100 : 0;
  const showImprovement = previousScore !== undefined && improvement !== 0;

  // Format score display
  const formatScore = (value: number) => {
    if (format === 'percentage') {
      return `${Math.round(value)}%`;
    }
    // Grade format
    if (value >= 97) return 'A+';
    if (value >= 93) return 'A';
    if (value >= 90) return 'A-';
    if (value >= 87) return 'B+';
    if (value >= 83) return 'B';
    if (value >= 80) return 'B-';
    if (value >= 77) return 'C+';
    if (value >= 73) return 'C';
    if (value >= 70) return 'C-';
    if (value >= 67) return 'D+';
    if (value >= 63) return 'D';
    if (value >= 60) return 'D-';
    return 'F';
  };

  // Get improvement color
  const getImprovementColor = () => {
    if (improvement > 0) return '#4CAF50';
    if (improvement < 0) return '#F44336';
    return '#9E9E9E';
  };

  // Get background color based on score
  const getBackgroundColor = () => {
    if (score >= 90) return '#E8F5E9';
    if (score >= 80) return '#E3F2FD';
    if (score >= 70) return '#FFF3E0';
    if (score >= 60) return '#FFF8E1';
    return '#FFEBEE';
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <View style={styles.header}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.title}>{title}</Text>
      </View>
      
      <View style={styles.scoreContainer}>
        <Text style={[styles.score, { color }]}>{formatScore(score)}</Text>
        
        {showImprovement && (
          <View style={styles.improvementContainer}>
            <Ionicons
              name={improvement > 0 ? 'arrow-up' : 'arrow-down'}
              size={16}
              color={getImprovementColor()}
            />
            <Text style={[styles.improvement, { color: getImprovementColor() }]}>
              {Math.abs(improvementPercent).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      
      {previousScore !== undefined && (
        <Text style={styles.previousScore}>
          Previous: {formatScore(previousScore)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    marginVertical: 8,
    minHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  improvementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  improvement: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
  },
  previousScore: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});