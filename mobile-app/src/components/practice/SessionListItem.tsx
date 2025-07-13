import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { PracticeSessionSummary } from '../../types/history';
import { Colors } from '../../constants/colors';

interface SessionListItemProps {
  session: PracticeSessionSummary;
  onPress?: () => void;
}

export const SessionListItem: React.FC<SessionListItemProps> = ({
  session,
  onPress,
}) => {
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getFocusIcon = (focus?: string) => {
    switch (focus) {
      case 'technique':
        return 'construction';
      case 'musicality':
        return 'music-note';
      case 'rhythm':
        return 'access-time';
      case 'intonation':
        return 'graphic-eq';
      default:
        return 'school';
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.leftSection}>
        <MaterialIcons
          name={getFocusIcon(session.focus)}
          size={24}
          color={Colors.primary}
        />
      </View>

      <View style={styles.middleSection}>
        <Text style={styles.timeText}>
          {formatTime(session.start_time)}
          {session.end_time && ` - ${formatTime(session.end_time)}`}
        </Text>
        {session.focus && (
          <Text style={styles.focusText}>
            {session.focus.charAt(0).toUpperCase() + session.focus.slice(1)}
          </Text>
        )}
        {session.tags.length > 0 && (
          <View style={styles.tagContainer}>
            {session.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {session.tags.length > 3 && (
              <Text style={styles.moreText}>+{session.tags.length - 3}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.rightSection}>
        <Text style={styles.durationText}>{formatDuration(session.duration_minutes)}</Text>
        {session.self_rating && (
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color={Colors.warning} />
            <Text style={styles.ratingText}>{session.self_rating}</Text>
          </View>
        )}
        <View style={styles.iconRow}>
          {session.has_video && (
            <MaterialIcons name="videocam" size={18} color={Colors.secondary} />
          )}
          {session.has_feedback && (
            <MaterialIcons name="comment" size={18} color={Colors.info} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  leftSection: {
    marginRight: 12,
    justifyContent: 'center',
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  focusText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  tagText: {
    fontSize: 11,
    color: '#666',
  },
  moreText: {
    fontSize: 11,
    color: '#999',
    marginLeft: 4,
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 2,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 4,
  },
});