"""
Memory management for conversation context
Supports both in-memory and Appwrite-backed storage
"""

from typing import Optional, List, Dict


class _Message:
    """Simple message object compatible with existing `get_history` logic."""

    def __init__(self, msg_type: str, content: str):
        self.type = msg_type
        self.content = content


class _ChatMemory:
    """In-memory chat history with window-size trimming."""

    def __init__(self, window_size: int):
        self.window_size = window_size
        self.messages: List[_Message] = []

    def _trim(self):
        if self.window_size > 0 and len(self.messages) > self.window_size:
            self.messages = self.messages[-self.window_size:]

    def add_user_message(self, content: str):
        self.messages.append(_Message("human", content))
        self._trim()

    def add_ai_message(self, content: str):
        self.messages.append(_Message("ai", content))
        self._trim()

    def clear(self):
        self.messages = []


class _SimpleConversationBufferWindowMemory:
    """Minimal replacement for the subset of behavior used by this project."""

    def __init__(self, k: int):
        self.chat_memory = _ChatMemory(window_size=k)

    def clear(self):
        self.chat_memory.clear()


class ConversationMemory:
    """
    Manages conversation memory with window size limiting
    
    Args:
        window_size: Number of messages to keep in memory
        return_messages: Whether to return messages as objects
    """
    
    def __init__(
        self,
        window_size: int = 10,
        return_messages: bool = True,
        session_id: Optional[str] = None,
        appwrite_service=None
    ):
        self.window_size = window_size
        self.return_messages = return_messages
        self.session_id = session_id
        self.appwrite_service = appwrite_service
        
        # Keep a bounded in-memory history.
        self.memory = _SimpleConversationBufferWindowMemory(k=window_size)
        
        # Load existing messages if session_id provided
        if session_id and appwrite_service:
            self._load_from_appwrite()
    
    def _load_from_appwrite(self):
        """Load conversation history from Appwrite"""
        if not self.appwrite_service or not self.session_id:
            return
        
        try:
            messages = self.appwrite_service.get_messages(self.session_id)
            
            for msg in messages:
                role = msg.get("role", "")
                content = msg.get("content", "")
                
                if role == "user":
                    self.memory.chat_memory.add_user_message(content)
                elif role == "assistant":
                    self.memory.chat_memory.add_ai_message(content)
                    
        except Exception as e:
            print(f"Error loading from Appwrite: {e}")
    
    def add_user_message(self, message: str):
        """Add a user message to memory"""
        self.memory.chat_memory.add_user_message(message)
        
        # Optionally persist to Appwrite
        if self.session_id and self.appwrite_service:
            try:
                self.appwrite_service.save_message(
                    session_id=self.session_id,
                    role="user",
                    content=message
                )
            except Exception as e:
                print(f"Error saving user message: {e}")
    
    def add_ai_message(self, message: str):
        """Add an AI message to memory"""
        self.memory.chat_memory.add_ai_message(message)
        
        # Optionally persist to Appwrite
        if self.session_id and self.appwrite_service:
            try:
                self.appwrite_service.save_message(
                    session_id=self.session_id,
                    role="assistant",
                    content=message
                )
            except Exception as e:
                print(f"Error saving AI message: {e}")
    
    def get_messages(self) -> List:
        """Get all messages in memory"""
        return self.memory.chat_memory.messages
    
    def get_history(self) -> List[Dict]:
        """Get messages as dict format for LLM"""
        messages = []
        for msg in self.get_messages():
            if hasattr(msg, "type"):
                # Internal message object with `type` and `content`
                role = "assistant" if msg.type == "ai" else "user"
                content = msg.content
            else:
                role = "user"
                content = str(msg)
            messages.append({"role": role, "content": content})
        return messages
    
    def clear(self):
        """Clear all messages from memory"""
        self.memory.clear()


def create_memory(
    window_size: int = 10,
    session_id: Optional[str] = None,
    appwrite_service=None
) -> ConversationMemory:
    """
    Factory function to create conversation memory
    
    Args:
        window_size: Number of messages to keep
        session_id: Optional session ID for persistence
        appwrite_service: Optional Appwrite service for persistence
    
    Returns:
        ConversationMemory instance
    """
    return ConversationMemory(
        window_size=window_size,
        return_messages=True,
        session_id=session_id,
        appwrite_service=appwrite_service
    )


# User-level memory (for long-term context across sessions)
class UserMemory:
    """Manages user-level memory for persistent context"""
    
    def __init__(self, user_id: str, appwrite_service):
        self.user_id = user_id
        self.appwrite_service = appwrite_service
        self._summary: Optional[str] = None
        self._load()
    
    def _load(self):
        """Load memory from Appwrite"""
        try:
            self._summary = self.appwrite_service.get_memory(self.user_id)
        except Exception as e:
            print(f"Error loading user memory: {e}")
            self._summary = None
    
    def get_summary(self) -> str:
        """Get the current memory summary"""
        return self._summary or ""
    
    def save_summary(self, summary: str):
        """Save a new summary"""
        self._summary = summary
        try:
            self.appwrite_service.save_memory(self.user_id, summary)
        except Exception as e:
            print(f"Error saving user memory: {e}")
    
    def update_with_conversation(self, messages: List[Dict]):
        """
        Update memory with new conversation
        Could use LangChain's summarization chain here
        """
        # Simple implementation: concatenate recent messages
        recent_text = "\n".join([
            f"{msg['role']}: {msg['content'][:100]}"
            for msg in messages[-5:]
        ])
        
        if self._summary:
            new_summary = self._summary + "\n" + recent_text
        else:
            new_summary = recent_text
        
        self.save_summary(new_summary)
