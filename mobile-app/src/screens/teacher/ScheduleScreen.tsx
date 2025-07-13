import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { ScheduleCalendar } from '../../components/schedule/ScheduleCalendar';
import { EventCard } from '../../components/schedule/EventCard';
import { 
  scheduleService, 
  CalendarDayEvents, 
  ScheduleEvent,
  CalendarEventSummary,
} from '../../services/schedule.service';
import { useAppSelector } from '../../hooks/redux';

type ViewMode = 'calendar' | 'list';

export const ScheduleScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAppSelector((state) => state.auth.user);
  
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [calendarData, setCalendarData] = useState<CalendarDayEvents[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date range for fetching events
  const getDateRange = () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0); // Next month end
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const loadCalendarData = useCallback(async () => {
    try {
      setError(null);
      const dateRange = getDateRange();
      
      // Load calendar view
      const calendarResponse = await scheduleService.getCalendarView({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        includeCancelled: false,
      });
      
      setCalendarData(calendarResponse);
      
      // Also load events list
      const eventsResponse = await scheduleService.getEvents({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });
      
      setEvents(eventsResponse);
    } catch (error) {
      console.error('Failed to load schedule:', error);
      setError('Failed to load schedule. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCalendarData();
  };

  const handleDayPress = (date: string) => {
    setSelectedDate(date === selectedDate ? '' : date);
  };

  const handleEventPress = (event: CalendarEventSummary | ScheduleEvent) => {
    // Navigate to event details
    (navigation as any).navigate('EventDetails', { eventId: event.id });
  };

  const handleCreateEvent = () => {
    // Navigate to create event screen
    (navigation as any).navigate('CreateEvent');
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Schedule</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
        >
          <MaterialIcons
            name={viewMode === 'calendar' ? 'view-list' : 'calendar-today'}
            size={24}
            color={Colors.primary}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleCreateEvent}
        >
          <MaterialIcons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCalendarView = () => (
    <ScheduleCalendar
      calendarData={calendarData}
      selectedDate={selectedDate}
      onDayPress={handleDayPress}
      onEventPress={handleEventPress}
      loading={loading}
    />
  );

  const renderListView = () => {
    const upcomingEvents = events.filter(event => !scheduleService.isPast(event));
    const pastEvents = events.filter(event => scheduleService.isPast(event));

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {upcomingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => handleEventPress(event)}
              />
            ))}
          </View>
        )}

        {pastEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Past Events</Text>
            {pastEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => handleEventPress(event)}
              />
            ))}
          </View>
        )}

        {events.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <MaterialIcons name="event" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyStateText}>No events scheduled</Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={handleCreateEvent}
            >
              <Text style={styles.emptyStateButtonText}>Create your first event</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
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
          <TouchableOpacity style={styles.retryButton} onPress={loadCalendarData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {viewMode === 'calendar' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {renderCalendarView()}
          
          {/* Quick Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{events.length}</Text>
              <Text style={styles.statLabel}>Total Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {events.filter(e => scheduleService.isToday(e)).length}
              </Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {events.filter(e => !scheduleService.isPast(e)).length}
              </Text>
              <Text style={styles.statLabel}>Upcoming</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        renderListView()
      )}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewModeButton: {
    padding: 8,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: 16,
    marginBottom: 12,
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});