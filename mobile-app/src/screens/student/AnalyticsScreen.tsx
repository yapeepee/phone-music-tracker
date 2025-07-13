import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { practiceSegmentService, PracticeFocusAnalytics } from '../../services/practice-segment.service';

interface SegmentCardProps {
  segment: {
    segmentName: string;
    pieceName: string;
    totalClicks: number;
    recentClicks: number;
    daysPracticed: number;
    isCompleted: boolean;
    lastClicked?: string | null;
  };
  showRecent?: boolean;
}

const SegmentCard: React.FC<SegmentCardProps> = ({ segment, showRecent = true }) => {
  const getLastClickedText = (lastClicked: string | null) => {
    if (!lastClicked) return 'Never practiced';
    
    const date = new Date(lastClicked);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={[styles.segmentCard, segment.isCompleted && styles.completedCard]}>
      <View style={styles.segmentHeader}>
        <View style={styles.segmentInfo}>
          <Text style={styles.segmentName} numberOfLines={1}>{segment.segmentName}</Text>
          <Text style={styles.pieceName} numberOfLines={1}>{segment.pieceName}</Text>
        </View>
        {segment.isCompleted && (
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        )}
      </View>
      
      <View style={styles.segmentStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{segment.totalClicks}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        {showRecent && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{segment.recentClicks}</Text>
            <Text style={styles.statLabel}>Recent</Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{segment.daysPracticed}</Text>
          <Text style={styles.statLabel}>Days</Text>
        </View>
      </View>
      
      <Text style={styles.lastClicked}>{getLastClickedText(segment.lastClicked)}</Text>
    </View>
  );
};

export const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDays, setSelectedDays] = useState(30);
  const [analytics, setAnalytics] = useState<PracticeFocusAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'all'>('overview');

  useEffect(() => {
    loadAnalytics();
  }, [selectedDays]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await practiceSegmentService.getPracticeFocusAnalytics(selectedDays);
      setAnalytics(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load practice analytics');
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading practice insights...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const noData = !analytics || analytics.statistics.totalSegments === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Practice Insights</Text>
          <View style={styles.periodSelector}>
            <Text style={styles.periodLabel}>Period:</Text>
            <Picker
              selectedValue={selectedDays}
              style={styles.picker}
              onValueChange={setSelectedDays}
            >
              <Picker.Item label="Last 7 days" value={7} />
              <Picker.Item label="Last 30 days" value={30} />
              <Picker.Item label="Last 90 days" value={90} />
              <Picker.Item label="Last year" value={365} />
            </Picker>
          </View>
        </View>

        {noData ? (
          <View style={styles.noDataContainer}>
            <Ionicons name="musical-notes-outline" size={64} color={Colors.textSecondary} />
            <Text style={styles.noDataText}>
              No practice focuses created yet
            </Text>
            <Text style={styles.noDataSubtext}>
              Start adding practice focuses to your pieces!
            </Text>
          </View>
        ) : (
          <>
            {/* Practice Stats Overview */}
            <View style={styles.statsOverview}>
              <Text style={styles.sectionTitle}>Practice Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>{analytics!.statistics.practiceDays}</Text>
                  <Text style={styles.statCardLabel}>Days Practiced</Text>
                  <Text style={styles.statCardSubtext}>
                    {analytics!.statistics.consistencyPercentage}% consistency
                  </Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>{analytics!.statistics.totalClicksPeriod}</Text>
                  <Text style={styles.statCardLabel}>Total Clicks</Text>
                  <Text style={styles.statCardSubtext}>
                    {analytics!.statistics.avgClicksPerDay}/day avg
                  </Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statCardValue}>{analytics!.statistics.activeSegments}</Text>
                  <Text style={styles.statCardLabel}>Active Focuses</Text>
                  <Text style={styles.statCardSubtext}>
                    {analytics!.statistics.completedSegments} completed
                  </Text>
                </View>
              </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
                onPress={() => setActiveTab('overview')}
              >
                <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
                  Overview
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'all' && styles.tabActive]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                  All Focuses ({analytics!.statistics.totalSegments})
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'overview' ? (
              <>
                {/* Most Practiced */}
                {analytics!.topPracticedSegments && analytics!.topPracticedSegments.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Most Practiced</Text>
                    <Text style={styles.sectionSubtitle}>Your top practice focuses</Text>
                    {analytics!.topPracticedSegments.map((segment, index) => (
                      <SegmentCard key={segment.segmentId} segment={segment} />
                    ))}
                  </View>
                )}

                {/* Needs Attention */}
                {analytics!.needsAttention && analytics!.needsAttention.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Needs Attention</Text>
                    <Text style={styles.sectionSubtitle}>
                      Focuses that haven't been practiced recently
                    </Text>
                    {analytics!.needsAttention.map((segment) => (
                      <View key={segment.segmentId}>
                        <SegmentCard segment={segment} showRecent={false} />
                        <Text style={styles.createdText}>
                          Created {segment.createdDaysAgo} days ago
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Daily Activity */}
                {analytics!.dailyActivity && analytics!.dailyActivity.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <Text style={styles.sectionSubtitle}>
                      Practice pattern over the last {selectedDays} days
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.activityChart}>
                        {analytics!.dailyActivity.slice(0, 14).reverse().map((day, index) => {
                          const date = new Date(day.date);
                          const maxClicks = Math.max(...analytics!.dailyActivity.map(d => d.clicks));
                          const heightPercentage = maxClicks > 0 ? (day.clicks / maxClicks) * 100 : 0;
                          
                          return (
                            <View key={day.date} style={styles.dayColumn}>
                              <View style={styles.barContainer}>
                                <View 
                                  style={[
                                    styles.bar, 
                                    { height: `${heightPercentage}%` },
                                    day.clicks === 0 && styles.emptyBar
                                  ]}
                                />
                                {day.clicks > 0 && (
                                  <Text style={styles.barValue}>{day.clicks}</Text>
                                )}
                              </View>
                              <Text style={styles.dayLabel}>
                                {date.toLocaleDateString('en', { weekday: 'short' })}
                              </Text>
                              <Text style={styles.dateLabel}>
                                {date.getDate()}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </>
            ) : (
              /* All Segments List */
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>All Practice Focuses</Text>
                <Text style={styles.sectionSubtitle}>
                  {analytics!.allSegments ? analytics!.allSegments.filter(s => !s.pieceArchived).length : 0} active, {' '}
                  {analytics!.allSegments ? analytics!.allSegments.filter(s => s.pieceArchived).length : 0} archived
                </Text>
                {analytics!.allSegments && analytics!.allSegments.map((segment) => (
                  <View key={segment.segmentId} style={segment.pieceArchived && styles.archivedSegment}>
                    <SegmentCard segment={segment} />
                    {segment.pieceArchived && (
                      <Text style={styles.archivedText}>Piece archived</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: 16,
    color: Colors.text,
    marginRight: 8,
  },
  picker: {
    flex: 1,
    height: 40,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  noDataText: {
    fontSize: 18,
    color: Colors.text,
    marginTop: 16,
  },
  noDataSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  statsOverview: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 6,
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statCardLabel: {
    fontSize: 14,
    color: Colors.text,
    marginTop: 4,
  },
  statCardSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
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
  section: {
    padding: 20,
  },
  segmentCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  completedCard: {
    opacity: 0.8,
    borderColor: Colors.success,
  },
  segmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  segmentInfo: {
    flex: 1,
    marginRight: 8,
  },
  segmentName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  pieceName: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  segmentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  lastClicked: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  createdText: {
    fontSize: 12,
    color: Colors.warning,
    fontStyle: 'italic',
    marginTop: -8,
    marginBottom: 12,
    paddingLeft: 16,
  },
  activityChart: {
    flexDirection: 'row',
    height: 150,
    paddingTop: 20,
  },
  dayColumn: {
    width: 40,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  barContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 24,
    backgroundColor: Colors.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  emptyBar: {
    backgroundColor: Colors.border,
    height: 4,
  },
  barValue: {
    position: 'absolute',
    top: -20,
    fontSize: 12,
    color: Colors.text,
    fontWeight: '600',
  },
  dayLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  dateLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  archivedSegment: {
    opacity: 0.6,
  },
  archivedText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: -8,
    marginBottom: 12,
    paddingLeft: 16,
  },
});