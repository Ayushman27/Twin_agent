"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export const WAKE_WORD = "Echo";

export interface GeminiLiveOptions {
  wsUrl?: string;
  onTranscript?: (sender: "user" | "ai", text: string) => void;
  onAudioVolumeChange?: (level: number) => void;
  onStatusChange?: (status: "disconnected" | "connecting" | "connected" | "listening" | "speaking" | "session-active") => void;
}

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export function useGeminiLive(options: GeminiLiveOptions = {}) {
  const { onTranscript, onStatusChange } = options;

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

  const updateStatus = useCallback(
    (newStatus: "disconnected" | "connecting" | "connected" | "listening" | "speaking" | "session-active") => {
      setStatus(newStatus);
      if (onStatusChange) onStatusChange(newStatus);
    },
    [onStatusChange]
  );

  // ── Send text to LLM with conversation memory ─────────────────────────────
  const sendTextMessage = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      console.log("[Echo] Sending to LLM:", clean);
      if (onTranscript) onTranscript("user", clean);

      // Add to history
      conversationHistory.current.push({ role: "user", content: clean });

      try {
        const res = await fetch("http://localhost:8000/api/v1/demo-agent/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: clean,
            history: conversationHistory.current.slice(0, -1), // send prior context, not current
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
          setIsSpeaking(true);
          updateStatus("speaking");

          utterance.onend = () => {
            setIsSpeaking(false);
            updateStatus(isListeningRef.current
              ? (sessionActiveRef.current ? "session-active" : "listening")
              : "connected");
          };
          window.speechSynthesis.speak(utterance);
        }
      } catch (err) {
        console.error("[Echo] LLM fetch error:", err);
      }
    },
    [onTranscript, updateStatus]
  );

  // ── End session (reset wake word gate) ───────────────────────────────────
  const endSession = useCallback(() => {
    sessionActiveRef.current = false;
    conversationHistory.current = [];
    setIsSessionActive(false);
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
      updateStatus(sessionActiveRef.current ? "session-active" : "listening");
    };

    recognition.onresult = (event: any) => {
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
      setTimeout(() => {
        if (recognitionRef.current === recognition) {
          try { recognition.start(); } catch (e) {}
        }
      }, 300);
    };

    recognition.onend = () => {
      console.log("[Echo] SpeechRecognition ended, restarting...");
      if (recognitionRef.current === recognition) {
        setTimeout(() => {
          try { recognition.start(); } catch (e) {}
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
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.stop(); } catch (e) {}
    }
    isListeningRef.current = false;
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
      if (recognitionRef.current) {
        const r = recognitionRef.current;
        recognitionRef.current = null;
        try { r.stop(); } catch (e) {}
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
