import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { tempoService, TempoAchievement, AchievementProgress, TEMPO_ACHIEVEMENTS } from '../../services/tempo.service';
import { useAppSelector } from '../../hooks/redux';

interface Props {
  onClose?: () => void;
}

interface AchievementInfo {
  key: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: string;
  levels: number[];
}

const ACHIEVEMENT_DETAILS: Record<string, AchievementInfo> = {
  [TEMPO_ACHIEVEMENTS.FIRST_SLOW_PRACTICE]: {
    key: TEMPO_ACHIEVEMENTS.FIRST_SLOW_PRACTICE,
    name: 'First Steps',
    description: 'Complete your first slow practice session',
    icon: 'footsteps',
    color: Colors.success,
    requirement: 'Practice under tempo for 5 minutes',
    levels: [1],
  },
  [TEMPO_ACHIEVEMENTS.PATIENCE_PADAWAN]: {
    key: TEMPO_ACHIEVEMENTS.PATIENCE_PADAWAN,
    name: 'Patience Padawan',
    description: 'Practice under tempo consistently',
    icon: 'school',
    color: Colors.primary,
    requirement: 'Practice under tempo for',
    levels: [30, 60, 120], // minutes
  },
  [TEMPO_ACHIEVEMENTS.ZEN_MASTER]: {
    key: TEMPO_ACHIEVEMENTS.ZEN_MASTER,
    name: 'Zen Master',
    description: 'Achieve deep focus in meditation mode',
    icon: 'flower',
    color: '#9C27B0',
    requirement: 'Practice in meditation mode (<60 BPM) for',
    levels: [10, 30, 60], // minutes
  },
  [TEMPO_ACHIEVEMENTS.SLOW_AND_STEADY]: {
    key: TEMPO_ACHIEVEMENTS.SLOW_AND_STEADY,
    name: 'Slow and Steady',
    description: 'Complete consecutive days of slow practice',
    icon: 'calendar',
    color: Colors.warning,
    requirement: 'Practice under tempo for',
    levels: [3, 7, 14], // days
  },
  [TEMPO_ACHIEVEMENTS.TEMPO_DISCIPLINE]: {
    key: TEMPO_ACHIEVEMENTS.TEMPO_DISCIPLINE,
    name: 'Tempo Discipline',
    description: 'Maintain high tempo accuracy',
    icon: 'speedometer',
    color: Colors.error,
    requirement: 'Achieve 90%+ tempo accuracy for',
    levels: [10, 50, 100], // sessions
  },
  [TEMPO_ACHIEVEMENTS.MEDITATION_MASTER]: {
    key: TEMPO_ACHIEVEMENTS.MEDITATION_MASTER,
    name: 'Meditation Master',
    description: 'Master the art of ultra-slow practice',
    icon: 'infinite',
    color: '#673AB7',
    requirement: 'Complete meditation sessions',
    levels: [5, 20, 50], // sessions
  },
};

export const PatienceAchievements: React.FC<Props> = ({ onClose }) => {
  const user = useAppSelector((state) => state.auth.user);
  const [achievements, setAchievements] = useState<TempoAchievement[]>([]);
  const [progress, setProgress] = useState<Record<string, AchievementProgress>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Load unlocked achievements
      const unlockedAchievements = await tempoService.getStudentAchievements(user.id);
      setAchievements(unlockedAchievements);
      
      // Load progress for all achievement types
      const progressData: Record<string, AchievementProgress> = {};
      for (const type of Object.values(TEMPO_ACHIEVEMENTS)) {
        try {
          const achievementProgress = await tempoService.getAchievementProgress(user.id, type);
          progressData[type] = achievementProgress;
        } catch (error) {
          // Achievement type might not have any progress yet
          progressData[type] = {
            achievement_type: type,
            current_progress: 0,
            required_progress: 0,
            percentage_complete: 0,
            is_unlocked: false,
            level: 0,
          };
        }
      }
      setProgress(progressData);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderAchievementCard = (info: AchievementInfo) => {
    const achievementProgress = progress[info.key];
    const unlockedAchievement = achievements.find(a => a.achievement_type === info.key);
    const currentLevel = unlockedAchievement?.level || 0;
    const isUnlocked = currentLevel > 0;
    
    return (
      <View key={info.key} style={[styles.achievementCard, !isUnlocked && styles.lockedCard]}>
        <View style={[styles.iconContainer, { backgroundColor: info.color + '20' }]}>
          <Ionicons 
            name={info.icon as any} 
            size={32} 
            color={isUnlocked ? info.color : Colors.textSecondary} 
          />
        </View>
        
        <View style={styles.achievementInfo}>
          <Text style={[styles.achievementName, !isUnlocked && styles.lockedText]}>
            {info.name}
          </Text>
          <Text style={[styles.achievementDescription, !isUnlocked && styles.lockedText]}>
            {info.description}
          </Text>
          
          {/* Level indicators */}
          <View style={styles.levelsContainer}>
            {info.levels.map((levelRequirement, index) => {
              const level = index + 1;
              const isLevelUnlocked = currentLevel >= level;
              return (
                <View 
                  key={level} 
                  style={[
                    styles.levelBadge,
                    isLevelUnlocked && { backgroundColor: info.color }
                  ]}
                >
                  {isLevelUnlocked ? (
                    <Ionicons name="star" size={16} color="white" />
                  ) : (
                    <Text style={styles.levelText}>{level}</Text>
                  )}
                </View>
              );
            })}
          </View>
          
          {/* Progress bar */}
          {achievementProgress && !isUnlocked && achievementProgress.required_progress > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${achievementProgress.percentage_complete}%`,
                      backgroundColor: info.color 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.floor(achievementProgress.current_progress)} / {achievementProgress.required_progress}
              </Text>
            </View>
          )}
          
          {/* Requirement text */}
          <Text style={styles.requirementText}>
            {info.requirement} {info.levels[currentLevel] || info.levels[0]}
            {info.key.includes('padawan') || info.key.includes('zen') ? ' minutes' : 
             info.key.includes('steady') ? ' days' : 
             info.key.includes('discipline') || info.key.includes('meditation_master') ? ' sessions' : ''}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Patience Achievements</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Patience Achievements</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Master the art of slow practice and unlock achievements
        </Text>
        
        {Object.values(ACHIEVEMENT_DETAILS).map(renderAchievementCard)}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Practice under tempo to earn points and unlock achievements
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lockedCard: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  lockedText: {
    color: Colors.gray,
  },
  levelsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  levelBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  levelText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    minWidth: 50,
  },
  requirementText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});