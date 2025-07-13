import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface SessionTimerProps {
  isSessionActive: boolean;
  onTimerUpdate?: (totalSeconds: number, isPaused: boolean) => void;
}

export const SessionTimer: React.FC<SessionTimerProps> = ({
  isSessionActive,
  onTimerUpdate,
}) => {
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Start/stop timer based on session state
  useEffect(() => {
    if (isSessionActive && !isPaused) {
      startTimer();
    } else {
      stopTimer();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isSessionActive, isPaused]);

  // Update parent component when timer changes
  useEffect(() => {
    if (onTimerUpdate) {
      onTimerUpdate(seconds, isPaused);
    }
  }, [seconds, isPaused, onTimerUpdate]);

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handlePauseResume = () => {
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setIsPaused(!isPaused);
  };

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSessionActive) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.timerContainer}>
        <Ionicons 
          name="timer-outline" 
          size={24} 
          color={isPaused ? Colors.warning : Colors.primary} 
        />
        <Text style={[styles.timerText, isPaused && styles.pausedText]}>
          {formatTime(seconds)}
        </Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity 
            style={[styles.pauseButton, isPaused && styles.resumeButton]}
            onPress={handlePauseResume}
          >
            <Ionicons 
              name={isPaused ? 'play' : 'pause'} 
              size={20} 
              color={Colors.surface} 
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
      {isPaused && (
        <Text style={styles.pausedLabel}>Timer Paused</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    fontVariant: ['tabular-nums'],
    flex: 1,
    textAlign: 'center',
  },
  pausedText: {
    color: Colors.warning,
  },
  pauseButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeButton: {
    backgroundColor: Colors.success,
  },
  pausedLabel: {
    fontSize: 12,
    color: Colors.warning,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
});