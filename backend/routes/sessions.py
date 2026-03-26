"""
Session routes for chat session management
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from services.appwrite_service import get_appwrite_service, AppwriteService, AppwritePersistenceError

router = APIRouter(prefix="/sessions", tags=["sessions"])


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


def get_db() -> AppwriteService:
    """Dependency to get Appwrite service"""
    return get_appwrite_service()


@router.post("/", response_model=SessionResponse, status_code=201)
async def create_session(
    request: CreateSessionRequest,
    db: AppwriteService = Depends(get_db)
):
    """
    Create a new chat session
    
    Returns the created session with its ID
    """
    try:
        result = db.create_session_record(
            user_id=request.user_id,
            title=request.title or "New Chat"
        )
        
        return SessionResponse(
            session_id=result.get("session_id", ""),
            user_id=result.get("user_id", ""),
            title=result.get("title", "New Chat"),
            created_at=result.get("created_at", "")
        )
    except AppwritePersistenceError as e:
        raise HTTPException(status_code=503, detail=f"Failed to create session: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.get("/", response_model=List[SessionResponse])
async def get_sessions(
    user_id: str,
    db: AppwriteService = Depends(get_db)
):
    """
    Get all sessions for a user
    
    Returns list of sessions sorted by creation date (newest first)
    """
    try:
        sessions = db.get_sessions(user_id)
        
        return [
            SessionResponse(
                session_id=s.get("session_id", ""),
                user_id=s.get("user_id", ""),
                title=s.get("title", "Untitled"),
                created_at=s.get("created_at", "")
            )
            for s in sessions
        ]
    except AppwritePersistenceError as e:
        raise HTTPException(status_code=503, detail=f"Failed to get sessions: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sessions: {str(e)}")


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    db: AppwriteService = Depends(get_db)
):
    """
    Get a specific session by ID
    """
    try:
        session = db.get_session(session_id)
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SessionResponse(
            session_id=session.get("session_id", ""),
            user_id=session.get("user_id", ""),
            title=session.get("title", "Untitled"),
            created_at=session.get("created_at", "")
        )
    except HTTPException:
        raise
    except AppwritePersistenceError as e:
        raise HTTPException(status_code=503, detail=f"Failed to get session: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    request: UpdateSessionRequest,
    db: AppwriteService = Depends(get_db)
):
    """
    Update a session (e.g., change title)
    """
    try:
        if request.title:
            result = db.update_session_title(session_id, request.title)
        else:
            result = db.get_session(session_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return SessionResponse(
            session_id=result.get("session_id", ""),
            user_id=result.get("user_id", ""),
            title=result.get("title", "Untitled"),
            created_at=result.get("created_at", "")
        )
    except HTTPException:
        raise
    except AppwritePersistenceError as e:
        raise HTTPException(status_code=503, detail=f"Failed to update session: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    db: AppwriteService = Depends(get_db)
):
    """
    Delete a session and all its messages
    """
    try:
        db.delete_session_record(session_id)
        return {"status": "deleted", "session_id": session_id}
    except AppwritePersistenceError as e:
        raise HTTPException(status_code=503, detail=f"Failed to delete session: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")


@router.get("/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    db: AppwriteService = Depends(get_db)
):
    """
    Get all messages for a session
    """
    try:
        messages = db.get_messages(session_id)
        
        return {
            "session_id": session_id,
            "messages": [
                {
                    "message_id": m.get("message_id", ""),
                    "role": m.get("role", ""),
                    "content": m.get("content", ""),
                    "created_at": m.get("created_at", "")
                }
                for m in messages
            ],
            "count": len(messages)
        }
    except AppwritePersistenceError as e:
        raise HTTPException(status_code=503, detail=f"Failed to get messages: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get messages: {str(e)}")
