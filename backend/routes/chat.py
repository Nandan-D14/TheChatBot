"""
Chat routes with streaming and non-streaming endpoints
"""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
import asyncio
import os

from core.beam_llm import BeamLLM, get_beam_llm
from services.appwrite_service import get_appwrite_service, AppwriteService

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


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    llm: BeamLLM = Depends(get_llm),
    db: AppwriteService = Depends(get_db)
):
    """
    Streaming chat endpoint using Server-Sent Events (SSE)
    
    The response is streamed token by token for real-time UI updates
    """
    
    async def token_generator():
        try:
            # Save user message to database
            try:
                db.save_message(
                    session_id=request.session_id,
                    role="user",
                    content=request.prompt
                )
            except Exception as e:
                print(f"Warning: Failed to save user message: {e}")
            
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
            
            # Save assistant message to database
            try:
                db.save_message(
                    session_id=request.session_id,
                    role="assistant",
                    content=response
                )
            except Exception as e:
                print(f"Warning: Failed to save assistant message: {e}")
            
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
    llm: BeamLLM = Depends(get_llm),
    db: AppwriteService = Depends(get_db)
):
    """
    Non-streaming chat endpoint
    
    Returns the complete response after generation is done
    """
    
    try:
        # Get response from Beam LLM
        response = await llm._acall(
            prompt=request.prompt,
            history=request.history,
            temperature=0.7,
            max_tokens=512
        )
        
        # Save messages to database
        try:
            db.save_message(request.session_id, "user", request.prompt)
            db.save_message(request.session_id, "assistant", response)
        except Exception as e:
            print(f"Warning: Failed to save messages: {e}")
        
        return ChatResponse(
            response=response,
            session_id=request.session_id
        )
        
    except Exception as e:
        raise Exception(f"Chat error: {str(e)}")


@router.post("/stream-full")
async def chat_stream_full(
    request: ChatRequest,
    llm: BeamLLM = Depends(get_llm),
    db: AppwriteService = Depends(get_db)
):
    """
    Full streaming endpoint - streams the complete response as it's generated
    Uses async generator for true streaming from the LLM
    """
    
    async def full_stream_generator():
        buffer = ""
        
        try:
            # Save user message
            try:
                db.save_message(
                    session_id=request.session_id,
                    role="user",
                    content=request.prompt
                )
            except:
                pass
            
            # Stream from LLM
            async for chunk in llm._astream(
                prompt=request.prompt,
                history=request.history
            ):
                buffer += chunk
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            
            # Save assistant message
            try:
                db.save_message(
                    session_id=request.session_id,
                    role="assistant",
                    content=buffer
                )
            except:
                pass
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        full_stream_generator(),
        media_type="text/event-stream"
    )
