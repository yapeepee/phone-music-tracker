import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { ScheduleEvent, EventType, EventStatus, scheduleService } from '../../services/schedule.service';

interface EventCardProps {
  event: ScheduleEvent;
  onPress?: () => void;
  showDate?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  showDate = true,
}) => {
  const getStatusIcon = () => {
    switch (event.status) {
      case EventStatus.CONFIRMED:
        return <MaterialIcons name="check-circle" size={16} color={Colors.success} />;
      case EventStatus.CANCELLED:
        return <MaterialIcons name="cancel" size={16} color={Colors.error} />;
      case EventStatus.COMPLETED:
        return <MaterialIcons name="check-circle-outline" size={16} color={Colors.textSecondary} />;
      case EventStatus.RESCHEDULED:
        return <MaterialIcons name="update" size={16} color={Colors.warning} />;
      default:
        return null;
    }
  };

  const isUpcoming = new Date(event.start_datetime) > new Date();
  const isPast = scheduleService.isPast(event);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderLeftColor: event.color || Colors.primary },
        isPast && styles.pastEvent,
        event.status === EventStatus.CANCELLED && styles.cancelledEvent,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons 
            name={scheduleService.getEventTypeIcon(event.event_type) as any} 
            size={20} 
            color={event.color || Colors.primary} 
          />
          {showDate && (
            <Text style={styles.dateText}>
              {new Date(event.start_datetime).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {getStatusIcon()}
        </View>
      </View>

      <Text style={[styles.title, isPast && styles.pastText]} numberOfLines={2}>
        {event.title}
      </Text>

      <View style={styles.details}>
        <View style={styles.timeContainer}>
          <MaterialIcons name="access-time" size={14} color={Colors.textSecondary} />
          <Text style={[styles.timeText, isPast && styles.pastText]}>
            {scheduleService.formatEventTime(event)}
          </Text>
        </View>

        {event.location && (
          <View style={styles.locationContainer}>
            <MaterialIcons 
              name={event.is_online ? "videocam" : "location-on"} 
              size={14} 
              color={Colors.textSecondary} 
            />
            <Text style={[styles.locationText, isPast && styles.pastText]} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}
      </View>

      {event.description && (
        <Text style={[styles.description, isPast && styles.pastText]} numberOfLines={2}>
          {event.description}
        </Text>
      )}

      {/* Duration and reminder info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {event.duration_minutes} min
        </Text>
        {isUpcoming && event.reminder_minutes > 0 && (
          <View style={styles.reminderContainer}>
            <MaterialIcons name="notifications" size={12} color={Colors.textSecondary} />
            <Text style={styles.footerText}>
              {event.reminder_minutes} min before
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  pastEvent: {
    opacity: 0.7,
    backgroundColor: Colors.surface,
  },
  cancelledEvent: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  pastText: {
    color: Colors.textSecondary,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    color: Colors.text,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reminderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});