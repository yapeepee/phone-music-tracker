"""Forum schemas for API validation."""
from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from uuid import UUID

from app.models.forum import PostStatus, VoteType
from app.schemas.forum_media import ForumMediaWithUrl
from app.schemas.practice import Tag


# Post schemas
class PostBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)  # Markdown content
    tags: List[str] = Field(default_factory=list, max_items=5, description="Tag names to associate with the post")


class PostCreate(PostBase):
    related_piece_id: Optional[UUID] = Field(None, description="ID of the musical piece this post is about")


class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    status: Optional[PostStatus] = None


class Post(PostBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    author_id: UUID
    status: PostStatus
    vote_score: int
    comment_count: int
    view_count: int
    accepted_answer_id: Optional[UUID]
    related_piece_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    last_activity_at: datetime
    
    # Include author info
    author_name: str
    author_role: str
    author_reputation_points: int = 0
    author_reputation_level: str = "newcomer"
    
    # Include related piece info
    related_piece: Optional[Tag] = None
    
    # Include media files
    media_files: List[ForumMediaWithUrl] = []


class PostWithComments(Post):
    """Post with its comments for detailed view."""
    comments: List["Comment"]


class PostList(BaseModel):
    """Response model for paginated post list."""
    items: List[Post]
    total: int
    page: int
    page_size: int


# Comment schemas
class CommentBase(BaseModel):
    content: str = Field(..., min_length=1)  # Markdown content


class CommentCreate(CommentBase):
    parent_id: Optional[UUID] = None


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1)


class Comment(CommentBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    post_id: UUID
    author_id: UUID
    parent_id: Optional[UUID]
    is_deleted: bool
    vote_score: int
    created_at: datetime
    updated_at: datetime
    
    # Include author info
    author_name: str
    author_role: str
    author_reputation_points: int = 0
    author_reputation_level: str = "newcomer"
    
    # Include children for threaded view
    children: List["Comment"] = []
    
    # Include media files
    media_files: List[ForumMediaWithUrl] = []


# Vote schemas
class VoteCreate(BaseModel):
    vote_type: VoteType


class VoteResponse(BaseModel):
    """Response after voting."""
    vote_type: VoteType
    new_score: int


# Search schemas
class SearchQuery(BaseModel):
    query: str = Field(..., min_length=1, max_length=200)
    tags: Optional[List[str]] = None
    author_id: Optional[UUID] = None
    status: Optional[PostStatus] = PostStatus.PUBLISHED
    sort_by: str = Field("relevance", pattern="^(relevance|recent|votes|activity)$")


class SearchResult(BaseModel):
    """Search result item."""
    post: Post
    highlight: Optional[str] = None  # Highlighted snippet from content
    relevance_score: float


class SearchResponse(BaseModel):
    """Response for search queries."""
    items: List[SearchResult]
    total: int
    query: str
    took_ms: int  # Search execution time in milliseconds


# Enable forward references
PostWithComments.model_rebuild()
Comment.model_rebuild()