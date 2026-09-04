import asyncio
from app.modules.demo_agent.voice_execution import extract_voice_intent, execute_voice_prompt
from app.core.database import AsyncSessionLocal

prompts = [
    "send message to ayushman",
    "send a message to ayushman",
    "send message to Ayushman that I will be late",
    "send a message to ayushman saying hello",
    "message ayushman hello",
    "tell ayushman hello",
    "tell ayushman that i am coming",
    "send message to Shreyasi",
    "send a message to Shreyasi saying let us meet",
    "send message to John",
    "send message to John Doe saying hi",
    "can you send message to ayushman",
    "hey echo send message to ayushman",
    "send message to ayushman: hello how are you",
    "send a message to ayushman that project is done",
    "send ayushman a message that project is done",
    "send message to ayushman saying we have a meeting",
]

async def main():
    print("=== TESTING EXTRACT VOICE INTENT ===")
    for p in prompts:
        res = await extract_voice_intent(p, [])
        print(f"PROMPT: '{p}' -> {res}")

    print("\n=== TESTING FULL EXECUTE VOICE PROMPT ===")
    async with AsyncSessionLocal() as session:
        for p in [
            "send a message to ayushman saying hello from test",
            "send ayushman a message saying meet me at 5",
            "tell ayushman that report is submitted",
        ]:
            out = await execute_voice_prompt(
                payload={
                    "prompt": p,
                    "history": [],
                    "user_id": "1ee2e287-5511-4ad0-9c84-d6cd331d2643",
                    "user_name": "Shreyasi Panigrahy",
                },
                db_session=session,
            )
            print(f"EXECUTE '{p}':\n  Output: {out.get('output')}\n  Tool Executed: {out.get('tool_executed')}\n  Tool Result: {out.get('tool_result')}\n")

if __name__ == "__main__":
    asyncio.run(main())
