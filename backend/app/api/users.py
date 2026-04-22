from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, require_admin_permission
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models.admin_user import AdminUser
from app.schemas.user import UserCreateRequest, UserResetPasswordRequest, UserResponse, UserUpdateRequest


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_permission),
) -> list[AdminUser]:
    return db.query(AdminUser).order_by(AdminUser.created_at.desc()).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreateRequest,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_permission),
) -> AdminUser:
    exists = db.query(AdminUser).filter(AdminUser.username == payload.username.strip()).first()
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")

    user = AdminUser(
        username=payload.username.strip(),
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=True,
        password_changed=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: AdminUser = Depends(require_admin_permission),
) -> AdminUser:
    user = db.get(AdminUser, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if payload.role is not None:
        user.role = payload.role

    if payload.is_active is not None:
        if current_admin.id == user.id and payload.is_active is False:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot disable current admin")
        user.is_active = payload.is_active

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/{user_id}/reset-password", response_model=UserResponse)
def reset_user_password(
    user_id: int,
    payload: UserResetPasswordRequest,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_permission),
) -> AdminUser:
    user = db.get(AdminUser, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)
    user.password_changed = False

    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def current_user_profile(user: AdminUser = Depends(get_current_admin)) -> AdminUser:
    return user
