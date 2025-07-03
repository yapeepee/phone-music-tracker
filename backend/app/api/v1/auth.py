from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core import security
from app.core.config import settings
from app.services.auth.user_service import UserService
from app.schemas.auth import (
    Token,
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    RefreshTokenRequest,
)
from app.schemas.user import User, UserCreate
from app.api.deps import get_current_active_user
from app.models.user import UserRole
from app.services.practice.challenge_service import ChallengeService


router = APIRouter()


@router.post("/register", response_model=AuthResponse)
async def register(
    register_data: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> AuthResponse:
    """Register a new user"""
    user_service = UserService(db)
    
    # Validate role
    try:
        role = UserRole(register_data.role)
        if role == UserRole.ADMIN:
            raise ValueError("Cannot register as admin")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'student' or 'teacher'"
        )
    
    # Create user
    user_create = UserCreate(
        email=register_data.email,
        password=register_data.password,
        full_name=register_data.full_name,
        role=role,
    )
    
    try:
        user = await user_service.create(user_create)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    # Activate all challenges for the new user
    if role == UserRole.STUDENT:
        challenge_service = ChallengeService(db)
        await challenge_service.ensure_user_challenges_active(user.id)
    
    # Generate tokens
    access_token = security.create_access_token(user.id)
    refresh_token = security.create_refresh_token(user.id)
    
    return AuthResponse(
        user=User.model_validate(user),
        tokens=Token(
            access_token=access_token,
            refresh_token=refresh_token,
        )
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    login_data: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> AuthResponse:
    """Login with email and password"""
    user_service = UserService(db)
    
    user = await user_service.authenticate(
        email=login_data.email,
        password=login_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Ensure all challenges are active for the user
    if user.role == UserRole.STUDENT:
        challenge_service = ChallengeService(db)
        await challenge_service.ensure_user_challenges_active(user.id)
    
    # Generate tokens
    access_token = security.create_access_token(user.id)
    refresh_token = security.create_refresh_token(user.id)
    
    return AuthResponse(
        user=User.model_validate(user),
        tokens=Token(
            access_token=access_token,
            refresh_token=refresh_token,
        )
    )


@router.post("/login/oauth", response_model=Token)
async def login_oauth_form(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Token:
    """OAuth2 compatible token login for Swagger UI"""
    user_service = UserService(db)
    
    user = await user_service.authenticate(
        email=form_data.username,  # OAuth2 expects username field
        password=form_data.password
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = security.create_access_token(user.id)
    refresh_token = security.create_refresh_token(user.id)
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Token:
    """Get new access token using refresh token"""
    token_data = security.decode_token(refresh_data.refresh_token)
    
    if not token_data or not token_data.user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    user_service = UserService(db)
    user = await user_service.get_by_id(token_data.user_id)
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    
    # Generate new tokens
    access_token = security.create_access_token(user.id)
    new_refresh_token = security.create_refresh_token(user.id)
    
    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )


@router.get("/me", response_model=User)
async def get_current_user(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    """Get current user info"""
    return User.model_validate(current_user)


@router.put("/push-token")
async def update_push_token(
    push_data: dict,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> dict:
    """Update user's push notification token"""
    push_token = push_data.get("push_token")
    platform = push_data.get("platform")
    
    if not push_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Push token is required"
        )
    
    # Update user's push token
    current_user.push_token = push_token
    current_user.push_platform = platform
    
    db.add(current_user)
    await db.commit()
    
    return {"detail": "Push token updated successfully"}