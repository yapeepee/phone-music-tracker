"""Forum endpoints for community Q&A."""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, Body, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.user import User
from app.models.forum import PostStatus, Post as PostModel
# from app.core.rate_limit import rate_limit  # Temporarily disabled
from app.schemas.forum import (
    Post,
    PostCreate,
    PostUpdate,
    PostWithComments,
    PostList,
    Comment,
    CommentCreate,
    CommentUpdate,
    VoteCreate,
    VoteResponse
)
from app.schemas.forum_media import ForumMediaWithUrl
from app.services.forum.forum_service import ForumService
from app.services.media.forum_media_service import ForumMediaService

router = APIRouter()


# Debug endpoint to test database connection
@router.get("/test-simple/{post_id}")
async def test_simple_post(
    post_id: UUID,
    db: AsyncSession = Depends(deps.get_db)
):
    """Test simple post retrieval without any complex logic."""
    try:
        # Direct query without any service or complex logic
        result = await db.execute(
            select(PostModel).where(PostModel.id == post_id)
        )
        post = result.scalar_one_or_none()
        
        if post:
            return {
                "status": "success",
                "id": str(post.id),
                "title": post.title,
                "content": post.content[:100] + "..." if len(post.content) > 100 else post.content
            }
        else:
            return {"status": "not_found"}
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "type": type(e).__name__
        }


