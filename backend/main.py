"""
TheChatBot API - FastAPI Backend Entry Point

A private ChatGPT-like API powered by Beam Cloud Qwen3.5-9B LLM
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os

from core.config import settings
from routes import chat, sessions, memory
from services.appwrite_service import get_appwrite_service, AppwritePersistenceError


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("=" * 50)
    logger.info("TheChatBot API Starting...")
    logger.info("Beam Endpoint: %s", settings.beam_endpoint_url)
    logger.info("Appwrite Project: %s", settings.appwrite_project_id)
    try:
        readiness = get_appwrite_service().verify_ready()
        logger.info("Appwrite readiness: %s", readiness)
    except AppwritePersistenceError as e:
        logger.error("Appwrite readiness check failed: %s", str(e))
        if os.environ.get("RENDER") == "true":
            # In production, fail fast so bad Appwrite config is surfaced during deploy.
            raise RuntimeError(f"Appwrite readiness failed: {str(e)}") from e
    logger.info("=" * 50)
    yield
    # Shutdown
    logger.info("TheChatBot API Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="TheChatBot API",
    description="Private ChatGPT-like API with Beam Cloud LLM",
    version="1.0.0",
    lifespan=lifespan
)


@app.middleware("http")
async def enforce_app_access_key(request: Request, call_next):
    """Require x-app-access-key header for all non-health API requests."""
    if request.method == "OPTIONS" or request.url.path == "/health":
        return await call_next(request)

    provided_key = request.headers.get("x-app-access-key", "").strip()
    expected_key = settings.app_access_key.strip()
    if not expected_key or provided_key != expected_key:
        return JSONResponse(
            status_code=403,
            content={"detail": "Invalid or missing app access key."},
        )

    return await call_next(request)

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
        "appwrite_db_id_configured": bool(settings.appwrite_db_id and settings.appwrite_db_id != "chatbot_db"),
        "app_access_key_configured": bool(settings.app_access_key),
    }


if __name__ == "__main__":
    import uvicorn
    
    # Use Render's PORT environment variable if available, otherwise use settings
    port = int(os.environ.get("PORT", settings.api_port))
    
    # Disable reload in production (Render sets RENDER environment variable)
    is_production = os.environ.get("RENDER") == "true"
    
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=port,
        reload=not is_production,
        log_level="info"
    )
