from typing import Optional, List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.models.user import User, Teacher, Student
from app.schemas.user import UserCreate, UserUpdate, TeacherCreate, StudentCreate
from app.core.security import get_password_hash, verify_password


class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        query = select(User).where(User.id == user_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_email(self, email: str) -> Optional[User]:
        query = select(User).where(User.email == email)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def create(self, user_create: UserCreate) -> User:
        # Check if user already exists
        existing_user = await self.get_by_email(user_create.email)
        if existing_user:
            raise ValueError("User with this email already exists")
        
        # Create user
        db_user = User(
            email=user_create.email,
            hashed_password=get_password_hash(user_create.password),
            full_name=user_create.full_name,
            role=user_create.role,
            timezone=user_create.timezone,
        )
        
        self.db.add(db_user)
        await self.db.flush()
        
        # Create role-specific profile
        if user_create.role == "teacher":
            teacher = Teacher(user_id=db_user.id)
            self.db.add(teacher)
        elif user_create.role == "student":
            student = Student(user_id=db_user.id)
            self.db.add(student)
        
        await self.db.commit()
        await self.db.refresh(db_user)
        
        return db_user
    
    async def update(self, user_id: UUID, user_update: UserUpdate) -> Optional[User]:
        user = await self.get_by_id(user_id)
        if not user:
            return None
        
        update_data = user_update.model_dump(exclude_unset=True)
        
        # Hash password if updating
        if "password" in update_data:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
    
    async def authenticate(self, email: str, password: str) -> Optional[User]:
        user = await self.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user
    
    async def get_teacher_profile(self, user_id: UUID) -> Optional[Teacher]:
        query = select(Teacher).where(Teacher.user_id == user_id).options(
            selectinload(Teacher.user)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_student_profile(self, user_id: UUID) -> Optional[Student]:
        query = select(Student).where(Student.user_id == user_id).options(
            selectinload(Student.user),
            selectinload(Student.teacher)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def update_teacher_profile(
        self, 
        user_id: UUID, 
        teacher_update: TeacherCreate
    ) -> Optional[Teacher]:
        teacher = await self.get_teacher_profile(user_id)
        if not teacher:
            return None
        
        update_data = teacher_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(teacher, field, value)
        
        self.db.add(teacher)
        await self.db.commit()
        await self.db.refresh(teacher)
        
        return teacher
    
    async def update_student_profile(
        self, 
        user_id: UUID, 
        student_update: StudentCreate
    ) -> Optional[Student]:
        student = await self.get_student_profile(user_id)
        if not student:
            return None
        
        update_data = student_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(student, field, value)
        
        self.db.add(student)
        await self.db.commit()
        await self.db.refresh(student)
        
        return student
    
    async def get_teacher_students(
        self,
        teacher_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Student]:
        """Get all students assigned to a teacher"""
        query = select(Student).where(
            Student.primary_teacher_id == teacher_id
        ).options(
            selectinload(Student.user),
            selectinload(Student.practice_sessions)
        )
        
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_teacher_student_count(self, teacher_id: UUID) -> int:
        """Get the number of students assigned to a teacher"""
        query = select(Student).where(Student.primary_teacher_id == teacher_id)
        result = await self.db.execute(query)
        return len(result.scalars().all())