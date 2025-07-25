from app.schemas.auth import *
from app.schemas.user import *
from app.schemas.practice import *

__all__ = [
    # Auth schemas
    "Token",
    "TokenData",
    "LoginRequest",
    "RegisterRequest",
    "AuthResponse",
    "RefreshTokenRequest",
    "PasswordResetRequest",
    "PasswordResetConfirm",
    # User schemas
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "User",
    "UserInDB",
    "TeacherBase",
    "TeacherCreate",
    "TeacherUpdate",
    "Teacher",
    "TeacherWithUser",
    "StudentBase",
    "StudentCreate",
    "StudentUpdate",
    "Student",
    "StudentWithUser",
    # Practice schemas
    "TagBase",
    "TagCreate",
    "TagUpdate",
    "Tag",
    "PracticeSessionBase",
    "PracticeSessionCreate",
    "PracticeSessionUpdate",
    "PracticeSession",
    "PracticeSessionWithDetails",
    "VideoBase",
    "VideoCreate",
    "Video",
    "MetricBase",
    "MetricCreate",
    "Metric",
    "FeedbackBase",
    "FeedbackCreate",
    "Feedback",
    "PracticeStatistics",
]