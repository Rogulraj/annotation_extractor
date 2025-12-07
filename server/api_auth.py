"""JWT Authentication utilities for the API"""

from datetime import datetime, timedelta
from typing import Optional
import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from ninja.security import HttpBearer
from passlib.hash import bcrypt

User = get_user_model()


class AuthBearer(HttpBearer):
    """JWT Bearer token authentication"""
    
    def authenticate(self, request, token: str) -> Optional[User]:
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            user_id = payload.get("user_id")
            if user_id:
                user = User.objects.filter(id=user_id).first()
                if user and user.is_active:
                    request.user = user
                    return user
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None
        return None


def create_access_token(user: User) -> str:
    """Create JWT access token for user"""
    payload = {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "exp": datetime.utcnow() + settings.JWT_ACCESS_TOKEN_EXPIRES,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user: User) -> str:
    """Create JWT refresh token for user"""
    payload = {
        "user_id": user.id,
        "exp": datetime.utcnow() + settings.JWT_REFRESH_TOKEN_EXPIRES,
        "iat": datetime.utcnow(),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    return bcrypt.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hash(password)
