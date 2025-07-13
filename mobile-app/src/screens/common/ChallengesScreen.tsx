import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  challengeService,
  ChallengeWithProgress,
  UserChallenge,
  ChallengeStatus,
  ChallengeType
} from '../../services/challenge.service';
import { Colors } from '../../constants/colors';

export default function ChallengesScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'all' | 'completed'>('all');
  const [availableChallenges, setAvailableChallenges] = useState<ChallengeWithProgress[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<UserChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      if (activeTab === 'all') {
        const response = await challengeService.getChallenges();
        setAvailableChallenges(response.items);
      } else {
        const challenges = await challengeService.getCompletedChallenges();
        setCompletedChallenges(challenges);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      Alert.alert('Error', 'Failed to load challenges');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };


  const renderProgressBar = (progress: number) => {
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${Math.min(progress, 100)}%` }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
      </View>
    );
  };

  const renderAvailableChallenge = ({ item }: { item: ChallengeWithProgress }) => {
    const icon = challengeService.getChallengeIcon(item.type);
    
    return (
      <View 
        style={[styles.challengeCard, { borderLeftColor: item.color }]}
      >
        <View style={styles.challengeHeader}>
          <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
            <MaterialCommunityIcons name={icon} size={24} color={item.color} />
          </View>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeName}>{item.name}</Text>
            <Text style={styles.challengeDescription} numberOfLines={2}>
              {item.description}
            </Text>
          </View>
          <View style={styles.rewardContainer}>
            <MaterialCommunityIcons name="star" size={16} color={Colors.primary} />
            <Text style={styles.rewardText}>{item.reputationReward}</Text>
          </View>
        </View>
        
        {item.userStatus === ChallengeStatus.IN_PROGRESS && (
          renderProgressBar(item.userProgressPercentage || 0)
        )}
        
        {!item.canStart && item.cooldownRemainingDays && (
          <Text style={styles.cooldownText}>
            Available in {item.cooldownRemainingDays} days
          </Text>
        )}
        
        {item.achievement && (
          <View style={styles.achievementPreview}>
            <MaterialCommunityIcons 
              name={item.achievement.icon} 
              size={16} 
              color={challengeService.getAchievementColor(item.achievement.tier)} 
            />
            <Text style={styles.achievementText}>{item.achievement.name}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderCompletedChallenge = ({ item }: { item: UserChallenge }) => {
    const icon = challengeService.getChallengeIcon(item.challenge.type);
    
    return (
      <View style={[styles.challengeCard, styles.completedCard]}>
        <View style={styles.challengeHeader}>
          <View style={[styles.iconContainer, { backgroundColor: Colors.success + '20' }]}>
            <MaterialCommunityIcons name={icon} size={24} color={Colors.success} />
          </View>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeName}>{item.challenge.name}</Text>
            <Text style={styles.completedDate}>
              Completed: {new Date(item.completedAt!).toLocaleDateString()}
            </Text>
          </View>
          <MaterialCommunityIcons name="check-circle" size={24} color={Colors.success} />
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    let data: any[] = [];
    let renderItem: any;
    let emptyMessage = '';

    if (activeTab === 'all') {
      data = availableChallenges;
      renderItem = renderAvailableChallenge;
      emptyMessage = 'No challenges available at the moment';
    } else {
      data = completedChallenges;
      renderItem = renderCompletedChallenge;
      emptyMessage = 'No completed challenges yet';
    }

    if (data.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons 
            name="trophy-outline" 
            size={64} 
            color={Colors.textSecondary} 
          />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadData();
            }}
            colors={[Colors.primary]}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Challenges</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <MaterialCommunityIcons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text
  },
  closeButton: {
    padding: 4
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    position: 'relative'
  },
  activeTab: {
    borderBottomColor: Colors.primary
  },
  tabText: {
    fontSize: 16,
    color: Colors.textSecondary
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600'
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 20,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center'
  },
  badgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold'
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  challengeCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  completedCard: {
    borderLeftColor: Colors.success
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  challengeInfo: {
    flex: 1,
    marginRight: 12
  },
  challengeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4
  },
  challengeDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20
  },
  progressStats: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500'
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: 4
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4
  },
  progressText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    minWidth: 35
  },
  cooldownText: {
    fontSize: 12,
    color: Colors.warning,
    fontStyle: 'italic',
    marginTop: 8
  },
  achievementPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  achievementText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 6
  },
  expiresText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic'
  },
  completedDate: {
    fontSize: 12,
    color: Colors.textSecondary
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16
  }
});