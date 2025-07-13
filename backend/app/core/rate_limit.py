"""Rate limiting configuration for API endpoints."""
from typing import Dict, Optional, Callable
from datetime import datetime, timedelta
from fastapi import Request, HTTPException
from collections import defaultdict
import time
import logging

logger = logging.getLogger(__name__)

# In-memory storage for rate limiting (replace with Redis in production)
request_history: Dict[str, list] = defaultdict(list)


class RateLimiter:
    """Simple rate limiter implementation."""
    
    def __init__(self, calls: int, period: timedelta):
        self.calls = calls
        self.period = period
    
    def __call__(self, request: Request) -> bool:
        """Check if request should be allowed."""
        # Get client identifier (IP address)
        client_id = request.client.host if request.client else "unknown"
        endpoint = request.url.path
        key = f"{client_id}:{endpoint}"
        
        now = time.time()
        
        # Clean old entries
        request_history[key] = [
            timestamp for timestamp in request_history[key]
            if timestamp > now - self.period.total_seconds()
        ]
        
        # Check rate limit
        if len(request_history[key]) >= self.calls:
            return False
        
        # Add current request
        request_history[key].append(now)
        return True


# Rate limiters for different endpoint types
rate_limiters = {
    # Authentication endpoints
    "auth_login": RateLimiter(5, timedelta(minutes=1)),
    "auth_register": RateLimiter(3, timedelta(hours=1)),
    
    # Forum endpoints
    "forum_create_post": RateLimiter(5, timedelta(minutes=1)),
    "forum_create_comment": RateLimiter(10, timedelta(minutes=1)),
    "forum_vote": RateLimiter(30, timedelta(minutes=1)),
    
    # Session endpoints
    "session_create": RateLimiter(20, timedelta(minutes=1)),
    "session_update": RateLimiter(30, timedelta(minutes=1)),
    
    # Video upload
    "video_upload": RateLimiter(5, timedelta(hours=1)),
    
    # Practice partner
    "partner_discover": RateLimiter(10, timedelta(minutes=1)),
    "partner_request": RateLimiter(5, timedelta(minutes=1)),
    
    # Default limits
    "default_read": RateLimiter(100, timedelta(minutes=1)),
    "default_write": RateLimiter(30, timedelta(minutes=1)),
}


def get_rate_limiter(limit_type: str) -> RateLimiter:
    """Get rate limiter for a specific endpoint type."""
    return rate_limiters.get(limit_type, rate_limiters["default_read"])


def rate_limit(limit_type: str) -> Callable:
    """Decorator to apply rate limiting to endpoints."""
    limiter = get_rate_limiter(limit_type)
    
    def decorator(func: Callable) -> Callable:
        async def wrapper(request: Request, *args, **kwargs):
            if not limiter(request):
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded. Please try again later.",
                    headers={"Retry-After": str(limiter.period.total_seconds())}
                )
            return await func(request, *args, **kwargs)
        
        # Preserve function metadata
        wrapper.__name__ = func.__name__
        wrapper.__doc__ = func.__doc__
        return wrapper
    
    return decorator


def setup_rate_limiting(app):
    """Setup rate limiting for the FastAPI application."""
    # This is a placeholder for now since we're using decorators
    logger.info("Rate limiting configured successfully")
    
    # Periodic cleanup of old entries (every 5 minutes)
    import asyncio
    
    async def cleanup_task():
        while True:
            await asyncio.sleep(300)  # 5 minutes
            now = time.time()
            for key in list(request_history.keys()):
                # Remove entries older than 1 hour
                request_history[key] = [
                    ts for ts in request_history[key]
                    if ts > now - 3600
                ]
                # Remove empty keys
                if not request_history[key]:
                    del request_history[key]
    
    # Start cleanup task in background
    asyncio.create_task(cleanup_task())