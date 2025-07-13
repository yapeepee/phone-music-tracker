/**
 * API Transformers for variable name consistency
 * 
 * CRITICAL: This solves the #1 issue in the codebase - variable naming inconsistencies
 * 
 * Rules:
 * - Frontend: camelCase (JavaScript convention)
 * - Backend: snake_case (Python convention)
 * - Conversion happens ONLY at API boundaries
 * 
 * Usage:
 * - When receiving data from API: use snakeToCamel(response.data)
 * - When sending data to API: use camelToSnake(requestData)
 */

/**
 * Convert backend snake_case to frontend camelCase
 * Handles nested objects and arrays recursively
 */
export const snakeToCamel = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(snakeToCamel);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Special case: preferred_communication (not communication_preference)
        if (key === 'preferred_communication') {
          converted['communicationPreference'] = snakeToCamel(obj[key]);
        } else {
          // Convert snake_case to camelCase
          const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          converted[camelKey] = snakeToCamel(obj[key]);
        }
      }
    }
    
    return converted;
  }
  
  return obj;
};

/**
 * Convert frontend camelCase to backend snake_case
 * Handles nested objects and arrays recursively
 */
export const camelToSnake = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(camelToSnake);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Special case: communicationPreference -> preferred_communication
        if (key === 'communicationPreference') {
          converted['preferred_communication'] = camelToSnake(obj[key]);
        } else {
          // Convert camelCase to snake_case
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          converted[snakeKey] = camelToSnake(obj[key]);
        }
      }
    }
    
    return converted;
  }
  
  return obj;
};

/**
 * Transform an array of items from snake_case to camelCase
 */
export const transformArrayResponse = <T>(items: any[]): T[] => {
  return items.map(item => snakeToCamel(item));
};

/**
 * Transform a paginated response from backend format
 */
export const transformPaginatedResponse = <T>(response: any): {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
} => {
  return {
    items: transformArrayResponse<T>(response.items || []),
    total: response.total || 0,
    page: response.page || 1,
    pageSize: response.page_size || response.pageSize || 20,
  };
};

/**
 * Common field mappings for quick reference
 * This helps developers know what to expect
 */
export const FIELD_MAPPINGS = {
  // User fields
  'studentId': 'student_id',
  'teacherId': 'teacher_id',
  'userId': 'user_id',
  'fullName': 'full_name',
  'pushToken': 'push_token',
  'isActive': 'is_active',
  'isVerified': 'is_verified',
  
  // Session fields
  'sessionId': 'session_id',
  'startTime': 'start_time',
  'endTime': 'end_time',
  'selfRating': 'self_rating',
  'durationMinutes': 'duration_minutes',
  'targetTempo': 'target_tempo',
  'practiceMode': 'practice_mode',
  
  // Practice segment fields
  'pieceTagId': 'piece_tag_id',
  'pieceId': 'piece_id', // After refactoring
  'segmentId': 'segment_id',
  'clickCount': 'click_count',
  'isCompleted': 'is_completed',
  'completedAt': 'completed_at',
  'totalClickCount': 'total_click_count',
  'lastClickedAt': 'last_clicked_at',
  'displayOrder': 'display_order',
  
  // Forum fields
  'postId': 'post_id',
  'authorId': 'author_id',
  'parentId': 'parent_id',
  'voteType': 'vote_type',
  'relatedPieceId': 'related_piece_id',
  'viewCount': 'view_count',
  'voteCount': 'vote_count',
  'commentCount': 'comment_count',
  
  // Video fields
  'videoId': 'video_id',
  'uploadId': 'upload_id',
  'fileSize': 'file_size',
  'mimeType': 'mime_type',
  'thumbnailUrl': 'thumbnail_url',
  'processingStatus': 'processing_status',
  'videoUrl': 'video_url',
  
  // Common timestamps
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'deletedAt': 'deleted_at',
  'archivedAt': 'archived_at',
  
  // Special cases
  'communicationPreference': 'preferred_communication', // NOT communication_preference!
  
  // Practice partner fields
  'partnerId': 'partner_id',
  'maxPartners': 'max_partners',
  'skillLevel': 'skill_level',
  'practiceGoals': 'practice_goals',
  'isAvailableForPartners': 'is_available_for_partners',
  'dayOfWeek': 'day_of_week',
  'startTime': 'start_time',
  'endTime': 'end_time',
  'timezoneOffset': 'timezone_offset',
  
  // Notification fields
  'notificationType': 'notification_type',
  'isRead': 'is_read',
  'readAt': 'read_at',
  
  // Tag/Piece fields (to be refactored)
  'tagType': 'tag_type',
  'opusNumber': 'opus_number',
  'difficultyLevel': 'difficulty_level',
} as const;

