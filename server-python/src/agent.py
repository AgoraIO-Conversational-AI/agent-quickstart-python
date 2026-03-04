"""
Agent

High-level API for managing Agora Conversational AI Agents.
"""
import os
import time
from typing import Any, Dict
from agoraio import Agora, Area
from agoraio.wrapper import Agent as AgoraAgent
from agoraio.wrapper.vendors import OpenAI, ElevenLabsTTS, DeepgramSTT

class Agent:
    """
    High-level wrapper for Agora Conversational AI Agent operations.
    
    Provides methods to:
    - Start agents with ASR, LLM, and TTS configuration
    - Stop running agents
    
    Used internally by the FastAPI server to handle HTTP API requests.
    """
    
    def __init__(self):
        self.app_id = os.getenv("APP_ID")
        self.app_certificate = os.getenv("APP_CERTIFICATE")
        api_key = os.getenv("API_KEY")
        api_secret = os.getenv("API_SECRET")
        
        area_str = os.getenv("AGORA_AREA", "US")
        if area_str == "CN":
            area = Area.CN
        else:
            try:
                area = Area[area_str]
            except KeyError:
                area = Area.US
            
        self.client = Agora(area=area, username=api_key, password=api_secret)
        self.client.app_id = self.app_id
        self.client.app_certificate = self.app_certificate
    
    def start(
        self,
        channel_name: str,
        agent_uid: str,
        user_uid: str
    ) -> Dict[str, Any]:
        """
        Start agent with ASR, LLM, and TTS configuration.
        """
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
            failure_message="I'm sorry, I'm having trouble processing your request."
        )
        
        agora_agent = (
            agora_agent
            .with_llm(OpenAI(
                api_key=llm_api_key,
                model="gpt-4o-mini",
            ))
            .with_tts(ElevenLabsTTS(
                key=tts_api_key,
                voice_id=voice_id,
                model_id=model_id
            ))
            .with_stt(DeepgramSTT(
                api_key=asr_api_key,
                language="en-US"
            ))
        )
        
        session = agora_agent.create_session(
            client=self.client,
            channel=channel_name,
            agent_uid=str(agent_uid),
            remote_uids=[str(user_uid)],
            enable_string_uid=True,
            idle_timeout=120
        )

        agent_id = session.start()  # Token will be auto-generated
        
        return {
            "agent_id": agent_id,
            "channel_name": channel_name,
            "status": "started"
        }
    
    def stop(self, agent_id: str) -> None:
        """
        Stop a running agent.
        """
        if not agent_id or not str(agent_id).strip():
            raise ValueError("agent_id is required and cannot be empty")
        
        self.client.agents.stop(appid=self.app_id, agent_id=agent_id)
