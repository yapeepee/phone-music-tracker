import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface BPMSelectorProps {
  value: number;
  onChange: (bpm: number) => void;
  minBPM?: number;
  maxBPM?: number;
  practiceMode?: 'normal' | 'slow_practice' | 'meditation';
  onPracticeModeChange?: (mode: 'normal' | 'slow_practice' | 'meditation') => void;
}

export const BPMSelector: React.FC<BPMSelectorProps> = ({
  value,
  onChange,
  minBPM = 40,
  maxBPM = 200,
  practiceMode = 'normal',
  onPracticeModeChange,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [tempBPM, setTempBPM] = useState(value);

  const commonTempos = [
    { label: 'Largo', bpm: 60 },
    { label: 'Adagio', bpm: 70 },
    { label: 'Andante', bpm: 80 },
    { label: 'Moderato', bpm: 100 },
    { label: 'Allegro', bpm: 120 },
    { label: 'Vivace', bpm: 140 },
    { label: 'Presto', bpm: 160 },
  ];

  const handleBPMChange = (delta: number) => {
    const newBPM = Math.max(minBPM, Math.min(maxBPM, tempBPM + delta));
    setTempBPM(newBPM);
  };

  const handleConfirm = () => {
    onChange(tempBPM);
    setShowModal(false);
  };

  const getModeColor = () => {
    switch (practiceMode) {
      case 'slow_practice':
        return Colors.warning;
      case 'meditation':
        return Colors.success;
      default:
        return Colors.primary;
    }
  };

  const getModeIcon = () => {
    switch (practiceMode) {
      case 'slow_practice':
        return 'speedometer-outline';
      case 'meditation':
        return 'leaf-outline';
      default:
        return 'musical-notes-outline';
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.selector} onPress={() => setShowModal(true)}>
        <View style={styles.selectorContent}>
          <Ionicons name={getModeIcon()} size={24} color={getModeColor()} />
          <View style={styles.bpmInfo}>
            <Text style={styles.bpmValue}>{value} BPM</Text>
            <Text style={styles.practiceMode}>{practiceMode.replace('_', ' ')}</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Tempo</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {/* Practice Mode Selector */}
            {onPracticeModeChange && (
              <View style={styles.modeSelector}>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    practiceMode === 'normal' && styles.modeButtonActive,
                  ]}
                  onPress={() => onPracticeModeChange('normal')}
                >
                  <Ionicons name="musical-notes" size={20} color={Colors.text} />
                  <Text style={styles.modeButtonText}>Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    practiceMode === 'slow_practice' && styles.modeButtonActive,
                  ]}
                  onPress={() => onPracticeModeChange('slow_practice')}
                >
                  <Ionicons name="speedometer" size={20} color={Colors.text} />
                  <Text style={styles.modeButtonText}>Slow Practice</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modeButton,
                    practiceMode === 'meditation' && styles.modeButtonActive,
                  ]}
                  onPress={() => onPracticeModeChange('meditation')}
                >
                  <Ionicons name="leaf" size={20} color={Colors.text} />
                  <Text style={styles.modeButtonText}>Meditation</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* BPM Adjuster */}
            <View style={styles.bpmAdjuster}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => handleBPMChange(-10)}
                onLongPress={() => handleBPMChange(-20)}
              >
                <Ionicons name="remove-circle" size={40} color={Colors.primary} />
              </TouchableOpacity>
              
              <View style={styles.bpmDisplay}>
                <Text style={styles.bpmDisplayValue}>{tempBPM}</Text>
                <Text style={styles.bpmDisplayLabel}>BPM</Text>
              </View>
              
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => handleBPMChange(10)}
                onLongPress={() => handleBPMChange(20)}
              >
                <Ionicons name="add-circle" size={40} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Fine Adjustment */}
            <View style={styles.fineAdjustment}>
              <TouchableOpacity
                style={styles.fineButton}
                onPress={() => handleBPMChange(-1)}
              >
                <Text style={styles.fineButtonText}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fineButton}
                onPress={() => handleBPMChange(1)}
              >
                <Text style={styles.fineButtonText}>+1</Text>
              </TouchableOpacity>
            </View>

            {/* Common Tempos */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tempoList}>
              {commonTempos.map((tempo) => (
                <TouchableOpacity
                  key={tempo.bpm}
                  style={[
                    styles.tempoButton,
                    tempBPM === tempo.bpm && styles.tempoButtonActive,
                  ]}
                  onPress={() => setTempBPM(tempo.bpm)}
                >
                  <Text style={styles.tempoLabel}>{tempo.label}</Text>
                  <Text style={styles.tempoBPM}>{tempo.bpm}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Confirm Button */}
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Set Tempo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginVertical: 8,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  bpmInfo: {
    flex: 1,
  },
  bpmValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  practiceMode: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  modeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
    gap: 8,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  modeButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  bpmAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 32,
    marginBottom: 16,
  },
  adjustButton: {
    padding: 8,
  },
  bpmDisplay: {
    alignItems: 'center',
  },
  bpmDisplayValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.text,
  },
  bpmDisplayLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  fineAdjustment: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  fineButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  fineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  tempoList: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  tempoButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  tempoButtonActive: {
    backgroundColor: Colors.primary + '20',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  tempoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  tempoBPM: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  confirmButton: {
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.surface,
  },
});