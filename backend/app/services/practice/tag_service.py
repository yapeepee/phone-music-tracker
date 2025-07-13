from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload

from app.models.practice import Tag, PracticeSession
from app.models.user import Teacher
from app.schemas.practice import TagCreate, TagUpdate, Tag as TagSchema


class TagService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_tags(
        self,
        teacher_id: Optional[UUID] = None,
        tag_type: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Tag]:
        """Get tags accessible to a teacher or all global tags"""
        query = select(Tag)
        
        if teacher_id:
            # Get tags that are either global or owned by this teacher
            query = query.where(
                or_(
                    Tag.owner_teacher_id == None,
                    Tag.owner_teacher_id == teacher_id
                )
            )
        else:
            # Only get global tags
            query = query.where(Tag.owner_teacher_id == None)
        
        # Filter by tag type if specified
        if tag_type:
            query = query.where(Tag.tag_type == tag_type)
        
        query = query.offset(skip).limit(limit).order_by(Tag.name)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_tag(
        self,
        tag_id: UUID,
        teacher_id: Optional[UUID] = None
    ) -> Optional[Tag]:
        """Get a specific tag by ID"""
        query = select(Tag).where(Tag.id == tag_id)
        
        if teacher_id:
            # Check if teacher has access to this tag
            query = query.where(
                or_(
                    Tag.owner_teacher_id == None,
                    Tag.owner_teacher_id == teacher_id
                )
            )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def create_tag(
        self,
        tag_data: TagCreate,
        teacher_id: Optional[UUID] = None
    ) -> Tag:
        """Create a new tag"""
        # Check if tag with same name already exists for this teacher
        # For pieces (tag_type='piece'), only check within pieces
        # For other tags, check within the same tag_type
        tag_type = getattr(tag_data, 'tag_type', 'general')
        
        existing_query = select(Tag).where(
            and_(
                Tag.name == tag_data.name,
                Tag.tag_type == tag_type,  # Only check within same tag type
                or_(
                    Tag.owner_teacher_id == teacher_id,
                    Tag.owner_teacher_id == None
                )
            )
        )
        
        result = await self.db.execute(existing_query)
        existing_tag = result.scalar_one_or_none()
        
        if existing_tag:
            if tag_type == 'piece':
                raise ValueError(f"A piece with name '{tag_data.name}' already exists")
            else:
                raise ValueError(f"Tag with name '{tag_data.name}' already exists")
        
        # Create the new tag
        tag = Tag(
            name=tag_data.name,
            color=tag_data.color,
            owner_teacher_id=teacher_id,
            tag_type=tag_type,
            composer=getattr(tag_data, 'composer', None),
            opus_number=getattr(tag_data, 'opus_number', None),
            difficulty_level=getattr(tag_data, 'difficulty_level', None),
            estimated_mastery_sessions=getattr(tag_data, 'estimated_mastery_sessions', None)
        )
        
        self.db.add(tag)
        await self.db.commit()
        await self.db.refresh(tag)
        
        return tag
    
    async def update_tag(
        self,
        tag_id: UUID,
        tag_data: TagUpdate,
        teacher_id: UUID
    ) -> Optional[Tag]:
        """Update a tag (only by owner)"""
        # Get the tag
        tag = await self.get_tag(tag_id)
        
        if not tag:
            return None
        
        # Check ownership
        if tag.owner_teacher_id != teacher_id:
            raise ValueError("You don't have permission to update this tag")
        
        # Check if new name conflicts with existing tags
        if tag_data.name and tag_data.name != tag.name:
            existing_query = select(Tag).where(
                and_(
                    Tag.name == tag_data.name,
                    Tag.tag_type == tag.tag_type,  # Only check within same tag type
                    Tag.id != tag_id,
                    or_(
                        Tag.owner_teacher_id == teacher_id,
                        Tag.owner_teacher_id == None
                    )
                )
            )
            
            result = await self.db.execute(existing_query)
            existing_tag = result.scalar_one_or_none()
            
            if existing_tag:
                if tag.tag_type == 'piece':
                    raise ValueError(f"A piece with name '{tag_data.name}' already exists")
                else:
                    raise ValueError(f"Tag with name '{tag_data.name}' already exists")
        
        # Update fields
        if tag_data.name is not None:
            tag.name = tag_data.name
        if tag_data.color is not None:
            tag.color = tag_data.color
        
        await self.db.commit()
        await self.db.refresh(tag)
        
        return tag
    
    async def delete_tag(
        self,
        tag_id: UUID,
        teacher_id: UUID
    ) -> bool:
        """Delete a tag (only by owner)"""
        # Get the tag
        tag = await self.get_tag(tag_id)
        
        if not tag:
            return False
        
        # Check ownership
        if tag.owner_teacher_id != teacher_id:
            raise ValueError("You don't have permission to delete this tag")
        
        # Check if tag is in use
        session_count_query = select(func.count()).select_from(PracticeSession).join(
            PracticeSession.tags
        ).where(Tag.id == tag_id)
        
        result = await self.db.execute(session_count_query)
        session_count = result.scalar()
        
        if session_count > 0:
            raise ValueError(f"Cannot delete tag: it's used in {session_count} sessions")
        
        await self.db.delete(tag)
        await self.db.commit()
        
        return True
    
    async def get_tag_usage_count(
        self,
        tag_id: UUID,
        teacher_id: Optional[UUID] = None
    ) -> int:
        """Get the number of sessions using this tag"""
        query = select(func.count()).select_from(PracticeSession).join(
            PracticeSession.tags
        ).where(Tag.id == tag_id)
        
        if teacher_id:
            # Only count sessions from students of this teacher
            query = query.join(PracticeSession.student).where(
                PracticeSession.student.has(primary_teacher_id=teacher_id)
            )
        
        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def get_popular_tags(
        self,
        teacher_id: Optional[UUID] = None,
        limit: int = 10
    ) -> List[tuple[Tag, int]]:
        """Get most popular tags with usage count"""
        # Build the query to count tag usage
        query = select(
            Tag,
            func.count(PracticeSession.id).label('usage_count')
        ).select_from(Tag).join(
            Tag.sessions
        ).group_by(Tag.id)
        
        if teacher_id:
            # Filter to teacher's tags and their students' sessions
            query = query.join(PracticeSession.student).where(
                and_(
                    or_(
                        Tag.owner_teacher_id == None,
                        Tag.owner_teacher_id == teacher_id
                    ),
                    PracticeSession.student.has(primary_teacher_id=teacher_id)
                )
            )
        else:
            # Only global tags
            query = query.where(Tag.owner_teacher_id == None)
        
        query = query.order_by(func.count(PracticeSession.id).desc()).limit(limit)
        
        result = await self.db.execute(query)
        return [(row[0], row[1]) for row in result.all()]