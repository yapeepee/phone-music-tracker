export enum PracticeFocus {
  TECHNIQUE = 'technique',
  MUSICALITY = 'musicality',
  RHYTHM = 'rhythm',
  INTONATION = 'intonation',
  OTHER = 'other',
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  ownerTeacherId?: string;
  tagType?: string; // 'piece', 'technique', 'general'
  composer?: string;
  opusNumber?: string;
  difficultyLevel?: number; // 1-10
  estimatedMasterySessions?: number;
  isArchived?: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  id: string;
  sessionId: string;
  localUri?: string; // Local file path
  s3Key?: string; // Remote S3 key when uploaded
  durationSeconds: number;
  fileSizeBytes: number;
  thumbnailUri?: string;
  thumbnailS3Key?: string;
  processed: boolean;
  processingError?: string;
  uploadProgress?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Metric {
  id: string;
  sessionId: string;
  metricKey: string;
  metricValue: number;
  unit?: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  teacherId: string;
  sessionId?: string;
  videoId?: string;
  text: string;
  rating?: number;
  timestampSeconds?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeSession {
  id: string;
  studentId: string;
  focus?: PracticeFocus;
  startTime: string;
  endTime?: string;
  selfRating?: number;
  note?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  durationMinutes?: number;
  targetTempo?: number;
  practiceMode?: 'normal' | 'slow_practice' | 'meditation';
  
  // Relations
  tagsDetails?: Tag[];
  videos?: Video[];
  metrics?: Metric[];
  feedback?: Feedback[];
}

export interface PracticeStatistics {
  totalSessions: number;
  totalMinutes: number;
  averageRating?: number;
  sessionsByFocus: Record<string, number>;
  sessionsByDay: Record<string, number>;
  streakDays: number;
  mostUsedTags: Array<{
    name: string;
    count: number;
  }>;
}

export interface CreatePracticeSessionInput {
  focus?: PracticeFocus;
  startTime: string;
  endTime?: string;
  selfRating?: number;
  note?: string;
  tags?: string[];
  targetTempo?: number;
  practiceMode?: 'normal' | 'slow_practice' | 'meditation';
  video?: {
    localUri: string;
    durationSeconds: number;
    fileSizeBytes: number;
    thumbnailUri?: string;
  };
}

export interface UpdatePracticeSessionInput {
  focus?: PracticeFocus;
  endTime?: string;
  selfRating?: number;
  note?: string;
  tags?: string[];
  targetTempo?: number;
  practiceMode?: 'normal' | 'slow_practice' | 'meditation';
}

export interface PracticeSegment {
  id: string;
  pieceTagId: string;
  studentId: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  completedAt?: string;
  totalClickCount: number;
  lastClickedAt?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentClick {
  id: string;
  segmentId: string;
  sessionId?: string;
  clickedAt: string;
  clickCount: number;
}

export interface PieceProgress {
  pieceTagId: string;
  pieceName: string;
  composer?: string;
  totalSegments: number;
  completedSegments: number;
  totalClicks: number;
  daysPracticed: number;
  firstPracticeDate?: string;
  lastPracticeDate?: string;
  completionPercentage: number;
  segments: PracticeSegment[];
}

export interface CreatePracticeSegmentInput {
  pieceTagId: string;
  name: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdatePracticeSegmentInput {
  name?: string;
  description?: string;
  displayOrder?: number;
  isCompleted?: boolean;
}

export interface SegmentClickInput {
  segmentId: string;
  sessionId?: string;
  clickCount?: number;
}

export interface PieceArchiveSummary {
  piece: {
    id: string;
    name: string;
    composer?: string;
    opusNumber?: string;
    difficultyLevel?: number;
    archivedAt: string;
  };
  summary: {
    totalSegments: number;
    completedSegments: number;
    totalClicks: number;
    sessionsPracticed: number;
    firstPracticed?: string;
    lastPracticed?: string;
    completionPercentage: number;
    totalPracticeSeconds?: number;
    avgPracticeSeconds?: number;
    sessionsWithTimer?: number;
  };
  segments: Array<{
    id: string;
    name: string;
    description?: string;
    totalClickCount: number;
    isCompleted: boolean;
    createdAt: string;
    lastClickedAt?: string;
  }>;
}

export interface ArchivedPieceInfo {
  pieceId: string;
  pieceName: string;
  composer?: string;
  opusNumber?: string;
  difficultyLevel?: number;
  archivedAt: string;
  createdAt: string;
  totalSegments: number;
  completedSegments: number;
  totalClicks: number;
  sessionsPracticed: number;
  firstPracticed?: string;
  lastPracticed?: string;
  completionPercentage: number;
}