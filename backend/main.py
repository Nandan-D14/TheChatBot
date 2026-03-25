"""
TheChatBot API - FastAPI Backend Entry Point

A private ChatGPT-like API powered by Beam Cloud Qwen3.5-9B LLM
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from core.config import settings
from routes import chat, sessions, memory


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("=" * 50)
    print("TheChatBot API Starting...")
    print(f"Beam Endpoint: {settings.beam_endpoint_url}")
    print(f"Appwrite Project: {settings.appwrite_project_id}")
    print("=" * 50)
    yield
    # Shutdown
    print("TheChatBot API Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="TheChatBot API",
    description="Private ChatGPT-like API with Beam Cloud LLM",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router)
app.include_router(sessions.router)
app.include_router(memory.router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "TheChatBot API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "chat": "/chat/stream",
            "sessions": "/sessions",
            "memory": "/memory"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "thechatbot-api"
    }


@app.get("/info")
async def info():
    """Get API configuration info (non-sensitive)"""
    return {
        "beam_endpoint_configured": bool(settings.beam_endpoint_url and settings.beam_endpoint_url != "https://your-app.beam.cloud"),
        "appwrite_configured": bool(settings.appwrite_project_id and settings.appwrite_project_id != "your_project_id"),
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
        log_level="info"
    )
