"""
Custom LangChain LLM wrapper for Beam Cloud inference
Provides both sync and async methods for streaming support
"""

from langchain.llms.base import LLM
from langchain.callbacks.manager import CallbackManagerForLLMRun
from typing import Optional, List, Any, Dict
import requests
import os
import aiohttp
import time
import asyncio


class BeamLLM(LLM):
    """
    Custom LangChain LLM that calls Beam Cloud endpoint
    
    Usage:
        llm = BeamLLM(
            endpoint_url="https://your-app.beam.cloud",
            beam_token="your_token"
        )
        response = llm._call(prompt="Hello", history=[{"role": "user", "content": "Hi"}])
    """
    
    endpoint_url: str = os.getenv("BEAM_ENDPOINT_URL", "")
    beam_token: str = os.getenv("BEAM_TOKEN", "")
    
    @property
    def _llm_type(self) -> str:
        return "beam"
    
    @property
    def _identifying_params(self) -> Dict[str, Any]:
        return {
            "endpoint_url": self.endpoint_url,
            "model": "Qwen3.5-9B-Uncensored"
        }
    
    def _call(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any
    ) -> str:
        """
        Synchronous call to Beam endpoint
        
        Args:
            prompt: The user's current prompt
            stop: Stop sequences (not used)
            run_manager: LangChain callback manager
            **kwargs: Additional arguments (history, temperature, etc.)
        
        Returns:
            The generated response string
        """
        history = kwargs.get("history", [])
        temperature = kwargs.get("temperature", 0.7)
        max_tokens = kwargs.get("max_tokens", 512)
        
        headers = {
            "Authorization": f"Bearer {self.beam_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "prompt": prompt,
            "history": history,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        # Retry up to 3 times with backoff (handles Beam cold starts gracefully)
        last_error = None
        for attempt in range(3):
            try:
                response = requests.post(
                    self.endpoint_url,
                    headers=headers,
                    json=payload,
                    timeout=300  # 5 minutes — enough for model load on cold start
                )
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get("response", "")
                elif response.status_code in (502, 503, 504):
                    # Gateway/server errors — container starting up, retry
                    last_error = f"Beam not ready (attempt {attempt+1}/3): {response.status_code}"
                    print(f"[BeamLLM] {last_error}, waiting 10s...")
                    time.sleep(10)
                else:
                    raise Exception(f"Beam API error: {response.status_code} - {response.text}")
                    
            except requests.exceptions.Timeout:
                last_error = f"Beam timeout (attempt {attempt+1}/3)"
                print(f"[BeamLLM] {last_error}")
                if attempt < 2:
                    time.sleep(5)
            except requests.exceptions.RequestException as e:
                raise Exception(f"Failed to connect to Beam: {str(e)}")
        
        raise Exception(f"Beam failed after 3 attempts. Last error: {last_error}")
    
    async def _acall(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any
    ) -> str:
        """
        Asynchronous call to Beam endpoint for streaming
        
        Args:
            prompt: The user's current prompt
            stop: Stop sequences (not used)
            run_manager: LangChain callback manager
            **kwargs: Additional arguments (history, temperature, etc.)
        
        Returns:
            The generated response string
        """
        history = kwargs.get("history", [])
        temperature = kwargs.get("temperature", 0.7)
        max_tokens = kwargs.get("max_tokens", 512)
        
        headers = {
            "Authorization": f"Bearer {self.beam_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "prompt": prompt,
            "history": history,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        timeout = aiohttp.ClientTimeout(total=300)
        
        # Retry up to 3 times with backoff (handles Beam cold starts gracefully)
        last_error = None
        for attempt in range(3):
            try:
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    async with session.post(
                        self.endpoint_url,
                        headers=headers,
                        json=payload
                    ) as response:
                        if response.status == 200:
                            result = await response.json()
                            return result.get("response", "")
                        elif response.status in (502, 503, 504):
                            last_error = f"Beam not ready (attempt {attempt+1}/3): {response.status}"
                            print(f"[BeamLLM] {last_error}, waiting 10s...")
                            await asyncio.sleep(10)
                        else:
                            text = await response.text()
                            raise Exception(f"Beam API error: {response.status} - {text}")
            except asyncio.TimeoutError:
                last_error = f"Beam async timeout (attempt {attempt+1}/3)"
                print(f"[BeamLLM] {last_error}")
                if attempt < 2:
                    await asyncio.sleep(5)
        
        raise Exception(f"Beam failed after 3 attempts. Last error: {last_error}")
    
    async def _astream(
        self,
        prompt: str,
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any
    ):
        """
        Stream tokens from Beam endpoint
        
        This is a generator that yields tokens as they come in
        """
        history = kwargs.get("history", [])
        
        headers = {
            "Authorization": f"Bearer {self.beam_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "prompt": prompt,
            "history": history
        }
        
        timeout = aiohttp.ClientTimeout(total=300)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                self.endpoint_url,
                headers=headers,
                json=payload
            ) as response:
                if response.status != 200:
                    text = await response.text()
                    raise Exception(f"Beam API error: {response.status} - {text}")
                
                # Read the response as a stream
                async for chunk in response.content.iter_chunked(1024):
                    if chunk:
                        text = chunk.decode('utf-8')
                        yield text


def get_beam_llm() -> BeamLLM:
    """Factory function to create BeamLLM instance from settings"""
    from core.config import get_settings  # Fixed: was 'from backend.core.config'
    settings = get_settings()
    
    return BeamLLM(
        endpoint_url=settings.beam_endpoint_url,
        beam_token=settings.beam_token
    )
