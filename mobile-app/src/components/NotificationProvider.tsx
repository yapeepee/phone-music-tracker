import React, { useEffect } from 'react';
import Constants from 'expo-constants';
import { notificationService } from '../services/notification.service';
import { useAppSelector } from '../hooks/redux';
import { useNavigation } from '@react-navigation/native';
import { CommonNavigatorScreenProps } from '../navigation/types';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const navigation = useNavigation<CommonNavigatorScreenProps<'Home'>['navigation']>();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Skip push notifications in Expo Go
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo) {
      console.log('Push notifications are not supported in Expo Go. Use a development build.');
      return;
    }

    // Register for push notifications
    const registerForNotifications = async () => {
      try {
        await notificationService.registerForPushNotifications();
      } catch (error) {
        console.error('Failed to register for push notifications:', error);
      }
    };

    registerForNotifications();

    // Set up notification handling only when not in Expo Go
    const setupNotificationHandling = async () => {
      if (isExpoGo) return;

      try {
        // Dynamically import expo-notifications only when needed
        const Notifications = await import('expo-notifications');
        
        // Set up notification received listener
        const notificationListener = Notifications.default.addNotificationReceivedListener(notification => {
          console.log('Notification received:', notification);
        });

        // Set up notification response listener
        const responseListener = Notifications.default.addNotificationResponseReceivedListener(response => {
          console.log('Notification response:', response);
          
          const data = response.notification.request.content.data;
          if (!data) return;

          // Navigate based on notification type
          switch (data.type) {
            case 'session':
              if (data.session_id) {
                navigation.navigate('SessionDetail' as never, { sessionId: data.session_id } as never);
              }
              break;
            case 'event':
              if (data.event_id) {
                navigation.navigate('EventDetails' as never, { eventId: data.event_id } as never);
              }
              break;
            case 'feedback':
              if (data.session_id) {
                navigation.navigate('SessionFeedback' as never, { sessionId: data.session_id } as never);
              }
              break;
            default:
              navigation.navigate('Notifications' as never);
          }
        });

        // Cleanup function
        return () => {
          Notifications.default.removeNotificationSubscription(notificationListener);
          Notifications.default.removeNotificationSubscription(responseListener);
        };
      } catch (error) {
        console.error('Failed to set up notification handling:', error);
      }
    };

    const cleanupPromise = setupNotificationHandling();

    return () => {
      // Clean up listeners if they were set up
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
    };
  }, [isAuthenticated, navigation]);

  return <>{children}</>;
};