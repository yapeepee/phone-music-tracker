import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrendIndicatorProps {
  title: string;
  value: number;
  unit?: string;
  trend: 'improving' | 'declining' | 'stable' | 'neutral' | 'insufficient_data';
  trendStrength?: number;
  subtitle?: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  title,
  value,
  unit = '',
  trend,
  trendStrength = 0,
  subtitle,
}) => {
  // Get trend icon and color
  const getTrendDisplay = () => {
    switch (trend) {
      case 'improving':
        return {
          icon: 'trending-up' as keyof typeof Ionicons.glyphMap,
          color: '#4CAF50',
          text: 'Improving',
        };
      case 'declining':
        return {
          icon: 'trending-down' as keyof typeof Ionicons.glyphMap,
          color: '#F44336',
          text: 'Declining',
        };
      case 'stable':
        return {
          icon: 'remove' as keyof typeof Ionicons.glyphMap,
          color: '#2196F3',
          text: 'Stable',
        };
      case 'insufficient_data':
        return {
          icon: 'help-circle-outline' as keyof typeof Ionicons.glyphMap,
          color: '#9E9E9E',
          text: 'Not enough data',
        };
      default:
        return {
          icon: 'remove' as keyof typeof Ionicons.glyphMap,
          color: '#9E9E9E',
          text: 'Neutral',
        };
    }
  };

  const trendDisplay = getTrendDisplay();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.valueContainer}>
        <Text style={styles.value}>
          {value.toFixed(1)}{unit}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      
      <View style={styles.trendContainer}>
        <Ionicons
          name={trendDisplay.icon}
          size={20}
          color={trendDisplay.color}
        />
        <View style={styles.trendTextContainer}>
          <Text style={[styles.trendText, { color: trendDisplay.color }]}>
            {trendDisplay.text}
          </Text>
          {trendStrength !== 0 && trend !== 'insufficient_data' && (
            <Text style={styles.trendStrength}>
              {trendStrength > 0 ? '+' : ''}{trendStrength.toFixed(1)}% per day
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  valueContainer: {
    marginBottom: 12,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  trendTextContainer: {
    marginLeft: 8,
    flex: 1,
  },
  trendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendStrength: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});