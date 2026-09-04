"""
Unit and integration tests for NVIDIA NeMo Speech-to-Speech service & API router.
"""
import base64
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.nemo_speech import nemo_speech_service

@pytest.mark.asyncio
async def test_nemo_speech_synthesis_wav():
    """Test synthesis of vocal audio bytes."""
    text = "Hello from NVIDIA NeMo Speech testing."
    audio_bytes = nemo_speech_service.synthesize_speech_wav(text)
    assert len(audio_bytes) > 0

@pytest.mark.asyncio
async def test_nemo_speech_transcription():
    """Test ASR transcription logic."""
    dummy_wav = nemo_speech_service.synthesize_speech_wav("Test prompt")
    transcript = await nemo_speech_service.transcribe_audio(dummy_wav)
    assert isinstance(transcript, str)
    assert len(transcript) > 0

@pytest.mark.asyncio
async def test_nemo_speech_s2s_pipeline():
    """Test complete Speech-to-Speech execution pipeline."""
    dummy_wav = nemo_speech_service.synthesize_speech_wav("Send hi to Shreyasi Panigrahi")
    res = await nemo_speech_service.process_speech_to_speech(
        audio_bytes=dummy_wav,
        history=[],
        user_name="Test User"
    )
    assert "transcript" in res
    assert "response" in res
    assert "audio_b64" in res
    assert res["audio_format"] in ["audio/mp3", "audio/wav"]

@pytest.mark.asyncio
async def test_nemo_speech_api_endpoints():
    """Test FastAPI REST endpoints for NeMo Speech."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test Synthesize endpoint
        resp_synth = await client.post(
            "/api/v1/nemo-speech/synthesize",
            json={"text": "Testing NeMo TTS endpoint", "voice": "en_US-Female-1"}
        )
        assert resp_synth.status_code == 200
        assert "audio/" in resp_synth.headers["content-type"]
        assert len(resp_synth.content) > 0

        # 2. Test S2S REST endpoint with prompt payload
        resp_s2s = await client.post(
            "/api/v1/nemo-speech/speech-to-speech",
            data={"prompt": "Hello Echo, what can you do?", "user_name": "Rohan"}
        )
        assert resp_s2s.status_code == 200
        data_s2s = resp_s2s.json()
        assert data_s2s["transcript"] == "Hello Echo, what can you do?"
        assert "response" in data_s2s
        assert "audio_b64" in data_s2s
