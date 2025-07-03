"""Forum service for community Q&A operations."""
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, update, desc
from sqlalchemy.orm import selectinload, joinedload

from app.models.forum import Post, Comment, PostVote, CommentVote, PostStatus, VoteType
from app.models.forum_media import ForumMedia
from app.models.user import User
from app.models.practice import Tag
from app.schemas.forum import PostCreate, PostUpdate, CommentCreate, CommentUpdate, VoteCreate
from app.services.community.reputation_service import ReputationService


class ForumService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # Post operations
    async def create_post(
        self,
        author_id: UUID,
        post_data: PostCreate
    ) -> Post:
        """Create a new forum post."""
        # Create the post
        db_post = Post(
            author_id=author_id,
            title=post_data.title,
            content=post_data.content,
            status=PostStatus.PUBLISHED,
            related_piece_id=post_data.related_piece_id
        )
        
        self.db.add(db_post)
        await self.db.flush()  # Flush to get the post ID
        
        # Handle tags if provided
        if post_data.tags:
            # Get or create tags
            for tag_name in post_data.tags:
                # First check if tag exists
                tag_query = select(Tag).where(Tag.name == tag_name)
                result = await self.db.execute(tag_query)
                tag = result.scalar_one_or_none()
                
                if not tag:
                    # Create global tag (no owner)
                    tag = Tag(name=tag_name)
                    self.db.add(tag)
                
                # Associate tag with post
                db_post.tags.append(tag)
        
        await self.db.commit()
        await self.db.refresh(db_post)
        
        # Load author info
        await self.db.refresh(db_post, ['author', 'tags'])
        
        # Check if this is the user's first post today for reputation bonus
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        first_today_query = select(func.count(Post.id)).where(
            and_(
                Post.author_id == author_id,
                Post.created_at >= today_start,
                Post.id != db_post.id  # Exclude the post we just created
            )
        )
        result = await self.db.execute(first_today_query)
        posts_today = result.scalar()
        
        if posts_today == 0:  # This is the first post today
            reputation_service = ReputationService(self.db)
            await reputation_service.update_reputation(
                user_id=author_id,
                reason="first_post_daily",
                reference_id=db_post.id,
                description="Daily first post bonus"
            )
        
        return db_post
    
    async def get_posts(
        self,
        skip: int = 0,
        limit: int = 20,
        tag: Optional[str] = None,
        author_id: Optional[UUID] = None,
        status: PostStatus = PostStatus.PUBLISHED,
        sort_by: str = "recent",  # recent, votes, activity
        search: Optional[str] = None,
        related_piece_id: Optional[UUID] = None
    ) -> Tuple[List[Post], int]:
        """Get paginated list of posts with filters."""
        # Base query
        query = select(Post).where(Post.status == status)
        count_query = select(func.count(Post.id)).where(Post.status == status)
        
        # Apply filters
        if tag:
            query = query.join(Post.tags).where(Tag.name == tag)
            count_query = count_query.join(Post.tags).where(Tag.name == tag)
        
        if author_id:
            query = query.where(Post.author_id == author_id)
            count_query = count_query.where(Post.author_id == author_id)
        
        if related_piece_id:
            query = query.where(Post.related_piece_id == related_piece_id)
            count_query = count_query.where(Post.related_piece_id == related_piece_id)
        
        if search:
            # Search in title and content (case-insensitive)
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Post.title.ilike(search_pattern),
                    Post.content.ilike(search_pattern)
                )
            )
            count_query = count_query.where(
                or_(
                    Post.title.ilike(search_pattern),
                    Post.content.ilike(search_pattern)
                )
            )
        
        # Apply sorting
        if sort_by == "votes":
            query = query.order_by(desc(Post.vote_score))
        elif sort_by == "activity":
            query = query.order_by(desc(Post.last_activity_at))
        else:  # recent
            query = query.order_by(desc(Post.created_at))
        
        # Include relationships
        query = query.options(
            selectinload(Post.author),
            selectinload(Post.tags),
            selectinload(Post.media_files),
            selectinload(Post.related_piece)
        )
        
        # Execute queries
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        posts = result.scalars().all()
        
        count_result = await self.db.execute(count_query)
        total = count_result.scalar()
        
        return posts, total
    
    async def get_post(
        self,
        post_id: UUID,
        increment_views: bool = True
    ) -> Optional[Post]:
        """Get a single post by ID."""
        query = select(Post).where(Post.id == post_id).options(
            selectinload(Post.author),
            selectinload(Post.tags),
            selectinload(Post.media_files),
            selectinload(Post.related_piece),
            selectinload(Post.comments).options(
                selectinload(Comment.author),
                selectinload(Comment.media_files)
            ),
            selectinload(Post.accepted_answer)
        )
        
        result = await self.db.execute(query)
        post = result.scalar_one_or_none()
        
        if post and increment_views:
            # Increment view count
            await self.db.execute(
                update(Post)
                .where(Post.id == post_id)
                .values(view_count=Post.view_count + 1)
            )
            await self.db.commit()
            post.view_count += 1
        
        return post
    
    async def update_post(
        self,
        post_id: UUID,
        author_id: UUID,
        post_update: PostUpdate
    ) -> Optional[Post]:
        """Update a post (only by author)."""
        # Get the post
        post = await self.get_post(post_id, increment_views=False)
        
        if not post or post.author_id != author_id:
            return None
        
        # Update fields
        if post_update.title is not None:
            post.title = post_update.title
        
        if post_update.content is not None:
            post.content = post_update.content
        
        if post_update.status is not None:
            post.status = post_update.status
        
        post.updated_at = datetime.now(timezone.utc)
        
        self.db.add(post)
        await self.db.commit()
        await self.db.refresh(post)
        
        return post
    
    async def delete_post(
        self,
        post_id: UUID,
        user_id: UUID,
        is_admin: bool = False
    ) -> bool:
        """Delete a post (soft delete)."""
        post = await self.get_post(post_id, increment_views=False)
        
        if not post:
            return False
        
        # Check permissions
        if not is_admin and post.author_id != user_id:
            return False
        
        # Soft delete
        post.status = PostStatus.DELETED
        post.updated_at = datetime.now(timezone.utc)
        
        self.db.add(post)
        await self.db.commit()
        
        return True
    
    # Comment operations
    async def create_comment(
        self,
        post_id: UUID,
        author_id: UUID,
        comment_data: CommentCreate
    ) -> Comment:
        """Create a new comment on a post."""
        # Verify post exists and is not deleted
        post_query = select(Post).where(
            and_(
                Post.id == post_id,
                Post.status != PostStatus.DELETED
            )
        )
        result = await self.db.execute(post_query)
        post = result.scalar_one_or_none()
        
        if not post:
            raise ValueError("Post not found or deleted")
        
        # Verify parent comment exists if provided
        if comment_data.parent_id:
            parent_query = select(Comment).where(
                and_(
                    Comment.id == comment_data.parent_id,
                    Comment.post_id == post_id,
                    Comment.is_deleted == False
                )
            )
            parent_result = await self.db.execute(parent_query)
            parent = parent_result.scalar_one_or_none()
            
            if not parent:
                raise ValueError("Parent comment not found")
        
        # Create comment
        db_comment = Comment(
            post_id=post_id,
            author_id=author_id,
            parent_id=comment_data.parent_id,
            content=comment_data.content
        )
        
        self.db.add(db_comment)
        
        # Update post stats
        await self.db.execute(
            update(Post)
            .where(Post.id == post_id)
            .values(
                comment_count=Post.comment_count + 1,
                last_activity_at=datetime.now(timezone.utc)
            )
        )
        
        await self.db.commit()
        await self.db.refresh(db_comment, ['author'])
        
        return db_comment
    
    async def get_comments(
        self,
        post_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Comment]:
        """Get comments for a post in threaded structure."""
        # Get all comments for the post
        query = select(Comment).where(
            and_(
                Comment.post_id == post_id,
                Comment.is_deleted == False
            )
        ).options(
            selectinload(Comment.author),
            selectinload(Comment.children),
            selectinload(Comment.media_files)
        ).order_by(Comment.created_at)
        
        result = await self.db.execute(query)
        all_comments = result.scalars().all()
        
        # Build threaded structure (only return top-level comments)
        top_level = [c for c in all_comments if c.parent_id is None]
        
        return top_level[skip:skip + limit]
    
    async def update_comment(
        self,
        comment_id: UUID,
        author_id: UUID,
        comment_update: CommentUpdate
    ) -> Optional[Comment]:
        """Update a comment (only by author)."""
        query = select(Comment).where(
            and_(
                Comment.id == comment_id,
                Comment.author_id == author_id,
                Comment.is_deleted == False
            )
        ).options(selectinload(Comment.author))
        
        result = await self.db.execute(query)
        comment = result.scalar_one_or_none()
        
        if not comment:
            return None
        
        comment.content = comment_update.content
        comment.updated_at = datetime.now(timezone.utc)
        
        self.db.add(comment)
        await self.db.commit()
        await self.db.refresh(comment)
        
        return comment
    
    async def delete_comment(
        self,
        comment_id: UUID,
        user_id: UUID,
        is_admin: bool = False
    ) -> bool:
        """Delete a comment (soft delete)."""
        query = select(Comment).where(Comment.id == comment_id)
        result = await self.db.execute(query)
        comment = result.scalar_one_or_none()
        
        if not comment:
            return False
        
        # Check permissions
        if not is_admin and comment.author_id != user_id:
            return False
        
        # Soft delete
        comment.is_deleted = True
        comment.content = "[deleted]"
        comment.updated_at = datetime.now(timezone.utc)
        
        # Update post comment count
        await self.db.execute(
            update(Post)
            .where(Post.id == comment.post_id)
            .values(comment_count=Post.comment_count - 1)
        )
        
        self.db.add(comment)
        await self.db.commit()
        
        return True
    
    # Voting operations
    async def vote_post(
        self,
        post_id: UUID,
        user_id: UUID,
        vote_data: VoteCreate
    ) -> Tuple[VoteType, int]:
        """Vote on a post. Returns (vote_type, new_score)."""
        # Check if user already voted
        existing_vote_query = select(PostVote).where(
            and_(
                PostVote.post_id == post_id,
                PostVote.user_id == user_id
            )
        )
        result = await self.db.execute(existing_vote_query)
        existing_vote = result.scalar_one_or_none()
        
        # Get the post
        post_query = select(Post).where(Post.id == post_id)
        post_result = await self.db.execute(post_query)
        post = post_result.scalar_one_or_none()
        
        if not post:
            raise ValueError("Post not found")
        
        score_change = 0
        
        if existing_vote:
            if existing_vote.vote_type == vote_data.vote_type.value:
                # Same vote - remove it
                await self.db.delete(existing_vote)
                score_change = -vote_data.vote_type.value
                final_vote_type = None
            else:
                # Different vote - update it
                old_value = existing_vote.vote_type
                existing_vote.vote_type = vote_data.vote_type.value
                score_change = vote_data.vote_type.value - old_value
                final_vote_type = vote_data.vote_type
        else:
            # New vote
            new_vote = PostVote(
                post_id=post_id,
                user_id=user_id,
                vote_type=vote_data.vote_type.value
            )
            self.db.add(new_vote)
            score_change = vote_data.vote_type.value
            final_vote_type = vote_data.vote_type
        
        # Update post score
        new_score = post.vote_score + score_change
        await self.db.execute(
            update(Post)
            .where(Post.id == post_id)
            .values(vote_score=new_score)
        )
        
        await self.db.commit()
        
        # Update reputation after commit
        if score_change != 0 and post.author_id != user_id:  # Don't give reputation for self-votes
            reputation_service = ReputationService(self.db)
            if score_change > 0:
                # User received an upvote
                await reputation_service.handle_post_vote(
                    post_author_id=post.author_id,
                    vote_type=1,
                    post_id=post_id
                )
            elif score_change < 0:
                # User received a downvote
                await reputation_service.handle_post_vote(
                    post_author_id=post.author_id,
                    vote_type=-1,
                    post_id=post_id
                )
        
        return final_vote_type, new_score
    
    async def vote_comment(
        self,
        comment_id: UUID,
        user_id: UUID,
        vote_data: VoteCreate
    ) -> Tuple[VoteType, int]:
        """Vote on a comment. Returns (vote_type, new_score)."""
        # Similar logic to vote_post but for comments
        existing_vote_query = select(CommentVote).where(
            and_(
                CommentVote.comment_id == comment_id,
                CommentVote.user_id == user_id
            )
        )
        result = await self.db.execute(existing_vote_query)
        existing_vote = result.scalar_one_or_none()
        
        # Get the comment
        comment_query = select(Comment).where(Comment.id == comment_id)
        comment_result = await self.db.execute(comment_query)
        comment = comment_result.scalar_one_or_none()
        
        if not comment:
            raise ValueError("Comment not found")
        
        score_change = 0
        
        if existing_vote:
            if existing_vote.vote_type == vote_data.vote_type.value:
                # Same vote - remove it
                await self.db.delete(existing_vote)
                score_change = -vote_data.vote_type.value
                final_vote_type = None
            else:
                # Different vote - update it
                old_value = existing_vote.vote_type
                existing_vote.vote_type = vote_data.vote_type.value
                score_change = vote_data.vote_type.value - old_value
                final_vote_type = vote_data.vote_type
        else:
            # New vote
            new_vote = CommentVote(
                comment_id=comment_id,
                user_id=user_id,
                vote_type=vote_data.vote_type.value
            )
            self.db.add(new_vote)
            score_change = vote_data.vote_type.value
            final_vote_type = vote_data.vote_type
        
        # Update comment score
        new_score = comment.vote_score + score_change
        await self.db.execute(
            update(Comment)
            .where(Comment.id == comment_id)
            .values(vote_score=new_score)
        )
        
        await self.db.commit()
        
        # Update reputation after commit
        if score_change != 0 and comment.author_id != user_id:  # Don't give reputation for self-votes
            reputation_service = ReputationService(self.db)
            if score_change > 0:
                # User received an upvote
                await reputation_service.handle_comment_vote(
                    comment_author_id=comment.author_id,
                    vote_type=1,
                    comment_id=comment_id
                )
            elif score_change < 0:
                # User received a downvote
                await reputation_service.handle_comment_vote(
                    comment_author_id=comment.author_id,
                    vote_type=-1,
                    comment_id=comment_id
                )
        
        return final_vote_type, new_score
    
    async def accept_answer(
        self,
        post_id: UUID,
        comment_id: UUID,
        author_id: UUID
    ) -> bool:
        """Mark a comment as the accepted answer (only post author can do this)."""
        # Get the post
        post_query = select(Post).where(
            and_(
                Post.id == post_id,
                Post.author_id == author_id
            )
        )
        post_result = await self.db.execute(post_query)
        post = post_result.scalar_one_or_none()
        
        if not post:
            return False
        
        # Verify comment exists and belongs to this post
        comment_query = select(Comment).where(
            and_(
                Comment.id == comment_id,
                Comment.post_id == post_id,
                Comment.is_deleted == False
            )
        )
        comment_result = await self.db.execute(comment_query)
        comment = comment_result.scalar_one_or_none()
        
        if not comment:
            return False
        
        # Update accepted answer
        post.accepted_answer_id = comment_id
        post.updated_at = datetime.now(timezone.utc)
        
        self.db.add(post)
        await self.db.commit()
        
        # Update reputation for accepted answer
        reputation_service = ReputationService(self.db)
        await reputation_service.handle_answer_accepted(
            answerer_id=comment.author_id,
            asker_id=author_id,
            comment_id=comment_id
        )
        
        return True