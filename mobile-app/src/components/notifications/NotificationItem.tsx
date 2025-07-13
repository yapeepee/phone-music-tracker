import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Notification } from '../../services/notification.service';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onMarkAsRead?: (notificationId: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'feedback_received':
        return 'chatbubble-ellipses';
      case 'video_processing':
        return 'videocam';
      case 'session_reminder':
        return 'time';
      case 'achievement_unlocked':
        return 'trophy';
      case 'system_announcement':
        return 'megaphone';
      default:
        return 'notifications';
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'feedback_received':
        return Colors.primary;
      case 'video_processing':
        return Colors.success;
      case 'session_reminder':
        return Colors.warning;
      case 'achievement_unlocked':
        return '#FFD700'; // Gold
      case 'system_announcement':
        return Colors.info;
      default:
        return Colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <TouchableOpacity
      style={[styles.container, !notification.read && styles.unread]}
      onPress={() => onPress(notification)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: getIconColor() + '20' }]}>
        <Ionicons name={getIcon() as any} size={24} color={getIconColor()} />
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, !notification.read && styles.unreadText]}>
          {notification.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={styles.timestamp}>
          {formatDate(notification.created_at)}
        </Text>
      </View>

      {!notification.read && onMarkAsRead && (
        <TouchableOpacity
          style={styles.markAsReadButton}
          onPress={(e) => {
            e.stopPropagation();
            onMarkAsRead(notification.id);
          }}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  unread: {
    backgroundColor: Colors.primary + '08',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '700',
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  markAsReadButton: {
    padding: 8,
    marginLeft: 8,
  },
});