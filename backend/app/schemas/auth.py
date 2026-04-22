from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    password_changed: bool = True


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
