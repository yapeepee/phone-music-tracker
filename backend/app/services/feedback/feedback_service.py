from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from app.models.practice import Feedback, PracticeSession, Video
from app.models.user import Teacher, Student
from app.schemas.practice import FeedbackCreate, Feedback as FeedbackSchema
from app.services.notification_service import NotificationService


class FeedbackService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_feedback(
        self,
        teacher_id: UUID,
        feedback_data: FeedbackCreate
    ) -> Feedback:
        """Create new feedback for a session or video"""
        # Validate that either session_id or video_id is provided, but not both
        if not feedback_data.session_id and not feedback_data.video_id:
            raise ValueError("Either session_id or video_id must be provided")
        
        if feedback_data.session_id and feedback_data.video_id:
            raise ValueError("Cannot provide both session_id and video_id")
        
        # Verify teacher has access to the student
        if feedback_data.session_id:
            # Get the session and verify teacher access
            session_query = select(PracticeSession).where(
                PracticeSession.id == feedback_data.session_id
            ).options(selectinload(PracticeSession.student))
            
            result = await self.db.execute(session_query)
            session = result.scalar_one_or_none()
            
            if not session:
                raise ValueError("Session not found")
            
            # Check if the teacher has access to this student
            student = session.student
            if student.primary_teacher_id != teacher_id:
                raise ValueError("You don't have access to this student")
        
        if feedback_data.video_id:
            # Get the video and verify teacher access through the session
            video_query = select(Video).where(
                Video.id == feedback_data.video_id
            ).options(
                selectinload(Video.session).selectinload(PracticeSession.student)
            )
            
            result = await self.db.execute(video_query)
            video = result.scalar_one_or_none()
            
            if not video:
                raise ValueError("Video not found")
            
            # Check if the teacher has access to this student
            student = video.session.student
            if student.primary_teacher_id != teacher_id:
                raise ValueError("You don't have access to this student")
        
        # Create the feedback
        db_feedback = Feedback(
            teacher_id=teacher_id,
            session_id=feedback_data.session_id,
            video_id=feedback_data.video_id,
            text=feedback_data.text,
            rating=feedback_data.rating,
            timestamp_seconds=feedback_data.timestamp_seconds
        )
        
        self.db.add(db_feedback)
        await self.db.commit()
        await self.db.refresh(db_feedback)
        
        # Create notification for the student
        try:
            # Get teacher info
            teacher_query = select(Teacher).where(
                Teacher.id == teacher_id
            ).options(selectinload(Teacher.user))
            teacher_result = await self.db.execute(teacher_query)
            teacher = teacher_result.scalar_one()
            teacher_name = teacher.user.full_name
            
            # Get session info and student ID
            if feedback_data.session_id:
                session_query = select(PracticeSession).where(
                    PracticeSession.id == feedback_data.session_id
                )
                session_result = await self.db.execute(session_query)
                session = session_result.scalar_one()
                student_id = session.student_id
                session_date = session.start_time
                session_id = session.id
            else:
                # For video feedback, get session through video
                student_id = video.session.student_id
                session_date = video.session.start_time
                session_id = video.session.id
            
            # Create notification
            notification_service = NotificationService(self.db)
            await notification_service.create_feedback_notification(
                student_id=student_id,
                teacher_name=teacher_name,
                session_id=session_id,
                feedback_id=db_feedback.id,
                session_date=session_date
            )
        except Exception as e:
            # Don't fail the feedback creation if notification fails
            print(f"Failed to create notification: {e}")
        
        return db_feedback
    
    async def get_session_feedback(
        self,
        session_id: UUID,
        teacher_id: Optional[UUID] = None
    ) -> List[Feedback]:
        """Get all feedback for a specific session"""
        query = select(Feedback).where(
            Feedback.session_id == session_id
        ).options(
            selectinload(Feedback.teacher).selectinload(Teacher.user)
        )
        
        if teacher_id:
            query = query.where(Feedback.teacher_id == teacher_id)
        
        query = query.order_by(Feedback.created_at.desc())
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_video_feedback(
        self,
        video_id: UUID,
        teacher_id: Optional[UUID] = None
    ) -> List[Feedback]:
        """Get all feedback for a specific video"""
        query = select(Feedback).where(
            Feedback.video_id == video_id
        ).options(
            selectinload(Feedback.teacher).selectinload(Teacher.user)
        )
        
        if teacher_id:
            query = query.where(Feedback.teacher_id == teacher_id)
        
        # Order by timestamp_seconds for video feedback
        query = query.order_by(
            Feedback.timestamp_seconds.asc().nullsfirst(),
            Feedback.created_at.desc()
        )
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_feedback_by_id(
        self,
        feedback_id: UUID,
        teacher_id: Optional[UUID] = None
    ) -> Optional[Feedback]:
        """Get a specific feedback item"""
        query = select(Feedback).where(
            Feedback.id == feedback_id
        ).options(
            selectinload(Feedback.teacher).selectinload(Teacher.user),
            selectinload(Feedback.session),
            selectinload(Feedback.video)
        )
        
        if teacher_id:
            query = query.where(Feedback.teacher_id == teacher_id)
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def update_feedback(
        self,
        feedback_id: UUID,
        teacher_id: UUID,
        text: Optional[str] = None,
        rating: Optional[int] = None
    ) -> Optional[Feedback]:
        """Update feedback (only by the teacher who created it)"""
        feedback = await self.get_feedback_by_id(feedback_id, teacher_id)
        
        if not feedback:
            return None
        
        if text is not None:
            feedback.text = text
        
        if rating is not None:
            feedback.rating = rating
        
        self.db.add(feedback)
        await self.db.commit()
        await self.db.refresh(feedback)
        
        return feedback
    
    async def delete_feedback(
        self,
        feedback_id: UUID,
        teacher_id: UUID
    ) -> bool:
        """Delete feedback (only by the teacher who created it)"""
        feedback = await self.get_feedback_by_id(feedback_id, teacher_id)
        
        if not feedback:
            return False
        
        await self.db.delete(feedback)
        await self.db.commit()
        
        return True
    
    async def get_student_all_feedback(
        self,
        student_id: UUID,
        teacher_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Feedback]:
        """Get all feedback given by a teacher to a specific student"""
        # Get all sessions for the student
        sessions_query = select(PracticeSession.id).where(
            PracticeSession.student_id == student_id
        )
        
        sessions_result = await self.db.execute(sessions_query)
        session_ids = [s for s in sessions_result.scalars().all()]
        
        if not session_ids:
            return []
        
        # Get all feedback for these sessions
        feedback_query = select(Feedback).where(
            and_(
                Feedback.teacher_id == teacher_id,
                Feedback.session_id.in_(session_ids)
            )
        ).options(
            selectinload(Feedback.session),
            selectinload(Feedback.video)
        )
        
        feedback_query = feedback_query.order_by(Feedback.created_at.desc())
        feedback_query = feedback_query.offset(skip).limit(limit)
        
        result = await self.db.execute(feedback_query)
        return result.scalars().all()