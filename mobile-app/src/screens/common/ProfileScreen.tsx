import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import authService from '../../services/auth.service';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { ReputationBadge } from '../../components/reputation/ReputationBadge';
import { challengeService, UserAchievement } from '../../services/challenge.service';
import { useNavigation } from '@react-navigation/native';

export const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const user = useAppSelector((state) => state.auth.user);
  const preferences = useAppSelector((state) => state.user.preferences);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoadingAchievements(true);
      const response = await challengeService.getUserAchievements();
      setAchievements(response.items.slice(0, 4)); // Show only first 4
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoadingAchievements(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            dispatch(logout());
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileIcon}>
          <Text style={styles.profileIconText}>
            {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Reputation Section */}
      <View style={styles.reputationSection}>
        <Text style={styles.reputationTitle}>Community Reputation</Text>
        <View style={styles.reputationContent}>
          <ReputationBadge
            points={user?.reputationPoints || 0}
            level={user?.reputationLevel || 'newcomer'}
            size="large"
          />
          <TouchableOpacity style={styles.viewHistoryButton}>
            <Text style={styles.viewHistoryText}>View History →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Achievements Section */}
      <View style={styles.achievementsSection}>
        <View style={styles.achievementsHeader}>
          <Text style={styles.achievementsTitle}>Recent Achievements</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Challenges' as never)}>
            <Text style={styles.viewAllText}>View All →</Text>
          </TouchableOpacity>
        </View>
        
        {loadingAchievements ? (
          <ActivityIndicator size="small" color={Colors.primary} style={styles.achievementsLoader} />
        ) : achievements.length > 0 ? (
          <View style={styles.achievementsGrid}>
            {achievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementItem}>
                <View 
                  style={[
                    styles.achievementIcon,
                    { backgroundColor: challengeService.getAchievementColor(achievement.achievement.tier) + '20' }
                  ]}
                >
                  <MaterialCommunityIcons
                    name={achievement.achievement.icon}
                    size={24}
                    color={challengeService.getAchievementColor(achievement.achievement.tier)}
                  />
                </View>
                <Text style={styles.achievementName} numberOfLines={2}>
                  {achievement.achievement.name}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noAchievementsText}>No achievements yet. Start completing challenges!</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>Edit Profile</Text>
          <Text style={styles.settingIcon}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>Change Password</Text>
          <Text style={styles.settingIcon}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => navigation.navigate('NotificationSettings' as never)}
        >
          <Text style={styles.settingLabel}>Notification Settings</Text>
          <Text style={styles.settingIcon}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Dark Mode</Text>
          <Text style={styles.settingValue}>
            {preferences.theme === 'dark' ? 'On' : 'Off'}
          </Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Auto Sync</Text>
          <Text style={styles.settingValue}>
            {preferences.autoSync ? 'On' : 'Off'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>Terms of Service</Text>
          <Text style={styles.settingIcon}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>Privacy Policy</Text>
          <Text style={styles.settingIcon}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>Help & Support</Text>
          <Text style={styles.settingIcon}>›</Text>
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Version</Text>
          <Text style={styles.settingValue}>1.0.0</Text>
        </View>
      </View>

      <View style={styles.logoutSection}>
        <Button
          title="Logout"
          onPress={handleLogout}
          variant="outline"
          size="large"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileIconText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.surface,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  roleTag: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.surface,
  },
  section: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  settingValue: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  settingIcon: {
    fontSize: 20,
    color: Colors.textSecondary,
  },
  logoutSection: {
    padding: 24,
    paddingBottom: 48,
  },
  reputationSection: {
    padding: 24,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reputationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  reputationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewHistoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  viewHistoryText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  achievementsSection: {
    padding: 24,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  achievementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  achievementsLoader: {
    paddingVertical: 20,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  achievementItem: {
    width: '25%',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  achievementName: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  noAchievementsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
});