"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface NemoSpeechOptions {
  userId?: string;
  userName?: string;
  voice?: string;
  onTranscript?: (sender: "user" | "ai", text: string) => void;
  onStatusChange?: (status: "disconnected" | "connecting" | "connected" | "listening" | "speaking" | "session-active") => void;
}

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export function useNemoSpeech(options: NemoSpeechOptions = {}) {
  const { onTranscript, onStatusChange, userId, userName, voice = "en_US-Female-1" } = options;

  const [isConnected, setIsConnected] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "listening" | "speaking" | "session-active">("connected");

  const recognitionRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isListeningRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const conversationHistory = useRef<ConversationTurn[]>([]);
  const isAgentBusyRef = useRef(false);

  const updateStatus = useCallback(
    (newStatus: "disconnected" | "connecting" | "connected" | "listening" | "speaking" | "session-active") => {
      setStatus(newStatus);
      if (onStatusChange) onStatusChange(newStatus);
    },
    [onStatusChange]
  );

  // Initialize Web Audio Context for playing NeMo synthesized audio
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Play base64 vocal audio (MP3/WAV) from NeMo Speech / gTTS engine
  const playAudioB64 = useCallback(async (base64Audio: string, mimeType: string = "audio/mp3"): Promise<void> => {
    try {
      const audio = new Audio(`data:${mimeType};base64,${base64Audio}`);
      audio.playbackRate = 1.2; // Speed up speech rate to crisp, lively 1.2x pace
      return new Promise((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = (e) => {
          console.warn("[NeMo Speech] HTML5 Audio playback error:", e);
          resolve();
        };
        audio.play().catch((err) => {
          console.warn("[NeMo Speech] Audio play blocked/failed:", err);
          resolve();
        });
      });
    } catch (err) {
      console.warn("[NeMo Speech] Audio playback error:", err);
    }
  }, []);

  // Pause speech recognition mic while agent is responding
  const pauseRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }
  }, []);

  // Resume speech recognition mic after playback finishes
  const resumeRecognition = useCallback(() => {
    setTimeout(() => {
      isAgentBusyRef.current = false;
      setIsSpeaking(false);
      const nextStatus = isListeningRef.current
        ? (sessionActiveRef.current ? "session-active" : "listening")
        : "connected";
      updateStatus(nextStatus);

      if (isListeningRef.current && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
    }, 400);
  }, [updateStatus]);

  // Send text or speech turn to NeMo S2S service endpoint
  const sendTextMessage = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;

      isAgentBusyRef.current = true;
      pauseRecognition();
      setIsSpeaking(true);
      updateStatus("speaking");

      console.log("[NeMo Speech S2S] Processing prompt:", clean);
      if (onTranscript) onTranscript("user", clean);
      conversationHistory.current.push({ role: "user", content: clean });

      try {
        const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
        const formData = new FormData();
        formData.append("prompt", clean);
        formData.append("history_json", JSON.stringify(conversationHistory.current.slice(0, -1)));
        if (userId) formData.append("user_id", userId);
        if (userName) formData.append("user_name", userName);
        if (voice) formData.append("voice", voice);

        const res = await fetch(`http://${host}:8000/api/v1/nemo-speech/speech-to-speech`, {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        const aiReply = data.response || `I am your NVIDIA NeMo AI Assistant. Processed: "${clean}".`;
        console.log("[NeMo Speech S2S] Engine response:", aiReply);

        conversationHistory.current.push({ role: "assistant", content: aiReply });
        if (conversationHistory.current.length > 20) {
          conversationHistory.current = conversationHistory.current.slice(-20);
        }

        if (onTranscript) onTranscript("ai", aiReply);

        // Play synthesized vocal audio (MP3/WAV) or SpeechSynthesis fallback
        if (data.audio_b64) {
          await playAudioB64(data.audio_b64, data.audio_format || "audio/mp3");
          resumeRecognition();
        } else if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(aiReply);
          utterance.lang = "en-US";
          utterance.rate = 1.15; // Faster reading rate
          utterance.pitch = 0.85; // Deeper male pitch timbre

          // Attempt to select a male voice profile from browser speech synthesis engine
          const voices = window.speechSynthesis.getVoices();
          const maleVoice = voices.find(v => 
            (v.lang.startsWith("en")) && 
            (v.name.includes("Male") || v.name.includes("David") || v.name.includes("Mark") || v.name.includes("George") || v.name.includes("Guy") || v.name.includes("Natural"))
          );
          if (maleVoice) {
            utterance.voice = maleVoice;
          }

          utterance.onend = () => {
            resumeRecognition();
          };

          utterance.onerror = (err) => {
            console.warn("[NeMo Speech] Speech synthesis error:", err);
            resumeRecognition();
          };

          window.speechSynthesis.speak(utterance);
        } else {
          resumeRecognition();
        }
      } catch (err) {
        console.error("[NeMo Speech] S2S execution error:", err);
        resumeRecognition();
      }
    },
    [onTranscript, updateStatus, pauseRecognition, resumeRecognition, playAudioB64, userId, userName, voice]
  );

  const startListening = useCallback(() => {
    sessionActiveRef.current = true;
    setIsSessionActive(true);
    isListeningRef.current = true;
    setIsListening(true);
    updateStatus("session-active");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        console.log("[NeMo Speech] Mic resumed & active ✅");
      } catch (e) {
        console.log("[NeMo Speech] Recognition already active or starting:", e);
      }
      return;
    }

    const globalWin = typeof window !== "undefined" ? (window as any) : {};
    const SpeechAPI = globalWin.SpeechRecognition || globalWin.webkitSpeechRecognition;

    if (!SpeechAPI) {
      console.warn("[NeMo Speech] Speech Recognition unavailable in browser");
      return;
    }

    const recognition = new SpeechAPI();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("[NeMo Speech] SpeechRecognition started ✅");
      isListeningRef.current = true;
      setIsListening(true);
      if (!isAgentBusyRef.current) {
        updateStatus("session-active");
      }
    };

    recognition.onresult = (event: any) => {
      if (isAgentBusyRef.current) return;

      const result = event.results[event.resultIndex];
      if (!result || !result.isFinal) return;

      const transcript = result[0].transcript.trim();
      if (!transcript) return;

      console.log("[NeMo Speech] Heard prompt:", transcript);
      sendTextMessage(transcript);
    };

    recognition.onerror = (err: any) => {
      console.warn("[NeMo Speech] SpeechRecognition error:", err.error);
      if (err.error === "not-allowed") {
        console.error("[NeMo Speech] Mic permission denied");
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
      if (isAgentBusyRef.current) return;
      console.log("[NeMo Speech] SpeechRecognition ended, restarting...");
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
      console.error("[NeMo Speech] Failed to start recognition:", e);
    }
  }, [sendTextMessage, updateStatus]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      try { r.abort(); } catch (e) {}
    }
    isListeningRef.current = false;
    sessionActiveRef.current = false;
    isAgentBusyRef.current = false;
    setIsListening(false);
    setIsSessionActive(false);
    updateStatus("connected");
  }, [updateStatus]);

  const endSession = useCallback(() => {
    sessionActiveRef.current = false;
    isAgentBusyRef.current = false;
    conversationHistory.current = [];
    setIsSessionActive(false);
    setIsSpeaking(false);
    updateStatus(isListeningRef.current ? "listening" : "connected");
  }, [updateStatus]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        const r = recognitionRef.current;
        recognitionRef.current = null;
        try { r.abort(); } catch (e) {}
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        try { audioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  return {
    isConnected,
    isListening,
    isSpeaking,
    isSessionActive,
    status,
    startListening,
    stopListening,
    sendTextMessage,
    endSession,
  };
}
