import re

LEADING_NOISE_RE = re.compile(
    r"^(?:new|hey|echo|eco|eko|can\s+you|could\s+you|please|so|okay|ok|i\s+want\s+to|i'd\s+like\s+to|kindly)\s+",
    re.IGNORECASE
)

TRAILING_PHRASES = [
    r"\s+using\s+(?:the\s+)?twin\s+agent\s+platform.*$",
    r"\s+using\s+(?:the\s+)?twin\s+agent.*$",
    r"\s+on\s+(?:the\s+)?twin\s+agent\s+platform.*$",
    r"\s+on\s+(?:the\s+)?twin\s+agent.*$",
    r"\s+via\s+telegram.*$",
    r"\s+on\s+telegram.*$",
    r"\s+through\s+(?:the\s+)?twin\s+agent\s+platform.*$",
    r"\s+through\s+(?:the\s+)?twin\s+agent.*$",
]

def _clean_extracted_text(text: str) -> str:
    if not text:
        return ""
    cleaned = text.strip()
    for tp in TRAILING_PHRASES:
        cleaned = re.sub(tp, "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip("\"' ")
    cleaned = re.sub(r"^(?:tell\s+(?:him|her|them|everyone)\s+that\s+|tell\s+(?:him|her|them)\s+|saying\s+that\s+|saying\s+|that\s+|to\s+|:\s*|-\s*|,\s*)", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = cleaned.strip("\"' ")
    return cleaned

REC_WORD = r"(?!an?\b|the\b|to\b)[a-zA-Z0-9_]+"
REC_LAZY = r"(?P<recipient>" + REC_WORD + r"(?:\s+" + REC_WORD + r")*?)"
REC_1_2 = r"(?P<recipient>" + REC_WORD + r"(?:\s+" + REC_WORD + r"){0,2})"
DELIM = r"(?:\s+(?:saying|said\s+that|that|for|about)\s*|\s*[:,-]\s*)"

MSG_EXPLICIT_PATTERNS = [
    # send/write/drop/shoot (a) message/note/text to [recipient] DELIM [text]
    re.compile(r"^(?:send|write|drop|shoot)\s+(?:an?\s+)?(?:msg|message|note|text)\s+to\s+" + REC_LAZY + DELIM + r"\s*(?P<text>.+)$", re.IGNORECASE),
    # send/write/drop/shoot (a) message/note/text to [recipient] "text"
    re.compile(r"^(?:send|write|drop|shoot)\s+(?:an?\s+)?(?:msg|message|note|text)\s+to\s+" + REC_LAZY + r"\s+[\"'](?P<text>.+?)[\"'](?:\s+.*)?$", re.IGNORECASE),
    # send/write/drop/shoot [recipient] (a) message/note/text DELIM [text]
    re.compile(r"^(?:send|write|drop|shoot)\s+" + REC_LAZY + r"\s+(?:an?\s+)?(?:msg|message|note|text)" + DELIM + r"\s*(?P<text>.+)$", re.IGNORECASE),
    # send/write/drop/shoot [recipient] (a) message/note/text "text"
    re.compile(r"^(?:send|write|drop|shoot)\s+" + REC_LAZY + r"\s+(?:an?\s+)?(?:msg|message|note|text)\s+[\"'](?P<text>.+?)[\"'](?:\s+.*)?$", re.IGNORECASE),
    # message/text/msg/ping/notify (to) [recipient] DELIM [text]
    re.compile(r"^(?:message|text|msg|ping|notify)\s+(?:to\s+)?" + REC_LAZY + DELIM + r"\s*(?P<text>.+)$", re.IGNORECASE),
    # message/text/msg/ping/notify (to) [recipient] "text"
    re.compile(r"^(?:message|text|msg|ping|notify)\s+(?:to\s+)?" + REC_LAZY + r"\s+[\"'](?P<text>.+?)[\"'](?:\s+.*)?$", re.IGNORECASE),
    # tell [recipient] DELIM or 'to' [text]
    re.compile(r"^tell\s+" + REC_LAZY + r"(?:\s+(?:saying|said\s+that|that|for|about|to)\s*|\s*[:,-]\s*)\s*(?P<text>.+)$", re.IGNORECASE),
    # send/write/drop/shoot (a) message/note/text to [recipient] [text] (no delimiter)
    re.compile(r"^(?:send|write|drop|shoot)\s+(?:an?\s+)?(?:msg|message|note|text)\s+to\s+" + REC_1_2 + r"\s+(?P<text>.+)$", re.IGNORECASE),
    # send/write/drop/shoot [recipient] (a) message/note/text [text] (no delimiter)
    re.compile(r"^(?:send|write|drop|shoot)\s+" + REC_1_2 + r"\s+(?:an?\s+)?(?:msg|message|note|text)\s+(?P<text>.+)$", re.IGNORECASE),
    # message/text/msg/ping/notify [recipient] [text] (no delimiter)
    re.compile(r"^(?:message|text|msg|ping|notify)\s+(?:to\s+)?" + REC_1_2 + r"\s+(?P<text>.+)$", re.IGNORECASE),
    # tell [recipient] [text] (no delimiter)
    re.compile(r"^tell\s+" + REC_1_2 + r"\s+(?P<text>.+)$", re.IGNORECASE),
    # say/send a hi/hello to [recipient]
    re.compile(r"^(?:send|say)\s+(?:a\s+)?(?P<text>hi|hello|hey|greetings?|update)\s+to\s+" + REC_LAZY + r"$", re.IGNORECASE),
    # send [recipient] a hi/hello
    re.compile(r"^send\s+" + REC_1_2 + r"\s+(?:a\s+)?(?P<text>hi|hello|hey|greetings?)$", re.IGNORECASE),
]

RECIPIENT_ONLY_PATTERNS = [
    re.compile(r"^(?:send|write|drop|shoot)\s+(?:an?\s+)?(?:msg|message|note|text)\s+to\s+" + REC_1_2 + r"$", re.IGNORECASE),
    re.compile(r"^(?:send|write|drop|shoot)\s+" + REC_1_2 + r"\s+(?:an?\s+)?(?:msg|message|note|text)$", re.IGNORECASE),
    re.compile(r"^(?:message|text|msg|ping|notify)\s+(?:to\s+)?" + REC_1_2 + r"$", re.IGNORECASE),
    re.compile(r"^tell\s+" + REC_1_2 + r"$", re.IGNORECASE),
]

test_cases = [
    "send message to ayushman",
    "send a message to ayushman",
    "send message to Ayushman that I will be late",
    "send a message to ayushman saying hello",
    "send message to ayushman: hello how are you",
    "send message to ayushman, hello how are you",
    "send message to ayushman hello",
    "send a message to ayushman hello how are you",
    "message ayushman that I am ready",
    "message ayushman saying hello",
    "message ayushman: hello",
    "message ayushman, hello how are you",
    "message ayushman hello",
    "tell ayushman that i am coming",
    "tell ayushman saying i will be late",
    "tell ayushman to join the call",
    "tell ayushman hello",
    "send message to Shreyasi",
    "send a message to Shreyasi saying let us meet",
    "send message to John Doe saying hi",
    "send message to John Doe that the build passed",
    "send message to John Doe, hello how are you",
    "send message to John Doe: hello how are you",
    "send message to John Doe hello how are you",
    "send ayushman a message hello",
    "send ayushman a message saying meet me at 5",
    "send ayushman a message that project is done",
    "say hi to ayushman",
    "send a hi to ayushman",
    "send ayushman a hi",
    "drop a message to ayushman saying we are ready",
    "shoot a message to ayushman that server is up",
]

for tc in test_cases:
    cleaned_p = tc.strip()
    while True:
        m = LEADING_NOISE_RE.match(cleaned_p)
        if not m:
            break
        cleaned_p = cleaned_p[m.end():].strip()

    matched = False
    for pat in MSG_EXPLICIT_PATTERNS:
        match = pat.search(cleaned_p)
        if match:
            rec = match.group("recipient").strip()
            raw_text = match.group("text").strip()
            cleaned_txt = _clean_extracted_text(raw_text)
            print(f"'{tc}' -> FULL: RECIPIENT='{rec}', TEXT='{cleaned_txt}'")
            matched = True
            break

    if not matched:
        for pat in RECIPIENT_ONLY_PATTERNS:
            match = pat.search(cleaned_p)
            if match:
                rec = match.group("recipient").strip()
                print(f"'{tc}' -> RECIPIENT ONLY: '{rec}'")
                matched = True
                break

    if not matched:
        print(f"'{tc}' -> NOT MATCHED!")
