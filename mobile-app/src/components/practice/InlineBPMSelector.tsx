import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface InlineBPMSelectorProps {
  value: number;
  onChange: (bpm: number) => void;
  minBPM?: number;
  maxBPM?: number;
  practiceMode?: 'normal' | 'slow_practice' | 'meditation';
  onPracticeModeChange?: (mode: 'normal' | 'slow_practice' | 'meditation') => void;
}

export const InlineBPMSelector: React.FC<InlineBPMSelectorProps> = ({
  value,
  onChange,
  minBPM = 40,
  maxBPM = 200,
  practiceMode = 'normal',
  onPracticeModeChange,
}) => {
  const handleBPMChange = (delta: number) => {
    const newBPM = Math.max(minBPM, Math.min(maxBPM, value + delta));
    onChange(newBPM);
  };

  const practiceModes = [
    { key: 'normal', label: 'Normal', icon: 'musical-note' },
    { key: 'slow_practice', label: 'Slow Practice', icon: 'time' },
    { key: 'meditation', label: 'Meditation', icon: 'flower' },
  ] as const;

  return (
    <View style={styles.container}>
      {/* BPM Adjuster */}
      <View style={styles.bpmContainer}>
        <Text style={styles.label}>Tempo</Text>
        <View style={styles.bpmControls}>
          <TouchableOpacity
            style={styles.bpmButton}
            onPress={() => handleBPMChange(-10)}
          >
            <Ionicons name="remove-circle-outline" size={28} color={Colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.bpmButton}
            onPress={() => handleBPMChange(-1)}
          >
            <Ionicons name="remove" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <View style={styles.bpmDisplay}>
            <Text style={styles.bpmValue}>{value}</Text>
            <Text style={styles.bpmUnit}>BPM</Text>
          </View>
          
          <TouchableOpacity
            style={styles.bpmButton}
            onPress={() => handleBPMChange(1)}
          >
            <Ionicons name="add" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.bpmButton}
            onPress={() => handleBPMChange(10)}
          >
            <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Practice Mode Selector */}
      <View style={styles.modeContainer}>
        <Text style={styles.label}>Mode</Text>
        <View style={styles.modeButtons}>
          {practiceModes.map((mode) => (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.modeButton,
                practiceMode === mode.key && styles.modeButtonActive,
              ]}
              onPress={() => onPracticeModeChange?.(mode.key)}
            >
              <Ionicons
                name={mode.icon as any}
                size={20}
                color={practiceMode === mode.key ? Colors.surface : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeText,
                  practiceMode === mode.key && styles.modeTextActive,
                ]}
              >
                {mode.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  bpmContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  bpmControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmButton: {
    padding: 8,
  },
  bpmDisplay: {
    marginHorizontal: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  bpmValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  bpmUnit: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modeContainer: {
    // Empty for now
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: Colors.background,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary,
  },
  modeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  modeTextActive: {
    color: Colors.surface,
  },
});