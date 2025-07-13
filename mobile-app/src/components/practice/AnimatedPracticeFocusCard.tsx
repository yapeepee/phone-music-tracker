import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { PracticeSegment } from '../../types/practice';

interface AnimatedPracticeFocusCardProps {
  focus: PracticeSegment;
  todayClicks: number;
  onPress: () => void;
  onLongPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const AnimatedPracticeFocusCard: React.FC<AnimatedPracticeFocusCardProps> = ({
  focus,
  todayClicks,
  onPress,
  onLongPress,
}) => {
  const [showCelebration, setShowCelebration] = useState(false);
  const [displayedClicks, setDisplayedClicks] = useState(todayClicks);
  const [displayedTotal, setDisplayedTotal] = useState(focus.total_click_count);
  
  // Animation values
  const scale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const clickCountScale = useSharedValue(1);
  const totalCountScale = useSharedValue(1);
  const progressWidth = useSharedValue((focus.total_click_count / 20) * 100);

  // Update displayed clicks with animation
  useEffect(() => {
    if (todayClicks !== displayedClicks) {
      clickCountScale.value = withSequence(
        withSpring(1.4, { damping: 3 }),
        withSpring(1, { damping: 3 })
      );
      
      // Delay number update to sync with scale animation
      setTimeout(() => {
        setDisplayedClicks(todayClicks);
      }, 100);
    }
  }, [todayClicks]);

  // Update displayed total with animation
  useEffect(() => {
    if (focus.total_click_count !== displayedTotal) {
      totalCountScale.value = withSequence(
        withSpring(1.3, { damping: 3 }),
        withSpring(1, { damping: 3 })
      );
      
      // Delay number update to sync with scale animation
      setTimeout(() => {
        setDisplayedTotal(focus.total_click_count);
      }, 100);
    }
  }, [focus.total_click_count]);

  // Update progress bar
  useEffect(() => {
    progressWidth.value = withTiming(Math.min((focus.total_click_count / 20) * 100, 100), {
      duration: 300,
    });
  }, [focus.total_click_count]);

  const handlePress = () => {
    'worklet';
    // Scale bounce animation
    scale.value = withSequence(
      withSpring(0.95, { damping: 5 }),
      withSpring(1.05, { damping: 3 }),
      withSpring(1, { damping: 5 })
    );

    // Ripple effect
    rippleScale.value = 0;
    rippleOpacity.value = 0.5;
    rippleScale.value = withTiming(2, { duration: 600 });
    rippleOpacity.value = withTiming(0, { duration: 600 });

    runOnJS(onPress)();

    // Check for milestone celebrations
    const newTotal = focus.total_click_count + 1;
    if (newTotal === 10 || newTotal === 20 || newTotal === 50 || newTotal === 100) {
      runOnJS(setShowCelebration)(true);
      setTimeout(() => runOnJS(setShowCelebration)(false), 2000);
    }
  };

  const tapGesture = Gesture.Tap()
    .onEnd(handlePress)
    .enabled(!focus.is_completed);

  const longPressGesture = Gesture.LongPress()
    .minDuration(500)
    .onEnd(() => runOnJS(onLongPress)())
    .enabled(!focus.is_completed);

  const composedGesture = Gesture.Simultaneous(tapGesture, longPressGesture);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedRippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const animatedClickCountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: clickCountScale.value }],
  }));

  const animatedTotalCountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: totalCountScale.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <AnimatedPressable
        style={[
          styles.container,
          focus.is_completed && styles.completedContainer,
          animatedContainerStyle,
        ]}
      >
        {/* Ripple Effect */}
        <Animated.View
          style={[styles.ripple, animatedRippleStyle]}
          pointerEvents="none"
        />

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
              <Animated.Text style={[styles.clickCount, animatedClickCountStyle]}>
                {displayedClicks}
              </Animated.Text>
              <Text style={styles.clickLabel}>Today</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.clickCounter}>
              <Animated.Text style={[styles.clickCount, styles.totalClickCount, animatedTotalCountStyle]}>
                {displayedTotal}
              </Animated.Text>
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
            <Animated.View 
              style={[styles.progressFill, animatedProgressStyle]}
            />
          </View>
        )}

        {/* Celebration Animation */}
        {showCelebration && (
          <View style={styles.celebrationContainer}>
            <LottieView
              source={require('../../assets/animations/confetti.json')}
              autoPlay
              loop={false}
              style={styles.celebration}
            />
          </View>
        )}
      </AnimatedPressable>
    </GestureDetector>
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
  ripple: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    left: '50%',
    top: '50%',
    marginLeft: -50,
    marginTop: -50,
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
  celebrationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  celebration: {
    width: 200,
    height: 200,
  },
});