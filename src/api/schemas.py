"""Pydantic schemas for request/response validation."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# User Schemas
class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """Schema for user creation."""
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for user updates."""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)


class User(UserBase):
    """Schema for user response."""
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Item Schemas
class ItemBase(BaseModel):
    """Base item schema."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ItemCreate(ItemBase):
    """Schema for item creation."""
    pass


class ItemUpdate(BaseModel):
    """Schema for item updates."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class Item(ItemBase):
    """Schema for item response."""
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Token Schemas
class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token payload."""
    username: Optional[str] = None
