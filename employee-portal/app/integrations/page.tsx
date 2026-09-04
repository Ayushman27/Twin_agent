"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@shared/services/api-client";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Radio,
  Sparkles,
  Layers,
  Bot,
  Send,
  Lock,
  Clock,
  User,
  X,
  FileText,
  AlertCircle,
  ChevronRight,
  Eye,
  Inbox,
  Copy,
  Check,
} from "lucide-react";

interface GmailStatus {
  connected: boolean;
  email?: string | null;
  status: "CONNECTED" | "NOT_CONNECTED" | "CONNECTING" | "ERROR";
  last_used_at?: string | null;
  scopes?: string[];
}

interface EmailItem {
  id: string;
  recipient_email: string;
  recipient_name?: string | null;
  subject: string;
  body: string;
  status: "SENT" | "FAILED" | "CANCELLED" | "PENDING_CONFIRMATION" | "DRAFT" | "SENDING";
  sent_at?: string | null;
  created_at: string;
  provider_message_id?: string | null;
  error_message?: string | null;
  meta_data?: {
    agent_id?: string;
    recipient_name?: string;
  } | null;
}

interface EmailHistoryResponse {
  emails: EmailItem[];
  total: number;
  limit: number;
  offset: number;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Gmail OAuth State
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({
    connected: false,
    status: "NOT_CONNECTED",
  });
  const [isFetchingStatus, setIsFetchingStatus] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Email Activity State
  const [emailHistory, setEmailHistory] = useState<EmailItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "SENT" | "FAILED" | "CANCELLED">("ALL");

  // Check URL query parameters for OAuth redirect callbacks
  useEffect(() => {
    const successParam = searchParams.get("success");
    const errorParam = searchParams.get("error");

    if (successParam === "gmail_connected") {
      setNotification({
        type: "success",
        message: "Gmail account successfully authorized and connected to your AI Twin.",
      });
      router.replace("/integrations");
    } else if (errorParam) {
      const decodedError = decodeURIComponent(errorParam);
      setNotification({
        type: "error",
        message:
          decodedError === "access_denied"
            ? "Google authorization was denied or cancelled. Make sure your account is saved under Test Users in Google Cloud Console, and click Continue on Google's consent screen."
            : `Unable to connect Gmail: ${decodedError}`,
      });
      router.replace("/integrations");
    }
  }, [searchParams, router]);

