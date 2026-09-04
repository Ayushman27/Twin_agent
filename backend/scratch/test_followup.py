import asyncio
from app.modules.demo_agent.voice_execution import extract_voice_intent

async def main():
    history = [
        {"role": "user", "content": "send message to ayushman"},
        {"role": "assistant", "content": "Got it, ayushman. What message would you like me to send to them?"}
    ]
    for prompt in [
        "hello how are you",
        "tell him that I am ready",
        "i will be late by 10 minutes",
        "that the meeting is postponed",
        "please join the call",
        "let us meet tomorrow at 10 am"
    ]:
        res = await extract_voice_intent(prompt, history)
        print(f"FOLLOWUP '{prompt}' -> {res}")

if __name__ == "__main__":
    asyncio.run(main())
