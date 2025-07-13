"""Service for managing user reputation."""
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.reputation import ReputationHistory, REPUTATION_POINTS
from app.core.cache import cache_get, cache_set, cache_delete, CacheKeys


class ReputationService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def update_reputation(
        self,
        user_id: UUID,
        reason: str,
        reference_id: Optional[UUID] = None,
        description: Optional[str] = None
    ) -> int:
        """
        Update user reputation based on the reason.
        Returns the new total reputation points.
        """
        # Get the points change for this reason
        points_change = REPUTATION_POINTS.get(reason, 0)
        if points_change == 0:
            return 0
        
        # Get current user reputation
        user_query = select(User).where(User.id == user_id)
        result = await self.db.execute(user_query)
        user = result.scalar_one_or_none()
        
        if not user:
            return 0
        
        # Calculate new points (minimum 0)
        current_points = user.reputation_points or 0
        new_points = max(0, current_points + points_change)
        
        # Determine new level
        new_level = self._calculate_reputation_level(new_points)
        
        # Update user reputation
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(
                reputation_points=new_points,
                reputation_level=new_level
            )
        )
        
        # Create history entry
        history = ReputationHistory(
            user_id=user_id,
            reason=reason,
            reference_id=reference_id,
            points_change=points_change,
            total_points=new_points,
            description=description
        )
        
        self.db.add(history)
        
        try:
            await self.db.commit()
            
            # Invalidate user reputation cache
            cache_key = CacheKeys.format(CacheKeys.USER_REPUTATION, user_id=str(user_id))
            await cache_delete(cache_key)
            
            # Also invalidate leaderboard cache
            await cache_delete("leaderboard:*")
            
        except Exception:
            # Unique constraint violation means this event was already recorded
            await self.db.rollback()
            return current_points
        
        return new_points
    
    def _calculate_reputation_level(self, points: int) -> str:
        """Calculate reputation level based on points."""
        if points >= 10000:
            return "expert"
        elif points >= 5000:
            return "veteran"
        elif points >= 2000:
            return "advanced"
        elif points >= 500:
            return "intermediate"
        elif points >= 100:
            return "contributor"
        else:
            return "newcomer"
    
    async def get_user_reputation_history(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 50
    ) -> list[ReputationHistory]:
        """Get reputation history for a user."""
        query = (
            select(ReputationHistory)
            .where(ReputationHistory.user_id == user_id)
            .order_by(ReputationHistory.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def handle_post_vote(
        self,
        post_author_id: UUID,
        vote_type: int,
        post_id: UUID
    ) -> None:
        """Handle reputation change when a post is voted on."""
        reason = "post_upvoted" if vote_type > 0 else "post_downvoted"
        await self.update_reputation(
            user_id=post_author_id,
            reason=reason,
            reference_id=post_id,
            description=f"Your post received {'an upvote' if vote_type > 0 else 'a downvote'}"
        )
    
    async def handle_comment_vote(
        self,
        comment_author_id: UUID,
        vote_type: int,
        comment_id: UUID
    ) -> None:
        """Handle reputation change when a comment is voted on."""
        reason = "comment_upvoted" if vote_type > 0 else "comment_downvoted"
        await self.update_reputation(
            user_id=comment_author_id,
            reason=reason,
            reference_id=comment_id,
            description=f"Your comment received {'an upvote' if vote_type > 0 else 'a downvote'}"
        )
    
    async def handle_answer_accepted(
        self,
        answerer_id: UUID,
        asker_id: UUID,
        comment_id: UUID
    ) -> None:
        """Handle reputation change when an answer is accepted."""
        # Reward the person who gave the answer
        await self.update_reputation(
            user_id=answerer_id,
            reason="answer_accepted",
            reference_id=comment_id,
            description="Your answer was accepted"
        )
        
        # Small reward for the asker
        await self.update_reputation(
            user_id=asker_id,
            reason="accepted_answer",
            reference_id=comment_id,
            description="You accepted an answer"
        )
    
    async def handle_practice_completed(
        self,
        student_id: UUID,
        session_id: UUID
    ) -> None:
        """Handle reputation change when a practice session is completed."""
        await self.update_reputation(
            user_id=student_id,
            reason="practice_completed",
            reference_id=session_id,
            description="Completed a practice session"
        )
    
    async def handle_feedback_given(
        self,
        teacher_id: UUID,
        feedback_id: UUID
    ) -> None:
        """Handle reputation change when a teacher gives feedback."""
        await self.update_reputation(
            user_id=teacher_id,
            reason="feedback_given",
            reference_id=feedback_id,
            description="Provided feedback to a student"
        )