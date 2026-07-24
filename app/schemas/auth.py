from pydantic import BaseModel, EmailStr, Field


class UserRead(BaseModel):
    id: str
    phone_number: str
    email: str | None = None
    full_name: str | None
    is_admin: bool

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    username: str = Field(description="Email or phone number")
    password: str = Field(min_length=6)


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    phone_number: str = Field(
        min_length=7,
        max_length=20,
        description="Phone number in E.164 format, e.g. +14155552671",
    )
    password: str = Field(min_length=6, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginResponse(TokenPair):
    user: UserRead


class RefreshRequest(BaseModel):
    refresh_token: str
