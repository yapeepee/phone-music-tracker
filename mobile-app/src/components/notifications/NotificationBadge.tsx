import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { notificationService } from '../../services/notification.service';
import { useAppSelector } from '../../hooks/redux';

interface NotificationBadgeProps {
  size?: 'small' | 'medium';
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  size = 'small' 
}) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);


  useEffect(() => {
    if (isAuthenticated && user) {
      loadUnreadCount();
      // Refresh count every 30 seconds
      const interval = setInterval(() => {
        loadUnreadCount();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error: any) {
      console.error('Failed to load unread count:', error?.message || error);
      // Set count to 0 on error to hide badge
      setUnreadCount(0);
    }
  };

  if (unreadCount === 0) {
    return null;
  }

  const badgeSize = size === 'small' ? styles.smallBadge : styles.mediumBadge;
  const textSize = size === 'small' ? styles.smallText : styles.mediumText;

  return (
    <View style={[styles.badge, badgeSize]}>
      <Text style={[styles.text, textSize]}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -8,
    right: -8,
  },
  smallBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
  },
  mediumBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  smallText: {
    fontSize: 11,
  },
  mediumText: {
    fontSize: 12,
  },
});