import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../hooks/redux';
import { Colors } from '../../constants/colors';
import { TeacherStackNavigationProp } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { NotificationBadge } from '../../components/notifications/NotificationBadge';

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<TeacherStackNavigationProp>();
  const user = useAppSelector((state) => state.auth.user);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Welcome back, {user?.full_name}</Text>
          <Text style={styles.subtitle}>Here's your teaching overview</Text>
        </View>
        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={() => navigation?.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color={Colors.primary} />
          <NotificationBadge size="small" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>24</Text>
          <Text style={styles.statLabel}>Active Students</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={styles.statLabel}>Classes This Week</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Pending Reviews</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>92%</Text>
          <Text style={styles.statLabel}>Student Progress</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('TagManagement')}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>🏷️</Text>
            </View>
            <Text style={styles.actionLabel}>Manage Tags</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📝</Text>
            </View>
            <Text style={styles.actionLabel}>Create Assignment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📊</Text>
            </View>
            <Text style={styles.actionLabel}>View Reports</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>📚</Text>
            </View>
            <Text style={styles.actionLabel}>Resources</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Student Activity</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityList}>
          <TouchableOpacity style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityIconText}>JS</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityName}>Jane Smith</Text>
              <Text style={styles.activityText}>Submitted practice video - Scales</Text>
              <Text style={styles.activityTime}>2 hours ago</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.activityItem}>
            <View style={styles.activityIcon}>
              <Text style={styles.activityIconText}>MJ</Text>
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityName}>Mike Johnson</Text>
              <Text style={styles.activityText}>Completed weekly practice goal</Text>
              <Text style={styles.activityTime}>5 hours ago</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        <View style={styles.scheduleList}>
          <View style={styles.scheduleItem}>
            <View style={styles.scheduleTime}>
              <Text style={styles.scheduleTimeText}>10:00 AM</Text>
            </View>
            <View style={styles.scheduleContent}>
              <Text style={styles.scheduleName}>Sarah Williams</Text>
              <Text style={styles.scheduleType}>Violin Lesson - Intermediate</Text>
            </View>
          </View>
          <View style={styles.scheduleItem}>
            <View style={styles.scheduleTime}>
              <Text style={styles.scheduleTimeText}>2:00 PM</Text>
            </View>
            <View style={styles.scheduleContent}>
              <Text style={styles.scheduleName}>Group Class</Text>
              <Text style={styles.scheduleType}>Music Theory - Beginners</Text>
            </View>
          </View>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingTop: 48,
  },
  headerContent: {
    flex: 1,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  statCard: {
    width: '45%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    margin: '2.5%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  activityList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityIconText: {
    color: Colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  activityText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  scheduleList: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  scheduleTime: {
    marginRight: 16,
  },
  scheduleTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  scheduleType: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  actionButton: {
    width: '23%',
    alignItems: 'center',
    marginRight: '2.66%',
    marginBottom: 16,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },
});