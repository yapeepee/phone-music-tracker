"""Challenge service for managing practice challenges and achievements."""
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta, timezone
from uuid import UUID
from sqlalchemy import select, and_, or_, func, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.challenge import (
    Challenge, Achievement, UserChallenge, UserAchievement,
    ChallengeType, ChallengeStatus, AchievementTier
)
from app.models.user import User
from app.models.practice import PracticeSession
from app.models.analytics import AnalysisResult
from app.services.community.reputation_service import ReputationService
from app.services.notification_service import NotificationService
from app.schemas.notification import NotificationCreate


class ChallengeService:
    """Service for managing challenges and achievements."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.reputation_service = ReputationService(db)
        self.notification_service = NotificationService(db)
    
    # Challenge management
    async def get_challenges(
        self,
        user: User,
        only_active: bool = True,
        include_progress: bool = True
    ) -> List[Challenge]:
        """Get available challenges for a user."""
        query = select(Challenge).options(selectinload(Challenge.achievement))
        
        if only_active:
            today = date.today()
            query = query.where(
                and_(
                    Challenge.is_active == True,
                    or_(Challenge.start_date.is_(None), Challenge.start_date <= today),
                    or_(Challenge.end_date.is_(None), Challenge.end_date >= today)
                )
            )
        
        query = query.order_by(Challenge.order_index, Challenge.name)
        
        result = await self.db.execute(query)
        challenges = result.scalars().all()
        
        if include_progress:
            # Get user's challenge progress
            user_challenges_query = select(UserChallenge).where(
                UserChallenge.user_id == user.id
            )
            user_challenges_result = await self.db.execute(user_challenges_query)
            user_challenges_map = {
                uc.challenge_id: uc 
                for uc in user_challenges_result.scalars().all()
            }
            
            # Add progress info to each challenge
            for challenge in challenges:
                if challenge.id in user_challenges_map:
                    uc = user_challenges_map[challenge.id]
                    challenge.user_status = uc.status
                    challenge.user_progress = uc.current_value
                    challenge.user_progress_percentage = min(
                        (uc.current_value / challenge.target_value) * 100, 100
                    )
                    
                    # Check if can start (cooldown)
                    if challenge.is_repeatable and uc.status == ChallengeStatus.COMPLETED:
                        if challenge.cooldown_days and uc.completed_at:
                            cooldown_end = uc.completed_at + timedelta(days=challenge.cooldown_days)
                            if datetime.now(timezone.utc) < cooldown_end:
                                challenge.can_start = False
                                challenge.cooldown_remaining_days = (
                                    cooldown_end - datetime.now(timezone.utc)
                                ).days
        
        return challenges
    
    async def get_challenge(self, challenge_id: UUID) -> Optional[Challenge]:
        """Get a specific challenge."""
        query = select(Challenge).options(
            selectinload(Challenge.achievement)
        ).where(Challenge.id == challenge_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def start_challenge(self, user: User, challenge_id: UUID) -> UserChallenge:
        """Start a challenge for a user."""
        # Check if challenge exists and is active
        challenge = await self.get_challenge(challenge_id)
        if not challenge or not challenge.is_active:
            raise ValueError("Challenge not found or not active")
        
        # Check if user already has this challenge active
        existing_query = select(UserChallenge).where(
            and_(
                UserChallenge.user_id == user.id,
                UserChallenge.challenge_id == challenge_id,
                UserChallenge.status.in_([
                    ChallengeStatus.NOT_STARTED, 
                    ChallengeStatus.IN_PROGRESS
                ])
            )
        )
        existing_result = await self.db.execute(existing_query)
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            raise ValueError("Challenge already in progress")
        
        # Check cooldown if repeatable
        if challenge.is_repeatable:
            completed_query = select(UserChallenge).where(
                and_(
                    UserChallenge.user_id == user.id,
                    UserChallenge.challenge_id == challenge_id,
                    UserChallenge.status == ChallengeStatus.COMPLETED
                )
            ).order_by(desc(UserChallenge.completed_at)).limit(1)
            
            completed_result = await self.db.execute(completed_query)
            last_completed = completed_result.scalar_one_or_none()
            
            if last_completed and challenge.cooldown_days:
                cooldown_end = last_completed.completed_at + timedelta(days=challenge.cooldown_days)
                if datetime.now(timezone.utc) < cooldown_end:
                    raise ValueError(f"Challenge on cooldown for {(cooldown_end - datetime.now(timezone.utc)).days} more days")
        
        # Create user challenge
        user_challenge = UserChallenge(
            user_id=user.id,
            challenge_id=challenge_id,
            status=ChallengeStatus.IN_PROGRESS,
            started_at=datetime.now(timezone.utc),
            current_value=0,
            progress_data={}
        )
        
        # Set expiration if needed
        if challenge.type == ChallengeType.WEEKLY_GOAL:
            # Weekly challenges expire at end of week
            today = date.today()
            days_until_sunday = (6 - today.weekday()) % 7
            if days_until_sunday == 0:
                days_until_sunday = 7
            user_challenge.expires_at = datetime.combine(
                today + timedelta(days=days_until_sunday),
                datetime.min.time()
            ).replace(tzinfo=timezone.utc)
        
        self.db.add(user_challenge)
        await self.db.commit()
        await self.db.refresh(user_challenge)
        
        return user_challenge
    
    async def update_challenge_progress(
        self,
        user_challenge_id: UUID,
        progress_increment: int = 1,
        progress_data: Optional[Dict[str, Any]] = None
    ) -> UserChallenge:
        """Update progress on a challenge."""
        query = select(UserChallenge).options(
            selectinload(UserChallenge.challenge).selectinload(Challenge.achievement)
        ).where(UserChallenge.id == user_challenge_id)
        
        result = await self.db.execute(query)
        user_challenge = result.scalar_one_or_none()
        
        if not user_challenge:
            raise ValueError("User challenge not found")
        
        if user_challenge.status != ChallengeStatus.IN_PROGRESS:
            raise ValueError("Challenge is not in progress")
        
        # Update progress
        user_challenge.current_value += progress_increment
        if progress_data:
            user_challenge.progress_data = {
                **(user_challenge.progress_data or {}),
                **progress_data
            }
        
        # Check if completed
        if user_challenge.current_value >= user_challenge.challenge.target_value:
            await self._complete_challenge(user_challenge)
        
        await self.db.commit()
        await self.db.refresh(user_challenge)
        
        return user_challenge
    
    async def _complete_challenge(self, user_challenge: UserChallenge):
        """Mark a challenge as completed and award rewards."""
        user_challenge.status = ChallengeStatus.COMPLETED
        user_challenge.completed_at = datetime.now(timezone.utc)
        
        challenge = user_challenge.challenge
        user = user_challenge.user
        
        # Award reputation points
        if challenge.reputation_reward > 0:
            await self.reputation_service.add_reputation(
                user_id=user.id,
                points=challenge.reputation_reward,
                reason="challenge_completed",
                reference_id=str(challenge.id),
                description=f"Completed challenge: {challenge.name}"
            )
        
        # Award achievement if linked
        if challenge.achievement_id:
            # Check if user already has this achievement
            existing_achievement = await self.db.execute(
                select(UserAchievement).where(
                    and_(
                        UserAchievement.user_id == user.id,
                        UserAchievement.achievement_id == challenge.achievement_id
                    )
                )
            )
            
            if not existing_achievement.scalar_one_or_none():
                # Award achievement
                user_achievement = UserAchievement(
                    user_id=user.id,
                    achievement_id=challenge.achievement_id,
                    earned_from_challenge_id=challenge.id
                )
                self.db.add(user_achievement)
                
                # Update achievement earned count
                achievement = challenge.achievement
                achievement.total_earned += 1
                
                # Send notification
                notification_data = NotificationCreate(
                    user_id=user.id,
                    type="achievement_unlocked",
                    title="Achievement Unlocked!",
                    message=f"You earned the '{achievement.name}' achievement!",
                    data={
                        "achievement_id": str(achievement.id),
                        "achievement_name": achievement.name,
                        "achievement_tier": achievement.tier
                    }
                )
                await self.notification_service.create_notification(notification_data)
    
    async def ensure_user_challenges_active(self, user_id: UUID) -> List[UserChallenge]:
        """Ensure all active challenges are started for a user.
        
        This method automatically creates UserChallenge records for all active challenges
        that the user hasn't started yet, making them immediately active.
        """
        # Get all active challenges
        today = date.today()
        active_challenges_query = select(Challenge).where(
            and_(
                Challenge.is_active == True,
                or_(Challenge.start_date.is_(None), Challenge.start_date <= today),
                or_(Challenge.end_date.is_(None), Challenge.end_date >= today)
            )
        )
        
        active_challenges_result = await self.db.execute(active_challenges_query)
        active_challenges = active_challenges_result.scalars().all()
        
        # Get user's existing challenges
        existing_challenges_query = select(UserChallenge).where(
            UserChallenge.user_id == user_id
        )
        existing_challenges_result = await self.db.execute(existing_challenges_query)
        existing_user_challenges = existing_challenges_result.scalars().all()
        
        # Create a map of existing challenges by challenge ID and status
        existing_challenge_map = {}
        for uc in existing_user_challenges:
            existing_challenge_map[uc.challenge_id] = uc
        
        # Create or update UserChallenge records
        new_user_challenges = []
        for challenge in active_challenges:
            existing_uc = existing_challenge_map.get(challenge.id)
            
            # If no existing challenge, create new one
            if not existing_uc:
                # Create new user challenge
                user_challenge = UserChallenge(
                    user_id=user_id,
                    challenge_id=challenge.id,
                    status=ChallengeStatus.IN_PROGRESS,
                    started_at=datetime.now(timezone.utc),
                    current_value=0,
                    progress_data={}
                )
                
                # Set expiration if needed
                if challenge.type == ChallengeType.WEEKLY_GOAL:
                    # Weekly challenges expire at end of week
                    days_until_sunday = (6 - today.weekday()) % 7
                    if days_until_sunday == 0:
                        days_until_sunday = 7
                    user_challenge.expires_at = datetime.combine(
                        today + timedelta(days=days_until_sunday),
                        datetime.min.time()
                    ).replace(tzinfo=timezone.utc)
                
                self.db.add(user_challenge)
                new_user_challenges.append(user_challenge)
            
            # If existing challenge is NOT_STARTED, activate it
            elif existing_uc.status == ChallengeStatus.NOT_STARTED:
                existing_uc.status = ChallengeStatus.IN_PROGRESS
                existing_uc.started_at = datetime.now(timezone.utc)
                existing_uc.current_value = 0
                existing_uc.progress_data = {}
                
                # Set expiration if needed
                if challenge.type == ChallengeType.WEEKLY_GOAL:
                    today = date.today()
                    days_until_sunday = (6 - today.weekday()) % 7
                    if days_until_sunday == 0:
                        days_until_sunday = 7
                    existing_uc.expires_at = datetime.combine(
                        today + timedelta(days=days_until_sunday),
                        datetime.min.time()
                    ).replace(tzinfo=timezone.utc)
                
                new_user_challenges.append(existing_uc)
            
            # If it's a completed repeatable challenge that's past cooldown, create new one
            elif existing_uc.status == ChallengeStatus.COMPLETED and challenge.is_repeatable:
                if challenge.cooldown_days and existing_uc.completed_at:
                    cooldown_end = existing_uc.completed_at + timedelta(days=challenge.cooldown_days)
                    if datetime.now(timezone.utc) >= cooldown_end:
                        # Reset the existing challenge instead of creating new one
                        existing_uc.status = ChallengeStatus.IN_PROGRESS
                        existing_uc.started_at = datetime.now(timezone.utc)
                        existing_uc.current_value = 0
                        existing_uc.progress_data = {}
                        existing_uc.completed_at = None
                        
                        # Set expiration if needed
                        if challenge.type == ChallengeType.WEEKLY_GOAL:
                            today = date.today()
                            days_until_sunday = (6 - today.weekday()) % 7
                            if days_until_sunday == 0:
                                days_until_sunday = 7
                            existing_uc.expires_at = datetime.combine(
                                today + timedelta(days=days_until_sunday),
                                datetime.min.time()
                            ).replace(tzinfo=timezone.utc)
                        
                        new_user_challenges.append(existing_uc)
        
        # Commit new and updated challenges
        if new_user_challenges:
            await self.db.commit()
            for uc in new_user_challenges:
                await self.db.refresh(uc)
        
        return new_user_challenges
    
    # Progress tracking for different challenge types
    async def track_practice_session(self, session: PracticeSession, analysis_result: Optional[AnalysisResult] = None):
        """Track a practice session for challenge progress."""
        user_id = session.student_id
        
        # Ensure all challenges are active for the user
        await self.ensure_user_challenges_active(user_id)
        
        # Get user's active challenges
        active_challenges_query = select(UserChallenge).options(
            selectinload(UserChallenge.challenge)
        ).where(
            and_(
                UserChallenge.user_id == user_id,
                UserChallenge.status == ChallengeStatus.IN_PROGRESS
            )
        )
        
        result = await self.db.execute(active_challenges_query)
        active_challenges = result.scalars().all()
        
        for uc in active_challenges:
            challenge = uc.challenge
            progress_made = False
            
            # Track based on challenge type
            if challenge.type == ChallengeType.TOTAL_SESSIONS:
                # Increment session count
                await self.update_challenge_progress(uc.id, 1)
                progress_made = True
                
            elif challenge.type == ChallengeType.DURATION:
                # Add session duration
                if session.duration_minutes:
                    await self.update_challenge_progress(
                        uc.id, 
                        session.duration_minutes,
                        {"last_session_id": str(session.id)}
                    )
                    progress_made = True
                    
            elif challenge.type == ChallengeType.FOCUS_SPECIFIC:
                # Check if session has the target focus
                if challenge.target_focus and str(session.focus) == challenge.target_focus:
                    await self.update_challenge_progress(uc.id, 1)
                    progress_made = True
                    
            elif challenge.type == ChallengeType.SCORE_THRESHOLD and analysis_result:
                # Check if score meets threshold
                if challenge.target_metric:
                    score = getattr(analysis_result, challenge.target_metric, None)
                    if score and score >= 90:  # Assuming 90% threshold
                        await self.update_challenge_progress(uc.id, 1)
                        progress_made = True
                        
            elif challenge.type == ChallengeType.TIME_OF_DAY:
                # Check session time
                session_hour = session.start_time.hour
                if "Early" in challenge.name and session_hour < 9:
                    await self.update_challenge_progress(uc.id, 1)
                    progress_made = True
                elif "Night" in challenge.name and session_hour >= 20:
                    await self.update_challenge_progress(uc.id, 1)
                    progress_made = True
                    
            elif challenge.type == ChallengeType.WEEKLY_GOAL:
                # Track weekly sessions
                week_start = session.start_time.date() - timedelta(days=session.start_time.weekday())
                progress_data = uc.progress_data or {}
                week_key = week_start.isoformat()
                
                if week_key not in progress_data:
                    progress_data[week_key] = []
                
                if str(session.id) not in progress_data[week_key]:
                    progress_data[week_key].append(str(session.id))
                    await self.update_challenge_progress(
                        uc.id, 
                        1,
                        progress_data
                    )
                    progress_made = True
        
        # Check for streak challenges
        await self._update_streak_challenges(user_id)
    
    async def _update_streak_challenges(self, user_id: UUID):
        """Update streak-based challenges."""
        # Get user's practice sessions for the last 30 days
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        
        sessions_query = select(PracticeSession).where(
            and_(
                PracticeSession.student_id == user_id,
                PracticeSession.start_time >= thirty_days_ago
            )
        ).order_by(desc(PracticeSession.start_time))
        
        result = await self.db.execute(sessions_query)
        sessions = result.scalars().all()
        
        # Calculate current streak
        current_streak = 0
        today = date.today()
        check_date = today
        
        session_dates = {s.start_time.date() for s in sessions}
        
        while check_date in session_dates or check_date == today:
            if check_date in session_dates:
                current_streak += 1
            check_date -= timedelta(days=1)
            
            if check_date not in session_dates and check_date != today - timedelta(days=1):
                break
        
        # Update streak challenges
        streak_challenges_query = select(UserChallenge).options(
            selectinload(UserChallenge.challenge)
        ).where(
            and_(
                UserChallenge.user_id == user_id,
                UserChallenge.status == ChallengeStatus.IN_PROGRESS
            )
        ).join(Challenge).where(Challenge.type == ChallengeType.STREAK)
        
        result = await self.db.execute(streak_challenges_query)
        streak_challenges = result.scalars().all()
        
        for uc in streak_challenges:
            if current_streak >= uc.challenge.target_value:
                # Complete the streak challenge
                await self._complete_challenge(uc)
            else:
                # Update progress
                uc.current_value = current_streak
                uc.progress_data = {"last_practice_date": today.isoformat()}
    
    # Achievement management
    async def get_user_achievements(self, user_id: UUID) -> List[UserAchievement]:
        """Get all achievements earned by a user."""
        query = select(UserAchievement).options(
            selectinload(UserAchievement.achievement)
        ).where(
            UserAchievement.user_id == user_id
        ).order_by(desc(UserAchievement.earned_at))
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_all_achievements(self) -> List[Achievement]:
        """Get all available achievements."""
        query = select(Achievement).order_by(
            Achievement.tier,
            Achievement.name
        )
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def check_for_special_achievements(self, user: User):
        """Check for special achievements that aren't tied to challenges."""
        # First practice session
        session_count_result = await self.db.execute(
            select(func.count(PracticeSession.id)).where(
                PracticeSession.student_id == user.id
            )
        )
        session_count = session_count_result.scalar()
        
        if session_count == 1:
            # Award "First Steps" achievement
            first_steps = await self.db.execute(
                select(Achievement).where(Achievement.name == "First Steps")
            )
            achievement = first_steps.scalar_one_or_none()
            
            if achievement:
                # Check if already earned
                existing = await self.db.execute(
                    select(UserAchievement).where(
                        and_(
                            UserAchievement.user_id == user.id,
                            UserAchievement.achievement_id == achievement.id
                        )
                    )
                )
                
                if not existing.scalar_one_or_none():
                    user_achievement = UserAchievement(
                        user_id=user.id,
                        achievement_id=achievement.id
                    )
                    self.db.add(user_achievement)
                    achievement.total_earned += 1
                    
                    notification_data = NotificationCreate(
                        user_id=user.id,
                        type="achievement_unlocked",
                        title="Achievement Unlocked!",
                        message=f"You earned the '{achievement.name}' achievement!",
                        data={
                            "achievement_id": str(achievement.id),
                            "achievement_name": achievement.name,
                            "achievement_tier": achievement.tier
                        }
                    )
                    await self.notification_service.create_notification(notification_data)
                    
                    await self.db.commit()