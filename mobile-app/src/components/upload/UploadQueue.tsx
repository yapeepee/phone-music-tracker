import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { UploadProgress } from './UploadProgress';
import {
  selectAllUploads,
  selectActiveUploadsCount,
  selectQueuedUploadsCount,
  selectCompletedUploadsCount,
  pauseUpload,
  resumeUpload,
  cancelUpload,
  retryUpload,
  clearCompleted,
} from '../../store/slices/uploadSlice';
import { RootState } from '../../store';

export const UploadQueue: React.FC = () => {
  const dispatch = useDispatch();
  const uploads = useSelector(selectAllUploads);
  const activeCount = useSelector(selectActiveUploadsCount);
  const queuedCount = useSelector(selectQueuedUploadsCount);
  const completedCount = useSelector(selectCompletedUploadsCount);

  const handlePause = (id: string) => {
    dispatch(pauseUpload(id));
  };

  const handleResume = (id: string) => {
    dispatch(resumeUpload(id));
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      'Cancel Upload',
      'Are you sure you want to cancel this upload?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: () => dispatch(cancelUpload(id)),
        },
      ]
    );
  };

  const handleRetry = (id: string) => {
    dispatch(retryUpload(id));
  };

  const handleClearCompleted = () => {
    Alert.alert(
      'Clear Completed',
      'Remove all completed uploads from the list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: () => dispatch(clearCompleted()),
        },
      ]
    );
  };

  const renderHeader = () => {
    if (uploads.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-upload-outline" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No uploads in progress</Text>
        </View>
      );
    }

    return (
      <View style={styles.header}>
        <Text style={styles.title}>Upload Queue</Text>
        <View style={styles.stats}>
          {activeCount > 0 && (
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#007AFF' }]} />
              <Text style={styles.statText}>{activeCount} Active</Text>
            </View>
          )}
          {queuedCount > 0 && (
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#FFA500' }]} />
              <Text style={styles.statText}>{queuedCount} Queued</Text>
            </View>
          )}
          {completedCount > 0 && (
            <View style={styles.statItem}>
              <View style={[styles.statDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.statText}>{completedCount} Completed</Text>
            </View>
          )}
        </View>
        {completedCount > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearCompleted}
          >
            <Text style={styles.clearButtonText}>Clear Completed</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderUploadItem = ({ item }: { item: any }) => {
    return (
      <UploadProgress
        fileName={item.fileName}
        progress={item.progress}
        bytesUploaded={item.bytesUploaded}
        bytesTotal={item.bytesTotal}
        speed={item.speed}
        status={item.status}
        error={item.error}
        onPause={() => handlePause(item.id)}
        onResume={() => handleResume(item.id)}
        onCancel={() => handleCancel(item.id)}
        onRetry={() => handleRetry(item.id)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={uploads}
        keyExtractor={(item) => item.id}
        renderItem={renderUploadItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 20,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
  },
});