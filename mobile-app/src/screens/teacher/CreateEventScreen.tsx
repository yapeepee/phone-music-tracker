import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { 
  scheduleService, 
  EventType,
  RecurrenceType,
  RecurrenceRule,
  ScheduleEventCreateRequest 
} from '../../services/schedule.service';
import { TeacherNavigatorScreenProps } from '../../navigation/types';

type CreateEventScreenProps = TeacherNavigatorScreenProps<'CreateEvent'>;

const eventTypes = [
  { value: EventType.LESSON, label: 'Lesson', icon: 'school' },
  { value: EventType.PRACTICE, label: 'Practice', icon: 'piano' },
  { value: EventType.MASTERCLASS, label: 'Master Class', icon: 'star' },
  { value: EventType.RECITAL, label: 'Recital', icon: 'music-note' },
  { value: EventType.OTHER, label: 'Other', icon: 'event' },
];

const eventColors = [
  '#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6B7280', '#3B82F6',
];

// Helper function to get ordinal suffix
const getOrdinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const CreateEventScreen: React.FC = () => {
  const navigation = useNavigation<CreateEventScreenProps['navigation']>();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>(EventType.LESSON);
  const [startDateTime, setStartDateTime] = useState(new Date());
  const [endDateTime, setEndDateTime] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour later
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [activePickerType, setActivePickerType] = useState<'start' | 'end'>('start');
  const [location, setLocation] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366F1');
  const [reminderMinutes, setReminderMinutes] = useState('15');
  const [loading, setLoading] = useState(false);
  
  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(RecurrenceType.WEEKLY);
  const [interval, setInterval] = useState('1');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [weekOfMonth, setWeekOfMonth] = useState('1');
  const [endCondition, setEndCondition] = useState<'never' | 'date' | 'occurrences'>('never');
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days from now
  const [occurrences, setOccurrences] = useState('10');
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleCreate = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }

    if (isOnline && !meetingUrl.trim()) {
      Alert.alert('Error', 'Please enter a meeting URL for online events');
      return;
    }

    if (endDateTime <= startDateTime) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    try {
      setLoading(true);

      // Build recurrence rule if enabled
      let recurrenceRule: RecurrenceRule | undefined;
      if (isRecurring && recurrenceType !== RecurrenceType.NONE) {
        recurrenceRule = {
          recurrence_type: recurrenceType,
          interval: parseInt(interval) || 1,
        };

        // Add type-specific fields
        if (recurrenceType === RecurrenceType.WEEKLY || recurrenceType === RecurrenceType.BIWEEKLY) {
          recurrenceRule.days_of_week = daysOfWeek.length > 0 ? daysOfWeek : [startDateTime.getDay()];
        } else if (recurrenceType === RecurrenceType.MONTHLY) {
          if (weekOfMonth !== '0') {
            recurrenceRule.week_of_month = parseInt(weekOfMonth);
            recurrenceRule.days_of_week = [startDateTime.getDay()];
          } else {
            recurrenceRule.day_of_month = parseInt(dayOfMonth) || startDateTime.getDate();
          }
        }

        // Add end condition
        if (endCondition === 'date') {
          recurrenceRule.end_date = endDate.toISOString().split('T')[0];
        } else if (endCondition === 'occurrences') {
          recurrenceRule.occurrences = parseInt(occurrences) || 10;
        }
      }

      const eventData: ScheduleEventCreateRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        event_type: eventType,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        location: location.trim() || undefined,
        is_online: isOnline,
        meeting_url: isOnline ? meetingUrl.trim() : undefined,
        color: selectedColor,
        reminder_minutes: parseInt(reminderMinutes) || 15,
        participant_ids: [], // TODO: Add participant selection
        recurrence_rule: recurrenceRule,
      };

      await scheduleService.createEvent(eventData);

      Alert.alert('Success', 'Event created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const openDateTimePicker = (type: 'start' | 'end') => {
    setActivePickerType(type);
    setPickerMode('date');
    if (type === 'start') {
      setShowStartPicker(true);
      setShowEndPicker(false);
    } else {
      setShowEndPicker(true);
      setShowStartPicker(false);
    }
  };

  const handleDateTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
      setShowEndPicker(false);
    }

    if (selectedDate && event.type !== 'dismissed') {
      if (activePickerType === 'start') {
        if (pickerMode === 'date') {
          // Update date part of startDateTime
          const newStartDateTime = new Date(selectedDate);
          newStartDateTime.setHours(startDateTime.getHours());
          newStartDateTime.setMinutes(startDateTime.getMinutes());
          setStartDateTime(newStartDateTime);
          
          // On iOS, automatically show time picker after date selection
          if (Platform.OS === 'ios') {
            setPickerMode('time');
          } else {
            // On Android, show time picker separately
            setTimeout(() => {
              setPickerMode('time');
              setShowStartPicker(true);
            }, 100);
          }
        } else {
          // Update time part of startDateTime
          const newStartDateTime = new Date(startDateTime);
          newStartDateTime.setHours(selectedDate.getHours());
          newStartDateTime.setMinutes(selectedDate.getMinutes());
          setStartDateTime(newStartDateTime);
          
          // Automatically adjust end time if it's before start time
          if (endDateTime <= newStartDateTime) {
            setEndDateTime(new Date(newStartDateTime.getTime() + 60 * 60 * 1000));
          }
          
          if (Platform.OS === 'android') {
            setShowStartPicker(false);
          }
        }
      } else {
        if (pickerMode === 'date') {
          // Update date part of endDateTime
          const newEndDateTime = new Date(selectedDate);
          newEndDateTime.setHours(endDateTime.getHours());
          newEndDateTime.setMinutes(endDateTime.getMinutes());
          setEndDateTime(newEndDateTime);
          
          // On iOS, automatically show time picker after date selection
          if (Platform.OS === 'ios') {
            setPickerMode('time');
          } else {
            // On Android, show time picker separately
            setTimeout(() => {
              setPickerMode('time');
              setShowEndPicker(true);
            }, 100);
          }
        } else {
          // Update time part of endDateTime
          const newEndDateTime = new Date(endDateTime);
          newEndDateTime.setHours(selectedDate.getHours());
          newEndDateTime.setMinutes(selectedDate.getMinutes());
          setEndDateTime(newEndDateTime);
          
          if (Platform.OS === 'android') {
            setShowEndPicker(false);
          }
        }
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter event title"
            placeholderTextColor={Colors.textSecondary}
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add event description"
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Event Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Event Type</Text>
          <View style={styles.typeContainer}>
            {eventTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeOption,
                  eventType === type.value && styles.typeOptionSelected,
                ]}
                onPress={() => setEventType(type.value)}
              >
                <MaterialIcons 
                  name={type.icon as any} 
                  size={24} 
                  color={eventType === type.value ? Colors.primary : Colors.textSecondary} 
                />
                <Text style={[
                  styles.typeLabel,
                  eventType === type.value && styles.typeLabelSelected,
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={styles.label}>Start Date & Time *</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => openDateTimePicker('start')}
          >
            <MaterialIcons name="event" size={20} color={Colors.textSecondary} />
            <Text style={styles.dateButtonText}>
              {startDateTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              })}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>End Date & Time *</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => openDateTimePicker('end')}
          >
            <MaterialIcons name="event" size={20} color={Colors.textSecondary} />
            <Text style={styles.dateButtonText}>
              {endDateTime.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Online Event</Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={isOnline ? Colors.primaryDark : Colors.surface}
            />
          </View>
          
          {!isOnline ? (
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location"
              placeholderTextColor={Colors.textSecondary}
            />
          ) : (
            <TextInput
              style={styles.input}
              value={meetingUrl}
              onChangeText={setMeetingUrl}
              placeholder="Enter meeting URL"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="url"
              autoCapitalize="none"
            />
          )}
        </View>

        {/* Color Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>Event Color</Text>
          <View style={styles.colorContainer}>
            {eventColors.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && (
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reminder */}
        <View style={styles.section}>
          <Text style={styles.label}>Reminder</Text>
          <View style={styles.reminderContainer}>
            {['0', '15', '30', '60'].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.reminderOption,
                  reminderMinutes === minutes && styles.reminderOptionSelected,
                ]}
                onPress={() => setReminderMinutes(minutes)}
              >
                <Text style={[
                  styles.reminderText,
                  reminderMinutes === minutes && styles.reminderTextSelected,
                ]}>
                  {minutes === '0' ? 'None' : `${minutes} min`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recurrence */}
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Repeat Event</Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor={isRecurring ? Colors.primaryDark : Colors.surface}
            />
          </View>

          {isRecurring && (
            <>
              {/* Recurrence Type */}
              <View style={styles.subsection}>
                <Text style={styles.sublabel}>Repeat</Text>
                <View style={styles.recurrenceTypeContainer}>
                  {[
                    { value: RecurrenceType.DAILY, label: 'Daily' },
                    { value: RecurrenceType.WEEKLY, label: 'Weekly' },
                    { value: RecurrenceType.BIWEEKLY, label: 'Biweekly' },
                    { value: RecurrenceType.MONTHLY, label: 'Monthly' },
                  ].map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.recurrenceOption,
                        recurrenceType === type.value && styles.recurrenceOptionSelected,
                      ]}
                      onPress={() => setRecurrenceType(type.value)}
                    >
                      <Text style={[
                        styles.recurrenceText,
                        recurrenceType === type.value && styles.recurrenceTextSelected,
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Interval */}
              <View style={styles.subsection}>
                <Text style={styles.sublabel}>
                  Every {recurrenceType === RecurrenceType.DAILY ? 'day(s)' :
                         recurrenceType === RecurrenceType.WEEKLY ? 'week(s)' :
                         recurrenceType === RecurrenceType.BIWEEKLY ? '2 weeks' :
                         'month(s)'}
                </Text>
                {recurrenceType !== RecurrenceType.BIWEEKLY && (
                  <TextInput
                    style={[styles.input, styles.intervalInput]}
                    value={interval}
                    onChangeText={setInterval}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={Colors.textSecondary}
                    maxLength={2}
                  />
                )}
              </View>

              {/* Days of Week for Weekly/Biweekly */}
              {(recurrenceType === RecurrenceType.WEEKLY || recurrenceType === RecurrenceType.BIWEEKLY) && (
                <View style={styles.subsection}>
                  <Text style={styles.sublabel}>On days</Text>
                  <View style={styles.daysContainer}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayOption,
                          daysOfWeek.includes(index) && styles.dayOptionSelected,
                        ]}
                        onPress={() => {
                          if (daysOfWeek.includes(index)) {
                            setDaysOfWeek(daysOfWeek.filter(d => d !== index));
                          } else {
                            setDaysOfWeek([...daysOfWeek, index].sort());
                          }
                        }}
                      >
                        <Text style={[
                          styles.dayText,
                          daysOfWeek.includes(index) && styles.dayTextSelected,
                        ]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Monthly Options */}
              {recurrenceType === RecurrenceType.MONTHLY && (
                <View style={styles.subsection}>
                  <Text style={styles.sublabel}>Monthly on</Text>
                  <View style={styles.monthlyOptionsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.monthlyOption,
                        weekOfMonth === '0' && styles.monthlyOptionSelected,
                      ]}
                      onPress={() => setWeekOfMonth('0')}
                    >
                      <Text style={[
                        styles.monthlyText,
                        weekOfMonth === '0' && styles.monthlyTextSelected,
                      ]}>
                        Day {dayOfMonth}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.monthlyOption,
                        weekOfMonth !== '0' && styles.monthlyOptionSelected,
                      ]}
                      onPress={() => {
                        const week = Math.ceil(startDateTime.getDate() / 7);
                        setWeekOfMonth(week.toString());
                      }}
                    >
                      <Text style={[
                        styles.monthlyText,
                        weekOfMonth !== '0' && styles.monthlyTextSelected,
                      ]}>
                        {weekOfMonth !== '0' ? `${getOrdinal(parseInt(weekOfMonth))} ` : '1st '}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][startDateTime.getDay()]}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* End Condition */}
              <View style={styles.subsection}>
                <Text style={styles.sublabel}>Ends</Text>
                <View style={styles.endConditionContainer}>
                  <TouchableOpacity
                    style={[
                      styles.endOption,
                      endCondition === 'never' && styles.endOptionSelected,
                    ]}
                    onPress={() => setEndCondition('never')}
                  >
                    <Text style={[
                      styles.endText,
                      endCondition === 'never' && styles.endTextSelected,
                    ]}>
                      Never
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.endOption,
                      endCondition === 'date' && styles.endOptionSelected,
                    ]}
                    onPress={() => setEndCondition('date')}
                  >
                    <Text style={[
                      styles.endText,
                      endCondition === 'date' && styles.endTextSelected,
                    ]}>
                      On date
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.endOption,
                      endCondition === 'occurrences' && styles.endOptionSelected,
                    ]}
                    onPress={() => setEndCondition('occurrences')}
                  >
                    <Text style={[
                      styles.endText,
                      endCondition === 'occurrences' && styles.endTextSelected,
                    ]}>
                      After
                    </Text>
                  </TouchableOpacity>
                </View>

                {endCondition === 'date' && (
                  <TouchableOpacity 
                    style={[styles.dateButton, { marginTop: 8 }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <MaterialIcons name="event" size={20} color={Colors.textSecondary} />
                    <Text style={styles.dateButtonText}>
                      {endDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>
                )}

                {endCondition === 'occurrences' && (
                  <View style={styles.occurrencesContainer}>
                    <TextInput
                      style={[styles.input, styles.occurrencesInput]}
                      value={occurrences}
                      onChangeText={setOccurrences}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={Colors.textSecondary}
                      maxLength={3}
                    />
                    <Text style={styles.occurrencesText}>times</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        {/* Create Button */}
        <Button
          title="Create Event"
          onPress={handleCreate}
          loading={loading}
          style={styles.createButton}
        />
      </ScrollView>

      {/* Date/Time Pickers */}
      {(showStartPicker || showEndPicker) && (
        <DateTimePicker
          value={activePickerType === 'start' ? startDateTime : endDateTime}
          mode={pickerMode}
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateTimeChange}
          minimumDate={activePickerType === 'end' ? startDateTime : undefined}
        />
      )}

      {/* End Date Picker for Recurrence */}
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(Platform.OS === 'ios');
            if (selectedDate && event.type !== 'dismissed') {
              setEndDate(selectedDate);
            }
          }}
          minimumDate={startDateTime}
        />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    gap: 8,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 4,
  },
  typeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  typeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  typeLabelSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  colorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  reminderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  reminderOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  reminderText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  reminderTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  createButton: {
    marginTop: 16,
    marginBottom: 32,
  },
  subsection: {
    marginTop: 16,
  },
  sublabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  recurrenceTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recurrenceOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  recurrenceOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  recurrenceText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  recurrenceTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  intervalInput: {
    width: 60,
    marginTop: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  dayText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dayTextSelected: {
    color: Colors.surface,
    fontWeight: '600',
  },
  monthlyOptionsContainer: {
    gap: 8,
  },
  monthlyOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  monthlyOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  monthlyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  monthlyTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  endConditionContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  endOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  endOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  endText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  endTextSelected: {
    color: Colors.primary,
    fontWeight: '500',
  },
  occurrencesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  occurrencesInput: {
    width: 60,
  },
  occurrencesText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});