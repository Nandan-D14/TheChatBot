"""
Appwrite service for database operations
Handles users, sessions, messages, and memory storage
"""

from typing import List, Dict, Optional
import logging
import uuid
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from datetime import datetime, timezone
from core.config import settings


logger = logging.getLogger(__name__)


class AppwritePersistenceError(Exception):
    """Raised when Appwrite persistence operations fail."""


def _utc_iso_timestamp() -> str:
    """Return an Appwrite-compatible UTC timestamp string."""
    return datetime.now(timezone.utc).isoformat()


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
            self.sessions_collection_id = settings.appwrite_sessions_collection_id
            self.messages_collection_id = settings.appwrite_messages_collection_id
            self.memory_collection_id = settings.appwrite_memory_collection_id
            self.databases = Databases(self.client)
            self.users = Users(self.client)
            self._operation_timeout_s = int(getattr(settings, "appwrite_operation_timeout_s", 20) or 20)
            self._max_retries = int(getattr(settings, "appwrite_max_retries", 2) or 2)
            self._retry_backoff_s = float(getattr(settings, "appwrite_retry_backoff_s", 0.4) or 0.4)
            self._executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix="appwrite-ops")

            self._initialized = True

        except ImportError:
            logger.exception("Appwrite package not installed")
            self._initialized = False
        except Exception as e:
            logger.exception("Failed to initialize Appwrite client")
            self._initialized = False
    
    def _check_initialized(self):
        """Check if Appwrite client is initialized"""
        if not self._initialized:
            raise AppwritePersistenceError("Appwrite is not initialized")

    def _call_with_retry(self, operation_name: str, func, *args, **kwargs):
        """Execute an Appwrite SDK call with timeout and bounded retries."""
        self._check_initialized()

        attempts = self._max_retries + 1
        last_error: Optional[Exception] = None

        for attempt in range(1, attempts + 1):
            future = self._executor.submit(func, *args, **kwargs)
            try:
                return future.result(timeout=self._operation_timeout_s)
            except FuturesTimeoutError as e:
                future.cancel()
                last_error = AppwritePersistenceError(
                    f"{operation_name} timed out after {self._operation_timeout_s}s"
                )
                logger.warning(
                    "Appwrite operation timeout",
                    extra={"operation": operation_name, "attempt": attempt, "attempts": attempts}
                )
            except Exception as e:
                last_error = e
                logger.warning(
                    "Appwrite operation failed",
                    extra={"operation": operation_name, "attempt": attempt, "attempts": attempts, "error": str(e)}
                )

            if attempt < attempts:
                time.sleep(self._retry_backoff_s * (2 ** (attempt - 1)))

        raise AppwritePersistenceError(
            f"{operation_name} failed after {attempts} attempt(s): {last_error}"
        )

    def verify_ready(self) -> Dict[str, bool]:
        """Verify Appwrite database and required collections are reachable."""
        self._check_initialized()

        readiness = {
            self.sessions_collection_id: False,
            self.messages_collection_id: False,
            self.memory_collection_id: False,
        }
        for collection_id in readiness:
            try:
                # A simple list call validates API key, DB id, and collection id.
                self._call_with_retry(
                    "verify_ready.list_documents",
                    self.databases.list_documents,
                    self.database_id,
                    collection_id,
                )
                readiness[collection_id] = True
            except Exception as e:
                logger.error(
                    "Appwrite readiness check failed",
                    extra={"database_id": self.database_id, "collection_id": collection_id, "error": str(e)}
                )
                raise AppwritePersistenceError(
                    f"Collection '{collection_id}' is not accessible in database '{self.database_id}': {e}"
                ) from e

        return readiness
    
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
        created_at = _utc_iso_timestamp()
        
        try:
            return self._call_with_retry(
                "create_session_record.create_document",
                self.databases.create_document,
                self.database_id,
                self.sessions_collection_id,
                session_id,
                {
                    "session_id": session_id,
                    "user_id": user_id,
                    "title": title,
                    "created_at": created_at,
                },
            )
        except Exception as e:
            logger.exception(
                "Appwrite create_session_record failed",
                extra={"database_id": self.database_id, "collection_id": self.sessions_collection_id, "user_id": user_id}
            )
            raise AppwritePersistenceError(f"Failed to create session record: {e}") from e
    
    def get_sessions(self, user_id: str) -> List[Dict]:
        """Get all sessions for a user"""
        self._check_initialized()
        
        try:
            from appwrite.query import Query

            result = self._call_with_retry(
                "get_sessions.list_documents",
                self.databases.list_documents,
                self.database_id,
                self.sessions_collection_id,
                queries=[
                    Query.equal("user_id", user_id),
                    Query.order_desc("created_at"),
                ],
            )
            return result.get("documents", [])
        except Exception as e:
            logger.exception(
                "Appwrite get_sessions failed",
                extra={"database_id": self.database_id, "collection_id": self.sessions_collection_id, "user_id": user_id}
            )
            raise AppwritePersistenceError(f"Failed to fetch sessions: {e}") from e
    
    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get a specific session"""
        self._check_initialized()
        
        try:
            return self._call_with_retry(
                "get_session.get_document",
                self.databases.get_document,
                self.database_id,
                self.sessions_collection_id,
                session_id,
            )
        except Exception as e:
            logger.warning(
                "Appwrite get_session failed",
                extra={"database_id": self.database_id, "collection_id": self.sessions_collection_id, "session_id": session_id, "error": str(e)}
            )
            return None
    
    def update_session_title(self, session_id: str, title: str) -> Dict:
        """Update session title"""
        self._check_initialized()
        
        return self._call_with_retry(
            "update_session_title.update_document",
            self.databases.update_document,
            self.database_id,
            self.sessions_collection_id,
            session_id,
            {"title": title},
        )
    
    def delete_session_record(self, session_id: str):
        """Delete a session and all its messages"""
        self._check_initialized()
        
        # Delete all messages in this session first
        messages = self.get_messages(session_id)
        for msg in messages:
            try:
                self._call_with_retry(
                    "delete_session_record.delete_message",
                    self.databases.delete_document,
                    self.database_id,
                    self.messages_collection_id,
                    msg["message_id"],
                )
            except Exception as e:
                logger.warning(
                    "Failed to delete message during session cleanup",
                    extra={"session_id": session_id, "message_id": msg.get("message_id", ""), "error": str(e)}
                )
        
        # Delete the session
        return self._call_with_retry(
            "delete_session_record.delete_session",
            self.databases.delete_document,
            self.database_id,
            self.sessions_collection_id,
            session_id,
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
        created_at = _utc_iso_timestamp()
        
        try:
            return self._call_with_retry(
                "save_message.create_document",
                self.databases.create_document,
                self.database_id,
                self.messages_collection_id,
                message_id,
                {
                    "message_id": message_id,
                    "session_id": session_id,
                    "role": role,
                    "content": content,
                    "created_at": created_at,
                },
            )
        except Exception as e:
            logger.exception(
                "Appwrite save_message failed",
                extra={"database_id": self.database_id, "collection_id": self.messages_collection_id, "session_id": session_id, "role": role}
            )
            raise AppwritePersistenceError(f"Failed to save message: {e}") from e
    
    def get_messages(self, session_id: str) -> List[Dict]:
        """Get all messages for a session"""
        self._check_initialized()
        
        try:
            from appwrite.query import Query

            result = self._call_with_retry(
                "get_messages.list_documents",
                self.databases.list_documents,
                self.database_id,
                self.messages_collection_id,
                queries=[
                    Query.equal("session_id", session_id),
                    Query.order_asc("created_at"),
                ],
            )
            return result.get("documents", [])
        except Exception as e:
            logger.exception(
                "Appwrite get_messages failed",
                extra={"database_id": self.database_id, "collection_id": self.messages_collection_id, "session_id": session_id}
            )
            raise AppwritePersistenceError(f"Failed to fetch messages: {e}") from e
    
    def get_message_count(self, session_id: str) -> int:
        """Get message count for a session"""
        self._check_initialized()
        
        from appwrite.query import Query

        result = self._call_with_retry(
            "get_message_count.list_documents",
            self.databases.list_documents,
            self.database_id,
            self.messages_collection_id,
            queries=[Query.equal("session_id", session_id)],
        )
        
        return result.get("total", 0)
    
    # ==================== Memory Methods ====================
    
    def save_memory(self, user_id: str, summary: str):
        """Save user-level memory summary"""
        self._check_initialized()
        
        from appwrite.query import Query

        # Check if memory exists
        result = self._call_with_retry(
            "save_memory.list_documents",
            self.databases.list_documents,
            self.database_id,
            self.memory_collection_id,
            queries=[Query.equal("user_id", user_id)],
        )
        
        updated_at = _utc_iso_timestamp()
        
        if result["total"] > 0:
            # Update existing
            doc_id = result["documents"][0]["$id"]
            self._call_with_retry(
                "save_memory.update_document",
                self.databases.update_document,
                self.database_id,
                self.memory_collection_id,
                doc_id,
                {"summary": summary, "updated_at": updated_at},
            )
        else:
            # Create new
            doc_id = str(uuid.uuid4())
            self._call_with_retry(
                "save_memory.create_document",
                self.databases.create_document,
                self.database_id,
                self.memory_collection_id,
                doc_id,
                {
                    "user_id": user_id,
                    "summary": summary,
                    "updated_at": updated_at,
                },
            )
    
    def get_memory(self, user_id: str) -> Optional[str]:
        """Get user-level memory summary"""
        self._check_initialized()
        
        from appwrite.query import Query

        result = self._call_with_retry(
            "get_memory.list_documents",
            self.databases.list_documents,
            self.database_id,
            self.memory_collection_id,
            queries=[Query.equal("user_id", user_id)],
        )
        
        if result["total"] > 0:
            return result["documents"][0].get("summary")
        return None
    
    def delete_memory(self, user_id: str):
        """Delete user memory"""
        self._check_initialized()
        
        from appwrite.query import Query

        result = self._call_with_retry(
            "delete_memory.list_documents",
            self.databases.list_documents,
            self.database_id,
            self.memory_collection_id,
            queries=[Query.equal("user_id", user_id)],
        )
        
        if result["total"] > 0:
            for doc in result["documents"]:
                self._call_with_retry(
                    "delete_memory.delete_document",
                    self.databases.delete_document,
                    self.database_id,
                    self.memory_collection_id,
                    doc["$id"],
                )


# Singleton instance
_appwrite_service: Optional[AppwriteService] = None


def get_appwrite_service() -> AppwriteService:
    """Get or create Appwrite service singleton"""
    global _appwrite_service
    if _appwrite_service is None:
        _appwrite_service = AppwriteService()
    return _appwrite_service
