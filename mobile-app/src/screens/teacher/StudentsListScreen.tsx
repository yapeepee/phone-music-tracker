import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import teacherService, { StudentActivity } from '../../services/teacher.service';

// Extended type to handle both camelCase and snake_case from API
type StudentActivityFlexible = StudentActivity & {
  userId?: string;
  fullName?: string;
  practiceGoalMinutes?: number;
  lastSessionDate?: string;
  totalSessionsWeek?: number;
  totalMinutesWeek?: number;
  averageRatingWeek?: number;
  streakDays?: number;
  isActive?: boolean;
};
import { TeacherStackNavigationProp } from '../../navigation/types';

export const StudentsListScreen: React.FC = () => {
  const navigation = useNavigation<TeacherStackNavigationProp>();
  const [students, setStudents] = useState<StudentActivityFlexible[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      const data = await teacherService.getStudents({ activeOnly });
      // Ensure unique students by user_id/userId and filter out any without an ID
      const uniqueStudents = data.filter((student, index, self) => {
        const studentId = student.userId || student.user_id;
        return studentId && 
          self.findIndex(s => (s.userId || s.user_id) === studentId) === index;
      });
      setStudents(uniqueStudents);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeOnly]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStudents();
  };

  const navigateToStudentProfile = (studentId: string) => {
    navigation.navigate('StudentProfile', { studentId });
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMilliseconds = now.getTime() - date.getTime();
    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays === 0) {
      if (diffInHours === 0) {
        if (diffInMinutes === 0) {
          return 'just now';
        }
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      }
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays === 1) {
      return 'yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  };

  const renderStudentItem = ({ item }: { item: StudentActivityFlexible }) => {
    const lastSessionDate = item.lastSessionDate || item.last_session_date;
    const lastSessionText = lastSessionDate
      ? formatRelativeTime(lastSessionDate)
      : 'Never practiced';

    const getActivityColor = () => {
      const lastSessionDate = item.lastSessionDate || item.last_session_date;
      if (!lastSessionDate) return '#999';
      const daysSinceLastSession = (Date.now() - new Date(lastSessionDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastSession <= 2) return Colors.success;
      if (daysSinceLastSession <= 7) return Colors.warning;
      return Colors.error;
    };

    return (
      <TouchableOpacity
        style={styles.studentCard}
        onPress={() => navigateToStudentProfile(item.userId || item.user_id)}
      >
        <View style={styles.studentHeader}>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{item.fullName || item.full_name}</Text>
            <Text style={styles.studentEmail}>{item.email}</Text>
            {item.instrument && (
              <View style={styles.instrumentBadge}>
                <Ionicons name="musical-notes-outline" size={14} color="#666" />
                <Text style={styles.instrumentText}>{item.instrument}</Text>
              </View>
            )}
          </View>
          <View style={[styles.activityIndicator, { backgroundColor: getActivityColor() }]} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.totalSessionsWeek || item.total_sessions_week}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.totalMinutesWeek || item.total_minutes_week}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {(item.averageRatingWeek || item.average_rating_week) ? (item.averageRatingWeek || item.average_rating_week).toFixed(1) : '-'}
            </Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.streakDays || item.streak_days}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.lastSessionText}>Last practice: {lastSessionText}</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Students</Text>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Active only</Text>
          <Switch
            value={activeOnly}
            onValueChange={setActiveOnly}
            trackColor={{ false: '#ccc', true: Colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <FlatList
        data={students}
        renderItem={renderStudentItem}
        keyExtractor={(item, index) => item.userId || item.user_id || `student-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {activeOnly ? 'No active students' : 'No students assigned yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeOnly
                ? 'Students who practiced in the last 7 days will appear here'
                : 'Students assigned to you will appear here'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterLabel: {
    fontSize: 16,
    color: '#666',
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
  listContent: {
    paddingVertical: 16,
  },
  studentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  instrumentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  instrumentText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  activityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  lastSessionText: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});