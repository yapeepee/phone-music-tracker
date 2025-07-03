"""Reputation system schemas."""
from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class UserReputationResponse(BaseModel):
    """User reputation information."""
    user_id: UUID
    full_name: str
    reputation_points: int
    reputation_level: str
    
    class Config:
        from_attributes = True


class ReputationHistoryResponse(BaseModel):
    """Reputation history entry."""
    id: UUID
    reason: str
    points_change: int
    total_points: int
    description: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True