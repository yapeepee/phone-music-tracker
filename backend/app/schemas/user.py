from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict, Field
from uuid import UUID

from app.models.user import UserRole, StudentLevel


# Base schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    timezone: str = "UTC"


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    timezone: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)


class UserInDBBase(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime


class User(UserInDBBase):
    reputation_points: int = 0
    reputation_level: str = "newcomer"


class UserInDB(UserInDBBase):
    hashed_password: str


# Teacher schemas
class TeacherBase(BaseModel):
    bio: Optional[str] = None
    specialties: List[str] = []
    years_experience: Optional[int] = None


class TeacherCreate(TeacherBase):
    pass


class TeacherUpdate(TeacherBase):
    pass


class Teacher(TeacherBase):
    model_config = ConfigDict(from_attributes=True)
    
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class TeacherWithUser(Teacher):
    user: User


# Student schemas
class StudentBase(BaseModel):
    primary_teacher_id: Optional[UUID] = None
    level: StudentLevel = StudentLevel.BEGINNER
    instrument: Optional[str] = None
    practice_goal_minutes: int = 30


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    primary_teacher_id: Optional[UUID] = None
    level: Optional[StudentLevel] = None
    instrument: Optional[str] = None
    practice_goal_minutes: Optional[int] = None


class Student(StudentBase):
    model_config = ConfigDict(from_attributes=True)
    
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class StudentWithUser(Student):
    user: User


# Teacher-specific schemas for student management
class StudentActivity(BaseModel):
    """Student with activity summary for teacher views"""
    model_config = ConfigDict(from_attributes=True)
    
    # Student info
    user_id: UUID
    full_name: str
    email: str
    instrument: Optional[str]
    level: StudentLevel
    practice_goal_minutes: int
    
    # Activity summary
    last_session_date: Optional[datetime] = None
    total_sessions_week: int = 0
    total_minutes_week: int = 0
    average_rating_week: Optional[float] = None
    streak_days: int = 0
    is_active: bool = True  # Has practiced in last 7 days


class StudentProfile(BaseModel):
    """Detailed student profile for teachers"""
    model_config = ConfigDict(from_attributes=True)
    
    # Student info
    student: StudentWithUser
    
    # Statistics
    total_sessions: int = 0
    total_practice_minutes: int = 0
    average_session_minutes: Optional[float] = None
    average_self_rating: Optional[float] = None
    
    # Recent activity
    sessions_last_7_days: int = 0
    minutes_last_7_days: int = 0
    sessions_last_30_days: int = 0
    minutes_last_30_days: int = 0
    
    # Progress
    improvement_trend: Optional[float] = None  # -1 to 1
    consistency_score: Optional[float] = None  # 0 to 100