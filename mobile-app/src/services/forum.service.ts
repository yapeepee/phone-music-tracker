import { BaseService } from './base.service';
import { Tag } from '../types/practice';

// Types matching backend schemas exactly
export type PostStatus = 'draft' | 'published' | 'closed' | 'deleted';
export type VoteType = 1 | -1;

export interface PostCreate {
  title: string;
  content: string;
  tags?: string[];
  relatedPieceId?: string;
}

export interface PostUpdate {
  title?: string;
  content?: string;
  status?: PostStatus;
}

export interface Post {
  id: string;
  authorId: string;
  title: string;
  content: string;
  status: PostStatus;
  voteScore: number;
  commentCount: number;
  viewCount: number;
  acceptedAnswerId?: string;
  relatedPieceId?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  tags: string[];
  // Include author info
  authorName: string;
  authorRole: string;
  authorReputationPoints: number;
  authorReputationLevel: string;
  // Include related piece info
  relatedPiece?: Tag;
  // Media files
  mediaFiles?: {
    id: string;
    mediaType: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    originalFilename: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
  }[];
}

export interface PostWithComments extends Post {
  comments: Comment[];
}

export interface PostList {
  items: Post[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CommentCreate {
  content: string;
  parentId?: string;
}

export interface CommentUpdate {
  content: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string;
  content: string;
  isDeleted: boolean;
  voteScore: number;
  createdAt: string;
  updatedAt: string;
  // Include author info
  authorName: string;
  authorRole: string;
  authorReputationPoints: number;
  authorReputationLevel: string;
  // Include children for threaded view
  children: Comment[];
  // Media files
  mediaFiles?: {
    id: string;
    mediaType: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    originalFilename: string;
    width?: number;
    height?: number;
    durationSeconds?: number;
  }[];
}

// Updated to use camelCase
export interface VoteCreate {
  voteType: VoteType;  // Changed from vote_type
}

// Updated to use camelCase
export interface VoteResponse {
  voteType: VoteType;  // Changed from vote_type
  newScore: number;    // Changed from new_score
}

// Updated params interface to use camelCase
export interface GetPostsParams {
  skip?: number;
  limit?: number;
  tag?: string;
  authorId?: string;      // Changed from author_id
  status?: PostStatus;
  sortBy?: 'recent' | 'votes' | 'activity';  // Changed from sort_by
  search?: string;
  relatedPieceId?: string;  // Changed from related_piece_id
}

class ForumService extends BaseService {
  constructor() {
    super('/forum');
  }

  /**
   * Create a new forum post
   */
  async createPost(post: PostCreate): Promise<Post> {
    return this.post<Post>('/posts/', post);
  }

  /**
   * Get paginated list of forum posts
   */
  async getPosts(params?: GetPostsParams): Promise<PostList> {
    return this.get<PostList>('/posts/', { params });
  }

  /**
   * Get a single post with its comments
   */
  async getPost(postId: string): Promise<PostWithComments> {
    return this.get<PostWithComments>(`/posts/${postId}`);
  }

  /**
   * Update a post (only by author)
   */
  async updatePost(postId: string, updates: PostUpdate): Promise<Post> {
    return this.put<Post>(`/posts/${postId}`, updates);
  }

  /**
   * Delete a post (soft delete)
   */
  async deletePost(postId: string): Promise<void> {
    return this.delete(`/posts/${postId}`);
  }

  /**
   * Create a comment on a post
   */
  async createComment(postId: string, comment: CommentCreate): Promise<Comment> {
    return this.post<Comment>(`/posts/${postId}/comments/`, comment);
  }

  /**
   * Get comments for a post in threaded structure
   */
  async getComments(
    postId: string,
    params?: { skip?: number; limit?: number }
  ): Promise<Comment[]> {
    return this.get<Comment[]>(`/posts/${postId}/comments/`, { params });
  }

  /**
   * Update a comment (only by author)
   */
  async updateComment(commentId: string, update: CommentUpdate): Promise<Comment> {
    return this.put<Comment>(`/comments/${commentId}`, update);
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string): Promise<void> {
    return this.delete(`/comments/${commentId}`);
  }

  /**
   * Vote on a post
   */
  async votePost(postId: string, vote: VoteCreate): Promise<VoteResponse> {
    return this.post<VoteResponse>(`/posts/${postId}/vote`, vote);
  }

  /**
   * Vote on a comment
   */
  async voteComment(commentId: string, vote: VoteCreate): Promise<VoteResponse> {
    return this.post<VoteResponse>(`/comments/${commentId}/vote`, vote);
  }

  /**
   * Mark a comment as the accepted answer
   */
  async acceptAnswer(postId: string, commentId: string): Promise<void> {
    return this.post(`/posts/${postId}/accept-answer/${commentId}`, {});
  }
}

export const forumService = new ForumService();