"""Demo agent endpoint tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_session_anonymous(client: AsyncClient):
    response = await client.post("/api/v1/demo-agent/session", json={})
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["session_status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_chat_with_agent(client: AsyncClient):
    session_r = await client.post("/api/v1/demo-agent/session", json={})
    session_id = session_r.json()["id"]

    response = await client.post("/api/v1/demo-agent/chat", json={
        "session_id": session_id,
        "message": "Hello, what is Twin Agent?",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == session_id
    assert data["agent_reply"]["sender"] == "agent"
    assert len(data["agent_reply"]["message"]) > 10


@pytest.mark.asyncio
async def test_get_session_history(client: AsyncClient):
    session_r = await client.post("/api/v1/demo-agent/session", json={})
    session_id = session_r.json()["id"]
    await client.post("/api/v1/demo-agent/chat", json={
        "session_id": session_id, "message": "What is an agent?"
    })

    response = await client.get(f"/api/v1/demo-agent/session/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["messages"]) == 2  # user + agent


@pytest.mark.asyncio
async def test_end_session(client: AsyncClient):
    session_r = await client.post("/api/v1/demo-agent/session", json={})
    session_id = session_r.json()["id"]

    response = await client.delete(f"/api/v1/demo-agent/session/{session_id}")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_chat_on_ended_session(client: AsyncClient):
    session_r = await client.post("/api/v1/demo-agent/session", json={})
    session_id = session_r.json()["id"]
    await client.delete(f"/api/v1/demo-agent/session/{session_id}")

    response = await client.post("/api/v1/demo-agent/chat", json={
        "session_id": session_id, "message": "Still there?"
    })
    assert response.status_code == 422
