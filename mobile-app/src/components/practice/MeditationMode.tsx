import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  Animated as RNAnimated,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface Props {
  bpm: number;
  isActive: boolean;
}

const { width, height } = Dimensions.get('window');
const BREATH_CIRCLE_SIZE = width * 0.6;

const ZEN_QUOTES = [
  'Breathe deeply, play slowly',
  'Each note is a meditation',
  'Find peace in the tempo',
  'Let the music flow naturally',
  'Patience brings perfection',
  'Slow is smooth, smooth is fast',
  'Feel the space between notes',
  'Music is the silence between sounds',
];

export const MeditationMode: React.FC<Props> = ({ bpm, isActive }) => {
  const breathScale = useSharedValue(1);
  const particleOpacity = useSharedValue(0);
  const gradientRotation = useSharedValue(0);
  const quoteOpacity = useRef(new RNAnimated.Value(0)).current;
  const currentQuoteIndex = useRef(0);

  // Calculate breath duration based on BPM (slower BPM = longer breath)
  const breathDuration = 60000 / bpm; // milliseconds per beat
  const fullBreathCycle = breathDuration * 4; // 4 beats per breath cycle

  useEffect(() => {
    if (isActive) {
      // Breathing animation
      breathScale.value = withRepeat(
        withSequence(
          withTiming(1.3, {
            duration: fullBreathCycle / 2,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, {
            duration: fullBreathCycle / 2,
            easing: Easing.inOut(Easing.ease),
          })
        ),
        -1
      );

      // Gradient rotation
      gradientRotation.value = withRepeat(
        withTiming(360, {
          duration: fullBreathCycle * 2,
          easing: Easing.linear,
        }),
        -1
      );

      // Particle effect
      particleOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1
      );

      // Quote rotation
      const quoteInterval = setInterval(() => {
        RNAnimated.sequence([
          RNAnimated.timing(quoteOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          RNAnimated.timing(quoteOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
        
        currentQuoteIndex.current = (currentQuoteIndex.current + 1) % ZEN_QUOTES.length;
      }, 8000);

      // Initial quote fade in
      RNAnimated.timing(quoteOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();

      return () => clearInterval(quoteInterval);
    } else {
      // Reset animations
      breathScale.value = withTiming(1);
      gradientRotation.value = withTiming(0);
      particleOpacity.value = withTiming(0);
      
      RNAnimated.timing(quoteOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, fullBreathCycle]);

  const breathCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
  }));

  const gradientStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${gradientRotation.value}deg` }],
  }));

  const particleStyle = useAnimatedStyle(() => ({
    opacity: particleOpacity.value,
  }));

  if (!isActive) return null;

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Gradient Background */}
      <Animated.View style={[StyleSheet.absoluteFillObject, gradientStyle]}>
        <LinearGradient
          colors={['#1a237e', '#3949ab', '#5c6bc0', '#283593']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Floating Particles */}
      <Animated.View style={[styles.particleContainer, particleStyle]}>
        {[...Array(15)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.particle,
              {
                left: Math.random() * width,
                top: Math.random() * height,
                width: Math.random() * 4 + 2,
                height: Math.random() * 4 + 2,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Breathing Circle */}
      <View style={styles.centerContainer}>
        <Animated.View style={[styles.breathCircle, breathCircleStyle]}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.3)']}
            style={styles.breathGradient}
          />
          <Text style={styles.breathText}>
            {breathScale.value > 1.15 ? 'Inhale' : 'Exhale'}
          </Text>
        </Animated.View>
      </View>

      {/* Zen Quote */}
      <RNAnimated.View
        style={[
          styles.quoteContainer,
          {
            opacity: quoteOpacity,
          },
        ]}
      >
        <Text style={styles.quoteText}>
          {ZEN_QUOTES[currentQuoteIndex.current]}
        </Text>
      </RNAnimated.View>

      {/* BPM Indicator */}
      <View style={styles.bpmContainer}>
        <Text style={styles.bpmText}>{bpm} BPM</Text>
        <Text style={styles.modeText}>Meditation Mode</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 50,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathCircle: {
    width: BREATH_CIRCLE_SIZE,
    height: BREATH_CIRCLE_SIZE,
    borderRadius: BREATH_CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  breathGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BREATH_CIRCLE_SIZE / 2,
  },
  breathText: {
    fontSize: 24,
    color: 'white',
    fontWeight: '300',
    letterSpacing: 2,
  },
  quoteContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 18,
    color: 'white',
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.9,
  },
  bpmContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    alignItems: 'flex-end',
  },
  bpmText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  modeText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
});