import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { practicePartnerService } from '../../services/practice-partner.service';
import { currentPiecesService } from '../../services/current-pieces.service';
import { useAppSelector } from '../../hooks/redux';
import {
  CompatiblePartner,
  PartnerSearchFilters,
  PracticePartnerMatchWithUsers,
  MatchStatus,
  SkillLevel,
} from '../../types/practicePartner';
import { CurrentPieceWithDetails } from '../../services/current-pieces.service';
import { 
  AvailabilityScheduler, 
  PartnerMatchCard, 
  PreferencesSettingsModal 
} from '../../components/practice-partners';

const PracticePartnersScreen: React.FC = () => {
  const user = useAppSelector(state => state.auth.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'availability' | 'preferences'>('availability');
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'discover' | 'requests' | 'partners'>('discover');
  
  // Discovery state
  const [compatiblePartners, setCompatiblePartners] = useState<CompatiblePartner[]>([]);
  const [currentPieces, setCurrentPieces] = useState<CurrentPieceWithDetails[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string | undefined>();
  const [filters, setFilters] = useState<PartnerSearchFilters>({});
  
  // Matches state
  const [pendingRequests, setPendingRequests] = useState<PracticePartnerMatchWithUsers[]>([]);
  const [activePartnerships, setActivePartnerships] = useState<PracticePartnerMatchWithUsers[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCurrentPieces(),
        loadMatches(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentPieces = async () => {
    try {
      const pieces = await currentPiecesService.getCurrentPieces();
      setCurrentPieces(pieces);
      if (pieces.length > 0 && !selectedPieceId) {
        setSelectedPieceId(pieces[0].pieceId);
      }
    } catch (error) {
      console.error('Error loading current pieces:', error);
    }
  };

  const loadMatches = async () => {
    try {
      const [pending, active] = await Promise.all([
        practicePartnerService.getPendingRequests(),
        practicePartnerService.getActivePartnerships(),
      ]);
      setPendingRequests(pending);
      setActivePartnerships(active);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const discoverPartners = async () => {
    if (!selectedPieceId) return;
    
    setLoading(true);
    try {
      const partners = await practicePartnerService.discoverPartners({
        ...filters,
        pieceId: selectedPieceId,
      });
      setCompatiblePartners(partners);
    } catch (error) {
      console.error('Error discovering partners:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'discover' && selectedPieceId) {
      discoverPartners();
    }
  }, [selectedPieceId, filters, activeTab]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (activeTab === 'discover') {
      await discoverPartners();
    } else {
      await loadMatches();
    }
    setRefreshing(false);
  }, [activeTab, selectedPieceId, filters]);

  const handleSendRequest = async (partner: CompatiblePartner) => {
    try {
      await practicePartnerService.createPartnerRequest({
        partnerId: partner.userId,
        pieceId: partner.pieceId,
        requesterMessage: `Hi! I'm also working on ${partner.pieceName}. Would you like to practice together?`,
      });
      // Remove from compatible partners list
      setCompatiblePartners(prev => prev.filter(p => p.userId !== partner.userId));
      // Reload matches to show in pending
      await loadMatches();
    } catch (error) {
      console.error('Error sending partner request:', error);
    }
  };

  const handleAcceptRequest = async (matchId: string) => {
    try {
      await practicePartnerService.acceptMatch(matchId);
      await loadMatches();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleDeclineRequest = async (matchId: string) => {
    try {
      await practicePartnerService.declineMatch(matchId);
      await loadMatches();
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  const renderPieceSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.pieceSelector}
    >
      {currentPieces.map((piece, index) => (
        <TouchableOpacity
          key={piece.pieceId || index}
          style={[
            styles.pieceChip,
            selectedPieceId === piece.pieceId && styles.pieceChipSelected
          ]}
          onPress={() => setSelectedPieceId(piece.pieceId)}
        >
          <Text style={[
            styles.pieceChipText,
            selectedPieceId === piece.pieceId && styles.pieceChipTextSelected
          ]}>
            {piece.piece.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderPartnerCard = ({ item }: { item: CompatiblePartner }) => (
    <PartnerMatchCard
      partner={item}
      onSendRequest={handleSendRequest}
      disabled={loading || refreshing}
    />
  );

  const renderRequestCard = ({ item }: { item: PracticePartnerMatchWithUsers }) => {
    const isIncoming = item.partnerId === user?.id;
    const otherUser = isIncoming ? item.requester : item.partner;
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestUserName}>{otherUser.full_name}</Text>
          <Text style={styles.requestPiece}>{item.piece.name}</Text>
        </View>
        
        {item.requester_message && (
          <Text style={styles.requestMessage}>{item.requester_message}</Text>
        )}
        
        {isIncoming && item.status === MatchStatus.PENDING && (
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton, { marginRight: 6 }]}
              onPress={() => handleAcceptRequest(item.id)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton, { marginLeft: 6 }]}
              onPress={() => handleDeclineRequest(item.id)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {!isIncoming && (
          <View style={styles.requestStatus}>
            <Text style={styles.statusText}>Waiting for response...</Text>
          </View>
        )}
      </View>
    );
  };

  const renderPartnershipCard = ({ item }: { item: PracticePartnerMatchWithUsers }) => {
    const otherUser = item.requesterId === user?.id ? item.partner : item.requester;
    
    return (
      <TouchableOpacity style={styles.partnershipCard}>
        <View style={styles.partnershipHeader}>
          <Text style={styles.partnershipUserName}>{otherUser.full_name}</Text>
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        </View>
        
        <Text style={styles.partnershipPiece}>{item.piece.name}</Text>
        
        <View style={styles.partnershipActions}>
          <TouchableOpacity style={styles.scheduleButton}>
            <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            <Text style={[styles.scheduleButtonText, { marginLeft: 6 }]}>Schedule Session</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'discover' && styles.tabActive]}
        onPress={() => setActiveTab('discover')}
      >
        <Text style={[styles.tabText, activeTab === 'discover' && styles.tabTextActive]}>
          Discover
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
        onPress={() => setActiveTab('requests')}
      >
        <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
          Requests
        </Text>
        {pendingRequests.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingRequests.length}</Text>
          </View>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.tab, activeTab === 'partners' && styles.tabActive]}
        onPress={() => setActiveTab('partners')}
      >
        <Text style={[styles.tabText, activeTab === 'partners' && styles.tabTextActive]}>
          Partners
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Practice Partners</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettingsModal(true)}
        >
          <Ionicons name="settings-outline" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {renderTabs()}

      {activeTab === 'discover' && (
        <>
          {currentPieces.length > 0 ? (
            <>
              {renderPieceSelector()}
              <FlatList
                data={compatiblePartners}
                renderItem={renderPartnerCard}
                keyExtractor={item => item.user_id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[Colors.primary]}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={64} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>
                      No compatible partners found for this piece
                    </Text>
                  </View>
                }
              />
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Add pieces to your current list to find practice partners
              </Text>
            </View>
          )}
        </>
      )}

      {activeTab === 'requests' && (
        <FlatList
          data={pendingRequests}
          renderItem={renderRequestCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="mail-outline" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No pending requests</Text>
            </View>
          }
        />
      )}

      {activeTab === 'partners' && (
        <FlatList
          data={activePartnerships}
          renderItem={renderPartnershipCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-circle-outline" size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No active partnerships yet</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Partner Settings</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingsTabs}>
            <TouchableOpacity
              style={[styles.settingsTab, settingsTab === 'availability' && styles.settingsTabActive]}
              onPress={() => setSettingsTab('availability')}
            >
              <Text style={[styles.settingsTabText, settingsTab === 'availability' && styles.settingsTabTextActive]}>
                Availability
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsTab, settingsTab === 'preferences' && styles.settingsTabActive]}
              onPress={() => setSettingsTab('preferences')}
            >
              <Text style={[styles.settingsTabText, settingsTab === 'preferences' && styles.settingsTabTextActive]}>
                Preferences
              </Text>
            </TouchableOpacity>
          </View>
          
          {settingsTab === 'availability' ? (
            <AvailabilityScheduler />
          ) : (
            <PreferencesSettingsModal onClose={() => setShowSettingsModal(false)} />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingsButton: {
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 20,
    backgroundColor: Colors.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  pieceSelector: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxHeight: 60,
  },
  pieceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pieceChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pieceChipText: {
    fontSize: 14,
    color: Colors.text,
  },
  pieceChipTextSelected: {
    color: Colors.surface,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
  },
  partnerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  partnerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  skillBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 12,
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  partnerDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  timezoneDiff: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  requestButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  requestButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    marginBottom: 8,
  },
  requestUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  requestPiece: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  requestMessage: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  acceptButtonText: {
    color: Colors.surface,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  declineButtonText: {
    color: Colors.textSecondary,
  },
  requestStatus: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusText: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  partnershipCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  partnershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  partnershipUserName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  partnershipPiece: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  partnershipActions: {
    flexDirection: 'row',
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary + '20',
  },
  scheduleButtonText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  settingsTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  settingsTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  settingsTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  settingsTabText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  settingsTabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default PracticePartnersScreen;