import { User } from './auth';
import { Tag } from './practice';

// Enums
export enum CommunicationPreference {
  IN_APP = 'in_app',
  EMAIL = 'email',
  VIDEO_CALL = 'video_call',
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate', 
  ADVANCED = 'advanced',
  PROFESSIONAL = 'professional',
}

export enum MatchStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  ENDED = 'ended',
}

export enum MatchReason {
  SAME_PIECE = 'same_piece',
  SIMILAR_TIMEZONE = 'similar_timezone',
  SKILL_LEVEL = 'skill_level',
  MANUAL = 'manual',
}

// User Availability (after API transformation to camelCase)
export interface UserAvailability {
  id: string;
  userId: string;          // was user_id
  dayOfWeek: number;       // was day_of_week, 0=Sunday, 6=Saturday
  startTime: string;       // was start_time, HH:MM format
  endTime: string;         // was end_time, HH:MM format
  timezone: string;
  isActive: boolean;       // was is_active
  createdAt: string;       // was created_at
  updatedAt: string;       // was updated_at
}

export interface UserAvailabilityCreate {
  dayOfWeek: number;       // was day_of_week
  startTime: string;       // was start_time
  endTime: string;         // was end_time
  timezone?: string;
  isActive?: boolean;      // was is_active
}

// User Practice Preferences (after API transformation to camelCase)
export interface UserPracticePreferences {
  userId: string;                           // was user_id
  isAvailableForPartners: boolean;         // was is_available_for_partners
  communicationPreference: CommunicationPreference;  // special case: was preferred_communication
  skillLevel?: SkillLevel;                 // was skill_level
  practiceGoals?: string;                  // was practice_goals
  languages: string[];
  maxPartners: number;                     // was max_partners
  createdAt: string;                       // was created_at
  updatedAt: string;                       // was updated_at
}

export interface UserPracticePreferencesUpdate {
  isAvailableForPartners?: boolean;        // was is_available_for_partners
  communicationPreference?: CommunicationPreference;  // special case: was preferred_communication
  skillLevel?: SkillLevel;                 // was skill_level
  practiceGoals?: string;                  // was practice_goals
  languages?: string[];
  maxPartners?: number;                    // was max_partners
}

// Practice Partner Match (after API transformation to camelCase)
export interface PracticePartnerMatch {
  id: string;
  requesterId: string;       // was requester_id
  partnerId: string;         // was partner_id
  pieceId: string;           // was piece_id
  status: MatchStatus;
  matchReason?: MatchReason; // was match_reason
  requesterMessage?: string; // was requester_message
  partnerMessage?: string;   // was partner_message
  matchedAt?: string;        // was matched_at
  endedAt?: string;          // was ended_at
  endedReason?: string;      // was ended_reason
  createdAt: string;         // was created_at
  updatedAt: string;         // was updated_at
}

export interface PracticePartnerMatchWithUsers extends PracticePartnerMatch {
  requester: User;
  partner: User;
  piece: Tag;
}

export interface PracticePartnerMatchCreate {
  partnerId: string;         // was partner_id
  pieceId: string;           // was piece_id
  requesterMessage?: string; // was requester_message
}

export interface PracticePartnerMatchUpdate {
  status?: MatchStatus;
  partnerMessage?: string;   // was partner_message
}

// Partner Discovery (after API transformation to camelCase)
export interface CompatiblePartner {
  userId: string;               // was user_id
  fullName: string;             // was full_name
  timezone: string;
  timezoneDiffHours: number;    // was timezone_diff_hours
  skillLevel?: SkillLevel;      // was skill_level
  commonLanguages: string[];    // was common_languages
  pieceId: string;              // was piece_id
  pieceName: string;            // was piece_name
  pieceComposer?: string;       // was piece_composer
  hasSentRequest?: boolean;     // was has_sent_request
  compatibleTimes?: any[];      // was compatible_times
  commonPieces?: any[];         // was common_pieces
  communicationPreference?: CommunicationPreference;  // was communication_preference
}

export interface PartnerSearchFilters {
  pieceId?: string;                   // was piece_id
  maxTimezoneDiffHours?: number;      // was max_timezone_diff_hours
  skillLevel?: SkillLevel;            // was skill_level
  language?: string;
}

// Partner Practice Session (after API transformation to camelCase)
export interface PartnerPracticeSession {
  id: string;
  matchId: string;              // was match_id
  sessionId: string;            // was session_id
  partnerSessionId?: string;    // was partner_session_id
  isSynchronized: boolean;      // was is_synchronized
  notes?: string;
  createdAt: string;            // was created_at
}

export interface PartnerPracticeSessionCreate {
  matchId: string;              // was match_id
  sessionId: string;            // was session_id
  partnerSessionId?: string;    // was partner_session_id
  isSynchronized?: boolean;     // was is_synchronized
  notes?: string;
}

// Helper types for UI
export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  id?: string;
}

export interface CompatibleTimeSlot {
  dayOfWeek: number;            // was day_of_week
  startTime: string;            // was start_time
  endTime: string;              // was end_time
  durationMinutes: number;      // was duration_minutes
}