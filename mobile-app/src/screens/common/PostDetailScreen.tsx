import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { forumService, PostWithComments, Comment, CommentCreate } from '../../services/forum.service';
import { useAppSelector } from '../../hooks/redux';
import { StudentStackParamList } from '../../navigation/types';
import { MarkdownRenderer } from '../../components/forum/MarkdownRenderer';

type PostDetailRouteProp = RouteProp<StudentStackParamList, 'PostDetail'>;
type PostDetailNavigationProp = StackNavigationProp<StudentStackParamList, 'PostDetail'>;

interface CommentItemProps {
  comment: Comment;
  onReply: (comment: Comment) => void;
  onVote: (commentId: string, voteType: 1 | -1) => void;
  depth: number;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, onReply, onVote, depth }) => {
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  if (comment.isDeleted) {
    return (
      <View style={[styles.commentContainer, { marginLeft: depth * 20 }]}>
        <Text style={styles.deletedText}>[deleted]</Text>
      </View>
    );
  }

  return (
    <View style={[styles.commentContainer, { marginLeft: depth * 20 }]}>
      <View style={styles.commentHeader}>
        <View style={styles.commentAuthor}>
          <Ionicons name="person-circle-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.authorName}>{comment.authorName}</Text>
          <Text style={styles.authorRole}>({comment.authorRole})</Text>
        </View>
        <Text style={styles.commentTime}>
          {new Date(comment.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <MarkdownRenderer content={comment.content} style={styles.commentContent} />

      <View style={styles.commentActions}>
        <View style={styles.voteContainer}>
          <TouchableOpacity
            onPress={() => isAuthenticated && onVote(comment.id, 1)}
            disabled={!isAuthenticated}
          >
            <Ionicons 
              name="arrow-up" 
              size={20} 
              color={Colors.textSecondary} 
            />
          </TouchableOpacity>
          <Text style={[
            styles.voteScore,
            comment.voteScore > 0 && styles.positiveScore,
            comment.voteScore < 0 && styles.negativeScore
          ]}>
            {comment.voteScore}
          </Text>
          <TouchableOpacity
            onPress={() => isAuthenticated && onVote(comment.id, -1)}
            disabled={!isAuthenticated}
          >
            <Ionicons 
              name="arrow-down" 
              size={20} 
              color={Colors.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        {isAuthenticated && (
          <TouchableOpacity onPress={() => onReply(comment)}>
            <Text style={styles.replyButton}>Reply</Text>
          </TouchableOpacity>
        )}
      </View>

      {comment.children && comment.children.length > 0 && (
        <View style={styles.childrenContainer}>
          {comment.children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              onReply={onReply}
              onVote={onVote}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
};

export const PostDetailScreen: React.FC = () => {
  const route = useRoute<PostDetailRouteProp>();
  const navigation = useNavigation<PostDetailNavigationProp>();
  const { postId } = route.params;
  
  const user = useAppSelector((state) => state.auth.user);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  
  const [post, setPost] = useState<PostWithComments | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  
  // Comment form state
  const [commentText, setCommentText] = useState('');
  
  // Action menu state
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    try {
      const postData = await forumService.getPost(postId);
      setPost(postData);
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.detail || error.response.data?.message || 'Failed to load post';
        Alert.alert('Error', errorMessage);
      } else {
        Alert.alert('Error', error.message || 'Failed to load post');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPost();
  };

  const handleVotePost = async (voteType: 1 | -1) => {
    if (!isAuthenticated || !post) return;

    try {
      const response = await forumService.votePost(post.id, { voteType: voteType });
      setPost(prev => prev ? { ...prev, voteScore: response.newScore } : null);
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleVoteComment = async (commentId: string, voteType: 1 | -1) => {
    if (!isAuthenticated) return;

    try {
      const response = await forumService.voteComment(commentId, { voteType: voteType });
      // Update comment score in the nested structure
      if (post) {
        const updateCommentScore = (comments: Comment[]): Comment[] => {
          return comments.map(c => {
            if (c.id === commentId) {
              return { ...c, voteScore: response.newScore };
            }
            if (c.children) {
              return { ...c, children: updateCommentScore(c.children) };
            }
            return c;
          });
        };
        
        setPost({
          ...post,
          comments: updateCommentScore(post.comments)
        });
      }
    } catch (error) {
      console.error('Failed to vote comment:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !post) return;

    setSubmitting(true);
    try {
      const commentData: CommentCreate = {
        content: commentText.trim(),
        parentId: replyingTo?.id,
      };

      await forumService.createComment(post.id, commentData);
      
      // Reload post to get updated comments
      await loadPost();
      
      // Reset form
      setCommentText('');
      setShowCommentForm(false);
      setReplyingTo(null);
      
      Alert.alert('Success', 'Comment posted successfully');
    } catch (error: any) {
      if (error.response) {
        const errorMessage = error.response.data?.detail || error.response.data?.message || 'Failed to post comment';
        Alert.alert('Error', errorMessage);
      } else {
        Alert.alert('Error', error.message || 'Failed to post comment');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    setShowCommentForm(true);
  };

  const handleAcceptAnswer = async (commentId: string) => {
    if (!post || post.authorId !== user?.id) return;

    try {
      await forumService.acceptAnswer(post.id, commentId);
      Alert.alert('Success', 'Answer accepted');
      await loadPost();
    } catch (error) {
      console.error('Failed to accept answer:', error);
      Alert.alert('Error', 'Failed to accept answer');
    }
  };

  const handleEditPost = () => {
    if (!post) return;
    setEditTitle(post.title);
    setEditContent(post.content);
    setShowActionMenu(false);
    setShowEditModal(true);
  };

  const handleUpdatePost = async () => {
    if (!post || !editTitle.trim()) return;

    setSubmitting(true);
    try {
      await forumService.updatePost(post.id, {
        title: editTitle.trim(),
        content: editContent.trim(),
      });
      
      Alert.alert('Success', 'Post updated successfully');
      setShowEditModal(false);
      await loadPost();
    } catch (error) {
      console.error('Failed to update post:', error);
      Alert.alert('Error', 'Failed to update post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = () => {
    setShowActionMenu(false);
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await forumService.deletePost(postId);
              Alert.alert('Success', 'Post deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Failed to delete post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
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

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Post not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Discussion</Text>
          {post.authorId === user?.id ? (
            <TouchableOpacity onPress={() => setShowActionMenu(true)}>
              <Ionicons name="ellipsis-vertical" size={24} color={Colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
            />
          }
        >
          {/* Post Content */}
          <View style={styles.postContainer}>
            <Text style={styles.postTitle}>{post.title}</Text>
            
            <View style={styles.postMeta}>
              <View style={styles.authorInfo}>
                <Ionicons name="person-circle-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.authorName}>{post.authorName}</Text>
                <Text style={styles.authorRole}>({post.authorRole})</Text>
              </View>
              <Text style={styles.postTime}>
                {new Date(post.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {post.relatedPiece && (
              <View style={styles.pieceBadge}>
                <Ionicons name="musical-notes" size={16} color={Colors.primary} />
                <Text style={styles.pieceText}>
                  {post.relatedPiece.name}
                  {post.relatedPiece.composer && ` - ${post.relatedPiece.composer}`}
                </Text>
              </View>
            )}

            {post.content ? (
              <MarkdownRenderer content={post.content} />
            ) : (
              <Text style={styles.postContent}>No content available</Text>
            )}

            {post.tags && post.tags.length > 0 && (
              <View style={styles.tagContainer}>
                {post.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.postActions}>
              <View style={styles.voteContainer}>
                <TouchableOpacity
                  onPress={() => handleVotePost(1)}
                  disabled={!isAuthenticated}
                >
                  <Ionicons 
                    name="arrow-up" 
                    size={24} 
                    color={Colors.textSecondary} 
                  />
                </TouchableOpacity>
                <Text style={[
                  styles.voteScore,
                  post.voteScore > 0 && styles.positiveScore,
                  post.voteScore < 0 && styles.negativeScore
                ]}>
                  {post.voteScore}
                </Text>
                <TouchableOpacity
                  onPress={() => handleVotePost(-1)}
                  disabled={!isAuthenticated}
                >
                  <Ionicons 
                    name="arrow-down" 
                    size={24} 
                    color={Colors.textSecondary} 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.postStats}>
                <View style={styles.statItem}>
                  <Ionicons name="chatbubble-outline" size={20} color={Colors.textSecondary} />
                  <Text style={styles.statText}>{post.commentCount}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="eye-outline" size={20} color={Colors.textSecondary} />
                  <Text style={styles.statText}>{post.viewCount}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Comments Section */}
          <View style={styles.commentsSection}>
            <View style={styles.commentsSectionHeader}>
              <Text style={styles.commentsSectionTitle}>
                {post.comment_count} {post.comment_count === 1 ? 'Answer' : 'Answers'}
              </Text>
              {isAuthenticated && (
                <TouchableOpacity
                  onPress={() => {
                    setReplyingTo(null);
                    setShowCommentForm(true);
                  }}
                >
                  <Text style={styles.addCommentButton}>Add Answer</Text>
                </TouchableOpacity>
              )}
            </View>

            {post.comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onVote={handleVoteComment}
                depth={0}
              />
            ))}
          </View>
        </ScrollView>

        {/* Comment Form */}
        {showCommentForm && (
          <View style={styles.commentForm}>
            {replyingTo && (
              <View style={styles.replyingToContainer}>
                <Text style={styles.replyingToText}>
                  Replying to {replyingTo.author_name}
                </Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            
            <TextInput
              style={styles.commentInput}
              placeholder="Write your answer..."
              placeholderTextColor={Colors.textSecondary}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={1000}
            />
            
            <View style={styles.commentFormActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowCommentForm(false);
                  setReplyingTo(null);
                  setCommentText('');
                }}
              >
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!commentText.trim() || submitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Post</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Menu Modal */}
        <Modal
          visible={showActionMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowActionMenu(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowActionMenu(false)}
          >
            <View style={styles.actionMenuContainer}>
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={handleEditPost}
              >
                <Ionicons name="create-outline" size={24} color={Colors.text} />
                <Text style={styles.actionMenuText}>Edit Post</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionMenuItem, styles.actionMenuItemLast]}
                onPress={handleDeletePost}
              >
                <Ionicons name="trash-outline" size={24} color={Colors.error} />
                <Text style={[styles.actionMenuText, styles.deleteText]}>Delete Post</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Edit Post Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEditModal(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelButton}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit Post</Text>
              <TouchableOpacity
                onPress={handleUpdatePost}
                disabled={!editTitle.trim() || submitting}
              >
                <Text style={[
                  styles.saveButton,
                  (!editTitle.trim() || submitting) && styles.saveButtonDisabled
                ]}>
                  {submitting ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Title</Text>
                <TextInput
                  style={styles.editInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Post title"
                  placeholderTextColor={Colors.textSecondary}
                  multiline={false}
                  maxLength={200}
                />
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Content</Text>
                <TextInput
                  style={[styles.editInput, styles.editContentInput]}
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="Post content (supports Markdown)"
                  placeholderTextColor={Colors.textSecondary}
                  multiline={true}
                  textAlignVertical="top"
                  maxLength={5000}
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </KeyboardAvoidingView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  postContainer: {
    backgroundColor: Colors.card,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  authorRole: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  postTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  postContent: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  pieceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  pieceText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  voteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voteScore: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  positiveScore: {
    color: Colors.success,
  },
  negativeScore: {
    color: Colors.error,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  statText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  commentsSection: {
    backgroundColor: Colors.card,
    marginTop: 8,
  },
  commentsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commentsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  addCommentButton: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  commentContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentTime: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  commentContent: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  deletedText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  replyButton: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  childrenContainer: {
    marginTop: 8,
  },
  commentForm: {
    backgroundColor: Colors.card,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  replyingToContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  commentInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  commentFormActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButton: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Action Menu Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionMenuContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionMenuItemLast: {
    borderBottomWidth: 0,
  },
  actionMenuText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  deleteText: {
    color: Colors.error,
  },
  // Edit Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  saveButton: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  saveButtonDisabled: {
    color: Colors.textSecondary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  editSection: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: Colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editContentInput: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
});