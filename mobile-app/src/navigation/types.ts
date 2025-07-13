import { NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// Student Stack
export type StudentTabParamList = {
  Home: undefined;
  Practice: undefined;
  Analytics: undefined;
  Community: undefined;
  Profile: undefined;
};

export type StudentStackParamList = {
  StudentTabs: NavigatorScreenParams<StudentTabParamList>;
  NewSession: undefined;
  SessionDetails: { sessionId: string };
  SessionDetail: { sessionId: string };  // Adding this for consistency with notification navigation
  VideoRecording: { sessionId: string };
  PostDetail: { postId: string };  // Forum post detail
  CreatePost: { 
    relatedPieceId?: string; 
    relatedPieceName?: string; 
    initialContent?: string; 
    fromSessionId?: string; 
  } | undefined;
  Uploads: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Leaderboard: undefined;
  Challenges: undefined;
  PieceSelection: undefined;
  SegmentTracking: { pieceId: string; pieceName: string };
  PieceSummary: { pieceId: string; pieceName: string };
  ArchivedPieces: undefined;
  PracticePartners: undefined;
};

// Teacher Stack
export type TeacherTabParamList = {
  Dashboard: undefined;
  Students: undefined;
  Schedule: undefined;
  Community: undefined;
  Profile: undefined;
};

export type TeacherStackParamList = {
  TeacherTabs: NavigatorScreenParams<TeacherTabParamList>;
  StudentDetails: { studentId: string };
  StudentProfile: { studentId: string };
  SessionDetail: { sessionId: string };
  SessionReview: { sessionId: string; studentId: string };
  VideoFeedback: { videoId: string; sessionId: string };
  VideoAnnotation: { videoId: string; videoUrl: string; sessionId: string };
  CreateClass: undefined;
  ClassDetails: { classId: string };
  TagManagement: undefined;
  CreateTag: undefined;
  EditTag: { tagId: string };
  Notifications: undefined;
  NotificationSettings: undefined;
  PostDetail: { postId: string };  // Forum post detail
  CreatePost: { 
    relatedPieceId?: string; 
    relatedPieceName?: string; 
    initialContent?: string; 
    fromSessionId?: string; 
  } | undefined;
  Leaderboard: undefined;
  Challenges: undefined;
  EventDetails: { eventId: string };
  CreateEvent: undefined;
  EditEvent: { eventId: string };
  PracticePartners: undefined;
};

// Root Stack
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Student: NavigatorScreenParams<StudentStackParamList>;
  Teacher: NavigatorScreenParams<TeacherStackParamList>;
};

// Navigation prop types
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

export type TeacherStackNavigationProp = StackNavigationProp<TeacherStackParamList>;

// Screen prop types
export type TeacherNavigatorScreenProps<T extends keyof TeacherStackParamList> = {
  navigation: StackNavigationProp<TeacherStackParamList, T>;
  route: RouteProp<TeacherStackParamList, T>;
};