import asyncio
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    create_password_reset_token,
    get_current_user,
    get_or_create_access_profile,
    hash_password,
    require_roles,
    reset_password_with_token,
    verify_password,
)
from database import get_db
from email_utils import send_password_reset_email
from models import User, UserAccessProfile
from rag.ingestion import ingest_document
from rag.model import generate_answer
from rag.retrieval import build_context, retrieve_context
from schemas import (
    ChangePassword,
    PasswordResetRequest,
    PasswordResetResponse,
    PasswordResetVerify,
    PrivateAdminCreate,
    Token,
    UserCreate,
    UserProfileUpdate,
    UserResponse,
    UserSignIn,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _serialize_user(user: User, profile: UserAccessProfile | None) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        company_name=user.company_name,
        role=(profile.role if profile else "FOUNDER"),
        title=(profile.title if profile else ""),
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _create_user_with_profile(
    db: Session,
    *,
    email: str,
    full_name: str,
    password: str,
    company_name: Optional[str],
    role: str,
) -> tuple[User, UserAccessProfile]:
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    try:
        db_user = User(
            email=email,
            full_name=full_name,
            hashed_password=hash_password(password),
            company_name=company_name,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        profile = UserAccessProfile(
            user_id=db_user.id,
            role=role.upper(),
            title="Founder" if role.upper() == "FOUNDER" else "Operator",
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
        return db_user, profile
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user account.",
        )


@router.post("/sign-up", response_model=Token, status_code=status.HTTP_201_CREATED)
def sign_up(user_data: UserCreate, db: Session = Depends(get_db)):
    user, profile = _create_user_with_profile(
        db,
        email=user_data.email,
        full_name=user_data.full_name,
        password=user_data.password,
        company_name=user_data.company_name,
        role=user_data.role,
    )
    return {
        "access_token": create_access_token(email=user.email),
        "token_type": "bearer",
        "user": _serialize_user(user, profile),
    }


@router.post("/private-admin/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_private_admin(payload: PrivateAdminCreate, db: Session = Depends(get_db)):
    expected_secret = os.getenv("ADMIN_SETUP_SECRET", "").strip()
    if not expected_secret or payload.admin_setup_secret != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin setup secret is invalid.",
        )

    user, profile = _create_user_with_profile(
        db,
        email=payload.email,
        full_name=payload.full_name,
        password=payload.password,
        company_name=payload.company_name,
        role="ADMIN",
    )
    profile.title = "Platform Admin"
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return {
        "access_token": create_access_token(email=user.email),
        "token_type": "bearer",
        "user": _serialize_user(user, profile),
    }


@router.post("/sign-in", response_model=Token)
def sign_in(credentials: UserSignIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    profile = get_or_create_access_profile(db, user)
    return {
        "access_token": create_access_token(email=user.email),
        "token_type": "bearer",
        "user": _serialize_user(user, profile),
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = get_or_create_access_profile(db, current_user)
    return _serialize_user(current_user, profile)


@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = get_or_create_access_profile(db, current_user)
    return _serialize_user(current_user, profile)


@router.patch("/profile", response_model=UserResponse)
def update_profile(
    payload: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = get_or_create_access_profile(db, current_user)
    updates = payload.model_dump(exclude_none=True)

    if "full_name" in updates:
        current_user.full_name = updates["full_name"].strip()
    if "company_name" in updates:
        current_user.company_name = (updates["company_name"] or "").strip() or None
    if "title" in updates:
        profile.title = updates["title"].strip()

    current_user.updated_at = datetime.utcnow()
    db.add(current_user)
    db.add(profile)
    db.commit()
    db.refresh(current_user)
    db.refresh(profile)
    return _serialize_user(current_user, profile)


@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("ADMIN")),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    profiles = {
        item.user_id: item
        for item in db.query(UserAccessProfile).filter(UserAccessProfile.user_id.in_([user.id for user in users])).all()
    }
    return [_serialize_user(user, profiles.get(user.id)) for user in users]


@router.post("/forgot-password", response_model=PasswordResetResponse)
def forgot_password(
    request: PasswordResetRequest,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None,
):
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="If the email exists, a reset link has been sent.",
        )

    try:
        reset_token = create_password_reset_token(request.email, db)
        if background_tasks is not None:
            background_tasks.add_task(send_password_reset_email, request.email, reset_token)
        else:
            send_password_reset_email(request.email, reset_token)

        return {
            "message": "Password reset sent. Check your email for reset link.",
            "email": request.email,
        }
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating reset token.",
        )


@router.post("/reset-password", response_model=PasswordResetResponse)
def reset_password(request: PasswordResetVerify, db: Session = Depends(get_db)):
    try:
        reset_password_with_token(request.token, request.new_password, db)
        user = db.query(User).filter(User.password_reset_token.is_(None)).order_by(User.updated_at.desc()).first()
        return {
            "message": "Password reset successfully.",
            "email": user.email if user else "unknown@example.com",
        }
    except HTTPException:
        raise
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error resetting password.",
        )


@router.post("/change-password", response_model=PasswordResetResponse)
def change_password(
    request: ChangePassword,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )
    if verify_password(request.new_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password.",
        )

    try:
        current_user.hashed_password = hash_password(request.new_password)
        current_user.updated_at = datetime.utcnow()
        db.add(current_user)
        db.commit()
        return {
            "message": "Password changed successfully.",
            "email": current_user.email,
        }
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error changing password.",
        )


rag_router = APIRouter(prefix="/api/v1", tags=["Ingestion"])


@rag_router.post("/ingest")
async def ingest_document_endpoint(
    file: UploadFile = File(..., description="PDF, DOC, DOCX, TXT, MD, or RTF file to ingest"),
    title: str = Form(..., description="Document title"),
    source_type: Optional[str] = Form("pdf", description="Source type (pdf, txt, md)"),
):
    allowed_extensions = {".pdf", ".doc", ".docx", ".txt", ".md", ".rtf"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {allowed_extensions}",
        )

    if not source_type:
        source_type = file_ext[1:]

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(exc)}")

    try:
        result = await asyncio.to_thread(
            ingest_document,
            local_file_path=tmp_path,
            title=title,
            source_type=source_type,
        )
    except Exception as exc:
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(exc)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return JSONResponse(content={"message": result})


@rag_router.post("/rag/search")
async def rag_search(question: str):
    chunks = retrieve_context(question, top_k=5)
    if not chunks:
        return {"answer": "No relevant information found.", "sources": []}

    context = build_context(chunks)
    answer = generate_answer(context, question)
    sources = [chunk[1] for chunk in chunks]
    return {"answer": answer, "sources": sources}
