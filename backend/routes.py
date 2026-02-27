from fastapi import APIRouter, Depends, HTTPException, logger, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from rag.model import generate_answer
from rag.retrieval import build_context, retrieve_context
from models import User

import tempfile
import asyncio
from pathlib import Path
from typing import List, Optional
import os

from rag.ingestion import ingest_document

from schemas import (
    UserCreate,
    UserSignIn,
    UserResponse,
    Token,
    PasswordResetRequest,
    PasswordResetVerify,
    ChangePassword,
    PasswordResetResponse,
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_password_reset_token,
    reset_password_with_token,
)
from database import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/sign-up", response_model=Token, status_code=status.HTTP_201_CREATED)
def sign_up(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user account and return an access token.

    - **email**: User's email address
    - **full_name**: User's full name
    - **password**: Password (minimum 8 characters)
    - **company_name**: Optional company name
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )

    try:
        # Hash password and create user
        hashed_password = hash_password(user_data.password)
        db_user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            company_name=user_data.company_name,
        )

        db.add(db_user)
        db.commit()
        db.refresh(db_user)

        access_token = create_access_token(email=db_user.email)

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(db_user),
        }

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered.",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating user account.",
        )


@router.post("/sign-in", response_model=Token)
def sign_in(credentials: UserSignIn, db: Session = Depends(get_db)):
    """
    Authenticate user and return an access token.

    - **email**: User's email address
    - **password**: User's password
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    access_token = create_access_token(email=user.email)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user),
    }


@router.get("/profile", response_model=UserResponse)
def get_profile(email: str = None, db: Session = Depends(get_db)):
    """
    Get the current user's profile information.

    Note: In a real application, you would validate the JWT token
    and get the email from it.
    """
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not provided.",
        )

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return UserResponse.model_validate(user)


@router.post("/forgot-password", response_model=PasswordResetResponse)
def forgot_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """
    Request a password reset. Generates a reset token.

    In production, this token would be sent via email to the user.
    For now, the token is returned in the response for testing purposes.

    - **email**: User's email address
    """
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        # Security: Don't reveal if email exists or not
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="If the email exists, a reset link has been sent.",
        )

    try:
        reset_token = create_password_reset_token(request.email, db)

        # In production, send this token via email
        # For testing: return the token so it can be used
        return {
            "message": "Password reset token generated. Check your email for reset link.",
            "email": request.email,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating reset token.",
        )


@router.post("/reset-password", response_model=PasswordResetResponse)
def reset_password(request: PasswordResetVerify, db: Session = Depends(get_db)):
    """
    Reset password using a valid reset token.

    - **token**: Password reset token (sent via email)
    - **new_password**: New password (minimum 8 characters)
    """
    try:
        reset_password_with_token(request.token, request.new_password, db)

        user = db.query(User).filter(User.password_reset_token.is_(None)).first()

        return {
            "message": "Password reset successfully.",
            "email": user.email if user else "unknown",
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error resetting password.",
        )


@router.post("/change-password", response_model=PasswordResetResponse)
def change_password(
    request: ChangePassword, email: str = None, db: Session = Depends(get_db)
):
    """
    Change password for authenticated user.

    Requires the user's current password for verification.

    - **current_password**: Current password
    - **new_password**: New password (minimum 8 characters)
    - **email**: User's email (query parameter for testing)
    """
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not provided.",
        )

    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Verify current password
    if not verify_password(request.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    # Prevent reusing the same password
    if verify_password(request.new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password.",
        )

    try:
        hashed_password = hash_password(request.new_password)
        user.hashed_password = hashed_password
        user.updated_at = datetime.now()

        db.add(user)
        db.commit()

        return {
            "message": "Password changed successfully.",
            "email": user.email,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error changing password.",
        )








# RAG Routes
# -----------------------

rag_router = APIRouter(prefix="/api/v1", tags=["Ingestion"])

@rag_router.post("/ingest")
async def ingest_document_endpoint(

    file: UploadFile = File(..., description="PDF, TXT, or MD file to ingest"),
    title: str = Form(..., description="Document title"),
    source_type: Optional[str] = Form("pdf", description="Source type (pdf, txt, md)")

):
    
    """
    Upload a document and ingest it into the RAG pipeline.
    The file is temporarily saved, processed, and then cleaned up.
    Returns a summary of the ingestion.
    """

    # Validate file extension
    allowed_extensions = {'.pdf', '.txt', '.md'}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {allowed_extensions}"
        )

    
    if not source_type:
        source_type = file_ext[1:]  

    # Save uploaded file to a temporary location
    try:
        # Create a temporary file with the same extension
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")


    # Run ingestion in a thread pool to avoid blocking the event loop
    try:
        result = await asyncio.to_thread(
            ingest_document,
            local_file_path=tmp_path,
            title=title,
            source_type=source_type
        )


    except Exception as e:
        # Clean up temp file even on error
        os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    
    
    finally:
        # Ensure temp file is removed after processing
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return JSONResponse(content={"message": result})



@rag_router.post("/rag/search")
async def rag_search(question: str):

    chunks = retrieve_context(question, top_k=5)
    
    if not chunks:
        return {"answer": "No relevant information found.", "sources": []}

    context = build_context(chunks)
    print(context)
    answer = generate_answer(context, question)
    sources = [c[1] for c in chunks]
    return {"answer": answer, "sources": sources}







    