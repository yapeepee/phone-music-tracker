import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CalendarDay, PracticeDay } from '../../types/history';
import { Colors } from '../../constants/colors';

interface PracticeCalendarProps {
  practiceData: Record<string, PracticeDay>; // keyed by YYYY-MM-DD
  onDayPress?: (date: string) => void;
  selectedDate?: string;
}

export const PracticeCalendar: React.FC<PracticeCalendarProps> = ({
  practiceData,
  onDayPress,
  selectedDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) { // 6 weeks
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const practiceDay = practiceData[dateString];
      
      days.push({
        date,
        dateString,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.getTime() === today.getTime(),
        hasPractice: !!practiceDay?.hasPracticed,
        sessionCount: practiceDay?.sessions.length || 0,
        totalMinutes: practiceDay?.totalMinutes || 0,
      });
    }
    
    return days;
  }, [currentDate, practiceData]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

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
              day.hasPractice && styles.hasPractice,
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
            
            {day.hasPractice && (
              <View style={styles.practiceIndicator}>
                <View style={[
                  styles.practiceDot,
                  day.totalMinutes >= 60 && styles.longPractice,
                ]} />
                {day.sessionCount > 1 && (
                  <Text style={styles.sessionCount}>{day.sessionCount}</Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Month Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {Object.values(practiceData).filter(d => {
            const date = new Date(d.date);
            return date.getMonth() === currentDate.getMonth() && 
                   date.getFullYear() === currentDate.getFullYear();
          }).length} days practiced this month
        </Text>
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
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
    color: '#666',
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
    color: '#333',
  },
  otherMonth: {
    opacity: 0.3,
  },
  otherMonthText: {
    color: '#999',
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
  hasPractice: {
    // Style handled by practice indicator
  },
  practiceIndicator: {
    position: 'absolute',
    bottom: 2,
    alignItems: 'center',
  },
  practiceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  longPractice: {
    backgroundColor: Colors.primary,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sessionCount: {
    fontSize: 8,
    color: Colors.primary,
    fontWeight: '600',
  },
  summary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});