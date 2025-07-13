import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { updatePreferences } from '../../store/slices/userSlice';
import { notificationPreferencesService } from '../../services/notification-preferences.service';

// Define notification types
interface NotificationPreferences {
  globalEnabled: boolean;
  types: {
    practiceReminders: boolean;
    sessionFeedback: boolean;
    videoProcessing: boolean;
    achievements: boolean;
    eventReminders: boolean;
    systemAnnouncements: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // "HH:MM" format
    endTime: string; // "HH:MM" format
  };
}

export const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const preferences = useAppSelector((state) => state.user.preferences);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Initialize notification preferences
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    globalEnabled: preferences.notifications,
    types: {
      practiceReminders: true,
      sessionFeedback: true,
      videoProcessing: true,
      achievements: true,
      eventReminders: true,
      systemAnnouncements: true,
    },
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
    },
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await notificationPreferencesService.getPreferences();
      setNotificationPrefs(prefs);
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      // Use default values on error
    } finally {
      setLoading(false);
    }
  };

  const handleGlobalToggle = (value: boolean) => {
    setNotificationPrefs(prev => ({
      ...prev,
      globalEnabled: value,
    }));
    dispatch(updatePreferences({ notifications: value }));
  };

  const handleTypeToggle = (type: keyof NotificationPreferences['types'], value: boolean) => {
    setNotificationPrefs(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: value,
      },
    }));
  };

  const handleQuietHoursToggle = (value: boolean) => {
    setNotificationPrefs(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        enabled: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await notificationPreferencesService.updatePreferences(notificationPrefs);
      
      // Update Redux state with global enabled setting
      dispatch(updatePreferences({ notifications: notificationPrefs.globalEnabled }));
      
      Alert.alert(
        'Settings Saved',
        'Your notification preferences have been updated.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to save notification preferences. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSaving(false);
    }
  };

  const renderNotificationOption = (
    title: string,
    description: string,
    value: boolean,
    onToggle: (value: boolean) => void,
    disabled = false
  ) => (
    <View style={[styles.option, disabled && styles.optionDisabled]}>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, disabled && styles.textDisabled]}>{title}</Text>
        <Text style={[styles.optionDescription, disabled && styles.textDisabled]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor={value ? Colors.primaryDark : Colors.surface}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <TouchableOpacity 
          onPress={handleSave} 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading preferences...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Master Switch */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>General</Text>
            {renderNotificationOption(
              'Enable Notifications',
              'Turn on/off all notifications',
            notificationPrefs.globalEnabled,
            handleGlobalToggle
          )}
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          {renderNotificationOption(
            'Practice Reminders',
            'Daily reminders to practice',
            notificationPrefs.types.practiceReminders,
            (value) => handleTypeToggle('practiceReminders', value),
            !notificationPrefs.globalEnabled
          )}
          {renderNotificationOption(
            'Session Feedback',
            'When teachers provide feedback on your sessions',
            notificationPrefs.types.sessionFeedback,
            (value) => handleTypeToggle('sessionFeedback', value),
            !notificationPrefs.globalEnabled
          )}
          {renderNotificationOption(
            'Video Processing',
            'Updates on video upload and processing status',
            notificationPrefs.types.videoProcessing,
            (value) => handleTypeToggle('videoProcessing', value),
            !notificationPrefs.globalEnabled
          )}
          {renderNotificationOption(
            'Achievements',
            'When you unlock new achievements',
            notificationPrefs.types.achievements,
            (value) => handleTypeToggle('achievements', value),
            !notificationPrefs.globalEnabled
          )}
          {user?.role === 'teacher' && renderNotificationOption(
            'Event Reminders',
            'Reminders for scheduled lessons and events',
            notificationPrefs.types.eventReminders,
            (value) => handleTypeToggle('eventReminders', value),
            !notificationPrefs.globalEnabled
          )}
          {renderNotificationOption(
            'System Announcements',
            'Important updates and announcements',
            notificationPrefs.types.systemAnnouncements,
            (value) => handleTypeToggle('systemAnnouncements', value),
            !notificationPrefs.globalEnabled
          )}
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          {renderNotificationOption(
            'Enable Quiet Hours',
            'Silence notifications during specific times',
            notificationPrefs.quietHours.enabled,
            handleQuietHoursToggle,
            !notificationPrefs.globalEnabled
          )}
          {notificationPrefs.quietHours.enabled && notificationPrefs.globalEnabled && (
            <View style={styles.quietHoursTime}>
              <TouchableOpacity style={styles.timeButton}>
                <Text style={styles.timeLabel}>Start Time</Text>
                <Text style={styles.timeValue}>{notificationPrefs.quietHours.startTime}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timeButton}>
                <Text style={styles.timeLabel}>End Time</Text>
                <Text style={styles.timeValue}>{notificationPrefs.quietHours.endTime}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Additional Info */}
        <View style={styles.infoSection}>
          <MaterialIcons name="info-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.infoText}>
            You can manage system notification settings for this app in your device's Settings app.
          </Text>
        </View>
        </ScrollView>
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
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    padding: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionText: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  textDisabled: {
    color: Colors.disabled,
  },
  quietHoursTime: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  timeButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    margin: 16,
    padding: 16,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});