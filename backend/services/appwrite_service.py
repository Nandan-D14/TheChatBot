"""
Appwrite service for database operations
Handles users, sessions, messages, and memory storage
"""

from typing import List, Dict, Optional
import os
import uuid
from datetime import datetime
from core.config import settings


class AppwriteService:
    """
    Service class for all Appwrite database operations
    
    Collections:
        - users: User authentication
        - sessions: Chat sessions
        - messages: Chat messages
        - memory: User-level memory
    """
    
    def __init__(self):
        """Initialize Appwrite client"""
        # Import here to handle missing dependency gracefully
        try:
            from appwrite.client import Client
            from appwrite.services.databases import Databases
            from appwrite.services.users import Users

            self.client = Client()
            # Use settings from config.py which loads .env file
            self.client.set_endpoint(settings.appwrite_endpoint)
            self.client.set_project(settings.appwrite_project_id)
            self.client.set_key(settings.appwrite_api_key)

            self.database_id = settings.appwrite_db_id
            self.databases = Databases(self.client)
            self.users = Users(self.client)

            self._initialized = True

        except ImportError:
            print("Warning: appwrite package not installed")
            self._initialized = False
        except Exception as e:
            print(f"Warning: Failed to initialize Appwrite: {e}")
            self._initialized = False
    
    def _check_initialized(self):
        """Check if Appwrite client is initialized"""
        if not self._initialized:
            raise Exception("Appwrite not initialized. Install appwrite package or provide mock.")
    
    # ==================== User Methods ====================
    
    def create_user(self, email: str, password: str) -> Dict:
        """Create a new user"""
        self._check_initialized()
        return self.users.create(email, password)
    
    def get_user(self, user_id: str) -> Dict:
        """Get user by ID"""
        self._check_initialized()
        return self.users.get(user_id)
    
    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email (list and filter)"""
        self._check_initialized()
        try:
            result = self.users.list(query=[f'equal("email", "{email}")'])
            if result["total"] > 0:
                return result["documents"][0]
        except:
            pass
        return None
    
    def create_session(self, email: str, password: str) -> Dict:
        """Create email/password session (login)"""
        self._check_initialized()
        raise NotImplementedError("Auth is not implemented")
    
    def delete_session(self, session_id: str):
        """Delete a session"""
        self._check_initialized()
        raise NotImplementedError("Auth is not implemented")
    
    def delete_all_sessions(self):
        """Delete all user sessions"""
        self._check_initialized()
        raise NotImplementedError("Auth is not implemented")
    
    # ==================== Session Methods ====================
    
    def create_session_record(
        self, 
        user_id: str, 
        title: str = "New Chat"
    ) -> Dict:
        """Create a new chat session"""
        self._check_initialized()
        
        session_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        
        session_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        
        try:
            return self.databases.create_document(
                self.database_id,
                "sessions",
                session_id,
                {
                    "session_id": session_id,
                    "user_id": user_id,
                    "title": title,
                    "created_at": created_at
                }
            )
        except Exception as e:
            print(f"Warning: Appwrite create_session failed: {e}. Returning mock.")
            return {
                "session_id": session_id,
                "user_id": user_id,
                "title": title,
                "created_at": created_at
            }
    
    def get_sessions(self, user_id: str) -> List[Dict]:
        """Get all sessions for a user"""
        self._check_initialized()
        
        try:
            result = self.databases.list_documents(
                self.database_id,
                "sessions",
                queries=[
                    f'equal("user_id", "{user_id}")',
                    'orderBy("created_at", "DESC")'
                ]
            )
            return result.get("documents", [])
        except Exception as e:
            print(f"Warning: Appwrite get_sessions failed: {e}. Returning empty list.")
            return []
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get a specific session"""
        self._check_initialized()
        
        try:
            return self.databases.get_document(
                self.database_id,
                "sessions",
                session_id
            )
        except:
            return None
    
    def update_session_title(self, session_id: str, title: str) -> Dict:
        """Update session title"""
        self._check_initialized()
        
        return self.databases.update_document(
            self.database_id,
            "sessions",
            session_id,
            {"title": title}
        )
    
    def delete_session_record(self, session_id: str):
        """Delete a session and all its messages"""
        self._check_initialized()
        
        # Delete all messages in this session first
        messages = self.get_messages(session_id)
        for msg in messages:
            try:
                self.databases.delete_document(
                    self.database_id,
                    "messages",
                    msg["message_id"]
                )
            except:
                pass
        
        # Delete the session
        return self.databases.delete_document(
            self.database_id,
            "sessions",
            session_id
        )
    
    # ==================== Message Methods ====================
    
    def save_message(
        self,
        session_id: str,
        role: str,
        content: str
    ) -> Dict:
        """Save a chat message"""
        self._check_initialized()
        
        message_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        
        try:
            return self.databases.create_document(
                self.database_id,
                "messages",
                message_id,
                {
                    "message_id": message_id,
                    "session_id": session_id,
                    "role": role,
                    "content": content,
                    "created_at": created_at
                }
            )
        except Exception as e:
            print(f"Warning: Appwrite save_message failed: {e}. Ignored.")
            return {}
    
    def get_messages(self, session_id: str) -> List[Dict]:
        """Get all messages for a session"""
        self._check_initialized()
        
        try:
            result = self.databases.list_documents(
                self.database_id,
                "messages",
                queries=[
                    f'equal("session_id", "{session_id}")',
                    'orderBy("created_at", "ASC")'
                ]
            )
            return result.get("documents", [])
        except Exception as e:
            print(f"Warning: Appwrite get_messages failed: {e}. Returning empty list.")
            return []
    
    def get_message_count(self, session_id: str) -> int:
        """Get message count for a session"""
        self._check_initialized()
        
        result = self.databases.list_documents(
            self.database_id,
            "messages",
            queries=[f'equal("session_id", "{session_id}")']
        )
        
        return result.get("total", 0)
    
    # ==================== Memory Methods ====================
    
    def save_memory(self, user_id: str, summary: str):
        """Save user-level memory summary"""
        self._check_initialized()
        
        # Check if memory exists
        result = self.databases.list_documents(
            self.database_id,
            "memory",
            queries=[f'equal("user_id", "{user_id}")']
        )
        
        updated_at = datetime.utcnow().isoformat()
        
        if result["total"] > 0:
            # Update existing
            doc_id = result["documents"][0]["$id"]
            self.databases.update_document(
                self.database_id,
                "memory",
                doc_id,
                {"summary": summary, "updated_at": updated_at}
            )
        else:
            # Create new
            doc_id = str(uuid.uuid4())
            self.databases.create_document(
                self.database_id,
                "memory",
                doc_id,
                {
                    "user_id": user_id,
                    "summary": summary,
                    "updated_at": updated_at
                }
            )
    
    def get_memory(self, user_id: str) -> Optional[str]:
        """Get user-level memory summary"""
        self._check_initialized()
        
        result = self.databases.list_documents(
            self.database_id,
            "memory",
            queries=[f'equal("user_id", "{user_id}")']
        )
        
        if result["total"] > 0:
            return result["documents"][0].get("summary")
        return None
    
    def delete_memory(self, user_id: str):
        """Delete user memory"""
        self._check_initialized()
        
        result = self.databases.list_documents(
            self.database_id,
            "memory",
            queries=[f'equal("user_id", "{user_id}")']
        )
        
        if result["total"] > 0:
            for doc in result["documents"]:
                self.databases.delete_document(
                    self.database_id,
                    "memory",
                    doc["$id"]
                )


# Singleton instance
_appwrite_service: Optional[AppwriteService] = None


def get_appwrite_service() -> AppwriteService:
    """Get or create Appwrite service singleton"""
    global _appwrite_service
    if _appwrite_service is None:
        _appwrite_service = AppwriteService()
    return _appwrite_service
