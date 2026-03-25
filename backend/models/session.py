"""
Session models for request/response validation
"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CreateSessionRequest(BaseModel):
    """Request to create a new session"""
    user_id: str
    title: Optional[str] = "New Chat"


class UpdateSessionRequest(BaseModel):
    """Request to update a session"""
    title: Optional[str] = None


class SessionResponse(BaseModel):
    """Session response model"""
    session_id: str
    user_id: str
    title: str
    created_at: str


class MessageResponse(BaseModel):
    """Message response model"""
    message_id: str
    session_id: str
    role: str
    content: str
    created_at: str
