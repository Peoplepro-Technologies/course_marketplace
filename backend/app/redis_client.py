"""
redis_client.py — Redis connection and caching helpers.

Provides simple get/set/invalidate wrappers around a Redis connection.
Used primarily to cache the public course catalog (5-minute TTL).
"""

import json
import logging
import redis
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

redis_client = None

if settings.REDIS_ENABLED:
    try:
        # decode_responses=True means we get Python strings instead of bytes.
        redis_client = redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
        )
    except Exception as e:
        logger.warning(f"Failed to connect to Redis during startup: {e}. Caching will be disabled.")
else:
    logger.warning("REDIS_ENABLED is false. Caching is disabled.")


def get_cache(key: str):
    """
    Retrieve a cached JSON value by key.
    Returns the parsed Python object, or None if the key doesn't exist.
    """
    if not settings.REDIS_ENABLED or not redis_client:
        return None
        
    try:
        data = redis_client.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.warning(f"Redis get_cache failed for key {key}: {e}")
    return None


def set_cache(key: str, value, ttl: int = 300):
    """
    Store a JSON-serializable value in Redis with a TTL (default 5 minutes).
    
    Args:
        key: Cache key string.
        value: Any JSON-serializable Python object.
        ttl: Time-to-live in seconds (default 300 = 5 minutes).
    """
    if not settings.REDIS_ENABLED or not redis_client:
        return
        
    try:
        redis_client.setex(key, ttl, json.dumps(value))
    except Exception as e:
        logger.warning(f"Redis set_cache failed for key {key}: {e}")


def invalidate_cache(pattern: str = "courses:*"):
    """
    Delete all keys matching the given glob pattern.
    Used to bust the catalog cache when courses are published/updated.

    Args:
        pattern: Redis key glob pattern (default "courses:*").
    """
    if not settings.REDIS_ENABLED or not redis_client:
        return
        
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
    except Exception as e:
        logger.warning(f"Redis invalidate_cache failed for pattern {pattern}: {e}")
