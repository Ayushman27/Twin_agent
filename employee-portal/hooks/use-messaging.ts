"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type WSStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ChatMessage {
  id: string;
  from: string;
  from_name: string;
  to: string;
  text: string;
  timestamp: string;
  /** true if this message was sent by the current user */
  isSelf: boolean;
  /** did the backend confirm delivery to recipient's socket? */
  delivered?: boolean;
}

export interface PresenceEvent {
  user_id: string;
  online: boolean;
  timestamp: string;
}

interface UseMessagingOptions {
  userId: string;
  displayName?: string;
  wsBaseUrl?: string;
  onMessage?: (msg: ChatMessage) => void;
  onPresence?: (event: PresenceEvent) => void;
  onStatusChange?: (status: WSStatus) => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMessaging({
  userId,
  displayName,
  wsBaseUrl,
  onMessage,
  onPresence,
  onStatusChange,
}: UseMessagingOptions) {
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Dynamic host determination for multi-device/laptop network support
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const activeWsBase = wsBaseUrl || `ws://${host}:8000/api/v1/messaging`;
  const activeApiBase = `http://${host}:8000/api/v1/messaging`;

  const updateStatus = useCallback(
    (s: WSStatus) => {
      setStatus(s);
      onStatusChange?.(s);
    },
    [onStatusChange]
  );

  // ── Connect ──────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!userId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    updateStatus("connecting");

    const params = new URLSearchParams({ display_name: displayName ?? userId });
    const url = `${activeWsBase}/ws/${encodeURIComponent(userId)}?${params}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      updateStatus("connected");

      // Start keepalive pings every 25s
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 25_000);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data as string);

        if (data.type === "pong") return;

        if (data.type === "online_list") {
          setOnlineUsers(data.users ?? []);
          return;
        }

        if (data.type === "presence") {
          const evt: PresenceEvent = {
            user_id: data.user_id,
            online: data.online,
            timestamp: data.timestamp,
          };
          setOnlineUsers((prev) =>
            data.online
              ? prev.includes(data.user_id) ? prev : [...prev, data.user_id]
              : prev.filter((u) => u !== data.user_id)
          );
          onPresence?.(evt);
          return;
        }

        if (data.type === "message") {
          const msg: ChatMessage = {
            id: data.id,
            from: data.from,
            from_name: data.from_name ?? data.from,
            to: data.to,
            text: data.text,
            timestamp: data.timestamp,
            isSelf: data.from === userId,
            delivered: data.delivered,
          };
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === msg.id || (m.text === msg.text && m.from === msg.from && Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 3000));
            if (exists) {
              return prev.map((m) => (m.id === msg.id || (m.text === msg.text && m.from === msg.from) ? { ...m, ...msg } : m));
            }
            return [...prev, msg];
          });
          onMessage?.(msg);
          return;
        }

        if (data.type === "error") {
          console.warn("[Messaging WS] Server error:", data.message);
        }
      } catch {
        console.warn("[Messaging WS] Failed to parse:", event.data);
      }
    };

    ws.onerror = () => {
      if (!mountedRef.current) return;
      updateStatus("error");
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      updateStatus("disconnected");
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

      // Auto-reconnect after 3 s
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, 3_000);
    };
  }, [userId, displayName, activeWsBase, updateStatus, onMessage, onPresence]);

  // ── Disconnect ───────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent auto-reconnect
      wsRef.current.close();
      wsRef.current = null;
    }
    updateStatus("disconnected");
  }, [updateStatus]);

  // ── Send a message ───────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (to: string, text: string): boolean => {
      if (!text.trim() || !to) return false;
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        console.warn("[Messaging WS] Not connected");
        return false;
      }
      wsRef.current.send(
        JSON.stringify({ type: "message", to, text: text.trim() })
      );
      return true;
    },
    []
  );

  // ── Load history from REST API ───────────────────────────────────────────
  const loadHistory = useCallback(
    async (peerId: string) => {
      try {
        const res = await fetch(
          `${activeApiBase}/history/${peerId}?user_id=${encodeURIComponent(userId)}&limit=50`
        );
        const data = await res.json();
        const history: ChatMessage[] = (data.messages ?? []).map((m: any) => ({
          ...m,
          isSelf: m.from === userId,
        }));
        setMessages(history);
      } catch (err) {
        console.error("[Messaging] Failed to load history:", err);
      }
    },
    [userId, activeApiBase]
  );

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (userId) connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    status,
    onlineUsers,
    messages,
    sendMessage,
    loadHistory,
    connect,
    disconnect,
    clearMessages: () => setMessages([]),
  };
}
