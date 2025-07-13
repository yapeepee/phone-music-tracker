import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { forumService, Post, PostList } from '../../services/forum.service';
import { useAppSelector } from '../../hooks/redux';
import { useSafeNavigation } from '../../hooks/useSafeNavigation';
import { stripMarkdown } from '../../utils/markdown';
import { ReputationBadge } from '../../components/reputation/ReputationBadge';
import { Tag } from '../../types/practice';
import { PiecePicker } from '../../components/forum/PiecePicker';

interface PostItemProps {
  post: Post;
  onPress: (post: Post) => void;
}

const PostItem: React.FC<PostItemProps> = ({ post, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.postCard} 
      onPress={() => onPress(post)}
      activeOpacity={0.7}
    >
      <View style={styles.postHeader}>
        <Text style={styles.postTitle} numberOfLines={2}>
          {post.title}
        </Text>
        <View style={styles.headerBadges}>
          {post.acceptedAnswerId && (
            <View style={styles.solvedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={styles.solvedText}>Solved</Text>
            </View>
          )}
          {post.relatedPiece && (
            <View style={styles.pieceBadge}>
              <Ionicons name="musical-notes" size={14} color={Colors.primary} />
              <Text style={styles.pieceText} numberOfLines={1}>
                {post.relatedPiece.name}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.postContent} numberOfLines={3}>
        {stripMarkdown(post.content)}
      </Text>

      <View style={styles.postMeta}>
        <View style={styles.authorInfo}>
          <Ionicons 
            name="person-circle-outline" 
            size={16} 
            color={Colors.textSecondary} 
          />
          <Text style={styles.authorName}>{post.authorName}</Text>
          <ReputationBadge
            points={post.authorReputationPoints}
            level={post.authorReputationLevel}
            size="small"
          />
        </View>

        <View style={styles.postStats}>
          <View style={styles.statItem}>
            <Ionicons 
              name={post.voteScore >= 0 ? "arrow-up" : "arrow-down"} 
              size={14} 
              color={post.voteScore >= 0 ? Colors.success : Colors.error} 
            />
            <Text style={styles.statText}>{post.voteScore}</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="chatbubble-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.statText}>{post.commentCount}</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.statText}>{post.viewCount}</Text>
          </View>
        </View>
      </View>

      {post.tags && post.tags.length > 0 && (
        <View style={styles.tagContainer}>
          {post.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

export const ForumListScreen: React.FC = () => {
  const { navigation, safeNavigate } = useSafeNavigation();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<'recent' | 'votes' | 'activity'>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Tag | null>(null);
  const [showPiecePicker, setShowPiecePicker] = useState(false);

  const loadPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setPage(0);
    }

    try {
      const response = await forumService.getPosts({
        skip: isRefresh ? 0 : page * 20,
        limit: 20,
        sortBy: sortBy,
        search: searchQuery.trim() || undefined,
        relatedPieceId: selectedPiece?.id,
      });

      if (isRefresh) {
        setPosts(response.items);
      } else {
        setPosts(prev => [...prev, ...response.items]);
      }
      
      setTotalCount(response.total);
      setPage(prev => isRefresh ? 1 : prev + 1);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [page, sortBy, searchQuery, selectedPiece]);

  useEffect(() => {
    loadPosts(true);
  }, [sortBy, selectedPiece]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    // Clear existing timeout
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    
    // Set new timeout for search
    const timeout = setTimeout(() => {
      loadPosts(true);
    }, 500); // 500ms debounce
    
    setSearchDebounce(timeout);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchDebounce) {
        clearTimeout(searchDebounce);
      }
    };
  }, [searchDebounce]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts(true);
  };

  const onLoadMore = () => {
    if (!loadingMore && posts.length < totalCount) {
      setLoadingMore(true);
      loadPosts();
    }
  };

  const navigateToPost = (post: Post) => {
    safeNavigate('PostDetail', { postId: post.id });
  };

  const navigateToCreatePost = () => {
    if (isAuthenticated) {
      safeNavigate('CreatePost', {
        relatedPieceId: selectedPiece?.id,
        relatedPieceName: selectedPiece?.name,
      });
    } else {
      // Navigate to login or show alert
      safeNavigate('Login');
    }
  };

  const navigateToLeaderboard = () => {
    safeNavigate('Leaderboard');
  };

  const navigateToChallenges = () => {
    safeNavigate('Challenges');
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyText}>No posts yet</Text>
      <Text style={styles.emptySubtext}>
        Be the first to ask a question or start a discussion
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

  const renderSortBar = () => (
    <View style={styles.sortBar}>
      <TouchableOpacity
        style={[styles.sortButton, sortBy === 'recent' && styles.sortButtonActive]}
        onPress={() => setSortBy('recent')}
      >
        <Text style={[styles.sortText, sortBy === 'recent' && styles.sortTextActive]}>
          Recent
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.sortButton, sortBy === 'votes' && styles.sortButtonActive]}
        onPress={() => setSortBy('votes')}
      >
        <Text style={[styles.sortText, sortBy === 'votes' && styles.sortTextActive]}>
          Top Voted
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.sortButton, sortBy === 'activity' && styles.sortButtonActive]}
        onPress={() => setSortBy('activity')}
      >
        <Text style={[styles.sortText, sortBy === 'activity' && styles.sortTextActive]}>
          Active
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
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
        <Text style={styles.title}>Community Q&A</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.trophyButton}
            onPress={navigateToChallenges}
          >
            <Ionicons name="rocket" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.trophyButton}
            onPress={navigateToLeaderboard}
          >
            <Ionicons name="trophy" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={navigateToCreatePost}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons 
          name="search" 
          size={20} 
          color={Colors.textSecondary} 
          style={styles.searchIcon} 
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              loadPosts(true);
            }}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {renderSortBar()}

      {selectedPiece && (
        <View style={styles.pieceFilterContainer}>
          <View style={styles.pieceFilter}>
            <Ionicons name="musical-notes" size={16} color={Colors.primary} />
            <Text style={styles.pieceFilterText} numberOfLines={1}>
              {selectedPiece.name}
            </Text>
            <TouchableOpacity onPress={() => setSelectedPiece(null)}>
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowPiecePicker(true)}
      >
        <Ionicons name="musical-notes-outline" size={20} color={Colors.primary} />
        <Text style={styles.filterButtonText}>
          {selectedPiece ? 'Change Piece Filter' : 'Filter by Piece'}
        </Text>
      </TouchableOpacity>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostItem post={item} onPress={navigateToPost} />
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
        contentContainerStyle={posts.length === 0 ? styles.emptyList : undefined}
      />

      {showPiecePicker && (
        <PiecePicker
          visible={showPiecePicker}
          onClose={() => setShowPiecePicker(false)}
          onSelectPiece={setSelectedPiece}
          selectedPiece={selectedPiece}
        />
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trophyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    marginRight: 12,
  },
  createButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: Colors.inputBackground,
  },
  sortButtonActive: {
    backgroundColor: Colors.primary + '20',
  },
  sortText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sortTextActive: {
    color: Colors.primary,
  },
  postCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  solvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  solvedText: {
    fontSize: 12,
    color: Colors.success,
    marginLeft: 4,
    fontWeight: '500',
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pieceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 150,
  },
  pieceText: {
    fontSize: 12,
    color: Colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  postContent: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  authorRole: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  statText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
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
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchIcon: {
    position: 'absolute',
    left: 28,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.inputBackground,
    borderRadius: 20,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 16,
    color: Colors.text,
  },
  clearButton: {
    position: 'absolute',
    right: 28,
    padding: 4,
  },
  pieceFilterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pieceFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  pieceFilterText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 6,
    marginRight: 8,
    maxWidth: 200,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 8,
  },
});