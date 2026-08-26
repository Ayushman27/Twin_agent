"""
End-to-End Diagnostic & Integration Verification Script
Twin Agent — Telegram + Messaging UI + Voice Agent Communication Pipeline
"""
import asyncio
import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.core.database import AsyncSessionLocal, init_db
from app.db.models.message import Message
from app.integrations.telegram.models import TelegramIdentity
from app.services.communication import CommunicationService
from app.modules.demo_agent.voice_execution import execute_voice_prompt
from app.modules.auth.models import User, UserRole
from app.core.security import hash_password
from sqlalchemy import select


async def run_diagnostics():
    print("=" * 70)
    print("RUNNING TWIN AGENT COMMUNICATION PIPELINE DIAGNOSTICS")
    print("=" * 70)

    # 1. Initialize DB
    await init_db()
    print("DONE: Database initialized successfully.")

    async with AsyncSessionLocal() as session:
        # Seed test user & telegram identity for testing
        res = await session.execute(select(User).where(User.email == "rahul.test@company.ai"))
        rahul = res.scalar_one_or_none()
        if not rahul:
            rahul = User(
                id="emp_rahul_123",
                name="Rahul Sharma",
                email="rahul.test@company.ai",
                password_hash=hash_password("TestPassword123"),
                role=UserRole.EMPLOYEE,
                job_title="Senior Product Manager",
                is_active=True,
            )
            session.add(rahul)
            await session.flush()

        res_tg = await session.execute(select(TelegramIdentity).where(TelegramIdentity.user_id == "emp_rahul_123"))
        tg_identity = res_tg.scalar_one_or_none()
        if not tg_identity:
            tg_identity = TelegramIdentity(
                user_id="emp_rahul_123",
                telegram_chat_id=987654321,
                telegram_username="rahul_sharma",
                telegram_first_name="Rahul",
            )
            session.add(tg_identity)

        # Seed unlinked employee
        res_priya = await session.execute(select(User).where(User.email == "priya.test@company.ai"))
        priya = res_priya.scalar_one_or_none()
        if not priya:
            priya = User(
                id="emp_priya_456",
                name="Priya Patel",
                email="priya.test@company.ai",
                password_hash=hash_password("TestPassword123"),
                role=UserRole.EMPLOYEE,
                job_title="UX Designer",
                is_active=True,
            )
            session.add(priya)

        await session.commit()
        print("[OK] Test employee identities & Telegram bindings seeded.")

        comm = CommunicationService(session)

        # 2. Test Recipient Resolution for linked user
        res_resolved = await comm.resolve_recipient("Rahul")
        print("\n--- TEST 1: Recipient Resolution (Linked) ---")
        print(f"Result: {res_resolved}")
        assert res_resolved["success"] is True
        assert res_resolved["chat_id"] == 987654321
        print("[OK] Resolved linked recipient 'Rahul' -> chat_id: 987654321")

        # 3. Test Recipient Resolution for unlinked user
        res_unlinked = await comm.resolve_recipient("Priya")
        print("\n--- TEST 2: Recipient Resolution (Unlinked User on Platform) ---")
        print(f"Result: {res_unlinked}")
        assert res_unlinked["success"] is True
        assert res_unlinked["telegram_connected"] is False
        assert res_unlinked["chat_id"] is None
        print("[OK] Resolved unlinked platform recipient 'Priya' (telegram_connected: False)")

        # 4. Test Recipient Resolution for unknown user
        res_unknown = await comm.resolve_recipient("NonExistentUser123")
        print("\n--- TEST 3: Recipient Resolution (Unknown) ---")
        print(f"Result: {res_unknown}")
        assert res_unknown["success"] is False
        assert res_unknown["error_code"] == "RECIPIENT_NOT_FOUND"
        print("[OK] Correctly handled unknown recipient with RECIPIENT_NOT_FOUND")

        # 5. Test Voice Agent Tool Trigger (User's Exact Spoken Query)
        print("\n--- TEST 4: Voice Agent Exact Prompt Test ---")
        voice_res_exact = await execute_voice_prompt({
            "prompt": 'send msg to rahul "hello" using twin agent platform.',
            "user_id": "emp_priya_456",
            "user_name": "Priya Patel",
        })
        print(f"Voice Response: {voice_res_exact}")
        assert voice_res_exact.get("tool_executed") == "telegram_messaging"
        assert "Rahul Sharma" in voice_res_exact["response"]
        print("[OK] Voice Agent correctly parsed 'send msg to rahul \"hello\" using twin agent platform.' and sent message!")

        # 6. Test Voice Agent Tool Trigger (Unlinked User)
        print("\n--- TEST 5: Voice Agent Messaging Command (Unlinked User) ---")
        voice_res_unlinked = await execute_voice_prompt({
            "prompt": "Send a message to Priya saying I will send the designs soon",
            "user_id": "emp_rahul_123",
            "user_name": "Rahul Sharma",
        })
        print(f"Voice Response: {voice_res_unlinked}")
        assert voice_res_unlinked.get("tool_executed") == "telegram_messaging"
        assert "Twin Agent Platform" in voice_res_unlinked["response"]
        print("[OK] Voice Agent accurately spoke: 'I have sent the message ... to Priya Patel on the Twin Agent Platform.'")

        # 7. Test Voice Agent Messaging Command (Unknown User)
        print("\n--- TEST 6: Voice Agent Messaging Command (Unknown User) ---")
        voice_res_unknown = await execute_voice_prompt({
            "prompt": "Send a message to NonExistentUser saying Hello"
        })
        print(f"Voice Response: {voice_res_unknown}")
        assert "Could not find employee" in voice_res_unknown["response"]
        print("[OK] Voice Agent accurately spoke: 'Could not find employee named NonExistentUser.'")

    print("\n" + "=" * 70)
    print("ALL DIAGNOSTIC SUITES PASSED SUCCESSFULLY [OK]")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_diagnostics())
