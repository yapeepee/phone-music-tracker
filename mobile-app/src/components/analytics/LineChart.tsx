import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CartesianChart, Line } from 'victory-native';
import { ChartDataPoint } from '../../types/analytics';
import { Colors } from '../../constants/colors';

interface LineChartProps {
  data: ChartDataPoint[];
  title?: string;
  xLabel?: string;
  yLabel?: string;
  color?: string;
  height?: number;
  width?: number;
  dateFormat?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  xLabel,
  yLabel,
  color = Colors.primary,
  height = 250,
  width = 350,
  dateFormat = false,
}) => {
  // Format x-axis labels for dates
  const formatXTick = (value: any) => {
    if (!dateFormat) return value;
    
    const date = new Date(value);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Calculate domain with some padding
  const yValues = data.map(d => d.y);
  const yMin = Math.min(...yValues) * 0.9;
  const yMax = Math.max(...yValues) * 1.1;

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      
      <View style={{ height, width }}>
        <CartesianChart
          data={data}
          xKey="x"
          yKeys={["y"]}
          domainPadding={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          {({ points }) => (
            <Line 
              points={points.y} 
              color={color}
              strokeWidth={2}
              curveType="catmullRom"
            />
          )}
        </CartesianChart>
      </View>
      
      {/* Axis labels */}
      {xLabel && (
        <Text style={styles.xLabel}>{xLabel}</Text>
      )}
      {yLabel && (
        <Text style={styles.yLabel}>{yLabel}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  xLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  yLabel: {
    fontSize: 14,
    color: '#666',
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: [{ rotate: '-90deg' }],
  },
});