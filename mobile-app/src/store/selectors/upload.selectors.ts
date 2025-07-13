import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../index';

// Base selectors
const selectUploadState = (state: RootState) => state.upload;
const selectUploadOrder = (state: RootState) => state.upload.uploadOrder;
const selectUploadEntities = (state: RootState) => state.upload.uploads;

// Memoized selectors
export const selectAllUploads = createSelector(
  [selectUploadOrder, selectUploadEntities],
  (uploadOrder, uploads) => uploadOrder.map(id => uploads[id])
);

export const selectActiveUploads = createSelector(
  [selectAllUploads],
  (uploads) => uploads.filter(upload => 
    upload.status === 'uploading' || 
    upload.status === 'queued'
  )
);

export const selectCompletedUploads = createSelector(
  [selectAllUploads],
  (uploads) => uploads.filter(upload => upload.status === 'completed')
);

export const selectFailedUploads = createSelector(
  [selectAllUploads],
  (uploads) => uploads.filter(upload => upload.status === 'failed')
);

export const selectUploadById = createSelector(
  [selectAllUploads, (_: RootState, uploadId: string) => uploadId],
  (uploads, uploadId) => uploads.find(upload => upload.id === uploadId)
);

export const selectHasActiveUploads = createSelector(
  [selectActiveUploads],
  (activeUploads) => activeUploads.length > 0
);

export const selectTotalUploadProgress = createSelector(
  [selectActiveUploads],
  (activeUploads) => {
    if (activeUploads.length === 0) return 100;
    const totalProgress = activeUploads.reduce((sum, upload) => sum + upload.progress, 0);
    return Math.round(totalProgress / activeUploads.length);
  }
);

// Additional selectors
export const selectQueuedUploads = createSelector(
  [selectAllUploads],
  (uploads) => uploads.filter(upload => upload.status === 'queued')
);

export const selectActiveUploadsCount = createSelector(
  [selectActiveUploads],
  (activeUploads) => activeUploads.length
);

export const selectQueuedUploadsCount = createSelector(
  [selectQueuedUploads],
  (queuedUploads) => queuedUploads.length
);

export const selectCompletedUploadsCount = createSelector(
  [selectCompletedUploads],
  (completedUploads) => completedUploads.length
);

export const selectTotalProgress = createSelector(
  [selectAllUploads],
  (uploads) => {
    if (uploads.length === 0) return 0;
    const totalBytes = uploads.reduce((sum, upload) => sum + upload.bytesTotal, 0);
    const uploadedBytes = uploads.reduce((sum, upload) => sum + upload.bytesUploaded, 0);
    return totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;
  }
);