import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { metronomeService } from '../../services/metronome.service';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  targetTempo: number;
  actualTempo: number;
  isPlaying: boolean;
  onTempoChange?: (tempo: number) => void;
  accuracy?: number; // 0-100 percentage
}

type MetronomeState = 'happy' | 'neutral' | 'annoyed' | 'angry';

const { width } = Dimensions.get('window');
const METRONOME_SIZE = width * 0.5;

export const AngryMetronome: React.FC<Props> = ({
  targetTempo,
  actualTempo,
  isPlaying,
  onTempoChange,
  accuracy = 0,
}) => {
  const beatScale = useSharedValue(1);
  const faceRotation = useSharedValue(0);
  const eyebrowPosition = useSharedValue(0);
  const mouthCurve = useSharedValue(0);
  const steamOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const eyeScale = useSharedValue(1);
  const accentGlow = useSharedValue(0);

  // Determine metronome state based on tempo accuracy
  const state = useMemo((): MetronomeState => {
    if (!isPlaying || actualTempo === targetTempo) return 'happy';
    
    const difference = Math.abs(actualTempo - targetTempo);
    const percentDiff = (difference / targetTempo) * 100;
    
    // Check if playing at an acceptable multiple/division
    const acceptableRatios = [0.5, 1, 2]; // Half, normal, or double speed
    for (const ratio of acceptableRatios) {
      const adjustedTempo = actualTempo / ratio;
      const adjustedDiff = Math.abs(adjustedTempo - targetTempo);
      const adjustedPercent = (adjustedDiff / targetTempo) * 100;
      
      if (adjustedPercent < 5) {
        return 'happy'; // Within 5% of target (or acceptable multiple)
      }
    }
    
    // Not at an acceptable multiple, check raw difference
    if (percentDiff < 10) return 'neutral'; // Within 10%
    if (percentDiff < 20) return 'annoyed'; // Within 20%
    return 'angry'; // More than 20% off
  }, [actualTempo, targetTempo, isPlaying]);

  const stateColors = {
    happy: Colors.success,
    neutral: Colors.primary,
    annoyed: Colors.warning,
    angry: Colors.error,
  };

  const currentColor = stateColors[state];

  // Update face expressions based on state
  useEffect(() => {
    switch (state) {
      case 'happy':
        eyebrowPosition.value = withSpring(-5);
        mouthCurve.value = withSpring(20);
        steamOpacity.value = withTiming(0);
        break;
      case 'neutral':
        eyebrowPosition.value = withSpring(0);
        mouthCurve.value = withSpring(0);
        steamOpacity.value = withTiming(0);
        break;
      case 'annoyed':
        eyebrowPosition.value = withSpring(5);
        mouthCurve.value = withSpring(-10);
        steamOpacity.value = withTiming(0);
        break;
      case 'angry':
        eyebrowPosition.value = withSpring(10);
        mouthCurve.value = withSpring(-20);
        steamOpacity.value = withTiming(1);
        // Add shake animation when angry
        shakeX.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 50 }),
            withTiming(5, { duration: 50 })
          ),
          -1,
          true
        );
        break;
    }
  }, [state]);

  // Beat animation
  useEffect(() => {
    if (isPlaying) {
      const unsubscribe = metronomeService.onBeat((beatNum, isAccent) => {
        
        // Animate face
        beatScale.value = withSequence(
          withSpring(isAccent ? 1.3 : 1.1, { damping: 5 }),
          withSpring(1, { damping: 10 })
        );
        
        if (isAccent) {
          // More dramatic animation for accent beats
          faceRotation.value = withSequence(
            withTiming(10, { duration: 100 }),
            withTiming(-10, { duration: 100 }),
            withTiming(0, { duration: 100 })
          );
          
          // Make eyes "pop" on accent
          eyeScale.value = withSequence(
            withSpring(1.5, { damping: 5 }),
            withSpring(1, { damping: 10 })
          );
          
          // Add a glow effect
          accentGlow.value = withSequence(
            withTiming(1, { duration: 100 }),
            withTiming(0, { duration: 300 })
          );
        } else {
          // Regular beat - smaller eye blink
          eyeScale.value = withSequence(
            withTiming(0.8, { duration: 50 }),
            withTiming(1, { duration: 100 })
          );
        }
      });

      return unsubscribe;
    } else {
      // Reset animations when stopped
      beatScale.value = withSpring(1);
      faceRotation.value = withSpring(0);
      shakeX.value = 0;
    }
  }, [isPlaying]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: beatScale.value },
      { rotate: `${faceRotation.value}deg` },
      { translateX: shakeX.value },
    ],
  }));

  const eyebrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: eyebrowPosition.value }],
  }));

  const steamStyle = useAnimatedStyle(() => ({
    opacity: steamOpacity.value,
  }));

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: eyeScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: accentGlow.value,
  }));

  // Generate mouth path based on curve
  const getMouthPath = (curve: number) => {
    const startX = 60;
    const startY = 80;
    const endX = 140;
    const endY = 80;
    const controlY = startY + curve;
    
    return `M ${startX} ${startY} Q 100 ${controlY} ${endX} ${endY}`;
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.metronomeContainer, containerStyle]}>
        <AnimatedSvg
          width={METRONOME_SIZE}
          height={METRONOME_SIZE}
          viewBox="0 0 200 200"
        >
          {/* Glow effect for accent beats */}
          <Animated.View style={glowStyle}>
            <Circle
              cx="100"
              cy="100"
              r="95"
              fill={Colors.primary}
              opacity={0.3}
            />
          </Animated.View>

          {/* Face circle with accuracy indicator */}
          <Circle
            cx="100"
            cy="100"
            r="90"
            fill={currentColor}
            opacity={0.2}
          />
          <Circle
            cx="100"
            cy="100"
            r="85"
            fill="white"
            stroke={currentColor}
            strokeWidth="5"
          />
          
          {/* Accuracy ring (shows when playing) */}
          {isPlaying && accuracy > 0 && (
            <Circle
              cx="100"
              cy="100"
              r="95"
              fill="none"
              stroke={accuracy > 80 ? Colors.success : accuracy > 60 ? Colors.warning : Colors.error}
              strokeWidth="3"
              strokeDasharray={`${(accuracy / 100) * 597} 597`} // 2 * PI * 95 = ~597
              transform="rotate(-90 100 100)"
              opacity={0.6}
            />
          )}

          {/* Eyes with animation */}
          <Animated.View style={eyeStyle}>
            <Circle cx="70" cy="70" r="8" fill={currentColor} />
            <Circle cx="130" cy="70" r="8" fill={currentColor} />
          </Animated.View>

          {/* Eyebrows */}
          <Animated.View style={eyebrowStyle}>
            <Path
              d="M 55 55 L 85 50"
              stroke={currentColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <Path
              d="M 115 50 L 145 55"
              stroke={currentColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </Animated.View>

          {/* Mouth */}
          <AnimatedPath
            d={getMouthPath(mouthCurve.value)}
            stroke={currentColor}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />

          {/* Steam (for angry state) */}
          <Animated.View style={steamStyle}>
            <G>
              <Circle cx="50" cy="30" r="5" fill={Colors.error} opacity={0.6} />
              <Circle cx="60" cy="20" r="4" fill={Colors.error} opacity={0.5} />
              <Circle cx="140" cy="25" r="6" fill={Colors.error} opacity={0.7} />
              <Circle cx="150" cy="35" r="4" fill={Colors.error} opacity={0.5} />
            </G>
          </Animated.View>
        </AnimatedSvg>
      </Animated.View>

      <View style={styles.infoContainer}>
        <Text style={[styles.tempoText, { color: currentColor }]}>
          {targetTempo} BPM
        </Text>
        <Text style={styles.targetText}>Target Tempo</Text>
        {actualTempo !== targetTempo && (
          <Text style={[styles.stateText, { color: currentColor }]}>
            {state === 'happy' && '🎯 Great timing!'}
            {state === 'neutral' && '👍 Getting close!'}
            {state === 'annoyed' && '🤔 Check your tempo'}
            {state === 'angry' && '😤 Way off tempo!'}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  metronomeContainer: {
    width: METRONOME_SIZE,
    height: METRONOME_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  tempoText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  targetText: {
    fontSize: 18,
    color: Colors.gray,
    marginTop: 5,
  },
  stateText: {
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },
});