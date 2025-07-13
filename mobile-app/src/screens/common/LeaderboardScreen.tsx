import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { reputationService, LeaderboardEntry } from '../../services/reputation.service';
import { ReputationBadge } from '../../components/reputation/ReputationBadge';
import { useAppSelector } from '../../hooks/redux';

interface LeaderboardItemProps {
  entry: LeaderboardEntry;
  currentUserId?: string;
}

const LeaderboardItem: React.FC<LeaderboardItemProps> = ({ entry, currentUserId }) => {
  const isCurrentUser = entry.userId === currentUserId;
  
  return (
    <View style={[styles.itemContainer, isCurrentUser && styles.currentUserItem]}>
      <View style={styles.rankContainer}>
        <Text style={[styles.rank, isCurrentUser && styles.currentUserText]}>
          #{entry.rank}
        </Text>
      </View>
      
      <View style={styles.userInfo}>
        <Text style={[styles.userName, isCurrentUser && styles.currentUserText]}>
          {entry.fullName}
        </Text>
        <ReputationBadge 
          points={entry.reputationPoints} 
          level={entry.reputationLevel}
          size="small"
          showPoints={true}
        />
      </View>
      
      {entry.rank <= 3 && (
        <View style={styles.trophyContainer}>
          {entry.rank === 1 && <Text style={styles.trophy}>🏆</Text>}
          {entry.rank === 2 && <Text style={styles.trophy}>🥈</Text>}
          {entry.rank === 3 && <Text style={styles.trophy}>🥉</Text>}
        </View>
      )}
    </View>
  );
};

export const LeaderboardScreen: React.FC = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentUser = useAppSelector(state => state.auth.user);

  const loadLeaderboard = async (refresh = false) => {
    try {
      setError(null);
      const skip = refresh ? 0 : page * 20;
      const newEntries = await reputationService.getLeaderboard(skip, 20);
      
      if (refresh) {
        setEntries(newEntries);
        setPage(1);
      } else {
        setEntries(prev => [...prev, ...newEntries]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(newEntries.length === 20);
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadLeaderboard(true);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadLeaderboard(true);
  };

  const onLoadMore = () => {
    if (!loadingMore && hasMore) {
      setLoadingMore(true);
      loadLeaderboard();
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="trophy-outline" size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyText}>No rankings yet</Text>
      <Text style={styles.emptySubtext}>
        Start participating in the community to earn reputation points!
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reputation Leaderboard</Text>
        <Text style={styles.subtitle}>Top contributors in our community</Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <LeaderboardItem 
            entry={item} 
            currentUserId={currentUser?.id}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
          />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={entries.length === 0 ? styles.emptyList : styles.list}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  list: {
    paddingVertical: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserItem: {
    backgroundColor: Colors.primary,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  trophyContainer: {
    marginLeft: 8,
  },
  trophy: {
    fontSize: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyList: {
    flex: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    marginTop: 16,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});