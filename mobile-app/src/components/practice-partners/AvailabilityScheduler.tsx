import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { practicePartnerService } from '../../services/practice-partner.service';
import { UserAvailability, UserAvailabilityCreate } from '../../types/practicePartner';

interface DayAvailability {
  day: number;
  name: string;
  enabled: boolean;
  startTime: Date;
  endTime: Date;
}

const DAYS_OF_WEEK = [
  { day: 0, name: 'Sunday' },
  { day: 1, name: 'Monday' },
  { day: 2, name: 'Tuesday' },
  { day: 3, name: 'Wednesday' },
  { day: 4, name: 'Thursday' },
  { day: 5, name: 'Friday' },
  { day: 6, name: 'Saturday' },
];

export const AvailabilityScheduler: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availabilities, setAvailabilities] = useState<DayAvailability[]>([]);
  const [showTimePicker, setShowTimePicker] = useState<{
    day: number;
    type: 'start' | 'end';
  } | null>(null);
  const [currentAvailability, setCurrentAvailability] = useState<UserAvailability[]>([]);

  useEffect(() => {
    loadAvailability();
  }, []);

  const loadAvailability = async () => {
    try {
      const data = await practicePartnerService.getUserAvailability();
      setCurrentAvailability(data);
      
      // Initialize all days with existing data
      const dayMap = new Map(data.map(a => [a.day_of_week, a]));
      
      const initialDays = DAYS_OF_WEEK.map(({ day, name }) => {
        const existing = dayMap.get(day);
        return {
          day,
          name,
          enabled: !!existing,
          startTime: existing 
            ? parseTimeString(existing.start_time)
            : new Date(2000, 0, 1, 9, 0), // Default 9 AM
          endTime: existing
            ? parseTimeString(existing.end_time)
            : new Date(2000, 0, 1, 17, 0), // Default 5 PM
        };
      });
      
      setAvailabilities(initialDays);
    } catch (error) {
      console.error('Failed to load availability:', error);
      // Initialize with defaults
      setAvailabilities(
        DAYS_OF_WEEK.map(({ day, name }) => ({
          day,
          name,
          enabled: false,
          startTime: new Date(2000, 0, 1, 9, 0),
          endTime: new Date(2000, 0, 1, 17, 0),
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const parseTimeString = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(2000, 0, 1, hours, minutes);
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const formatTimeForAPI = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}:00`;
  };

  const toggleDay = (dayIndex: number) => {
    setAvailabilities(prev =>
      prev.map((day, index) =>
        index === dayIndex ? { ...day, enabled: !day.enabled } : day
      )
    );
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(null);
    
    if (selectedDate && showTimePicker) {
      const { day, type } = showTimePicker;
      setAvailabilities(prev =>
        prev.map((avail, index) =>
          avail.day === day
            ? { ...avail, [type === 'start' ? 'startTime' : 'endTime']: selectedDate }
            : avail
        )
      );
    }
  };

  const saveAvailability = async () => {
    setSaving(true);
    
    try {
      // Get current availability IDs for deletion
      const currentIds = currentAvailability.map(a => a.id);
      
      // Delete all existing availability
      for (const id of currentIds) {
        await practicePartnerService.deleteAvailabilitySlot(id);
      }
      
      // Add new availability
      const enabledDays = availabilities.filter(day => day.enabled);
      
      for (const day of enabledDays) {
        const data: UserAvailabilityCreate = {
          day_of_week: day.day,
          start_time: formatTimeForAPI(day.startTime),
          end_time: formatTimeForAPI(day.endTime),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          is_active: true,
        };
        
        await practicePartnerService.addAvailabilitySlot(data);
      }
      
      Alert.alert('Success', 'Your availability has been saved');
      await loadAvailability(); // Reload to get latest data
    } catch (error) {
      console.error('Failed to save availability:', error);
      Alert.alert('Error', 'Failed to save availability. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Set Your Practice Availability</Text>
      <Text style={styles.subtitle}>
        Let partners know when you're available to practice
      </Text>

      {availabilities.map((day, index) => (
        <View key={day.day} style={styles.dayCard}>
          <TouchableOpacity
            style={styles.dayHeader}
            onPress={() => toggleDay(index)}
          >
            <Text style={styles.dayName}>{day.name}</Text>
            <View style={[styles.checkbox, day.enabled && styles.checkboxChecked]}>
              {day.enabled && (
                <Ionicons name="checkmark" size={16} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>

          {day.enabled && (
            <View style={styles.timeContainer}>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker({ day: day.day, type: 'start' })}
              >
                <Text style={styles.timeLabel}>Start</Text>
                <Text style={styles.timeValue}>{formatTime(day.startTime)}</Text>
              </TouchableOpacity>

              <Text style={styles.timeSeparator}>to</Text>

              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker({ day: day.day, type: 'end' })}
              >
                <Text style={styles.timeLabel}>End</Text>
                <Text style={styles.timeValue}>{formatTime(day.endTime)}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={saveAvailability}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Ionicons name="save-outline" size={20} color="#FFF" />
            <Text style={styles.saveButtonText}>Save Availability</Text>
          </>
        )}
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={
            availabilities.find(a => a.day === showTimePicker.day)?.[
              showTimePicker.type === 'start' ? 'startTime' : 'endTime'
            ] || new Date()
          }
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.backgroundDark,
    borderRadius: 8,
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  timeSeparator: {
    marginHorizontal: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});