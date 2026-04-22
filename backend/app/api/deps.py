from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.admin_user import AdminUser


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AdminUser:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    token_data = decode_access_token(credentials.credentials)
    if not token_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    admin = db.query(AdminUser).filter(AdminUser.username == token_data["sub"]).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin not found")
    if not admin.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    return admin


def require_view_permission(user: AdminUser = Depends(get_current_admin)) -> AdminUser:
    if user.role not in {AdminUser.ROLE_ADMIN, AdminUser.ROLE_EDITOR, AdminUser.ROLE_VIEWER}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No view permission")
    return user


def require_edit_permission(user: AdminUser = Depends(get_current_admin)) -> AdminUser:
    if user.role not in {AdminUser.ROLE_ADMIN, AdminUser.ROLE_EDITOR}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No edit permission")
    return user


def require_admin_permission(user: AdminUser = Depends(get_current_admin)) -> AdminUser:
    if user.role != AdminUser.ROLE_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permission required")
    return user
