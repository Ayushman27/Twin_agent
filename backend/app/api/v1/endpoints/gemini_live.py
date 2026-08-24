"""
Gemini Live WebSocket API Bridge Endpoint
Enables real-time voice-to-voice streaming with Gemini Multimodal Live API over WebSockets.
"""
import os
import json
import asyncio
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Gemini Live API WebSocket endpoint URI
GEMINI_LIVE_WS_URL = (
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
)

@router.websocket("/ws/gemini-live")
async def gemini_live_websocket(websocket: WebSocket):
    """
    Bi-directional WebSocket proxy connecting browser web audio client to Gemini 2.0 Live Multimodal API.
    """
    await websocket.accept()
    logger.info("Client connected to Gemini Live WebSocket proxy")

    api_key = settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        logger.warning("GEMINI_API_KEY environment variable not set. Running in mock/simulation mode.")

    gemini_url = f"{GEMINI_LIVE_WS_URL}?key={api_key}"

    try:
        if api_key:
            async with websockets.connect(gemini_url) as gemini_ws:
                # 1. Send initial setup configuration frame
                setup_message = {
                    "setup": {
                        "model": "models/gemini-2.0-flash-realtime-exp",
                        "generationConfig": {
                            "responseModalities": ["AUDIO", "TEXT"],
                            "speechConfig": {
                                "voiceConfig": {
                                    "prebuiltVoiceConfig": {
                                        "voiceName": "Puck"
                                    }
                                }
                            }
                        },
                        "systemInstruction": {
                            "parts": [
                                {
                                    "text": "You are the AI Twin Executive Assistant for Rohan in the Twin Agent Platform. Respond concisely, helpfully, and with natural professional tone in real-time voice."
                                }
                            ]
                        }
                    }
                }
                await gemini_ws.send(json.dumps(setup_message))

                # Task to relay messages from Gemini to Client
                async def gemini_to_client():
                    try:
                        async for msg in gemini_ws:
                            await websocket.send_text(msg if isinstance(msg, str) else msg.decode('utf-8'))
                    except Exception as e:
                        logger.error(f"Error relaying from Gemini to client: {e}")

                # Task to relay messages from Client to Gemini
                async def client_to_gemini():
                    try:
                        while True:
                            data = await websocket.receive_text()
                            await gemini_ws.send(data)
                    except Exception as e:
                        logger.error(f"Error relaying from client to Gemini: {e}")

                await asyncio.gather(gemini_to_client(), client_to_gemini())
        else:
            # Fallback/Mock Mode when no API Key is provided
            while True:
                data_str = await websocket.receive_text()
                try:
                    msg = json.loads(data_str)
                    if "setup" in msg:
                        await websocket.send_text(json.dumps({"setupComplete": {}}))
                    elif "realtimeInput" in msg:
                        # Echo back mock turn / audio notification if mic data sent
                        pass
                    elif "clientContent" in msg:
                        user_text = ""
                        turns = msg.get("clientContent", {}).get("turns", [])
                        if turns and "parts" in turns[0]:
                            user_text = turns[0]["parts"][0].get("text", "")
                        
                        # Generate dynamic intelligent response using LLM provider
                        try:
                            from app.ai.llm import get_llm_provider
                            llm = get_llm_provider()
                            ai_reply = await llm.generate(
                                system_prompt="You are Rohan's AI Digital Twin Executive Assistant. Answer concisely, intelligently, and helpfully in 1-2 sentences.",
                                user_message=user_text or "Hello"
                            )
                        except Exception as err:
                            logger.error(f"LLM Generation Error: {err}")
                            ai_reply = f"I am your AI Twin Assistant. Processing your task: '{user_text}'. All systems and agents are synchronized."

                        await websocket.send_text(json.dumps({
                            "serverContent": {
                                "modelTurn": {
                                    "parts": [{
                                        "text": ai_reply
                                    }]
                                }
                            }
                        }))
                except Exception as e:
                    logger.error(f"Mock WebSocket parsing error: {e}")

    except WebSocketDisconnect:
        logger.info("Client disconnected from Gemini Live WebSocket proxy")
    except Exception as e:
        logger.error(f"Gemini Live WebSocket exception: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
