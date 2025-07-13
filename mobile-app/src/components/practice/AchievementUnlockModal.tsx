import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface Props {
  visible: boolean;
  achievement: {
    name: string;
    description: string;
    icon: string;
    color: string;
    level: number;
  };
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export const AchievementUnlockModal: React.FC<Props> = ({
  visible,
  achievement,
  onClose,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      rotateAnim.setValue(0);

      // Start animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 20,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!achievement) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <Animated.View
          style={[
            styles.container,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Confetti Background */}
          <LottieView
            source={require('../../assets/animations/confetti.json')}
            autoPlay
            loop
            style={styles.confetti}
          />

          {/* Achievement Badge */}
          <Animated.View
            style={[
              styles.badge,
              { backgroundColor: achievement.color + '20' },
              { transform: [{ rotate: spin }] },
            ]}
          >
            <View style={[styles.innerBadge, { backgroundColor: achievement.color }]}>
              <Ionicons
                name={achievement.icon as any}
                size={48}
                color="white"
              />
            </View>
          </Animated.View>

          {/* Title */}
          <Text style={styles.unlockText}>Achievement Unlocked!</Text>
          
          {/* Achievement Info */}
          <Text style={styles.achievementName}>{achievement.name}</Text>
          <Text style={styles.achievementDescription}>{achievement.description}</Text>
          
          {/* Level Stars */}
          <View style={styles.levelContainer}>
            {[...Array(achievement.level)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.star,
                  {
                    opacity: opacityAnim,
                    transform: [
                      {
                        scale: scaleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="star" size={24} color={achievement.color} />
              </Animated.View>
            ))}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: achievement.color }]}
            onPress={handleClose}
          >
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.85,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    width: '150%',
    height: '150%',
    top: '-25%',
    left: '-25%',
  },
  badge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  innerBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  levelContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  star: {
    marginHorizontal: 4,
  },
  continueButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  continueText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});