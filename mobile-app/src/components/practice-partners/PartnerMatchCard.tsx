import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CompatiblePartner, SkillLevel } from '../../types/practicePartner';

interface PartnerMatchCardProps {
  partner: CompatiblePartner;
  onSendRequest: (partner: CompatiblePartner) => void;
  disabled?: boolean;
}

export const PartnerMatchCard: React.FC<PartnerMatchCardProps> = ({
  partner,
  onSendRequest,
  disabled = false,
}) => {
  const getSkillLevelColor = (level: SkillLevel): string => {
    switch (level) {
      case SkillLevel.BEGINNER:
        return Colors.info;
      case SkillLevel.INTERMEDIATE:
        return Colors.warning;
      case SkillLevel.ADVANCED:
        return Colors.success;
      case SkillLevel.PROFESSIONAL:
        return Colors.primary;
      default:
        return Colors.textSecondary;
    }
  };

  const formatTimezoneOffset = (hours: number): string => {
    if (hours === 0) return 'Same timezone';
    const absHours = Math.abs(hours);
    return `${hours > 0 ? '+' : '-'}${absHours} hour${absHours !== 1 ? 's' : ''}`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{partner.fullName}</Text>
          {partner.skillLevel && (
            <View style={[styles.skillBadge, { backgroundColor: getSkillLevelColor(partner.skillLevel) + '20' }]}>
              <Text style={[styles.skillText, { color: getSkillLevelColor(partner.skillLevel) }]}>
                {partner.skillLevel.charAt(0).toUpperCase() + partner.skillLevel.slice(1)}
              </Text>
            </View>
          )}
        </View>
        {partner.hasSentRequest && (
          <View style={styles.requestSentBadge}>
            <Ionicons name="mail-outline" size={16} color={Colors.primary} />
            <Text style={[styles.requestSentText, { marginLeft: 4 }]}>Request Sent</Text>
          </View>
        )}
      </View>

      <View style={styles.details}>
        {partner.timezoneDiffHours !== undefined && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              {formatTimezoneOffset(partner.timezoneDiffHours)}
            </Text>
          </View>
        )}

        {partner.compatibleTimes && partner.compatibleTimes.length > 0 && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              {partner.compatibleTimes.length} compatible time{partner.compatibleTimes.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {partner.commonPieces && partner.commonPieces.length > 1 && (
          <View style={styles.detailRow}>
            <Ionicons name="musical-notes-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              Also working on {partner.commonPieces.length - 1} other piece{partner.commonPieces.length - 1 !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {partner.commonLanguages && partner.commonLanguages.length > 0 && (
          <View style={styles.detailRow}>
            <Ionicons name="language-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              {partner.commonLanguages.join(', ')}
            </Text>
          </View>
        )}

        {partner.communicationPreference && (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubbles-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.detailText}>
              Prefers {partner.communicationPreference.replace('_', ' ')}
            </Text>
          </View>
        )}
      </View>

      {!partner.hasSentRequest && (
        <TouchableOpacity
          style={[styles.requestButton, disabled && styles.requestButtonDisabled]}
          onPress={() => onSendRequest(partner)}
          disabled={disabled}
        >
          <Ionicons name="person-add-outline" size={20} color="#FFF" />
          <Text style={[styles.requestButtonText, { marginLeft: 8 }]}>Send Request</Text>
        </TouchableOpacity>
      )}

      {partner.hasSentRequest && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Request pending...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  skillBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
  },
  requestSentText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  details: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    marginLeft: 8,
  },
  requestButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestButtonDisabled: {
    opacity: 0.6,
  },
  requestButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});