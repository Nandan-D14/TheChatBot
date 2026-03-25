"""
Chat models for request/response validation
"""

from pydantic import BaseModel
from typing import List, Dict, Optional


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    session_id: str
    prompt: str
    history: List[Dict[str, str]] = []
    temperature: float = 0.7
    max_tokens: int = 512


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str
    session_id: str


class StreamChatResponse(BaseModel):
    """Streaming response chunk"""
    token: str
    complete: bool = False