# Debug endpoint to test simple post creation
@router.post("/test-create-simple")
async def test_create_simple(
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """Test simple post creation without any complex logic."""
    try:
        # Create a simple post directly
        new_post = PostModel(
            author_id=current_user.id,
            title="Test Post Simple",
            content="This is a test post created directly without services.",
            status=PostStatus.PUBLISHED
        )
        db.add(new_post)
        await db.commit()
        await db.refresh(new_post)
        
        return {
            "status": "success",
            "id": str(new_post.id),
            "title": new_post.title
        }
    except Exception as e:
        await db.rollback()
        return {
            "status": "error",
            "error": str(e),
            "type": type(e).__name__
        }


# Helper function to convert comment - moved outside to avoid nested async closure issues
async def convert_comment_to_dict(comment, db: AsyncSession, level: int = 0):
    """Convert a comment model to a dictionary with proper formatting."""
    if comment.is_deleted:
        comment_dict = {
            'id': comment.id,
            'post_id': comment.post_id,
            'author_id': comment.author_id,
            'parent_id': comment.parent_id,
            'content': "[deleted]",
            'is_deleted': True,
            'vote_score': 0,
            'created_at': comment.created_at,
            'updated_at': comment.updated_at,
            'author_name': "[deleted]",
            'author_role': "unknown",
            'author_reputation_points': 0,
            'author_reputation_level': "newcomer",
            'children': [],
            'media_files': []
        }
    else:
        comment_dict = {
            'id': comment.id,
            'post_id': comment.post_id,
            'author_id': comment.author_id,
            'parent_id': comment.parent_id,
            'content': comment.content,
            'is_deleted': comment.is_deleted,
            'vote_score': comment.vote_score,
            'created_at': comment.created_at,
            'updated_at': comment.updated_at,
            'author_name': comment.author.full_name,
            'author_role': comment.author.role,
            'author_reputation_points': comment.author.reputation_points,
            'author_reputation_level': comment.author.reputation_level,
            'children': [],
            'media_files': []  # Temporarily disabled - await convert_media_files_to_urls(comment.media_files, db)
        }
    
    # Convert children recursively
    for child in comment.children:
        child_dict = await convert_comment_to_dict(child, db, level + 1)
        comment_dict['children'].append(child_dict)
    
    return comment_dict




async def convert_media_files_to_urls(media_files: List, db: AsyncSession) -> List[ForumMediaWithUrl]:
    """Convert ForumMedia objects to ForumMediaWithUrl with presigned URLs."""
    if not media_files:
        return []
    
    media_service = ForumMediaService(db)
    media_with_urls = []
    
    for media in media_files:
        media_with_url = await media_service.get_media_with_url(media.id)
        if media_with_url:
            media_with_urls.append(media_with_url)
    
    return media_with_urls


# Post endpoints
@router.post("/posts/", response_model=Post)
async def create_post(
    post_data: PostCreate,
    current_user: User = Depends(deps.get_current_user),
    db: AsyncSession = Depends(deps.get_db)
) -> Post:
    """
    Create a new forum post.
    
    Any authenticated user can create posts.
    """
    # Test if cache disable fixes the issue
    forum_service = ForumService(db)
    post = await forum_service.create_post(
        author_id=current_user.id,
        post_data=post_data
    )
    
    # Convert to Pydantic schema with author info
    post_dict = {
        'id': post.id,
        'author_id': post.author_id,
        'title': post.title,
        'content': post.content,
        'tags': [tag.name for tag in post.tags],
        'status': post.status,
        'vote_score': post.vote_score,
        'comment_count': post.comment_count,
        'view_count': post.view_count,
        'accepted_answer_id': post.accepted_answer_id,
        'related_piece_id': post.related_piece_id,
        'created_at': post.created_at,
        'updated_at': post.updated_at,
        'last_activity_at': post.last_activity_at,
        'author_name': post.author.full_name,
        'author_role': post.author.role,
        'author_reputation_points': post.author.reputation_points,
        'author_reputation_level': post.author.reputation_level,
        'related_piece': {
            'id': post.related_piece.id,
            'name': post.related_piece.name,
            'color': post.related_piece.color,
            'tag_type': post.related_piece.tag_type,
            'composer': post.related_piece.composer,
            'opus_number': post.related_piece.opus_number,
            'difficulty_level': post.related_piece.difficulty_level,
            'owner_teacher_id': post.related_piece.owner_teacher_id,
            'estimated_mastery_sessions': post.related_piece.estimated_mastery_sessions,
            'is_archived': post.related_piece.is_archived,
            'archived_at': post.related_piece.archived_at,
            'created_at': post.related_piece.created_at,
            'updated_at': post.related_piece.updated_at
        } if post.related_piece else None,
        'media_files': []  # No media files on initial creation
    }
        
    return Post(**post_dict)


@router.get("/posts/", response_model=PostList)
async def get_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    tag: Optional[str] = Query(None, description="Filter by tag name"),
    author_id: Optional[UUID] = Query(None, description="Filter by author"),
    status: PostStatus = Query(PostStatus.PUBLISHED, description="Filter by status"),
    sort_by: str = Query("recent", pattern="^(recent|votes|activity)$"),
    search: Optional[str] = Query(None, description="Search in title and content"),
    related_piece_id: Optional[UUID] = Query(None, description="Filter by related musical piece"),
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
) -> PostList:
    """
    Get paginated list of forum posts.
    
    Posts are public and can be viewed without authentication.
    """
    forum_service = ForumService(db)
    
    posts, total = await forum_service.get_posts(
        skip=skip,
        limit=limit,
        tag=tag,
        author_id=author_id,
        status=status,
        sort_by=sort_by,
        search=search,
        related_piece_id=related_piece_id
    )
    
    # Convert posts to Pydantic schemas with author info
    post_items = []
    for post in posts:
        post_dict = {
            'id': post.id,
            'author_id': post.author_id,
            'title': post.title,
            'content': post.content,
            'tags': [tag.name for tag in post.tags],
            'status': post.status,
            'vote_score': post.vote_score,
            'comment_count': post.comment_count,
            'view_count': post.view_count,
            'accepted_answer_id': post.accepted_answer_id,
            'related_piece_id': post.related_piece_id,
            'created_at': post.created_at,
            'updated_at': post.updated_at,
            'last_activity_at': post.last_activity_at,
            'author_name': post.author.full_name,
            'author_role': post.author.role,
            'author_reputation_points': post.author.reputation_points,
            'author_reputation_level': post.author.reputation_level,
            'related_piece': {
                'id': post.related_piece.id,
                'name': post.related_piece.name,
                'color': post.related_piece.color,
                'tag_type': post.related_piece.tag_type,
                'composer': post.related_piece.composer,
                'opus_number': post.related_piece.opus_number,
                'difficulty_level': post.related_piece.difficulty_level,
                'owner_teacher_id': post.related_piece.owner_teacher_id,
                'estimated_mastery_sessions': post.related_piece.estimated_mastery_sessions,
                'is_archived': post.related_piece.is_archived,
                'archived_at': post.related_piece.archived_at,
                'created_at': post.related_piece.created_at,
                'updated_at': post.related_piece.updated_at
            } if post.related_piece else None,
            'media_files': []  # Temporarily disabled - await convert_media_files_to_urls(post.media_files, db)
        }
        post_items.append(Post(**post_dict))
    
    page = (skip // limit) + 1
    
    return PostList(
        items=post_items,
        total=total,
        page=page,
        page_size=limit
    )


@router.get("/posts/{post_id}", response_model=PostWithComments)
async def get_post(
    post_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
) -> PostWithComments:
    """
    Get a single post with its comments.
    
    Increments view count on each access.
    """
    forum_service = ForumService(db)
    
    post = await forum_service.get_post(post_id, increment_views=True)
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    
    # Convert to Pydantic schema
    post_dict = {
        'id': post.id,
        'author_id': post.author_id,
        'title': post.title,
        'content': post.content,
        'tags': [tag.name for tag in post.tags],
        'status': post.status,
        'vote_score': post.vote_score,
        'comment_count': post.comment_count,
        'view_count': post.view_count,
        'accepted_answer_id': post.accepted_answer_id,
        'related_piece_id': post.related_piece_id,
        'created_at': post.created_at,
        'updated_at': post.updated_at,
        'last_activity_at': post.last_activity_at,
        'author_name': post.author.full_name,
        'author_role': post.author.role,
        'author_reputation_points': post.author.reputation_points,
        'author_reputation_level': post.author.reputation_level,
        'related_piece': {
            'id': post.related_piece.id,
            'name': post.related_piece.name,
            'color': post.related_piece.color,
            'tag_type': post.related_piece.tag_type,
            'composer': post.related_piece.composer,
            'opus_number': post.related_piece.opus_number,
            'difficulty_level': post.related_piece.difficulty_level,
            'owner_teacher_id': post.related_piece.owner_teacher_id,
            'estimated_mastery_sessions': post.related_piece.estimated_mastery_sessions,
            'is_archived': post.related_piece.is_archived,
            'archived_at': post.related_piece.archived_at,
            'created_at': post.related_piece.created_at,
            'updated_at': post.related_piece.updated_at
        } if post.related_piece else None,
        'media_files': [],  # Temporarily disabled - await convert_media_files_to_urls(post.media_files, db),
        'comments': []
    }
    
    # Convert comments
    for comment in post.comments:
        comment_dict = await convert_comment_to_dict(comment, db)
        post_dict['comments'].append(comment_dict)
    
    return PostWithComments(**post_dict)


@router.put("/posts/{post_id}", response_model=Post)
async def update_post(
    post_id: UUID,
    post_update: PostUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Post:
    """
    Update a post.
    
    Only the post author can update their post.
    """
    forum_service = ForumService(db)
    
    post = await forum_service.update_post(
        post_id=post_id,
        author_id=current_user.id,
        post_update=post_update
    )
    
    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found or you don't have permission to update it"
        )
    
    # Convert to Pydantic schema with author info
    post_dict = {
        'id': post.id,
        'author_id': post.author_id,
        'title': post.title,
        'content': post.content,
        'tags': [tag.name for tag in post.tags],
        'status': post.status,
        'vote_score': post.vote_score,
        'comment_count': post.comment_count,
        'view_count': post.view_count,
        'accepted_answer_id': post.accepted_answer_id,
        'related_piece_id': post.related_piece_id,
        'created_at': post.created_at,
        'updated_at': post.updated_at,
        'last_activity_at': post.last_activity_at,
        'author_name': current_user.full_name,
        'author_role': current_user.role,
        'author_reputation_points': current_user.reputation_points,
        'author_reputation_level': current_user.reputation_level,
        'related_piece': {
            'id': post.related_piece.id,
            'name': post.related_piece.name,
            'color': post.related_piece.color,
            'tag_type': post.related_piece.tag_type,
            'composer': post.related_piece.composer,
            'opus_number': post.related_piece.opus_number,
            'difficulty_level': post.related_piece.difficulty_level,
            'owner_teacher_id': post.related_piece.owner_teacher_id,
            'estimated_mastery_sessions': post.related_piece.estimated_mastery_sessions,
            'is_archived': post.related_piece.is_archived,
            'archived_at': post.related_piece.archived_at,
            'created_at': post.related_piece.created_at,
            'updated_at': post.related_piece.updated_at
        } if post.related_piece else None,
        'media_files': await convert_media_files_to_urls(post.media_files, db)
    }
    
    return Post(**post_dict)


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """
    Delete a post (soft delete).
    
    Only the post author or admins can delete posts.
    """
    forum_service = ForumService(db)
    
    is_admin = current_user.role == "admin"
    
    success = await forum_service.delete_post(
        post_id=post_id,
        user_id=current_user.id,
        is_admin=is_admin
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Post not found or you don't have permission to delete it"
        )
    
    return {"detail": "Post deleted successfully"}


# Comment endpoints
@router.post("/posts/{post_id}/comments/", response_model=Comment)
async def create_comment(
    post_id: UUID,
    comment_data: CommentCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Comment:
    """
    Create a comment on a post.
    
    Comments can be threaded by providing a parent_id.
    """
    forum_service = ForumService(db)
    
    try:
        comment = await forum_service.create_comment(
            post_id=post_id,
            author_id=current_user.id,
            comment_data=comment_data
        )
        
        # Convert to Pydantic schema with author info
        comment_dict = {
            'id': comment.id,
            'post_id': comment.post_id,
            'author_id': comment.author_id,
            'parent_id': comment.parent_id,
            'content': comment.content,
            'is_deleted': comment.is_deleted,
            'vote_score': comment.vote_score,
            'created_at': comment.created_at,
            'updated_at': comment.updated_at,
            'author_name': current_user.full_name,
            'author_role': current_user.role,
            'author_reputation_points': current_user.reputation_points,
            'author_reputation_level': current_user.reputation_level,
            'children': [],
            'media_files': []  # TODO: Add media files if needed
        }
        
        return Comment(**comment_dict)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/posts/{post_id}/comments/", response_model=List[Comment])
async def get_comments(
    post_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(deps.get_db),
    current_user: Optional[User] = Depends(deps.get_current_user_optional)
) -> List[Comment]:
    """
    Get comments for a post in threaded structure.
    
    Returns top-level comments with their children nested.
    """
    forum_service = ForumService(db)
    
    comments = await forum_service.get_comments(
        post_id=post_id,
        skip=skip,
        limit=limit
    )
    
    # Add author info recursively
    def add_author_info(comment: Comment):
        if not comment.is_deleted:
            comment.author_name = comment.author.full_name
            comment.author_role = comment.author.role
            comment.author_reputation_points = comment.author.reputation_points
            comment.author_reputation_level = comment.author.reputation_level
        for child in comment.children:
            add_author_info(child)
    
    for comment in comments:
        add_author_info(comment)
    
    return comments


@router.put("/comments/{comment_id}", response_model=Comment)
async def update_comment(
    comment_id: UUID,
    comment_update: CommentUpdate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> Comment:
    """
    Update a comment.
    
    Only the comment author can update their comment.
    """
    forum_service = ForumService(db)
    
    comment = await forum_service.update_comment(
        comment_id=comment_id,
        author_id=current_user.id,
        comment_update=comment_update
    )
    
    if not comment:
        raise HTTPException(
            status_code=404,
            detail="Comment not found or you don't have permission to update it"
        )
    
    # Add author info
    comment.author_name = current_user.full_name
    comment.author_role = current_user.role
    comment.author_reputation_points = current_user.reputation_points
    comment.author_reputation_level = current_user.reputation_level
    
    return comment


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """
    Delete a comment (soft delete).
    
    Only the comment author or admins can delete comments.
    """
    forum_service = ForumService(db)
    
    is_admin = current_user.role == "admin"
    
    success = await forum_service.delete_comment(
        comment_id=comment_id,
        user_id=current_user.id,
        is_admin=is_admin
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Comment not found or you don't have permission to delete it"
        )
    
    return {"detail": "Comment deleted successfully"}


# Voting endpoints
@router.post("/posts/{post_id}/vote", response_model=VoteResponse)
async def vote_post(
    request: Request,
    post_id: UUID,
    vote_data: VoteCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
    _: bool = Depends(deps.rate_limit_vote)
) -> VoteResponse:
    """
    Vote on a post.
    
    Voting again with the same type removes the vote.
    Voting with a different type changes the vote.
    """
    forum_service = ForumService(db)
    
    try:
        vote_type, new_score = await forum_service.vote_post(
            post_id=post_id,
            user_id=current_user.id,
            vote_data=vote_data
        )
        
        return VoteResponse(
            vote_type=vote_type if vote_type else vote_data.vote_type,
            new_score=new_score
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/comments/{comment_id}/vote", response_model=VoteResponse)
async def vote_comment(
    comment_id: UUID,
    vote_data: VoteCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> VoteResponse:
    """
    Vote on a comment.
    
    Voting again with the same type removes the vote.
    Voting with a different type changes the vote.
    """
    forum_service = ForumService(db)
    
    try:
        vote_type, new_score = await forum_service.vote_comment(
            comment_id=comment_id,
            user_id=current_user.id,
            vote_data=vote_data
        )
        
        return VoteResponse(
            vote_type=vote_type if vote_type else vote_data.vote_type,
            new_score=new_score
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/posts/{post_id}/accept-answer/{comment_id}")
async def accept_answer(
    post_id: UUID,
    comment_id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
) -> dict:
    """
    Mark a comment as the accepted answer.
    
    Only the post author can accept an answer.
    """
    forum_service = ForumService(db)
    
    success = await forum_service.accept_answer(
        post_id=post_id,
        comment_id=comment_id,
        author_id=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail="Post or comment not found, or you don't have permission"
        )
    
    return {"detail": "Answer accepted successfully"}