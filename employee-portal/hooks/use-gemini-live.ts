"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export const WAKE_WORD = "Echo";

export interface GeminiLiveOptions {
  wsUrl?: string;
  userId?: string;
  userName?: string;
  onTranscript?: (sender: "user" | "ai", text: string) => void;
  onAudioVolumeChange?: (level: number) => void;
  onStatusChange?: (status: "disconnected" | "connecting" | "connected" | "listening" | "speaking" | "session-active") => void;
}

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export function useGeminiLive(options: GeminiLiveOptions = {}) {
  const { onTranscript, onStatusChange, userId, userName } = options;

  const [isConnected, setIsConnected] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "listening" | "speaking" | "session-active">("connected");

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const sessionActiveRef = useRef(false);        // true after first Echo trigger
  const conversationHistory = useRef<ConversationTurn[]>([]); // persistent memory
  const isAgentBusyRef = useRef(false);          // true while LLM fetching or TTS speaking
  const resumeTimeoutRef = useRef<any>(null);

  const updateStatus = useCallback(
    (newStatus: "disconnected" | "connecting" | "connected" | "listening" | "speaking" | "session-active") => {
      setStatus(newStatus);
      if (onStatusChange) onStatusChange(newStatus);
    },
    [onStatusChange]
  );

  // ── Helper: Pause microphone recognition ─────────────────────────────────
  const pauseRecognition = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        console.log("[Echo] 🔇 Mic turned off while agent is responding/speaking");
      } catch (e) {}
    }
  }, []);

  // ── Helper: Resume microphone recognition after agent finished speaking ──
  const resumeRecognition = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    // 400ms buffer to let speaker audio and room reverberation completely settle
    resumeTimeoutRef.current = setTimeout(() => {
      isAgentBusyRef.current = false;
      setIsSpeaking(false);
      const nextStatus = isListeningRef.current
        ? (sessionActiveRef.current ? "session-active" : "listening")
        : "connected";
      updateStatus(nextStatus);

      if (isListeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
          console.log("[Echo] 🎙️ Mic resumed and listening for user input");
        } catch (e) {
          // May already be active
        }
      }
    }, 400);
  }, [updateStatus]);

  // ── Send text to LLM with conversation memory ─────────────────────────────
  const sendTextMessage = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      // Turn OFF mic immediately while agent processes & speaks
      isAgentBusyRef.current = true;
      pauseRecognition();
      setIsSpeaking(true);
      updateStatus("speaking");

      console.log("[Echo] Sending to LLM:", clean);
      if (onTranscript) onTranscript("user", clean);

      // Add to history
      conversationHistory.current.push({ role: "user", content: clean });

      try {
        const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
        const res = await fetch(`http://${host}:8000/api/v1/demo-agent/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: clean,
            history: conversationHistory.current.slice(0, -1), // send prior context, not current
            user_id: userId,
            user_name: userName,
          }),
        });
        const data = await res.json();
        const aiReply =
          data.output ||
          data.response ||
          `I am Echo. I received: "${clean}".`;

        console.log("[Echo] LLM reply:", aiReply);

        // Add AI reply to history
        conversationHistory.current.push({ role: "assistant", content: aiReply });

        // Keep history bounded (last 20 turns = 10 exchanges)
        if (conversationHistory.current.length > 20) {
          conversationHistory.current = conversationHistory.current.slice(-20);
        }

        if (onTranscript) onTranscript("ai", aiReply);

        // Speak the reply
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(aiReply);
          utterance.lang = "en-US";
          utterance.rate = 1.0;
          utterance.pitch = 1.0;

          utterance.onend = () => {
            console.log("[Echo] Finished speaking reply");
            resumeRecognition();
          };

          utterance.onerror = (err) => {
            console.warn("[Echo] Speech synthesis error:", err);
            resumeRecognition();
          };

          window.speechSynthesis.speak(utterance);
        } else {
          // If browser speech synthesis is unavailable, resume mic after reply
          resumeRecognition();
        }
      } catch (err) {
        console.error("[Echo] LLM fetch error:", err);
        resumeRecognition();
      }
    },
    [onTranscript, updateStatus, pauseRecognition, resumeRecognition]
  );

  // ── End session (reset wake word gate) ───────────────────────────────────
  const endSession = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    sessionActiveRef.current = false;
    isAgentBusyRef.current = false;
    conversationHistory.current = [];
    setIsSessionActive(false);
    setIsSpeaking(false);
    updateStatus(isListeningRef.current ? "listening" : "connected");
    console.log("[Echo] Session ended, memory cleared");
  }, [updateStatus]);

  // ── Start always-on SpeechRecognition ────────────────────────────────────
  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      console.log("[Echo] Already listening");
      return;
    }

    const globalWin = typeof window !== "undefined" ? (window as any) : {};
    const SpeechRecognitionAPI =
      globalWin.SpeechRecognition || globalWin.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn("[Echo] SpeechRecognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log("[Echo] SpeechRecognition started ✅");
      isListeningRef.current = true;
      setIsListening(true);
      if (!isAgentBusyRef.current) {
        updateStatus(sessionActiveRef.current ? "session-active" : "listening");
      }
    };

    recognition.onresult = (event: any) => {
      // Ignore any speech captured while the agent is responding or speaking
      if (isAgentBusyRef.current) {
        console.log("[Echo] 🔇 Ignored speech captured while agent is speaking");
        return;
      }

      const result = event.results[event.resultIndex];
      if (!result || !result.isFinal) return;

      const transcript = result[0].transcript.trim();
      if (!transcript) return;

      console.log("[Echo] Heard:", transcript);

      if (sessionActiveRef.current) {
        // Session is active — send everything without wake word check
        console.log("[Echo] Session active → sending to LLM");
        sendTextMessage(transcript);
      } else {
        // Not in session — require wake word "Echo"
        const lower = transcript.toLowerCase();
        const wakeWordMatched =
          lower.includes("echo") ||
          lower.includes("eko") ||
          lower.includes("eco");

        if (wakeWordMatched) {
          console.log("[Echo] ✅ Wake word detected — session started!");
          sessionActiveRef.current = true;
          setIsSessionActive(true);
          updateStatus("session-active");
          sendTextMessage(transcript);
        } else {
          console.log("[Echo] ℹ️ Waiting for wake word...");
        }
      }
    };

    recognition.onerror = (err: any) => {
      console.warn("[Echo] SpeechRecognition error:", err.error);
      if (err.error === "not-allowed") {
        console.error("[Echo] ❌ Mic permission denied");
        return;
      }
      if (!isAgentBusyRef.current && isListeningRef.current) {
        setTimeout(() => {
          if (!isAgentBusyRef.current && recognitionRef.current === recognition) {
            try { recognition.start(); } catch (e) {}
          }
        }, 300);
      }
    };

    recognition.onend = () => {
      // If the agent is speaking or responding, DO NOT restart mic
      if (isAgentBusyRef.current) {
        console.log("[Echo] SpeechRecognition ended while agent responding (mic kept off)");
        return;
      }

      console.log("[Echo] SpeechRecognition ended, restarting...");
      if (isListeningRef.current && recognitionRef.current === recognition) {
        setTimeout(() => {
          if (!isAgentBusyRef.current && isListeningRef.current && recognitionRef.current === recognition) {
            try { recognition.start(); } catch (e) {}
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("[Echo] Failed to start recognition:", e);
    }
  }, [sendTextMessage, updateStatus]);

  // ── Stop listening ────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.abort(); } catch (e) {}
    }
    isListeningRef.current = false;
    isAgentBusyRef.current = false;
    setIsListening(false);
    setIsUserSpeaking(false);
    updateStatus("connected");
  }, [updateStatus]);

  const connect = useCallback(() => {
    setIsConnected(true);
    updateStatus("connected");
  }, [updateStatus]);

  const disconnect = useCallback(() => {
    stopListening();
    setIsConnected(false);
    updateStatus("disconnected");
  }, [stopListening, updateStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        const r = recognitionRef.current;
        recognitionRef.current = null;
        try { r.abort(); } catch (e) {}
      }
    };
  }, []);

  return {
    isConnected,
    isListening,
    isSpeaking,
    isUserSpeaking,
    isSessionActive,
    status,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendTextMessage,
    endSession,
  };
}
