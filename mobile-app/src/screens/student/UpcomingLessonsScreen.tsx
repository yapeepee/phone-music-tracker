import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { EventCard } from '../../components/schedule/EventCard';
import { scheduleService, ScheduleEvent } from '../../services/schedule.service';

export const UpcomingLessonsScreen: React.FC = () => {
  const navigation = useNavigation();
  
  const [upcomingEvents, setUpcomingEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUpcomingEvents = useCallback(async () => {
    try {
      setError(null);
      
      // Load upcoming events for the next 30 days
      const events = await scheduleService.getMyUpcomingEvents(30);
      
      // Sort by start time
      const sortedEvents = events.sort((a, b) => 
        new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      );
      
      setUpcomingEvents(sortedEvents);
    } catch (error) {
      console.error('Failed to load upcoming lessons:', error);
      setError('Failed to load upcoming lessons. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUpcomingEvents();
  }, [loadUpcomingEvents]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadUpcomingEvents();
  };

  const handleEventPress = (event: ScheduleEvent) => {
    // Navigate to event details when implemented
    console.log('Event pressed:', event.id);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Upcoming Lessons</Text>
      <TouchableOpacity
        style={styles.calendarButton}
        onPress={() => console.log('Open full calendar')}
      >
        <MaterialIcons name="calendar-today" size={24} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const groupEventsByDate = (events: ScheduleEvent[]) => {
    const grouped: Record<string, ScheduleEvent[]> = {};
    
    events.forEach(event => {
      const date = new Date(event.start_datetime).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    
    return grouped;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadUpcomingEvents}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const groupedEvents = groupEventsByDate(upcomingEvents);
  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {sortedDates.length > 0 ? (
          sortedDates.map(date => {
            const dateObj = new Date(date + 'T00:00:00');
            const isToday = new Date().toISOString().split('T')[0] === date;
            const isTomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] === date;
            
            let dateLabel = dateObj.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            });
            
            if (isToday) dateLabel = 'Today';
            if (isTomorrow) dateLabel = 'Tomorrow';
            
            return (
              <View key={date} style={styles.dateGroup}>
                <Text style={styles.dateHeader}>{dateLabel}</Text>
                {groupedEvents[date].map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={() => handleEventPress(event)}
                    showDate={false}
                  />
                ))}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-available" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyStateText}>No upcoming lessons</Text>
            <Text style={styles.emptyStateSubtext}>
              Your teacher will schedule lessons for you
            </Text>
          </View>
        )}
        
        {upcomingEvents.length > 0 && (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {upcomingEvents.length} lesson{upcomingEvents.length !== 1 ? 's' : ''} scheduled
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  calendarButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  summary: {
    padding: 16,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});