import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

from database import get_db
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from models import User, UserAccessProfile
from schemas import TokenData

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
PASSWORD_RESET_TOKEN_EXPIRE_HOURS = int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_HOURS"))


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(email: str, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = {"sub": email}

    if expires_delta:
        expire = datetime.now() + expires_delta
    else:
        expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def verify_token(token: str) -> Optional[str]:
    """Verify a JWT token and return the email."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")

        if email is None:
            return None

        return email
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Get the current authenticated user from the JWT token."""
    token = credentials.credentials

    email = verify_token(token)

    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    return user


def get_or_create_access_profile(
    db: Session,
    user: User,
    default_role: str = "FOUNDER",
) -> UserAccessProfile:
    profile = db.query(UserAccessProfile).filter(UserAccessProfile.user_id == user.id).first()
    if profile:
        return profile

    profile = UserAccessProfile(
        user_id=user.id,
        role=(default_role or "FOUNDER").upper(),
        title="",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def get_current_token_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TokenData:
    profile = get_or_create_access_profile(db, current_user)
    return TokenData(email=current_user.email, role=profile.role)


def require_roles(*roles: str):
    allowed_roles = {role.upper() for role in roles}

    def dependency(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        profile = get_or_create_access_profile(db, current_user)
        if profile.role.upper() not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this resource.",
            )
        return current_user

    return dependency


def generate_password_reset_token() -> str:
    """Generate a secure password reset token."""
    return secrets.token_urlsafe(32)


def create_password_reset_token(email: str, db: Session) -> str:
    """Create a password reset token for a user."""
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    reset_token = generate_password_reset_token()
    expires = datetime.now() + timedelta(hours=PASSWORD_RESET_TOKEN_EXPIRE_HOURS)

    user.password_reset_token = reset_token
    user.password_reset_expires = expires

    db.add(user)
    db.commit()

    return reset_token


def verify_password_reset_token(token: str, db: Session) -> Optional[User]:
    """Verify a password reset token and return the user if valid."""
    user = db.query(User).filter(User.password_reset_token == token).first()

    if not user:
        return None

    if user.password_reset_expires < datetime.now():
        # Token expired, clear it
        user.password_reset_token = None
        user.password_reset_expires = None
        db.add(user)
        db.commit()
        return None

    return user


def reset_password_with_token(token: str, new_password: str, db: Session) -> bool:
    """Reset password using a valid reset token."""
    user = verify_password_reset_token(token, db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired reset token.",
        )

    hashed_password = hash_password(new_password)
    user.hashed_password = hashed_password
    user.password_reset_token = None
    user.password_reset_expires = None

    db.add(user)
    db.commit()

    return True
