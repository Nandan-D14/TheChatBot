"""
Chat routes with streaming and non-streaming endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import asyncio
import logging

from core.beam_llm import BeamLLM, get_beam_llm
from core.auth import get_current_user
from services.appwrite_service import get_appwrite_service, AppwriteService, AppwritePersistenceError


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    session_id: str
    prompt: str
    history: List[Dict[str, str]] = []


class ChatResponse(BaseModel):
    """Response model for chat endpoint"""
    response: str
    session_id: str


def get_llm() -> BeamLLM:
    """Dependency to get Beam LLM instance"""
    return get_beam_llm()


def get_db() -> AppwriteService:
    """Dependency to get Appwrite service"""
    return get_appwrite_service()


def _require_session_ownership(session_id: str, user_id: str, db: AppwriteService):
    session = db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")


def _build_session_title_from_prompt(prompt: str) -> str:
    normalized = " ".join(prompt.split()).strip()
    if not normalized:
        return "New Chat"

    max_len = 48
    if len(normalized) <= max_len:
        return normalized

    return f"{normalized[:max_len - 3]}..."


def _auto_title_session_from_prompt(db: AppwriteService, session_id: str, prompt: str):
    """Update the session title from the first user prompt when still generic."""
    try:
        message_count = db.get_message_count(session_id)
        if message_count > 0:
            return

        session = db.get_session(session_id)
        if not session:
            return

        current_title = (session.get("title") or "").strip()
        if current_title not in ("", "New Chat", "Untitled"):
            return

        db.update_session_title(session_id, _build_session_title_from_prompt(prompt))
    except Exception:
        # Non-blocking improvement; chat should continue even if title update fails.
        logger.exception("Failed to auto-title session", extra={"session_id": session_id})


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    llm: BeamLLM = Depends(get_llm),
    db: AppwriteService = Depends(get_db)
):
    """
    Streaming chat endpoint using Server-Sent Events (SSE)
    
    The response is streamed token by token for real-time UI updates
    """
    
    _require_session_ownership(request.session_id, current_user["user_id"], db)

    async def token_generator():
        try:
            _auto_title_session_from_prompt(db, request.session_id, request.prompt)

            # Save user message before generation so persistence failures are visible.
            db.save_message(
                session_id=request.session_id,
                role="user",
                content=request.prompt
            )
            
            # Get response from Beam LLM (async for streaming)
            response = await llm._acall(
                prompt=request.prompt,
                history=request.history,
                temperature=0.7,
                max_tokens=512
            )
            
            # Stream tokens one by one for SSE
            buffer = ""
            words = response.split()
            
            for i, word in enumerate(words):
                buffer += word + " "
                
                # Yield token in SSE format
                token_data = {"token": word + " ", "complete": False}
                yield f"data: {json.dumps(token_data)}\n\n"
                
                # Small delay to simulate streaming (remove in production)
                await asyncio.sleep(0.02)
            
            # Save assistant message and emit explicit stream error if persistence fails.
            try:
                db.save_message(
                    session_id=request.session_id,
                    role="assistant",
                    content=response
                )
            except AppwritePersistenceError as e:
                logger.exception("Failed to persist assistant response", extra={"session_id": request.session_id})
                yield f"data: {json.dumps({'error': str(e), 'persistence': True})}\n\n"
            
            # Signal completion
            yield "data: {\"token\": \"\", \"complete\": true}\n\n"
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            error_data = {"error": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream"
        }
    )


@router.post("/non-stream", response_model=ChatResponse)
async def chat_non_stream(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    llm: BeamLLM = Depends(get_llm),
    db: AppwriteService = Depends(get_db)
):
    """
    Non-streaming chat endpoint
    
    Returns the complete response after generation is done
    """
    
    try:
        _require_session_ownership(request.session_id, current_user["user_id"], db)
        _auto_title_session_from_prompt(db, request.session_id, request.prompt)

        # Get response from Beam LLM
        response = await llm._acall(
            prompt=request.prompt,
            history=request.history,
            temperature=0.7,
            max_tokens=512
        )
        
        # Save messages to database; fail request if persistence fails.
        db.save_message(request.session_id, "user", request.prompt)
        db.save_message(request.session_id, "assistant", response)
        
        return ChatResponse(
            response=response,
            session_id=request.session_id
        )
        
    except AppwritePersistenceError as e:
        raise HTTPException(status_code=500, detail=f"Chat persistence error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/stream-full")
async def chat_stream_full(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    llm: BeamLLM = Depends(get_llm),
    db: AppwriteService = Depends(get_db)
):
    """
    Full streaming endpoint - streams the complete response as it's generated
    Uses async generator for true streaming from the LLM
    """
    
    _require_session_ownership(request.session_id, current_user["user_id"], db)

    async def full_stream_generator():
        buffer = ""
        
        try:
            _auto_title_session_from_prompt(db, request.session_id, request.prompt)

            db.save_message(
                session_id=request.session_id,
                role="user",
                content=request.prompt
            )
            
            # Stream from LLM
            async for chunk in llm._astream(
                prompt=request.prompt,
                history=request.history
            ):
                buffer += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            
            try:
                db.save_message(
                    session_id=request.session_id,
                    role="assistant",
                    content=buffer
                )
            except AppwritePersistenceError as e:
                logger.exception("Failed to persist full-stream assistant response", extra={"session_id": request.session_id})
                yield f"data: {json.dumps({'error': str(e), 'persistence': True})}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        full_stream_generator(),
        media_type="text/event-stream"
    )
