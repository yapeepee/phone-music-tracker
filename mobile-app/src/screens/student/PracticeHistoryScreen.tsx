import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { PracticeCalendar } from '../../components/practice/PracticeCalendar';
import { SessionListItem } from '../../components/practice/SessionListItem';
import { PracticeDay, PracticeSessionSummary } from '../../types/history';
import { Colors } from '../../constants/colors';
import practiceService from '../../services/practice.service';
import { SessionResponse } from '../../services/practice.service';
import { SessionDetailsModal } from '../../components/practice/SessionDetailsModal';

export const PracticeHistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const [practiceData, setPracticeData] = useState<Record<string, PracticeDay>>({});
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDaySessions, setSelectedDaySessions] = useState<PracticeSessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionResponse | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);

  const loadPracticeHistory = useCallback(async () => {
    try {
      // Get date range for current month and previous month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 31);
      
      // Backend expects full ISO datetime format
      const startStr = startDate.toISOString();
      const endStr = endDate.toISOString();
      
      // Use existing getSessions with parameters
      const sessions = await practiceService.getSessions({
        startDate: startStr,
        endDate: endStr,
      });
      
      // Transform sessions into practice days
      const dataByDate: Record<string, PracticeDay> = {};
      
      sessions.forEach((session: SessionResponse) => {
        const date = session.startTime.split('T')[0];
        
        if (!dataByDate[date]) {
          dataByDate[date] = {
            date,
            sessions: [],
            totalMinutes: 0,
            hasPracticed: true,
          };
        }
        
        const durationMinutes = session.endTime
          ? Math.round(
              (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) /
              (1000 * 60)
            )
          : 30; // Default 30 minutes if no end time
        
        const sessionSummary: PracticeSessionSummary = {
          id: session.id,
          start_time: session.startTime,
          end_time: session.endTime,
          duration_minutes: durationMinutes,
          focus: session.focus,
          self_rating: session.selfRating,
          has_video: false, // TODO: Check if session has video
          has_feedback: false, // TODO: Check if session has feedback
          tags: session.tags || [],
        };
        
        dataByDate[date].sessions.push(sessionSummary);
        dataByDate[date].totalMinutes += durationMinutes;
      });
      
      setPracticeData(dataByDate);
    } catch (error: any) {
      console.error('Failed to load practice history:', error);
      // Log the full error details for debugging
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPracticeHistory();
  }, [loadPracticeHistory]);

  const handleDayPress = (date: string) => {
    setSelectedDate(date);
    const dayData = practiceData[date];
    setSelectedDaySessions(dayData?.sessions || []);
  };

  const handleSessionPress = async (sessionId: string) => {
    try {
      // Load full session details
      const fullSession = await practiceService.getSession(sessionId);
      setSelectedSession(fullSession);
      setShowSessionDetails(true);
    } catch (error) {
      console.error('Failed to load session details:', error);
    }
  };

  const handleCloseModal = () => {
    setShowSessionDetails(false);
    // Delay clearing session to avoid flicker during close animation
    setTimeout(() => setSelectedSession(null), 200);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPracticeHistory();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading practice history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Practice History</Text>
        
        <PracticeCalendar
          practiceData={practiceData}
          onDayPress={handleDayPress}
          selectedDate={selectedDate}
        />
        
        {selectedDate && (
          <View style={styles.sessionsSection}>
            <Text style={styles.sectionTitle}>
              Sessions on {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
            
            {selectedDaySessions.length > 0 ? (
              selectedDaySessions.map((session) => (
                <SessionListItem
                  key={session.id}
                  session={session}
                  onPress={() => handleSessionPress(session.id)}
                />
              ))
            ) : (
              <Text style={styles.noSessionsText}>No practice sessions on this day</Text>
            )}
          </View>
        )}
        
        {!selectedDate && Object.keys(practiceData).length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No practice sessions recorded yet</Text>
            <Text style={styles.emptySubtext}>
              Start practicing to see your history here!
            </Text>
          </View>
        )}
      </ScrollView>
      
      <SessionDetailsModal
        visible={showSessionDetails}
        onClose={handleCloseModal}
        session={selectedSession}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    paddingHorizontal: 16,
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 20,
  },
  sessionsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  noSessionsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
});