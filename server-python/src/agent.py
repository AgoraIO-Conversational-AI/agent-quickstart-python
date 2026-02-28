"""
Agent

High-level API for managing Agora Conversational AI Agents.
"""
import os
import json
import time
from typing import Any, Dict, Optional, Tuple
from agoraio import Agora, Area
from agoraio.wrapper import Agent as AgoraAgent
from agoraio.wrapper.vendors import OpenAI, ElevenLabsTTS, DeepgramSTT
from agora_token_builder import RtcTokenBuilder, Role_Publisher


def _model_dump(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return value.model_dump(exclude_none=True)
    if hasattr(value, "dict"):
        return value.dict(exclude_none=True)
    return value


def _redact_for_curl(value: Any, path: Tuple[str, ...] = ()) -> Any:
    if isinstance(value, dict):
        return {k: _redact_for_curl(v, (*path, str(k))) for k, v in value.items()}
    if isinstance(value, list):
        return [_redact_for_curl(v, path) for v in value]

    if not path:
        return value

    key = path[-1]
    if key == "token":
        return "$RTC_RTM_TOKEN"
    if key == "api_key" and "llm" in path:
        return "$LLM_API_KEY"
    if key == "key" and ("tts" in path or "params" in path):
        return "$TTS_ELEVENLABS_API_KEY"
    if key == "api_key" and ("asr" in path or "stt" in path or "params" in path):
        return "$ASR_DEEPGRAM_API_KEY"
    if key in {"password", "api_secret", "secret", "secret_key"}:
        return "$API_SECRET"

    return value


def _curl_command(*, method: str, url: str, json_body: Optional[Any] = None) -> str:
    # Always print raw curl without redaction as requested
    base = f"curl -sS -X {method} '{url}' -u \"$API_KEY:$API_SECRET\""
    if json_body is None:
        return base
    body = json.dumps(json_body, ensure_ascii=False, separators=(",", ":"))
    return f"{base} -H 'Content-Type: application/json' -d '{body}'"


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

        token = RtcTokenBuilder.build_token_with_rtm(
            app_id=self.app_id,
            app_certificate=self.app_certificate,
            channel_name=channel_name,
            account=str(agent_uid),
            role=Role_Publisher,
            token_expire=86400,
            privilege_expire=86400
        )

        asr_api_key = os.getenv("ASR_DEEPGRAM_API_KEY")
        llm_api_key = os.getenv("LLM_API_KEY")
        tts_api_key = os.getenv("TTS_ELEVENLABS_API_KEY")
        voice_id = os.getenv("TTS_ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
        model_id = os.getenv("TTS_ELEVENLABS_MODEL_ID", "eleven_turbo_v2")

        name = f"agent_{channel_name}_{agent_uid}_{int(time.time())}"
        
        agent_config = AgoraAgent(
            name=name,
            instructions="You are a helpful AI assistant.",
            greeting="Hello! I am your AI assistant. How can I help you?",
            failure_message="I'm sorry, I'm having trouble processing your request."
        )
        
        agent_config = (
            agent_config
            .with_llm(OpenAI(
                api_key=llm_api_key,
                model="gpt-4o-mini",
                # wrapper uses base_url if needed, defaulting to OpenAI
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
        
        session = agent_config.create_session(
            client=self.client,
            channel=channel_name,
            agent_uid=str(agent_uid),
            remote_uids=[str(user_uid)],
            token=token,
            enable_string_uid=True,
            idle_timeout=120
        )

        base_url = self.client.get_current_url() if hasattr(self.client, "get_current_url") else ""
        join_url = f"{base_url}/v2/projects/{self.app_id}/join"
        properties = agent_config.to_properties(
            channel=channel_name,
            agent_uid=str(agent_uid),
            remote_uids=[str(user_uid)],
            idle_timeout=120,
            enable_string_uid=True,
            token=token,
        )
        print(_curl_command(method="POST", url=join_url, json_body={"name": name, "properties": _model_dump(properties)}))

        agent_id = session.start()
        
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
        
        base_url = self.client.get_current_url() if hasattr(self.client, "get_current_url") else ""
        leave_url = f"{base_url}/v2/projects/{self.app_id}/agents/{agent_id}/leave"
        print(_curl_command(method="POST", url=leave_url))
        self.client.agents.stop(appid=self.app_id, agent_id=agent_id)
