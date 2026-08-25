"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMessaging, ChatMessage } from "@/hooks/use-messaging";
import { useAuth } from "@/hooks/use-auth";

// ── Constants ─────────────────────────────────────────────────────────────────
// Random demo user ID — generated client-side only to avoid hydration mismatch.
const DEMO_USER_ID =
  typeof window !== "undefined"
    ? "employee-" + Math.random().toString(36).slice(2, 7)
    : "employee-demo";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  if (!iso) return "";
  try {
    const str = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
    return new Date(str).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function initials(name: string) {
  return name
    .split(/[\s-_]/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusDot({ online }: { online: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        online ? "bg-[#00ff41] shadow-[0_0_6px_#00ff41]" : "bg-[#555]"
      }`}
    />
  );
}

// ── Connection status bar ─────────────────────────────────────────────────────
function ConnectionBar({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    connected:    { label: "CONNECTED",    color: "#00ff41" },
    connecting:   { label: "CONNECTING…",  color: "#ffd700" },
    disconnected: { label: "DISCONNECTED", color: "#ff4444" },
    error:        { label: "ERROR",        color: "#ff4444" },
  };
  const { label, color } = map[status] ?? { label: status.toUpperCase(), color: "#888" };
  return (
    <div className="flex items-center gap-2 font-mono text-[10px]" style={{ color }}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === "connected" ? "animate-pulse" : ""
        }`}
        style={{ background: color, boxShadow: `0 0 5px ${color}` }}
      />
      {label}
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({
  msg,
  isSelf,
  directory,
  myUserName,
}: {
  msg: ChatMessage;
  isSelf: boolean;
  directory?: ContactItem[];
  myUserName?: string;
}) {
  const senderContact = directory?.find(
    (c) =>
      c.user_id === msg.from ||
      c.email?.toLowerCase() === msg.from?.toLowerCase() ||
      c.name?.toLowerCase() === msg.from?.toLowerCase()
  );
  const displayName = isSelf
    ? (myUserName || "You")
    : (senderContact?.name || msg.from_name || msg.from);

  return (
    <div className={`flex gap-2 items-end ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      {!isSelf && (
        <div className="w-7 h-7 rounded-sm bg-[#0a2a0a] border border-[#00ff4133] flex items-center justify-center font-mono text-[9px] text-[#00ff41] flex-shrink-0">
          {initials(displayName)}
        </div>
      )}

      <div className={`max-w-[72%] flex flex-col gap-0.5 ${isSelf ? "items-end" : "items-start"}`}>
        {/* Sender name (only for received messages) */}
        {!isSelf && (
          <span className="font-mono text-[9px] text-[#4a7c4a] px-1">
            {displayName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`relative px-3 py-2 font-mono text-[12px] leading-relaxed break-words ${
            isSelf
              ? "bg-[#00ff41] text-[#050505] rounded-sm rounded-br-none border border-[#00ff41]"
              : "bg-[#0a120a] text-[#c8e6c9] rounded-sm rounded-bl-none border border-[#1a3a1a]"
          }`}
        >
          {msg.text}
        </div>

        {/* Timestamp + delivery tick */}
        <div className="flex items-center gap-1.5 px-1">
          <span className="font-mono text-[9px] text-[#3a5a3a]">
            {formatTime(msg.timestamp)}
          </span>
          {isSelf && (
            <span
              className="font-mono text-[9px]"
              style={{ color: msg.delivered ? "#00ff41" : "#555" }}
            >
              {msg.delivered ? "✓✓" : "✓"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── User list item ────────────────────────────────────────────────────────────
export interface ContactItem {
  user_id: string;
  name: string;
  email: string;
  job_title: string;
  telegram_connected: boolean;
  telegram_username?: string;
}

// ── Contact Item ─────────────────────────────────────────────────────────────
function ContactCard({
  contact,
  isOnline,
  isSelected,
  lastMsg,
  onClick,
}: {
  contact: ContactItem;
  isOnline: boolean;
  isSelected: boolean;
  lastMsg?: string;
  onClick: () => void;
}) {
  return (
    <button
      id={`contact-item-${contact.user_id}`}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 border-l-2 transition-all duration-150 cursor-pointer text-left ${
        isSelected
          ? "border-[#00ff41] bg-[#00ff4108] text-[#00ff41]"
          : "border-transparent hover:bg-[#0a120a] text-[#8aab8a]"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-sm flex items-center justify-center font-mono text-[10px] flex-shrink-0 ${
          isSelected
            ? "bg-[#00ff4120] border border-[#00ff41] text-[#00ff41]"
            : "bg-[#0a2a0a] border border-[#1a3a1a] text-[#4a7a4a]"
        }`}
      >
        {initials(contact.name || contact.user_id)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-medium truncate">
            {contact.name || contact.user_id}
          </span>
          <StatusDot online={isOnline} />
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="font-mono text-[9px] text-[#3a6a3a] truncate">
            {contact.job_title || "Employee"}
          </span>
          <span
            className={`font-mono text-[8px] px-1 rounded-sm border ${
              contact.telegram_connected
                ? "border-[#00ff4140] text-[#00ff41] bg-[#00ff410a]"
                : "border-[#ffffff20] text-[#666]"
            }`}
          >
            {contact.telegram_connected ? "Telegram" : "UI Only"}
          </span>
        </div>
        {lastMsg && (
          <p className="font-mono text-[9px] text-[#3a5a3a] truncate mt-0.5">
            {lastMsg}
          </p>
        )}
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MessagingPage() {
  const { user: currentUser, isLoading } = useAuth();
  const myUserId = currentUser?.id || "";
  const myUserName = currentUser?.name || "";
  const myUserTitle = currentUser?.job_title || currentUser?.role || "Employee";

  const [activePeer, setActivePeer] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [directory, setDirectory] = useState<ContactItem[]>([]);
  const [systemEvents, setSystemEvents] = useState<string[]>([]);
  const [tgStatus, setTgStatus] = useState<{ configured: boolean; webhook_configured: boolean; bot_connected: boolean } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addEvent = useCallback((text: string) => {
    setSystemEvents((prev) => [...prev.slice(-19), `[${formatTime(new Date().toISOString())}] ${text}`]);
  }, []);

  // Dynamic host determination for multi-device/laptop network support
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";

  // Fetch employee directory (isolated by organization)
  useEffect(() => {
    if (!myUserId) return;
    fetch(`http://${host}:8000/api/v1/messaging/contacts?user_id=${encodeURIComponent(myUserId)}`)
      .then((res) => res.json())
      .then((data) => setDirectory(data.contacts || []))
      .catch(() => {});
  }, [myUserId, host]);

  useEffect(() => {
    fetch(`http://${host}:8000/api/v1/telegram/status`)
      .then((res) => res.json())
      .then((data) => setTgStatus(data))
      .catch(() => setTgStatus(null));
  }, [host]);

  const { status, onlineUsers, messages, sendMessage, loadHistory, clearMessages } =
    useMessaging({
      userId: myUserId,
      displayName: myUserName,
      wsBaseUrl: `ws://${host}:8000/api/v1/messaging`,
      onMessage: (msg) => {
        addEvent(`↙ Message from ${msg.from_name}`);
      },
      onPresence: (evt) => {
        addEvent(`${evt.online ? "🟢" : "⚫"} ${evt.user_id} ${evt.online ? "joined" : "left"}`);
      },
      onStatusChange: (s) => {
        addEvent(`WebSocket → ${s.toUpperCase()}`);
      },
    });

  // Filter messages for the active conversation (handling UUID, email, or name matching)
  const activeContact = directory.find((c) => c.user_id === activePeer);
  const peerIdentifiers = new Set(
    [
      activePeer,
      activeContact?.user_id,
      activeContact?.email?.toLowerCase(),
      activeContact?.name?.toLowerCase(),
    ].filter(Boolean) as string[]
  );

  const myIdentifiers = new Set(
    [
      myUserId,
      currentUser?.id,
      currentUser?.email?.toLowerCase(),
      currentUser?.name?.toLowerCase(),
    ].filter(Boolean) as string[]
  );

  const conversationMessages = messages.filter((m) => {
    const fromVal = m.from?.toLowerCase();
    const toVal = m.to?.toLowerCase();

    const isFromMe = myIdentifiers.has(m.from) || myIdentifiers.has(fromVal);
    const isToMe = myIdentifiers.has(m.to) || myIdentifiers.has(toVal);
    const isFromPeer = peerIdentifiers.has(m.from) || peerIdentifiers.has(fromVal);
    const isToPeer = peerIdentifiers.has(m.to) || peerIdentifiers.has(toVal);

    if (isFromMe && isToPeer) return true;
    if (isFromPeer && (isToMe || m.to === "system")) return true;
    if (activePeer === "system" && m.to === "system") return true;
    return false;
  });

  // Filter directory contacts by search query
  const filteredContacts = directory.filter((c) => {
    if (c.user_id === myUserId || c.name?.toLowerCase() === myUserName?.toLowerCase()) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name?.toLowerCase().includes(q) ||
      c.job_title?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.user_id?.toLowerCase().includes(q)
    );
  });

  // Last message per peer for sidebar preview
  const lastMsgByPeer: Record<string, string> = {};
  messages.forEach((m) => {
    const isFromMe = myIdentifiers.has(m.from) || myIdentifiers.has(m.from?.toLowerCase());
    const peer = isFromMe ? m.to : m.from;
    lastMsgByPeer[peer] = m.text;
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages.length]);

  // Load history when peer changes
  useEffect(() => {
    if (activePeer) {
      clearMessages();
      loadHistory(activePeer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePeer]);

  const handleSend = () => {
    if (!activePeer || !inputText.trim()) return;
    const ok = sendMessage(activePeer, inputText);
    if (ok) setInputText("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full gap-0 bg-[#050505] text-[#c8e6c9] overflow-hidden">

      {/* ── Left Sidebar: Contacts & Search ─────────────────────────────────── */}
      <aside className="w-[250px] flex-shrink-0 border-r border-[#1a3a1a] flex flex-col h-full">
        {/* User Identity Panel */}
        <div className="p-3 border-b border-[#1a3a1a] bg-[#050505]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#00ff4120] border border-[#00ff41] flex items-center justify-center font-mono text-[10px] text-[#00ff41] flex-shrink-0">
              {initials(myUserName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] font-bold text-[#c8e6c9] truncate">
                {myUserName}
              </p>
              <p className="font-mono text-[9px] text-[#3a6a3a] truncate">
                {myUserTitle}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex flex-col gap-1">
            <ConnectionBar status={status} />
            <div className="font-mono text-[9px] flex items-center gap-1.5 text-[#3a6a3a]">
              <span>Telegram:</span>
              <span style={{ color: tgStatus?.bot_connected ? "#00ff41" : tgStatus?.configured ? "#ffd700" : "#ff4444" }}>
                {tgStatus?.bot_connected ? "BOT ONLINE" : tgStatus?.configured ? "CONFIGURED" : "OFFLINE"}
              </span>
            </div>
          </div>
        </div>

        {/* Search Employees */}
        <div className="p-3 border-b border-[#1a3a1a]">
          <p className="font-mono text-[9px] text-[#3a6a3a] uppercase tracking-widest mb-1.5">
            Search Whom to Message
          </p>
          <input
            id="search-employee-input"
            className="w-full bg-[#0a120a] border border-[#1a3a1a] font-mono text-[10px] text-[#c8e6c9] px-2.5 py-1.5 outline-none focus:border-[#00ff41] transition-colors placeholder:text-[#2a4a2a]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type employee name or role..."
          />
        </div>

        {/* Employee Contact List */}
        <div className="flex-1 overflow-y-auto scroll-hidden">
          <p className="font-mono text-[9px] text-[#2a5a2a] uppercase tracking-widest px-3 py-2">
            Employees ({filteredContacts.length})
          </p>
          {filteredContacts.length === 0 ? (
            <p className="font-mono text-[10px] text-[#2a4a2a] px-4 py-3">
              No employees found matching &quot;{searchQuery}&quot;.
            </p>
          ) : (
            filteredContacts.map((contact) => (
              <ContactCard
                key={contact.user_id}
                contact={contact}
                isOnline={onlineUsers.includes(contact.user_id)}
                isSelected={activePeer === contact.user_id}
                lastMsg={lastMsgByPeer[contact.user_id]}
                onClick={() => setActivePeer(contact.user_id)}
              />
            ))
          )}
        </div>

        {/* Stats */}
        <div className="p-3 border-t border-[#1a3a1a]">
          <p className="font-mono text-[9px] text-[#3a6a3a]">
            {onlineUsers.length} employee{onlineUsers.length !== 1 ? "s" : ""} online
          </p>
        </div>
      </aside>

      {/* ── Main: Chat window ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full min-w-0">
        {activePeer ? (
          <>
            {/* Chat header */}
            {(() => {
              const activeContact = directory.find((c) => c.user_id === activePeer);
              const displayName = activeContact?.name || activePeer;
              const subtitle = activeContact?.job_title || activePeer;
              return (
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a3a1a] bg-[#050505] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-sm bg-[#0a2a0a] border border-[#1a3a1a] flex items-center justify-center font-mono text-[10px] text-[#00ff41]">
                      {initials(displayName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-[12px] text-[#c8e6c9] font-bold">{displayName}</p>
                        {activeContact?.telegram_connected && (
                          <span className="font-mono text-[8px] border border-[#00ff4140] text-[#00ff41] bg-[#00ff410a] px-1 rounded-sm">
                            Telegram Linked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[9px] text-[#3a6a3a]">{subtitle}</span>
                        <span className="text-[#3a6a3a]">·</span>
                        <StatusDot online={onlineUsers.includes(activePeer)} />
                        <span className="font-mono text-[9px] text-[#3a6a3a]">
                          {onlineUsers.includes(activePeer) ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      id="close-chat-btn"
                      onClick={() => setActivePeer(null)}
                      className="font-mono text-[11px] text-[#3a5a3a] hover:text-[#ff4444] transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Messages area */}
            <div
              id="messages-area"
              className="flex-1 overflow-y-auto scroll-hidden px-4 py-4 flex flex-col gap-3"
              style={{
                background: `
                  radial-gradient(ellipse 80% 60% at 50% 100%, rgba(0,255,65,0.03) 0%, transparent 70%),
                  #050505
                `,
              }}
            >
              {conversationMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 opacity-40">
                  <div className="w-12 h-12 rounded-sm border border-[#1a3a1a] flex items-center justify-center">
                    <span className="text-[#00ff41] font-mono text-lg">✉</span>
                  </div>
                  <p className="font-mono text-[11px] text-[#3a6a3a]">
                    No messages yet. Say hello!
                  </p>
                </div>
              ) : (
                conversationMessages.map((msg) => (
                  <Bubble
                    key={msg.id}
                    msg={msg}
                    isSelf={msg.isSelf}
                    directory={directory}
                    myUserName={myUserName}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="flex-shrink-0 px-4 py-3 border-t border-[#1a3a1a] bg-[#050505]">
              <div className="flex gap-2 items-center">
                {/* Status indicator */}
                <span
                  className="font-mono text-[10px] text-[#00ff41] flex-shrink-0"
                  title={`Connected as ${myUserName || myUserId}`}
                >
                  &gt;
                </span>

                <input
                  id="message-input"
                  ref={inputRef}
                  className="flex-1 bg-[#0a120a] border border-[#1a3a1a] font-mono text-[12px] text-[#c8e6c9] px-3 py-2.5 outline-none focus:border-[#00ff41] transition-colors placeholder:text-[#2a4a2a] caret-[#00ff41]"
                  placeholder={`Message ${activeContact?.name || activePeer}…`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                  disabled={status !== "connected"}
                />

                <button
                  id="send-btn"
                  onClick={handleSend}
                  disabled={!inputText.trim() || status !== "connected"}
                  className="px-4 py-2.5 bg-[#00ff41] text-[#050505] font-mono text-[11px] font-bold hover:bg-[#00e639] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex-shrink-0"
                >
                  SEND
                </button>
              </div>

              <p className="font-mono text-[9px] text-[#2a4a2a] mt-1.5 pl-4">
                Enter ↵ to send · WebSocket real-time · End-to-end routing
              </p>
            </div>
          </>
        ) : (
          /* ── Empty state ─────────────────────────────────────────────────── */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div
              className="w-20 h-20 rounded-sm border border-[#1a3a1a] flex items-center justify-center"
              style={{ boxShadow: "0 0 40px rgba(0,255,65,0.05)" }}
            >
              <span className="material-symbols-outlined text-[40px] text-[#00ff41] opacity-60">
                chat
              </span>
            </div>
            <div className="text-center">
              <h2 className="font-mono text-[16px] text-[#c8e6c9] mb-2">
                Twin Agent Messaging
              </h2>
              <p className="font-mono text-[11px] text-[#3a6a3a] max-w-xs leading-relaxed">
                Real-time WebSocket communication between employees.
                Select a contact or type a peer ID to start chatting.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
              {[
                { label: "Status",  value: status.toUpperCase(), color: status === "connected" ? "#00ff41" : "#ff4444" },
                { label: "Online",  value: onlineUsers.length,   color: "#00ff41" },
                { label: "Channel", value: "WebSocket",          color: "#888" },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="border border-[#1a3a1a] p-3 text-center"
                >
                  <p className="font-mono text-[18px] font-bold" style={{ color }}>
                    {value}
                  </p>
                  <p className="font-mono text-[9px] text-[#3a6a3a] mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Right panel: System events log ─────────────────────────────────── */}
      <aside className="w-[200px] flex-shrink-0 border-l border-[#1a3a1a] flex flex-col h-full">
        <div className="px-3 py-2.5 border-b border-[#1a3a1a]">
          <p className="font-mono text-[9px] text-[#3a6a3a] uppercase tracking-widest">
            Event Log
          </p>
        </div>
        <div className="flex-1 overflow-y-auto scroll-hidden px-2 py-2 flex flex-col gap-1">
          {systemEvents.length === 0 ? (
            <p className="font-mono text-[9px] text-[#2a4a2a] px-1">
              Waiting for events…
            </p>
          ) : (
            [...systemEvents].reverse().map((evt, i) => (
              <p key={i} className="font-mono text-[9px] text-[#3a6a3a] log-entry leading-relaxed">
                {evt}
              </p>
            ))
          )}
        </div>
        <div className="px-3 py-2 border-t border-[#1a3a1a]">
          <p className="font-mono text-[9px] text-[#2a4a2a]">
            ws://{host}:8000
          </p>
        </div>
      </aside>
    </div>
  );
}
