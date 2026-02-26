# -*- coding: utf-8 -*-
"""
Agora Agent & Token Service

HTTP APIs:
- GET  /get_config     -> Agent.generate_config()
- POST /v2/startAgent  -> Agent.start()
- POST /v2/stopAgent   -> Agent.stop()
"""
import os
import random
import time
from dotenv import load_dotenv

# Load environment variables from .env.local or .env
_base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_base_dir, '.env.local'))
load_dotenv(os.path.join(_base_dir, '.env'))

from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agora_rest.agent import TokenBuilder
from src.agent import Agent

def _to_http_error(exc: Exception) -> HTTPException:
    """Convert SDK exceptions to HTTP errors"""
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    if isinstance(exc, RuntimeError):
        return HTTPException(status_code=500, detail=str(exc))
    return HTTPException(status_code=500, detail=f"Internal error: {exc}")

try:
    agent = Agent()
except ValueError as e:
    print(f"Warning: Failed to initialize SDK: {e}")
    print("Service will fail if endpoints are called without proper configuration")
    agent = None


# FastAPI application
app = FastAPI(
    title="Agora Agent & Token Service",
    version="2.0.0",
    description="Agora Conversational AI service",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()


# Request models
class StartAgentRequest(BaseModel):
    """Request body for POST /v2/startAgent"""
    channelName: str
    rtcUid: str
    userUid: str


class StopAgentRequest(BaseModel):
    """Request body for POST /v2/stopAgent"""
    agentId: str


# API endpoints
@router.get("/get_config")
def get_config():
    """Generate connection configuration"""
    if agent is None:
        raise HTTPException(
            status_code=500,
            detail="Service not properly configured. Please check environment variables.",
        )

    try:
        # Generate random UIDs
        user_uid = random.randint(1000, 9999999)
        agent_uid = random.randint(10000000, 99999999)
        
        # Generate channel name
        channel_name = f"channel_{int(time.time())}"
        
        # Get credentials from environment
        app_id = os.getenv("APP_ID")
        app_certificate = os.getenv("APP_CERTIFICATE")
        
        # Generate token using TokenBuilder
        token = TokenBuilder.generate(
            app_id=app_id,
            app_certificate=app_certificate,
            channel_name=channel_name,
            uid=str(user_uid),
            expire=86400  # 24 hours
        )
        
        config_data = {
            "app_id": app_id,
            "token": token,
            "uid": str(user_uid),
            "channel_name": channel_name,
            "agent_uid": str(agent_uid)
        }
        
        return {
            "code": 0,
            "data": config_data,
            "msg": "success",
        }
    except Exception as e:
        raise _to_http_error(e)


@router.post("/v2/startAgent")
def start_agent(request: StartAgentRequest):
    """Start agent in a channel"""
    if agent is None:
        raise HTTPException(
            status_code=500,
            detail="Service not properly configured. Please check environment variables.",
        )

    try:
        result = agent.start(
            channel_name=request.channelName,
            agent_uid=request.rtcUid,
            user_uid=request.userUid,
        )
        return {"code": 0, "msg": "success", "data": result}
    except Exception as e:
        raise _to_http_error(e)


@router.post("/v2/stopAgent")
def stop_agent(request: StopAgentRequest):
    """Stop agent by ID"""
    if agent is None:
        raise HTTPException(
            status_code=500,
            detail="Service not properly configured. Please check environment variables.",
        )

    try:
        agent.stop(request.agentId)
        return {"code": 0, "msg": "success"}
    except Exception as e:
        if isinstance(e, ValueError):
            raise HTTPException(status_code=404, detail=str(e))
        raise _to_http_error(e)


app.include_router(router)


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
