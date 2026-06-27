"""
Auth endpoints: register, login, refresh, OTP (stub), Google login (stub).
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    OTPSendRequest,
    OTPVerifyRequest,
    GoogleLoginRequest,
)
from app.schemas.common import Message
from app.schemas.user import UserCreate, UserRead

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        mobile=payload.mobile,
        password_hash=hash_password(payload.password),
        age=payload.age,
        gender=payload.gender,
        state=payload.state,
        district=payload.district,
        is_rural=payload.is_rural,
        occupation=payload.occupation,
        annual_income=payload.annual_income,
        category=payload.category,
        education=payload.education,
        disability_status=payload.disability_status,
        marital_status=payload.marital_status,
        language_preference=payload.language_preference,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest):
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = data["sub"]
    return TokenResponse(
        access_token=create_access_token(user_id),
        refresh_token=create_refresh_token(user_id),
    )


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/otp/send", response_model=Message)
def send_otp(payload: OTPSendRequest):
    # TODO: integrate SMS provider (see SMS_PROVIDER_API_KEY in config) and
    # store a hashed OTP + expiry, e.g. in Redis or a dedicated table.
    return Message(message=f"OTP sent to {payload.mobile} (stub — not actually sent yet)")


@router.post("/otp/verify", response_model=Message)
def verify_otp(payload: OTPVerifyRequest):
    # TODO: verify against stored OTP.
    return Message(message="OTP verified (stub)")


@router.post("/login/google", response_model=TokenResponse)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    # TODO: verify payload.id_token with Google's tokeninfo endpoint using
    # GOOGLE_CLIENT_ID, then find-or-create the User by the verified email.
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Google login not yet implemented")
