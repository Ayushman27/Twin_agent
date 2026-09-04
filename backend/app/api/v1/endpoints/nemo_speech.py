"""
NVIDIA NeMo Speech-to-Speech FastAPI Endpoint Router.
Exposes REST and WebSocket interfaces for NeMo ASR, TTS, and Speech-to-Speech workflows.
"""
import json
import base64
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, Response, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel

from app.services.nemo_speech import nemo_speech_service

logger = logging.getLogger(__name__)

router = APIRouter()

class SynthesizeRequest(BaseModel):
    text: str
    voice: Optional[str] = None

class SpeechToSpeechTextRequest(BaseModel):
    prompt: str
    history: Optional[List[Dict[str, str]]] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    voice: Optional[str] = None

@router.post("/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    """
    Transcribe audio file using NVIDIA NeMo ASR (FastConformer / Canary).
    """
    try:
        content = await audio_file.read()
        transcript = await nemo_speech_service.transcribe_audio(content, filename=audio_file.filename or "audio.wav")
        return {"transcript": transcript, "model": nemo_speech_service.asr_model}
    except Exception as exc:
        logger.error(f"Error in transcribe_audio endpoint: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/synthesize")
async def synthesize_speech(req: SynthesizeRequest):
    """
    Synthesize text into vocal audio stream using NVIDIA NeMo Speech or gTTS synthesizer.
    """
    try:
        audio_bytes, media_type = nemo_speech_service.synthesize_speech_bytes(req.text, voice=req.voice)
        return Response(content=audio_bytes, media_type=media_type)
    except Exception as exc:
        logger.error(f"Error in synthesize_speech endpoint: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@router.post("/speech-to-speech")
async def speech_to_speech_file(
    audio_file: Optional[UploadFile] = File(None),
    prompt: Optional[str] = Form(None),
    history_json: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    user_name: Optional[str] = Form(None),
    voice: Optional[str] = Form(None),
):
    """
    Execute full Speech-to-Speech turn using NVIDIA NeMo pipeline.
    """
    try:
        history = json.loads(history_json) if history_json else []
        audio_bytes = b""
        if audio_file:
            audio_bytes = await audio_file.read()

        # If direct text prompt provided without audio, transcribe is skipped
        if prompt and not audio_bytes:
            from app.modules.demo_agent.voice_execution import execute_voice_prompt
            exec_res = await execute_voice_prompt({
                "prompt": prompt,
                "history": history,
                "user_id": user_id,
                "user_name": user_name,
            })
            ai_reply = exec_res.get("response") or exec_res.get("output", "")
            audio_wav = nemo_speech_service.synthesize_speech_wav(ai_reply, voice=voice)
            audio_b64 = base64.b64encode(audio_wav).decode("utf-8")
            return {
                "transcript": prompt,
                "response": ai_reply,
                "audio_b64": audio_b64,
                "audio_format": "audio/wav",
                "tool_executed": exec_res.get("tool_executed"),
                "tool_result": exec_res.get("tool_result"),
            }

        result = await nemo_speech_service.process_speech_to_speech(
            audio_bytes=audio_bytes,
            history=history,
            user_id=user_id,
            user_name=user_name,
            voice=voice
        )
        return result
    except Exception as exc:
        logger.error(f"Error in speech_to_speech endpoint: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))

@router.websocket("/ws/nemo-speech")
async def nemo_speech_websocket(websocket: WebSocket):
    """
    Bi-directional WebSocket streaming endpoint for NVIDIA NeMo Speech-to-Speech sessions.
    """
    await websocket.accept()
    logger.info("Client connected to NVIDIA NeMo Speech WebSocket")
    
    # Send ready setup frame
    await websocket.send_text(json.dumps({
        "status": "connected",
        "engine": "NVIDIA NeMo Speech S2S",
        "asr_model": nemo_speech_service.asr_model,
        "tts_voice": nemo_speech_service.default_voice
    }))

    try:
        while True:
            msg_text = await websocket.receive_text()
            try:
                data = json.loads(msg_text)
                msg_type = data.get("type", "speech_turn")

                if msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                elif msg_type == "speech_turn":
                    user_prompt = data.get("prompt", "")
                    audio_b64_in = data.get("audio_b64")
                    history = data.get("history", [])
                    user_id = data.get("user_id")
                    user_name = data.get("user_name")
                    voice = data.get("voice")

                    audio_bytes = base64.b64decode(audio_b64_in) if audio_b64_in else b""
                    
                    if user_prompt and not audio_bytes:
                        transcript = user_prompt
                        from app.modules.demo_agent.voice_execution import execute_voice_prompt
                        exec_res = await execute_voice_prompt({
                            "prompt": transcript,
                            "history": history,
                            "user_id": user_id,
                            "user_name": user_name
                        })
                        ai_reply = exec_res.get("response") or exec_res.get("output", "")
                        audio_wav = nemo_speech_service.synthesize_speech_wav(ai_reply, voice=voice)
                        audio_b64_out = base64.b64encode(audio_wav).decode("utf-8")
                        s2s_res = {
                            "transcript": transcript,
                            "response": ai_reply,
                            "audio_b64": audio_b64_out,
                            "audio_format": "audio/wav",
                            "tool_executed": exec_res.get("tool_executed"),
                            "tool_result": exec_res.get("tool_result"),
                        }
                    else:
                        s2s_res = await nemo_speech_service.process_speech_to_speech(
                            audio_bytes=audio_bytes,
                            history=history,
                            user_id=user_id,
                            user_name=user_name,
                            voice=voice
                        )

                    await websocket.send_text(json.dumps({
                        "type": "speech_response",
                        "data": s2s_res
                    }))
            except Exception as e:
                logger.error(f"NeMo WebSocket message error: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": str(e)
                }))

    except WebSocketDisconnect:
        logger.info("Client disconnected from NVIDIA NeMo Speech WebSocket")
    except Exception as e:
        logger.error(f"NeMo WebSocket exception: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
