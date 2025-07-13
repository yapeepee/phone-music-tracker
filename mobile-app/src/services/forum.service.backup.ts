import { apiClient, handleApiError } from './api/client';
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

export interface VoteCreate {
  vote_type: VoteType;
}

export interface VoteResponse {
  vote_type: VoteType;
  new_score: number;
}

class ForumService {
  /**
   * Create a new forum post
   */
  async createPost(post: PostCreate): Promise<Post> {
    try {
      const response = await apiClient.post<Post>('/forum/posts/', post);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get paginated list of forum posts
   */
  async getPosts(params?: {
    skip?: number;
    limit?: number;
    tag?: string;
    author_id?: string;
    status?: PostStatus;
    sort_by?: 'recent' | 'votes' | 'activity';
    search?: string;
    related_piece_id?: string;
  }): Promise<PostList> {
    try {
      const response = await apiClient.get<PostList>('/forum/posts/', { params });
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get a single post with its comments
   */
  async getPost(postId: string): Promise<PostWithComments> {
    try {
      const response = await apiClient.get<PostWithComments>(`/forum/posts/${postId}`);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Update a post (only by author)
   */
  async updatePost(postId: string, updates: PostUpdate): Promise<Post> {
    try {
      const response = await apiClient.put<Post>(`/forum/posts/${postId}`, updates);
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Delete a post (soft delete)
   */
  async deletePost(postId: string): Promise<void> {
    try {
      await apiClient.delete(`/forum/posts/${postId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Create a comment on a post
   */
  async createComment(postId: string, comment: CommentCreate): Promise<Comment> {
    try {
      const response = await apiClient.post<Comment>(
        `/forum/posts/${postId}/comments/`,
        comment
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get comments for a post in threaded structure
   */
  async getComments(
    postId: string,
    params?: { skip?: number; limit?: number }
  ): Promise<Comment[]> {
    try {
      const response = await apiClient.get<Comment[]>(
        `/forum/posts/${postId}/comments/`,
        { params }
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Update a comment (only by author)
   */
  async updateComment(commentId: string, update: CommentUpdate): Promise<Comment> {
    try {
      const response = await apiClient.put<Comment>(
        `/forum/comments/${commentId}`,
        update
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string): Promise<void> {
    try {
      await apiClient.delete(`/forum/comments/${commentId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Vote on a post
   */
  async votePost(postId: string, vote: VoteCreate): Promise<VoteResponse> {
    try {
      const response = await apiClient.post<VoteResponse>(
        `/forum/posts/${postId}/vote`,
        vote
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Vote on a comment
   */
  async voteComment(commentId: string, vote: VoteCreate): Promise<VoteResponse> {
    try {
      const response = await apiClient.post<VoteResponse>(
        `/forum/comments/${commentId}/vote`,
        vote
      );
      return response.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Mark a comment as the accepted answer
   */
  async acceptAnswer(postId: string, commentId: string): Promise<void> {
    try {
      await apiClient.post(
        `/forum/posts/${postId}/accept-answer/${commentId}`
      );
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const forumService = new ForumService();