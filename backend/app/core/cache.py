"""Redis caching utilities."""
from typing import Optional, Any, Callable
from functools import wraps
import json
import pickle
import asyncio
from datetime import timedelta
import logging

import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger(__name__)

# Redis connection pool
redis_pool: Optional[redis.ConnectionPool] = None


async def get_redis_pool() -> redis.ConnectionPool:
    """Get or create Redis connection pool."""
    global redis_pool
    if redis_pool is None:
        redis_pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            decode_responses=False,  # We'll handle encoding/decoding
            max_connections=50
        )
    return redis_pool


async def get_redis_client() -> redis.Redis:
    """Get Redis client with connection from pool."""
    pool = await get_redis_pool()
    return redis.Redis(connection_pool=pool)


class CacheKeys:
    """Centralized cache key definitions."""
    
    # User cache keys
    USER_BY_ID = "user:id:{user_id}"
    USER_BY_EMAIL = "user:email:{email}"
    USER_REPUTATION = "user:reputation:{user_id}"
    
    # Forum cache keys
    FORUM_POST = "forum:post:{post_id}"
    FORUM_POST_LIST = "forum:posts:{status}:{sort}:{page}"
    FORUM_POST_COMMENTS = "forum:post:{post_id}:comments"
    FORUM_USER_VOTES = "forum:user:{user_id}:votes"
    
    # Session cache keys
    SESSION_BY_ID = "session:id:{session_id}"
    SESSION_STATS = "session:stats:{user_id}:{days}"
    
    # Challenge cache keys
    USER_CHALLENGES = "challenges:user:{user_id}"
    CHALLENGE_BY_ID = "challenge:id:{challenge_id}"
    
    # Leaderboard cache
    LEADERBOARD = "leaderboard:{period}:{page}"
    
    # Practice partner cache
    PARTNER_DISCOVERY = "partners:discover:{user_id}:{filters_hash}"
    
    @staticmethod
    def format(key_template: str, **kwargs) -> str:
        """Format a cache key with parameters."""
        return key_template.format(**kwargs)


async def cache_get(key: str, deserialize: bool = True) -> Optional[Any]:
    """Get value from cache."""
    try:
        client = await get_redis_client()
        value = await client.get(key)
        
        if value is None:
            return None
        
        if deserialize:
            try:
                # Try JSON first
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                # Fall back to pickle
                return pickle.loads(value)
        
        return value
    except Exception as e:
        logger.error(f"Cache get error for key {key}: {e}")
        return None


async def cache_set(
    key: str,
    value: Any,
    expire: Optional[int] = None,
    serialize: bool = True
) -> bool:
    """Set value in cache with optional expiration."""
    try:
        client = await get_redis_client()
        
        if serialize:
            try:
                # Try JSON for better interoperability
                serialized = json.dumps(value)
            except (TypeError, ValueError):
                # Fall back to pickle for complex objects
                serialized = pickle.dumps(value)
        else:
            serialized = value
        
        if expire:
            await client.setex(key, expire, serialized)
        else:
            await client.set(key, serialized)
        
        return True
    except Exception as e:
        logger.error(f"Cache set error for key {key}: {e}")
        return False


async def cache_delete(key: str) -> bool:
    """Delete value from cache."""
    try:
        client = await get_redis_client()
        await client.delete(key)
        return True
    except Exception as e:
        logger.error(f"Cache delete error for key {key}: {e}")
        return False


async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a pattern."""
    try:
        client = await get_redis_client()
        keys = []
        async for key in client.scan_iter(match=pattern):
            keys.append(key)
        
        if keys:
            await client.delete(*keys)
        
        return len(keys)
    except Exception as e:
        logger.error(f"Cache delete pattern error for {pattern}: {e}")
        return 0


def cached(
    key_func: Callable,
    expire: int = 300,  # 5 minutes default
    prefix: str = ""
) -> Callable:
    """
    Decorator for caching function results.
    
    Args:
        key_func: Function to generate cache key from arguments
        expire: Cache expiration in seconds
        prefix: Optional prefix for cache keys
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = key_func(*args, **kwargs)
            if prefix:
                cache_key = f"{prefix}:{cache_key}"
            
            # Try to get from cache
            cached_value = await cache_get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call the function
            result = await func(*args, **kwargs)
            
            # Cache the result
            await cache_set(cache_key, result, expire=expire)
            
            return result
        
        return wrapper
    return decorator


# Cache invalidation helpers
async def invalidate_user_cache(user_id: str):
    """Invalidate all cache entries for a user."""
    patterns = [
        CacheKeys.USER_BY_ID.format(user_id=user_id),
        CacheKeys.USER_REPUTATION.format(user_id=user_id),
        CacheKeys.SESSION_STATS.format(user_id=user_id, days="*"),
        CacheKeys.USER_CHALLENGES.format(user_id=user_id),
        f"forum:user:{user_id}:*",
        f"partners:discover:{user_id}:*"
    ]
    
    for pattern in patterns:
        await cache_delete_pattern(pattern)


async def invalidate_forum_cache(post_id: Optional[str] = None):
    """Invalidate forum-related cache entries."""
    if post_id:
        # Specific post
        await cache_delete(CacheKeys.FORUM_POST.format(post_id=post_id))
        await cache_delete(CacheKeys.FORUM_POST_COMMENTS.format(post_id=post_id))
    
    # Always invalidate post lists
    await cache_delete_pattern("forum:posts:*")


async def invalidate_leaderboard_cache():
    """Invalidate leaderboard cache."""
    await cache_delete_pattern("leaderboard:*")


# Utility functions for common caching patterns
async def get_or_set_cache(
    key: str,
    getter_func: Callable,
    expire: int = 300
) -> Any:
    """Get from cache or call function and cache result."""
    value = await cache_get(key)
    if value is not None:
        return value
    
    value = await getter_func()
    await cache_set(key, value, expire=expire)
    return value