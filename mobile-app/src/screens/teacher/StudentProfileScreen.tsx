import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import teacherService, { StudentProfile } from '../../services/teacher.service';
import { SessionResponse } from '../../services/practice.service';
import { TeacherStackParamList } from '../../navigation/types';

// Extended types to handle both camelCase and snake_case from API
type StudentProfileFlexible = StudentProfile & {
  totalSessions?: number;
  totalPracticeMinutes?: number;
  averageSessionMinutes?: number;
  averageSelfRating?: number;
  sessionsLast7Days?: number;
  minutesLast7Days?: number;
  sessionsLast30Days?: number;
  minutesLast30Days?: number;
  improvementTrend?: number;
  consistencyScore?: number;
  student?: any;
  // Also handle case where root level has student data
  userId?: string;
  primaryTeacherId?: string;
  practiceGoalMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: any;
};

type SessionResponseFlexible = SessionResponse & {
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  selfRating?: number;
  createdAt?: string;
  updatedAt?: string;
};

type StudentProfileRouteProp = RouteProp<TeacherStackParamList, 'StudentProfile'>;
type StudentProfileNavigationProp = StackNavigationProp<TeacherStackParamList, 'StudentProfile'>;

export const StudentProfileScreen: React.FC = () => {
  const route = useRoute<StudentProfileRouteProp>();
  const navigation = useNavigation<StudentProfileNavigationProp>();
  const { studentId } = route.params;
  
  const [profile, setProfile] = useState<StudentProfileFlexible | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionResponseFlexible[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  const loadStudentData = async () => {
    try {
      const [profileData, sessionsData] = await Promise.all([
        teacherService.getStudentProfile(studentId),
        teacherService.getStudentRecentSessions(studentId, { days: 30, limit: 10 }),
      ]);
      
      // Log for debugging if needed
      if (__DEV__) {
        console.log('Profile data received:', profileData);
        console.log('Sessions data received:', sessionsData);
      }
      
      setProfile(profileData);
      setRecentSessions(sessionsData);
    } catch (error) {
      console.error('Failed to load student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToSession = (sessionId: string) => {
    navigation.navigate('SessionDetail', { sessionId });
  };

  const renderStatCard = (label: string, value: string | number, icon: string, color: string) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderSessionItem = (session: SessionResponseFlexible) => {
    const duration = session.durationMinutes || session.duration_minutes || 0;
    const startTime = session.startTime || session.start_time;
    const date = new Date(startTime || '');
    
    // Check for valid date
    const isValidDate = !isNaN(date.getTime());
    
    return (
      <TouchableOpacity
        key={session.id || `session-${Math.random()}`}
        style={styles.sessionItem}
        onPress={() => navigateToSession(session.id)}
      >
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionDate}>
            {isValidDate ? 
              `${date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })} at ${date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}` : 
              'Date not available'
            }
          </Text>
          <View style={styles.sessionDetails}>
            {session.focus && (
              <View style={styles.focusBadge}>
                <Text style={styles.focusText}>{session.focus}</Text>
              </View>
            )}
            <Text style={styles.durationText}>{duration} min</Text>
            {(session.selfRating || session.self_rating) && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>{session.selfRating || session.self_rating}</Text>
              </View>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading student profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load student profile</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Handle case where entire profile is student object (due to API transformation)
  const student = profile.student || (profile as any);
  const improvementTrend = profile.improvementTrend || profile.improvement_trend || 0;
  
  // Extract user data - check multiple possible locations
  const userData = student.user || profile.user || {};
  const fullName = userData.fullName || userData.full_name || 'Unknown Student';
  const email = userData.email || 'No email';
  
  // Log for debugging if needed
  if (__DEV__) {
    console.log('Student object:', student);
    console.log('User data:', userData);
  }
  const trendIcon = improvementTrend > 0 ? 'trending-up' : improvementTrend < 0 ? 'trending-down' : 'remove';
  const trendColor = improvementTrend > 0 ? Colors.success : improvementTrend < 0 ? Colors.error : '#999';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.studentName}>{fullName}</Text>
            <Text style={styles.studentEmail}>{email}</Text>
            <View style={styles.badgeContainer}>
              {student.instrument && (
                <View style={styles.instrumentBadge}>
                  <Ionicons name="musical-notes-outline" size={16} color="#666" />
                  <Text style={styles.instrumentText}>{student.instrument}</Text>
                </View>
              )}
              {student.level && (
                <View style={styles.levelBadge}>
                  <Ionicons name="school-outline" size={16} color="#666" />
                  <Text style={styles.levelText}>
                    {student.level.charAt(0).toUpperCase() + student.level.slice(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Overview Stats */}
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Total Sessions',
            profile.totalSessions || profile.total_sessions || 0,
            'calendar-outline',
            Colors.primary
          )}
          {renderStatCard(
            'Total Minutes',
            profile.totalPracticeMinutes || profile.total_practice_minutes || 0,
            'time-outline',
            Colors.secondary
          )}
          {renderStatCard(
            'Avg Rating',
            (profile.averageSelfRating || profile.average_self_rating)?.toFixed(1) || '-',
            'star-outline',
            '#FFD700'
          )}
          {renderStatCard(
            'Consistency',
            (profile.consistencyScore || profile.consistency_score) ? `${Math.round(profile.consistencyScore || profile.consistency_score)}%` : '-',
            'checkmark-circle-outline',
            Colors.success
          )}
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progress Trend</Text>
            <Ionicons name={trendIcon as any} size={24} color={trendColor} />
          </View>
          <Text style={styles.progressText}>
            {improvementTrend > 0
              ? `Improving by ${(improvementTrend * 100).toFixed(0)}%`
              : improvementTrend < 0
              ? `Declining by ${Math.abs(improvementTrend * 100).toFixed(0)}%`
              : 'Stable performance'}
          </Text>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityRow}>
            <View style={styles.activityItem}>
              <Text style={styles.activityValue}>{profile.sessionsLast7Days || profile.sessions_last_7_days || 0}</Text>
              <Text style={styles.activityLabel}>Sessions (7d)</Text>
            </View>
            <View style={styles.activityItem}>
              <Text style={styles.activityValue}>{profile.minutesLast7Days || profile.minutes_last_7_days || 0}</Text>
              <Text style={styles.activityLabel}>Minutes (7d)</Text>
            </View>
            <View style={styles.activityItem}>
              <Text style={styles.activityValue}>{profile.sessionsLast30Days || profile.sessions_last_30_days || 0}</Text>
              <Text style={styles.activityLabel}>Sessions (30d)</Text>
            </View>
            <View style={styles.activityItem}>
              <Text style={styles.activityValue}>{profile.minutesLast30Days || profile.minutes_last_30_days || 0}</Text>
              <Text style={styles.activityLabel}>Minutes (30d)</Text>
            </View>
          </View>
        </View>

        {/* Recent Sessions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {recentSessions.length > 0 ? (
            recentSessions.map(renderSessionItem)
          ) : (
            <Text style={styles.noSessionsText}>No practice sessions yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
    marginTop: 4,
  },
  headerInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  instrumentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  instrumentText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  levelText: {
    fontSize: 14,
    color: '#1976d2',
    marginLeft: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    marginTop: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    margin: '1%',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  activityItem: {
    alignItems: 'center',
  },
  activityValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  activityLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sessionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  focusBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  focusText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  noSessionsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
});