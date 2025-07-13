import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CalendarDayEvents, CalendarEventSummary } from '../../services/schedule.service';

interface ScheduleCalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEventSummary[];
  eventCount: number;
}

interface ScheduleCalendarProps {
  calendarData: CalendarDayEvents[];
  onDayPress?: (date: string) => void;
  onEventPress?: (event: CalendarEventSummary) => void;
  selectedDate?: string;
  loading?: boolean;
}

export const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({
  calendarData,
  onDayPress,
  onEventPress,
  selectedDate,
  loading = false,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Convert CalendarDayEvents to a map for easy lookup
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEventSummary[]> = {};
    calendarData.forEach(dayEvents => {
      map[dayEvents.date] = dayEvents.events;
    });
    return map;
  }, [calendarData]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: ScheduleCalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) { // 6 weeks
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const events = eventsByDate[dateString] || [];
      
      days.push({
        date,
        dateString,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        events,
        eventCount: events.length,
      });
    }
    
    return days;
  }, [currentDate, eventsByDate]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getEventIndicatorColor = (events: CalendarEventSummary[]): string => {
    // Use the first event's color if available
    if (events.length > 0 && events[0].color) {
      return events[0].color;
    }
    return Colors.primary;
  };

  const renderEventIndicators = (events: CalendarEventSummary[]) => {
    if (events.length === 0) return null;

    // Show up to 3 event dots
    const displayEvents = events.slice(0, 3);
    
    return (
      <View style={styles.eventIndicatorContainer}>
        {displayEvents.map((event, index) => (
          <View
            key={event.id}
            style={[
              styles.eventDot,
              { backgroundColor: event.color || Colors.primary },
              index > 0 && styles.eventDotSpacing,
            ]}
          />
        ))}
        {events.length > 3 && (
          <Text style={styles.moreEventsText}>+{events.length - 3}</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Month Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateMonth(-1)}>
          <MaterialIcons name="chevron-left" size={28} color={Colors.primary} />
        </TouchableOpacity>
        
        <Text style={styles.monthText}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Text>
        
        <TouchableOpacity onPress={() => navigateMonth(1)}>
          <MaterialIcons name="chevron-right" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Day Headers */}
      <View style={styles.weekHeader}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Text key={day} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day) => (
          <TouchableOpacity
            key={day.dateString}
            style={[
              styles.dayCell,
              !day.isCurrentMonth && styles.otherMonth,
              day.isToday && styles.today,
              selectedDate === day.dateString && styles.selected,
              day.eventCount > 0 && styles.hasEvents,
            ]}
            onPress={() => onDayPress?.(day.dateString)}
            disabled={!day.isCurrentMonth}
          >
            <Text style={[
              styles.dayText,
              !day.isCurrentMonth && styles.otherMonthText,
              day.isToday && styles.todayText,
              selectedDate === day.dateString && styles.selectedText,
            ]}>
              {day.date.getDate()}
            </Text>
            
            {renderEventIndicators(day.events)}
          </TouchableOpacity>
        ))}
      </View>

      {/* Selected Day Events */}
      {selectedDate && eventsByDate[selectedDate] && eventsByDate[selectedDate].length > 0 && (
        <ScrollView style={styles.selectedDayEvents} showsVerticalScrollIndicator={false}>
          <Text style={styles.selectedDayTitle}>
            Events on {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
          {eventsByDate[selectedDate].map((event) => (
            <TouchableOpacity
              key={event.id}
              style={[styles.eventItem, { borderLeftColor: event.color || Colors.primary }]}
              onPress={() => onEventPress?.(event)}
            >
              <Text style={styles.eventTime}>
                {new Date(event.start_datetime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
              <Text style={styles.eventTitle} numberOfLines={1}>
                {event.title}
              </Text>
              {event.is_online && (
                <MaterialIcons name="videocam" size={16} color={Colors.textSecondary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayText: {
    fontSize: 16,
    color: Colors.text,
  },
  otherMonth: {
    opacity: 0.3,
  },
  otherMonthText: {
    color: Colors.textSecondary,
  },
  today: {
    backgroundColor: Colors.lightGray,
    borderRadius: 20,
  },
  todayText: {
    fontWeight: '600',
  },
  selected: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
  },
  selectedText: {
    color: 'white',
    fontWeight: '600',
  },
  hasEvents: {
    // Visual indication handled by event indicators
  },
  eventIndicatorContainer: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventDotSpacing: {
    marginLeft: 2,
  },
  moreEventsText: {
    fontSize: 8,
    color: Colors.textSecondary,
    marginLeft: 2,
    fontWeight: '600',
  },
  selectedDayEvents: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    maxHeight: 200,
  },
  selectedDayTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  eventTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 8,
    minWidth: 60,
  },
  eventTitle: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    marginRight: 8,
  },
});