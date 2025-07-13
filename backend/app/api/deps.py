"""API dependencies."""
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
from collections import defaultdict
import time

from app.core import security
from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import TokenData
from app.services.auth.user_service import UserService

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

# Rate limiting storage
rate_limit_storage = defaultdict(list)


# get_db is imported from app.db.session


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenData(user_id=payload.get("sub"))
    except (JWTError, ValidationError):
        raise credentials_exception
    
    user_service = UserService(db)
    user = await user_service.get_by_id(token_data.user_id)
    
    if not user:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


async def get_current_user_optional(
    db: AsyncSession = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[User]:
    """Get current user if authenticated, None otherwise."""
    if not token:
        return None
    
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenData(user_id=payload.get("sub"))
    except (JWTError, ValidationError):
        return None
    
    user_service = UserService(db)
    user = await user_service.get_by_id(token_data.user_id)
    
    return user if user and user.is_active else None


async def get_current_student(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Ensure current user is a student."""
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_current_teacher(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Ensure current user is a teacher."""
    if current_user.role != "teacher":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


# Rate limiting dependencies
class RateLimitChecker:
    """Rate limit checker dependency."""
    
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    def __call__(self, request: Request, current_user: User = Depends(get_current_user)):
        # Use user ID for authenticated endpoints
        key = f"{current_user.id}:{request.url.path}"
        now = time.time()
        
        # Clean old entries
        rate_limit_storage[key] = [
            timestamp for timestamp in rate_limit_storage[key]
            if timestamp > now - self.window_seconds
        ]
        
        # Check rate limit
        if len(rate_limit_storage[key]) >= self.max_requests:
            retry_after = self.window_seconds - (now - rate_limit_storage[key][0])
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Try again in {int(retry_after)} seconds.",
                headers={"Retry-After": str(int(retry_after))}
            )
        
        # Record request
        rate_limit_storage[key].append(now)
        return True


# Pre-configured rate limiters for common use cases
rate_limit_auth = RateLimitChecker(max_requests=5, window_seconds=60)  # 5 per minute
rate_limit_post_create = RateLimitChecker(max_requests=5, window_seconds=60)  # 5 per minute
rate_limit_comment_create = RateLimitChecker(max_requests=10, window_seconds=60)  # 10 per minute
rate_limit_vote = RateLimitChecker(max_requests=30, window_seconds=60)  # 30 per minute
rate_limit_video_upload = RateLimitChecker(max_requests=5, window_seconds=3600)  # 5 per hour
rate_limit_partner_discover = RateLimitChecker(max_requests=10, window_seconds=60)  # 10 per minute