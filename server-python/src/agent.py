"""
Agent

High-level API for managing Agora Conversational AI Agents.
"""
import os
import time
from typing import Any, Dict
from agora_agent import Agora, Area
from agora_agent.agentkit import Agent as AgoraAgent
from agora_agent.agentkit.vendors import OpenAI, ElevenLabsTTS, DeepgramSTT


class Agent:
    """
    High-level wrapper for Agora Conversational AI Agent operations.
    
    Uses AgentSession for full lifecycle management (start/stop),
    which handles Token007 authentication automatically.
    """
    
    def __init__(self):
        self.app_id = os.getenv("APP_ID")
        self.app_certificate = os.getenv("APP_CERTIFICATE")
        
        if not self.app_id or not self.app_certificate:
            raise ValueError("APP_ID and APP_CERTIFICATE are required")
        
        self.client = Agora(
            area=Area.US,
            app_id=self.app_id,
            app_certificate=self.app_certificate,
        )
        
        # Track active sessions by agent_id
        self._sessions: Dict[str, Any] = {}
    
    def start(
        self,
        channel_name: str,
        agent_uid: str,
        user_uid: str
    ) -> Dict[str, Any]:
        """Start agent with ASR, LLM, and TTS configuration."""
        if not channel_name or not str(channel_name).strip():
            raise ValueError("channel_name is required and cannot be empty")
        if not agent_uid or not str(agent_uid).strip():
            raise ValueError("agent_uid is required and cannot be empty")
        if not user_uid or not str(user_uid).strip():
            raise ValueError("user_uid is required and cannot be empty")

        asr_api_key = os.getenv("ASR_DEEPGRAM_API_KEY")
        llm_api_key = os.getenv("LLM_API_KEY")
        tts_api_key = os.getenv("TTS_ELEVENLABS_API_KEY")
        voice_id = os.getenv("TTS_ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
        model_id = os.getenv("TTS_ELEVENLABS_MODEL_ID", "eleven_turbo_v2")

        name = f"agent_{channel_name}_{agent_uid}_{int(time.time())}"
        
        agora_agent = AgoraAgent(
            name=name,
            instructions="You are a helpful AI assistant.",
            greeting="Hello! I am your AI assistant. How can I help you?",
            failure_message="I'm sorry, I'm having trouble processing your request.",
            advanced_features={"enable_rtm": True},
            parameters={"data_channel": "rtm", "enable_error_message": True},
        )
        
        agora_agent = (
            agora_agent
            .with_llm(OpenAI(api_key=llm_api_key, model="gpt-4o-mini"))
            .with_tts(ElevenLabsTTS(key=tts_api_key, voice_id=voice_id, model_id=model_id))
            .with_stt(DeepgramSTT(api_key=asr_api_key, language="en-US"))
        )
        
        session = agora_agent.create_session(
            client=self.client,
            channel=channel_name,
            agent_uid=str(agent_uid),
            remote_uids=["*"],
            enable_string_uid=True,
            idle_timeout=120,
        )

        agent_id = session.start()
        
        # Save session for later stop
        self._sessions[agent_id] = session
        
        return {
            "agent_id": agent_id,
            "channel_name": channel_name,
            "status": "started",
        }
    
    def stop(self, agent_id: str) -> None:
        """Stop a running agent via its session."""
        if not agent_id or not str(agent_id).strip():
            raise ValueError("agent_id is required and cannot be empty")
        
        session = self._sessions.pop(agent_id, None)
        if session:
            session.stop()
        else:
            raise ValueError(f"No active session found for agent_id: {agent_id}")
