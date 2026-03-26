"""
Configuration management for TheChatBot backend
Uses pydantic-settings for environment variable management
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    # Beam Cloud Configuration
    beam_endpoint_url: str = "https://your-app.beam.cloud"
    beam_token: str = "your_beam_token"
    
    # Appwrite Configuration
    appwrite_endpoint: str = "http://localhost/v1"
    appwrite_project_id: str = "your_project_id"
    appwrite_api_key: str = "your_api_key"
    appwrite_db_id: str = "chatbot_db"
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # HuggingFace Token
    hf_token: str = ""
    
    # CORS Configuration
    cors_origins: str = "http://localhost:3000"
    
    @property
    def get_cors_origins(self) -> List[str]:
        """Parse CORS origins from comma-separated string"""
        if isinstance(self.cors_origins, str):
            return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
        return self.cors_origins if isinstance(self.cors_origins, list) else ["http://localhost:3000"]
    
# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get the settings instance"""
    return settings
