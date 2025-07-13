import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UploadQueue } from '../../components/upload/UploadQueue';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { Colors } from '../../constants/colors';
import { useNavigation } from '@react-navigation/native';

export const UploadsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { uploads, activeUploads, getTotalProgress } = useVideoUpload();

  const totalProgress = getTotalProgress();
  const hasUploads = uploads.length > 0;
  const hasActiveUploads = activeUploads.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Uploads</Text>
        <View style={styles.headerRight}>
          {hasActiveUploads && (
            <View style={styles.progressIndicator}>
              <Text style={styles.progressText}>{Math.round(totalProgress)}%</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <UploadQueue />
      </View>

      {hasUploads && (
        <View style={styles.footer}>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Uploads</Text>
              <Text style={styles.summaryValue}>{uploads.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Active</Text>
              <Text style={styles.summaryValue}>{activeUploads.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Progress</Text>
              <Text style={styles.summaryValue}>{Math.round(totalProgress)}%</Text>
            </View>
          </View>
        </View>
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
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  headerRight: {
    width: 50,
    alignItems: 'flex-end',
  },
  progressIndicator: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  footer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
});