  // Fetch Gmail connection status for the authenticated employee
  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsFetchingStatus(true);
    try {
      const data = await apiClient.get<GmailStatus>("/integrations/gmail/status");
      setGmailStatus(data);
    } catch (err: any) {
      console.error("Failed to fetch Gmail integration status:", err);
      setGmailStatus({
        connected: false,
        status: "ERROR",
      });
    } finally {
      setIsFetchingStatus(false);
    }
  }, [isAuthenticated]);

  // Fetch AI Email Activity History
  const fetchEmailHistory = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingHistory(true);
    try {
      const res = await apiClient.get<EmailHistoryResponse>("/email/history?limit=30");
      if (res?.emails) {
        setEmailHistory(res.emails);
      }
    } catch (err: any) {
      console.warn("Could not load email history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isAuthenticated]);

  // Telegram Integration State
  const [telegramStatus, setTelegramStatus] = useState<{
    connected: boolean;
    username?: string | null;
    chatId?: number | null;
  }>({ connected: false });
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch Telegram connection status
  const fetchTelegramStatus = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      const res = await apiClient.get<any>(`/messaging/contacts?user_id=${user.id}`);
      const me = res?.contacts?.find((c: any) => c.user_id === user.id || c.email === user.email);
      if (me) {
        setTelegramStatus({
          connected: Boolean(me.telegram_connected),
          username: me.telegram_username,
        });
      }
    } catch (err) {
      console.warn("Could not fetch telegram connection status:", err);
    }
  }, [isAuthenticated, user?.id, user?.email]);

  useEffect(() => {
    fetchStatus();
    fetchEmailHistory();
    fetchTelegramStatus();
  }, [fetchStatus, fetchEmailHistory, fetchTelegramStatus]);

  // Handle Send Telegram Test Notification
  const handleSendTelegramTest = async () => {
    if (!user?.id) return;
    setIsTestingTelegram(true);
    try {
      const res = await apiClient.post<any>("/telegram/test-message", {
        user_id: user.id,
        text: `🚀 Hello ${user.name || "Employee"}! This is a real-time test notification from your Digital Twin (Echo). Your Telegram integration is active and working!`,
      });
      if (res?.success) {
        setNotification({
          type: "success",
          message: "Test message sent to your Telegram successfully! Check your Telegram app.",
        });
      } else {
        setNotification({
          type: "error",
          message: res?.error || "Could not send test message. Please link your Telegram account first.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to trigger test message.",
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // Handle Connect Gmail click
  const handleConnectGmail = async () => {
    setActionLoading(true);
    setNotification(null);
    try {
      const res = await apiClient.get<{ auth_url: string }>("/integrations/gmail/connect?redirect=false");
      if (res?.auth_url) {
        setGmailStatus((prev) => ({ ...prev, status: "CONNECTING" }));
        window.location.href = res.auth_url;
      } else {
        throw new Error("Unable to connect Gmail. Please try again.");
      }
    } catch (err: any) {
      setActionLoading(false);
      setNotification({
        type: "error",
        message: "Unable to connect Gmail. Please try again.",
      });
      setGmailStatus((prev) => ({ ...prev, status: "ERROR" }));
    }
  };

  // Handle Disconnect Gmail click
  const handleDisconnectGmail = async () => {
    if (!confirm("Are you sure you want to disconnect your Gmail account? Your AI Twin will no longer be able to send emails on your behalf.")) {
      return;
    }
    setActionLoading(true);
    try {
      await apiClient.delete("/integrations/gmail/disconnect");
      setNotification({
        type: "success",
        message: "Gmail account disconnected successfully.",
      });
      await fetchStatus();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "Failed to disconnect Gmail account.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter email activities
  const filteredEmails = emailHistory.filter((item) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "SENT") return item.status === "SENT";
    if (activeFilter === "FAILED") return item.status === "FAILED";
    if (activeFilter === "CANCELLED") return item.status === "CANCELLED";
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return (
          <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/30 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41]" />
            Sent
          </span>
        );
      case "FAILED":
        return (
          <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-error/15 text-error border border-error/30 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-error" />
            Failed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-border-tech font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant" />
            Cancelled
          </span>
        );
      case "PENDING_CONFIRMATION":
        return (
          <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold flex items-center gap-1">
            <Clock size={10} className="animate-pulse" />
            Awaiting Confirmation
          </span>
        );
      default:
        return (
          <span className="font-label-caps text-[10px] px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-border-tech">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading integration workspace..." />;
  }

  return (
    <div className="flex flex-col gap-grid_unit h-full min-h-0 overflow-y-auto scroll-hidden pr-1 animate-fade-in-up">
      {/* Header Banner */}
      <div className="dark-glass rounded p-grid_unit flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-label-caps text-xs text-primary-container font-semibold tracking-wider">
              WORKSPACE // CONNECTED APPS &amp; INTEGRATIONS
            </span>
            <span className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
          </div>
          <h2 className="font-headline-lg text-2xl font-bold text-on-surface">
            External Integrations &amp; Tools
          </h2>
          <p className="font-code-sm text-xs text-on-surface-variant mt-0.5">
            Authorize third-party services to empower your autonomous Digital Twin with email and messaging capabilities.
          </p>
        </div>

        <button
          onClick={() => {
            fetchStatus();
            fetchEmailHistory();
          }}
          disabled={isFetchingStatus || isLoadingHistory}
          className="px-3.5 py-2 bg-surface-container-high border border-border-tech rounded flex items-center gap-2 font-code-sm text-xs text-on-surface hover:border-primary-container/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetchingStatus || isLoadingHistory ? "animate-spin text-primary-container" : ""} />
          Refresh
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded border flex items-center justify-between gap-3 text-xs font-code-sm ${
            notification.type === "success"
              ? "bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]"
              : "bg-error/10 border-error/30 text-error"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-on-surface-variant hover:text-on-surface font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-grid_unit">
        {/* ── 1. Gmail Integration Card ── */}
        <div className="dark-glass rounded p-grid_unit border border-border-tech hover:border-primary-container/40 transition-all flex flex-col justify-between relative overflow-hidden">
          <div>
            {/* Top Row: Icon & Status Badge */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">
                <Mail size={22} />
              </div>
              <div className="flex items-center gap-2">
                {isFetchingStatus ? (
                  <span className="font-label-caps text-[10px] px-2.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">
                    Checking…
                  </span>
                ) : gmailStatus.connected ? (
                  <span className="font-label-caps text-[10px] px-2.5 py-0.5 rounded bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/30 flex items-center gap-1.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
                    ● Connected
                  </span>
                ) : gmailStatus.status === "CONNECTING" || actionLoading ? (
                  <span className="font-label-caps text-[10px] px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <Radio size={10} className="animate-pulse" />
                    Connecting
                  </span>
                ) : gmailStatus.status === "ERROR" ? (
                  <span className="font-label-caps text-[10px] px-2.5 py-0.5 rounded bg-error/15 text-error border border-error/30 font-bold">
                    ● Error
                  </span>
                ) : (
                  <span className="font-label-caps text-[10px] px-2.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-border-tech font-bold">
                    ● Not Connected
                  </span>
                )}
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="font-headline-lg text-lg font-bold text-on-surface mb-1">
              Gmail
            </h3>
            <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed mb-4">
              Allow your AI Twin to send emails on your behalf.
            </p>

            {/* Connected Details */}
            {gmailStatus.connected && (
              <div className="mb-4 p-3 rounded bg-surface-container-lowest border border-border-tech space-y-2">
                <div className="flex items-center justify-between text-xs font-code-sm">
                  <span className="text-on-surface-variant">Connected account:</span>
                  <span className="text-on-surface font-semibold text-primary-fixed-dim truncate max-w-[200px]">
                    {gmailStatus.email}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-code-sm text-[#00ff41] pt-1 border-t border-border-tech/50">
                  <ShieldCheck size={12} />
                  <span>Tokens are encrypted with AES/Fernet in Neon PostgreSQL</span>
                </div>
              </div>
            )}

            {/* Disconnected Guidance */}
            {!gmailStatus.connected && (
              <div className="mb-4 p-2.5 rounded bg-surface-container-lowest/60 border border-border-tech/60 flex items-start gap-2 text-[11px] font-code-sm text-on-surface-variant">
                <Lock size={14} className="text-primary-container shrink-0 mt-0.5" />
                <span>
                  Connect Gmail to enable AI email sending.
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-border-tech flex items-center justify-between gap-3">
            {gmailStatus.connected ? (
              <>
                <span className="font-code-sm text-[10px] text-on-surface-variant">
                  Ready for AI Twin voice dispatch
                </span>
                <button
                  onClick={handleDisconnectGmail}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 bg-error/10 hover:bg-error/20 text-error border border-error/30 rounded font-label-caps text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  Disconnect Gmail
                </button>
              </>
            ) : (
              <>
                <span className="font-code-sm text-[10px] text-on-surface-variant">
                  OAuth 2.0 Web Application
                </span>
                <button
                  onClick={handleConnectGmail}
                  disabled={actionLoading || isFetchingStatus}
                  className="px-4 py-2 bg-primary-container hover:bg-primary-fixed text-on-primary rounded font-label-caps text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Send size={13} />
                  {actionLoading ? "Redirecting..." : "Connect Gmail"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── 2. Telegram Integration Card ── */}
        <div className="dark-glass rounded p-grid_unit border border-border-tech flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="p-2.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Radio size={22} />
              </div>
              {telegramStatus.connected ? (
                <span className="font-label-caps text-[10px] px-2.5 py-0.5 rounded bg-[#00ff41]/15 text-[#00ff41] border border-[#00ff41]/30 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
                  CONNECTED
                </span>
              ) : (
                <span className="font-label-caps text-[10px] px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  NOT LINKED
                </span>
              )}
            </div>

            <h3 className="font-headline-lg text-lg font-bold text-on-surface mb-1">
              Telegram Messenger
            </h3>
            <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed mb-3">
              Link your Telegram account to receive real-time notifications and send commands to your Digital Twin (Echo).
            </p>

            <div className="p-3 rounded bg-surface-container-lowest border border-border-tech space-y-1.5 mb-3 text-xs font-code-sm">
              <div className="flex justify-between text-on-surface-variant">
                <span>Bot:</span>
                <a
                  href={`https://t.me/Echo2627bot?start=${user?.id || ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-container font-semibold hover:underline flex items-center gap-1"
                >
                  @Echo2627bot
                  <ExternalLink size={11} />
                </a>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Account Status:</span>
                <span className={telegramStatus.connected ? "text-[#00ff41] font-semibold" : "text-amber-400 font-semibold"}>
                  {telegramStatus.connected ? (telegramStatus.username ? `@${telegramStatus.username}` : "Linked ✅") : "Not Linked"}
                </span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Link Command:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`/start ${user?.email || user?.id || ""}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="text-on-surface hover:text-primary-container transition-colors flex items-center gap-1 font-mono text-[11px]"
                  title="Click to copy command"
                >
                  <code>/start {user?.email || "email"}</code>
                  {copiedLink ? <Check size={11} className="text-[#00ff41]" /> : <Copy size={11} />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border-tech flex flex-wrap items-center justify-between gap-2 text-xs font-code-sm">
            <a
              href={`https://t.me/Echo2627bot?start=${user?.id || ""}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-label-caps text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <ExternalLink size={13} />
              {telegramStatus.connected ? "Open @Echo2627bot" : "Link on Telegram"}
            </a>

            {telegramStatus.connected && (
              <button
                type="button"
                onClick={handleSendTelegramTest}
                disabled={isTestingTelegram}
                className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest border border-border-tech text-on-surface rounded font-label-caps text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Send size={12} className={isTestingTelegram ? "animate-pulse text-primary-container" : ""} />
                {isTestingTelegram ? "Sending..." : "Test Message"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. AI Email Activity Interface ── */}
      <div className="dark-glass rounded p-grid_unit border border-border-tech flex flex-col gap-3 mt-2">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-border-tech">
          <div>
            <h3 className="font-headline-lg text-base font-bold text-on-surface flex items-center gap-2">
              <FileText size={18} className="text-primary-container" />
              AI Email Activity
            </h3>
            <p className="font-code-sm text-xs text-on-surface-variant">
              Audited records of emails staged, confirmed, and sent by your AI Twin.
            </p>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 bg-surface-container-lowest p-1 rounded border border-border-tech text-xs font-code-sm">
            {(["ALL", "SENT", "FAILED", "CANCELLED"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-2.5 py-1 rounded transition-colors text-[11px] font-label-caps ${
                  activeFilter === filter
                    ? "bg-primary-container text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {filter === "ALL" ? "All Activity" : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Email Table */}
        {isLoadingHistory ? (
          <div className="p-8 text-center text-xs font-code-sm text-on-surface-variant flex items-center justify-center gap-2">
            <RefreshCw size={14} className="animate-spin text-primary-container" />
            Loading AI email dispatch records...
          </div>
        ) : filteredEmails.length === 0 ? (
          <div className="p-8 text-center text-xs font-code-sm text-on-surface-variant flex flex-col items-center justify-center gap-2">
            <Inbox size={28} className="text-on-surface-variant/40" />
            <span>No AI email activity matching the selected filter.</span>
            {!gmailStatus.connected && (
              <span className="text-amber-400 text-[11px]">
                Connect Gmail above to start sending emails with your Voice AI Twin.
              </span>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-code-sm border-collapse">
              <thead>
                <tr className="border-b border-border-tech text-on-surface-variant font-label-caps text-[11px]">
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-tech/40">
                {filteredEmails.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedEmail(item)}
                    className="hover:bg-surface-container-high/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3">
                      <div className="font-semibold text-on-surface">
                        {item.meta_data?.recipient_name || item.recipient_email}
                      </div>
                      <div className="text-[11px] text-on-surface-variant truncate max-w-[180px]">
                        {item.recipient_email}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-on-surface max-w-[280px] truncate">
                      {item.subject || "(No Subject)"}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant whitespace-nowrap">
                      {formatDate(item.sent_at || item.created_at)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmail(item);
                        }}
                        className="p-1.5 rounded hover:bg-surface-container-high text-on-surface-variant group-hover:text-primary-container transition-colors"
                        title="View Email Details"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. Email Detail Modal ── */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="dark-glass rounded-lg border border-border-tech max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 relative animate-scale-in max-h-[85vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border-tech">
              <div>
                <span className="font-label-caps text-[10px] text-primary-container tracking-wider">
                  AI DISPATCH DETAIL // EMAIL RECORD
                </span>
                <h4 className="font-headline-lg text-lg font-bold text-on-surface mt-0.5">
                  {selectedEmail.subject}
                </h4>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="p-1.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Email Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-code-sm p-3 rounded bg-surface-container-lowest border border-border-tech">
              <div>
                <span className="text-on-surface-variant block text-[10px] font-label-caps">From</span>
                <span className="text-on-surface font-semibold truncate block">
                  {gmailStatus.email || user?.email || "AI Twin (Voice Agent)"}
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px] font-label-caps">To</span>
                <span className="text-on-surface font-semibold truncate block">
                  {selectedEmail.meta_data?.recipient_name ? `${selectedEmail.meta_data.recipient_name} ` : ""}
                  &lt;{selectedEmail.recipient_email}&gt;
                </span>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px] font-label-caps">Status</span>
                <div className="mt-0.5">{getStatusBadge(selectedEmail.status)}</div>
              </div>
              <div>
                <span className="text-on-surface-variant block text-[10px] font-label-caps">Timestamp</span>
                <span className="text-on-surface">
                  {formatDate(selectedEmail.sent_at || selectedEmail.created_at)}
                </span>
              </div>
              <div className="sm:col-span-2 pt-1 border-t border-border-tech/50 flex justify-between items-center text-[11px]">
                <span className="text-on-surface-variant">Agent Responsible:</span>
                <span className="text-primary-container font-semibold">
                  {selectedEmail.meta_data?.agent_id || "Echo (Voice AI Twin)"}
                </span>
              </div>
              {selectedEmail.provider_message_id && (
                <div className="sm:col-span-2 flex justify-between items-center text-[11px]">
                  <span className="text-on-surface-variant">Gmail Message ID:</span>
                  <span className="text-on-surface-variant font-mono truncate max-w-[200px]">
                    {selectedEmail.provider_message_id}
                  </span>
                </div>
              )}
            </div>

            {/* Email Body Content */}
            <div className="space-y-1.5">
              <span className="text-on-surface-variant font-label-caps text-[10px]">
                Message Body
              </span>
              <div className="p-4 rounded bg-surface-container-lowest border border-border-tech font-code-sm text-xs text-on-surface whitespace-pre-wrap leading-relaxed min-h-[100px]">
                {selectedEmail.body}
              </div>
            </div>

            {/* Error detail if failed */}
            {selectedEmail.error_message && (
              <div className="p-3 rounded bg-error/10 border border-error/30 text-error text-xs font-code-sm flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Delivery Failure Reason:</span>
                  <span>{selectedEmail.error_message}</span>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-border-tech flex justify-end">
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded font-label-caps text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
