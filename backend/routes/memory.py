"""
Memory routes for user-level persistent memory
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.appwrite_service import get_appwrite_service, AppwriteService
from core.memory import UserMemory

router = APIRouter(prefix="/memory", tags=["memory"])


class SaveMemoryRequest(BaseModel):
    """Request to save memory"""
    user_id: str
    summary: str


class MemoryResponse(BaseModel):
    """Memory response model"""
    user_id: str
    summary: str
    updated_at: Optional[str] = None


def get_db() -> AppwriteService:
    """Dependency to get Appwrite service"""
    return get_appwrite_service()


@router.get("/{user_id}", response_model=MemoryResponse)
async def get_memory(
    user_id: str,
    db: AppwriteService = Depends(get_db)
):
    """
    Get user-level memory summary
    
    Returns the persistent memory for a user across sessions
    """
    try:
        memory = UserMemory(user_id, db)
        summary = memory.get_summary()
        
        return MemoryResponse(
            user_id=user_id,
            summary=summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get memory: {str(e)}")


@router.post("/", response_model=MemoryResponse)
async def save_memory(
    request: SaveMemoryRequest,
    db: AppwriteService = Depends(get_db)
):
    """
    Save user-level memory summary
    
    This stores long-term context that persists across sessions
    """
    try:
        memory = UserMemory(request.user_id, db)
        memory.save_summary(request.summary)
        
        return MemoryResponse(
            user_id=request.user_id,
            summary=request.summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save memory: {str(e)}")


@router.delete("/{user_id}")
async def delete_memory(
    user_id: str,
    db: AppwriteService = Depends(get_db)
):
    """
    Delete user-level memory
    """
    try:
        db.delete_memory(user_id)
        return {"status": "deleted", "user_id": user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete memory: {str(e)}")


@router.post("/{user_id}/update")
async def update_memory_from_conversation(
    user_id: str,
    messages: list,
    db: AppwriteService = Depends(get_db)
):
    """
    Update memory based on recent conversation
    
    Takes recent messages and updates the long-term memory
    """
    try:
        memory = UserMemory(user_id, db)
        memory.update_with_conversation(messages)
        
        return {
            "status": "updated",
            "user_id": user_id,
            "summary": memory.get_summary()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update memory: {str(e)}")
