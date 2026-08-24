"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export const WAKE_WORD = "Victor";

export interface GeminiLiveOptions {
  wsUrl?: string;
  onTranscript?: (sender: "user" | "ai", text: string) => void;
  onAudioVolumeChange?: (level: number) => void;
  onStatusChange?: (status: "disconnected" | "connecting" | "connected" | "listening" | "speaking") => void;
}

export function useGeminiLive(options: GeminiLiveOptions = {}) {
  const {
    wsUrl = "ws://localhost:8000/api/v1/ws/gemini-live",
    onTranscript,
    onAudioVolumeChange,
    onStatusChange,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected" | "listening" | "speaking">("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Int16Array[]>([]);
  const isPlayingRef = useRef(false);

  const updateStatus = useCallback((newStatus: "disconnected" | "connecting" | "connected" | "listening" | "speaking") => {
    setStatus(newStatus);
    if (onStatusChange) onStatusChange(newStatus);
  }, [onStatusChange]);

  // Send Text Message over Gemini Live session
  const sendTextMessage = useCallback(async (text: string) => {
    if (onTranscript) onTranscript("user", text);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const clientContent = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text }]
            }
          ],
          turnComplete: true
        }
      };
      wsRef.current.send(JSON.stringify(clientContent));
    }

    // Direct LLM execution & voice speech synthesis output
    try {
      const res = await fetch("http://localhost:8000/api/v1/demo-agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      const aiReply = data.output || data.response || `Hello Rohan! I received your voice input: "${text}". All Digital Twin tasks remain synchronized.`;

      if (onTranscript) onTranscript("ai", aiReply);

      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(aiReply);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onstart = () => {
          setIsSpeaking(true);
          updateStatus("speaking");
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          updateStatus(isListening ? "listening" : "connected");
        };
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      console.error("Voice output error:", err);
    }
  }, [isListening, onTranscript, updateStatus]);

  // Audio Playback Queue Processor
  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    isPlayingRef.current = true;
    setIsSpeaking(true);
    updateStatus("speaking");

    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 24000 });
    }

    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    while (audioQueueRef.current.length > 0) {
      const pcm16Data = audioQueueRef.current.shift();
      if (!pcm16Data) continue;

      const float32Data = new Float32Array(pcm16Data.length);
      for (let i = 0; i < pcm16Data.length; i++) {
        float32Data[i] = pcm16Data[i] / 32768.0;
      }

      const buffer = audioCtx.createBuffer(1, float32Data.length, 24000);
      buffer.getChannelData(0).set(float32Data);

      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);

      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start(0);
      });
    }

    isPlayingRef.current = false;
    setIsSpeaking(false);
    updateStatus(isListening ? "listening" : "connected");
  }, [isListening, updateStatus]);

  // Handle incoming WebSocket messages from Gemini Live server
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);

      // 1. Audio / Text response from Gemini Live
      if (data?.serverContent?.modelTurn?.parts) {
        for (const part of data.serverContent.modelTurn.parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith("audio/pcm")) {
            const rawBinary = atob(part.inlineData.data);
            const bytes = new Uint8Array(rawBinary.length);
            for (let i = 0; i < rawBinary.length; i++) {
              bytes[i] = rawBinary.charCodeAt(i);
            }
            const pcm16 = new Int16Array(bytes.buffer);
            audioQueueRef.current.push(pcm16);
            playAudioQueue();
          }
          if (part.text) {
            if (onTranscript) onTranscript("ai", part.text);
            
            // Speak text using Web Speech Synthesis as live voice fallback
            if ("speechSynthesis" in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(part.text);
              utterance.rate = 1.0;
              utterance.pitch = 1.0;
              utterance.onstart = () => {
                setIsSpeaking(true);
                updateStatus("speaking");
              };
              utterance.onend = () => {
                setIsSpeaking(false);
                updateStatus(isListening ? "listening" : "connected");
              };
              window.speechSynthesis.speak(utterance);
            }
          }
        }
      }

      if (data?.serverContent?.turnComplete) {
        // AI turn complete
      }
    } catch (e) {
      console.error("Gemini WebSocket message parsing error:", e);
    }
  }, [onTranscript, playAudioQueue]);

  // Connect WebSocket session
  const connect = useCallback(() => {
    if (wsRef.current) return;

    updateStatus("connecting");
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      updateStatus("connected");

      // Send setup frame
      const setupConfig = {
        setup: {
          model: "models/gemini-2.0-flash-realtime-exp",
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Puck" }
              }
            }
          }
        }
      };
      ws.send(JSON.stringify(setupConfig));
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setIsConnected(false);
      setIsListening(false);
      setIsSpeaking(false);
      updateStatus("disconnected");
      wsRef.current = null;
    };

    ws.onerror = (err) => {
      console.error("Gemini Live WebSocket error:", err);
    };

    wsRef.current = ws;
  }, [wsUrl, updateStatus, handleMessage]);

  // Stop Microphone Audio Stream
  const stopListening = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    setIsListening(false);
    if (isConnected) updateStatus("connected");
  }, [isConnected, updateStatus]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    stopListening();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    updateStatus("disconnected");
  }, [stopListening, updateStatus]);

  // Start Microphone Audio Stream
  const startListening = useCallback(async () => {
    if (!isConnected) {
      connect();
    }

    try {
      // 1. Setup Web Speech Recognition for real-time Speech-to-Text transcript
      const SpeechRecognition = (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";

          let speechDebounceTimer: NodeJS.Timeout | null = null;

          recognition.onresult = (event: any) => {
            let transcript = "";
            let isFinal = false;

            for (let i = event.resultIndex; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                isFinal = true;
              }
            }

            const cleanText = transcript.trim();
            if (!cleanText) return;

            // Wake word validation check ("Victor")
            if (!cleanText.toLowerCase().includes(WAKE_WORD.toLowerCase())) {
              return;
            }

            if (isFinal) {
              if (speechDebounceTimer) clearTimeout(speechDebounceTimer);
              sendTextMessage(cleanText);
            } else {
              if (speechDebounceTimer) clearTimeout(speechDebounceTimer);
              speechDebounceTimer = setTimeout(() => {
                sendTextMessage(cleanText);
              }, 1000);
            }
          };

          recognition.onerror = (err: any) => {
            console.warn("SpeechRecognition error:", err);
            if (err.error !== "no-speech") {
              try {
                recognition.start();
              } catch (e) {}
            }
          };

          recognition.onend = () => {
            try {
              recognition.start();
            } catch (e) {
              // Already started
            }
          };

          recognition.start();
        } catch (recErr) {
          console.warn("SpeechRecognition start error:", recErr);
        }
      }

      // 2. Setup WebAudio raw PCM streamer for WebSocket
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const volumeLevel = Math.min(1.0, rms * 8);

        if (volumeLevel > 0.05) {
          setIsUserSpeaking(true);
        } else {
          setIsUserSpeaking(false);
        }

        if (onAudioVolumeChange) {
          onAudioVolumeChange(volumeLevel);
        }

        // Downsample/Convert to PCM16
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        let binary = "";
        const bytes = new Uint8Array(pcm16.buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const realtimeInputMessage = {
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: "audio/pcm",
                  data: base64Audio
                }
              ]
            }
          };
          wsRef.current.send(JSON.stringify(realtimeInputMessage));
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsListening(true);
      updateStatus("listening");
    } catch (err) {
      console.error("Microphone access error:", err);
    }
  }, [isConnected, connect, onAudioVolumeChange, sendTextMessage, updateStatus]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    isSpeaking,
    isUserSpeaking,
    status,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendTextMessage
  };
}
