"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@shared/components/status/loading-state";
import { 
  Volume2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Filter, 
  Plus, 
  Search, 
  Bot, 
  Sparkles, 
  Send, 
  Check, 
  ArrowRight,
  ListTodo,
  Layers,
  ChevronRight,
  ShieldCheck,
  Play,
  Mic,
  MicOff,
  Radio,
  Square
} from "lucide-react";
import { useGeminiLive } from "@/hooks/use-gemini-live";

interface Task {
  id: string;
  title: string;
  description: string;
  status: "IN_PROGRESS" | "PENDING_APPROVAL" | "COMPLETED" | "QUEUED";
  priority: "HIGH" | "MEDIUM" | "CRITICAL";
  assignedAgent: string;
  dueDate: string;
}

const INITIAL_TASKS: Task[] = [
  {
    id: "TSK-101",
    title: "Approve CI/CD deployment to staging",
    description: "Agent has prepared v2.4 package. Requires authorization for sensitive routing changes.",
    status: "PENDING_APPROVAL",
    priority: "CRITICAL",
    assignedAgent: "SEC_OP_09",
    dueDate: "Today, 5:00 PM",
  },
  {
    id: "TSK-102",
    title: "Analyze system dependencies for v2.4 core upgrade",
    description: "Cross-referencing lib-auth mapping and verifying backward compatibility across microservices.",
    status: "IN_PROGRESS",
    priority: "HIGH",
    assignedAgent: "DEV_AGENT_01",
    dueDate: "Today, 6:30 PM",
  },
  {
    id: "TSK-103",
    title: "Run automated security vulnerability scan",
    description: "Execute static analysis on legacy auth modules and generate evidence report.",
    status: "QUEUED",
    priority: "MEDIUM",
    assignedAgent: "AUDIT_TWIN",
    dueDate: "Tomorrow, 10:00 AM",
  },
  {
    id: "TSK-104",
    title: "Index Slack thread: 'Staging deployment fails'",
    description: "Extract root cause analysis from incident channel and append to Knowledge base.",
    status: "COMPLETED",
    priority: "MEDIUM",
    assignedAgent: "KNOWLEDGE_RAG",
    dueDate: "Completed 2h ago",
  },
  {
    id: "TSK-105",
    title: "Scale up PostgreSQL database connections",
    description: "Adjust connection pool size to accommodate peak load during evening sync.",
    status: "COMPLETED",
    priority: "HIGH",
    assignedAgent: "SYS_OP_02",
    dueDate: "Completed 4h ago",
  },
];

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  isVoice?: boolean;
}

/* ── Circular Floating Multicolor Particle Orb Component ── */
function VoiceParticleOrb({ isSpeaking }: { isSpeaking: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const width = 160;
    const height = 160;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = width / 2 - 6;

    // 26 Floating particles inside circle
    const particles = Array.from({ length: 26 }, () => ({
      x: centerX + (Math.random() - 0.5) * (maxRadius * 1.3),
      y: centerY + (Math.random() - 0.5) * (maxRadius * 1.3),
      vx: (Math.random() - 0.5) * 0.9,
      vy: (Math.random() - 0.5) * 0.9,
      r: Math.random() * 3 + 2,
      phase: Math.random() * Math.PI * 2,
      idleColor: (["#00ff41", "#00f3ff", "#a855f7", "#3b82f6", "#10b981"][Math.floor(Math.random() * 5)] || "#00ff41") as string,
      speakingColor: (["#f59e0b", "#ff007f", "#eab308", "#ff6b00", "#ec4899"][Math.floor(Math.random() * 5)] || "#f59e0b") as string,
    }));

    let step = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      step += isSpeaking ? 0.06 : 0.025;

      // Radial background glow inside circle
      const bgGlow = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, maxRadius);
      if (isSpeaking) {
        bgGlow.addColorStop(0, "rgba(245, 158, 11, 0.35)");
        bgGlow.addColorStop(0.5, "rgba(255, 0, 127, 0.2)");
        bgGlow.addColorStop(1, "rgba(20, 8, 25, 0.95)");
      } else {
        bgGlow.addColorStop(0, "rgba(0, 255, 65, 0.25)");
        bgGlow.addColorStop(0.5, "rgba(0, 243, 255, 0.12)");
        bgGlow.addColorStop(1, "rgba(5, 15, 10, 0.95)");
      }
      ctx.fillStyle = bgGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.fill();

      // Floating Particles Animation
      particles.forEach((p) => {
        const speed = isSpeaking ? 1.9 : 1.0;
        p.x += p.vx * speed;
        p.y += p.vy * speed;

        // Circular boundary collision
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxRadius - p.r - 2) {
          const angle = Math.atan2(dy, dx);
          p.x = centerX + Math.cos(angle) * (maxRadius - p.r - 3);
          p.y = centerY + Math.sin(angle) * (maxRadius - p.r - 3);
          p.vx = -p.vx + (Math.random() - 0.5) * 0.3;
          p.vy = -p.vy + (Math.random() - 0.5) * 0.3;
        }

        const radius = Math.max(1, p.r * (isSpeaking ? 1.35 : 1) + Math.sin(step * 2 + p.phase) * 0.8);
        const color = isSpeaking ? p.speakingColor : p.idleColor;

        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = isSpeaking ? 14 : 7;

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.shadowBlur = 0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isSpeaking]);

  return (
    <div className="relative flex flex-col items-center justify-center pointer-events-none">
      {/* Outer Glow Ring */}
      <div
        className={`relative w-44 h-44 rounded-full flex items-center justify-center transition-all duration-700 p-1 border ${
          isSpeaking
            ? "border-amber-400/90 shadow-[0_0_50px_rgba(245,158,11,0.6),inset_0_0_30px_rgba(255,0,127,0.35)] bg-gradient-to-br from-amber-500/15 via-pink-500/15 to-purple-950/40"
            : "border-[#00ff41]/60 shadow-[0_0_40px_rgba(0,255,65,0.35),inset_0_0_25px_rgba(0,243,255,0.2)] bg-gradient-to-br from-[#00ff41]/10 via-cyan-500/10 to-slate-950/40"
        }`}
      >
        {/* Animated Canvas with floating particles */}
        <canvas
          ref={canvasRef}
          width={160}
          height={160}
          className="rounded-full overflow-hidden"
        />
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isEmployee, hasOrganization } = useAuth();

  // Task State
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [taskFilter, setTaskFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // AI Voice Output Interface State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "ai",
      text: "Hello! I am Echo, your AI Twin Voice Assistant. Say 'Echo' followed by your question to talk to me.",
      timestamp: "10:40 AM",
    },
  ]);

  const addMessage = (sender: "user" | "ai", text: string, isVoice = false) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}-${Math.random()}`, sender, text, timestamp: time, isVoice },
    ]);
  };

  const geminiLive = useGeminiLive({
    onTranscript: (sender, text) => {
      addMessage(sender, text, true);
    },
    onStatusChange: (status) => {
      if (status === "speaking") {
        setIsSpeaking(true);
      } else {
        setIsSpeaking(false);
      }
    }
  });

  useEffect(() => {
    // Badge auto-shows once authenticated; mic starts on first click
    if (!isLoading && isAuthenticated && isEmployee && hasOrganization) {
      // nothing — mic starts via button click below
    }
  }, [isLoading, isAuthenticated, isEmployee, hasOrganization]);

  if (isLoading) {
    return <LoadingState label="Authenticating Digital Twin workspace..." />;
  }

  if (!isAuthenticated || !isEmployee || !hasOrganization) {
    return <LoadingState label="Redirecting to Employee Login..." />;
  }

  // Task Actions
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `TSK-${Math.floor(100 + Math.random() * 900)}`,
      title: newTaskTitle.trim(),
      description: "User defined task assigned to Twin Execution Engine.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignedAgent: "TWIN_EXEC",
      dueDate: "Today",
    };

    setTasks([newTask, ...tasks]);
    setNewTaskTitle("");
  };

  const handleToggleTaskStatus = (taskId: string) => {
    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED" }
          : t
      )
    );
  };

  // AI Voice Output Trigger
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!voiceText.trim()) return;

    const text = voiceText.trim();
    setVoiceText("");
    geminiLive.sendTextMessage(text);
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesFilter =
      taskFilter === "ALL" ||
      (taskFilter === "IN_PROGRESS" && t.status === "IN_PROGRESS") ||
      (taskFilter === "PENDING_APPROVAL" && t.status === "PENDING_APPROVAL") ||
      (taskFilter === "COMPLETED" && t.status === "COMPLETED");

    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignedAgent.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-grid_unit h-full min-h-0 animate-fade-in-up">
      {/* ── Left & Center Columns: All Tasks Workspace (Span 2) ── */}
      <div className="lg:col-span-2 flex flex-col gap-grid_unit h-full min-h-0 overflow-y-auto scroll-hidden pr-1">
        {/* Welcome Header */}
        <div className="dark-glass rounded p-grid_unit flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-label-caps text-xs text-primary-container font-semibold tracking-wider">
                WORKSPACE // EMPLOYEE TASKS
              </span>
              <span className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
            </div>
            <h2 className="font-headline-lg text-2xl font-bold text-on-surface">
              Welcome, {user?.name || "Rohan Mehta"}
            </h2>
            <p className="font-code-sm text-xs text-on-surface-variant mt-0.5">
              Manage all assigned tasks and supervise your autonomous Digital Twin execution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-surface-container-high border border-border-tech rounded flex items-center gap-2 font-code-sm text-xs text-on-surface">
              <ListTodo size={14} className="text-primary-container" />
              <span>{tasks.filter((t) => t.status !== "COMPLETED").length} Active Tasks</span>
            </div>
          </div>
        </div>

        {/* Task Control & Add Bar */}
        <div className="dark-glass rounded p-grid_unit flex flex-col gap-4">
          <form onSubmit={handleAddTask} className="flex gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="+ Add a new task for your AI Twin..."
              className="flex-1 bg-surface-container-lowest border border-border-tech rounded px-4 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container transition-colors"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-primary-container text-on-primary font-label-caps text-xs font-bold rounded flex items-center gap-2 hover:bg-primary-fixed transition-colors"
            >
              <Plus size={16} /> Add Task
            </button>
          </form>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2 border-t border-border-tech">
            {/* Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto scroll-hidden pb-1 sm:pb-0">
              {[
                { id: "ALL", label: "All Tasks" },
                { id: "IN_PROGRESS", label: "In Progress" },
                { id: "PENDING_APPROVAL", label: "Pending Approval" },
                { id: "COMPLETED", label: "Completed" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setTaskFilter(filter.id)}
                  className={`px-3 py-1.5 rounded font-label-caps text-xs transition-colors whitespace-nowrap ${
                    taskFilter === filter.id
                      ? "bg-primary-container/10 border border-primary-container text-primary-fixed-dim font-bold"
                      : "bg-surface-container-high border border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full bg-surface-container-lowest border border-border-tech rounded pl-8 pr-3 py-1.5 font-code-sm text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
              />
            </div>
          </div>
        </div>

        {/* All Tasks List */}
        <div className="flex flex-col gap-3">
          {filteredTasks.length === 0 ? (
            <div className="dark-glass rounded p-12 flex flex-col items-center justify-center text-center">
              <CheckCircle2 size={40} className="text-primary-container/40 mb-3" />
              <h3 className="font-headline-lg text-lg text-on-surface font-semibold">No Tasks Found</h3>
              <p className="font-code-sm text-xs text-on-surface-variant mt-1">
                There are no tasks matching your current filter criteria.
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isCompleted = task.status === "COMPLETED";
              const isApprovalNeeded = task.status === "PENDING_APPROVAL";

              return (
                <div
                  key={task.id}
                  className={`dark-glass rounded p-grid_unit border transition-all ${
                    isApprovalNeeded
                      ? "border-error/50 bg-error-container/5"
                      : isCompleted
                      ? "border-border-tech/40 opacity-70"
                      : "border-border-tech hover:border-primary-container/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      {/* Status Checkbox */}
                      <button
                        onClick={() => handleToggleTaskStatus(task.id)}
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-colors border ${
                          isCompleted
                            ? "bg-primary-container border-primary-container text-on-primary"
                            : "border-border-tech hover:border-primary-container bg-surface-layer"
                        }`}
                      >
                        {isCompleted && <Check size={12} strokeWidth={3} />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs text-primary-container font-semibold">
                            {task.id}
                          </span>
                          <span
                            className={`font-label-caps text-[9px] px-2 py-0.5 rounded font-bold ${
                              task.priority === "CRITICAL"
                                ? "bg-error/20 text-error border border-error/30"
                                : task.priority === "HIGH"
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-surface-container-high text-on-surface-variant"
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span
                            className={`font-label-caps text-[9px] px-2 py-0.5 rounded ${
                              isApprovalNeeded
                                ? "bg-error/20 text-error font-bold"
                                : isCompleted
                                ? "bg-primary-container/20 text-primary-container"
                                : "bg-blue-500/20 text-blue-400"
                            }`}
                          >
                            {task.status.replace("_", " ")}
                          </span>
                        </div>

                        <h4
                          className={`font-semibold text-sm ${
                            isCompleted ? "line-through text-on-surface-variant" : "text-on-surface"
                          }`}
                        >
                          {task.title}
                        </h4>
                        <p className="font-code-sm text-xs text-on-surface-variant mt-1 leading-relaxed">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    {/* Actions & Agent Badge */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 font-label-caps text-[10px] text-on-surface-variant bg-surface-layer px-2.5 py-1 rounded border border-border-tech">
                        <Bot size={12} className="text-primary-container" />
                        <span>{task.assignedAgent}</span>
                      </div>

                      {isApprovalNeeded && (
                        <button
                          onClick={() => handleToggleTaskStatus(task.id)}
                          className="px-3 py-1 bg-primary-container text-on-primary font-label-caps text-[10px] font-bold rounded hover:bg-primary-fixed transition-colors flex items-center gap-1"
                        >
                          Approve Now <ChevronRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Column: Voice Chat Interface (Span 1) ── */}
      <div className="lg:col-span-1 flex flex-col gap-grid_unit h-full min-h-0">
        {/* Voice Assistant Module */}
        <div className="dark-glass rounded p-grid_unit flex flex-col h-full min-h-0 border border-border-tech relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-tech pb-3 mb-4 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-primary-container/10 border border-primary-container/20 text-primary-container">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-label-caps text-xs font-bold text-on-surface">Echo — Voice Agent</h3>
                <span className="font-code-sm text-[10px] text-primary-container flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Say &quot;Echo&quot; to activate
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!micReady ? (
                <button
                  className="font-code-sm text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/20 transition-colors"
                  onClick={() => {
                    geminiLive.startListening();
                    setMicReady(true);
                  }}
                >
                  <Mic size={12} className="animate-pulse" />
                  Tap to Activate
                </button>
              ) : geminiLive.isSessionActive ? (
                <>
                  <span className="font-code-sm text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
                    <Radio size={12} className="animate-pulse" />
                    Session Active
                  </span>
                  <button
                    className="font-code-sm text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1 hover:bg-red-500/20 transition-colors"
                    onClick={() => geminiLive.endSession()}
                  >
                    <Square size={10} />
                    End
                  </button>
                </>
              ) : (
                <span className="font-code-sm text-[10px] px-2 py-0.5 rounded bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/30 flex items-center gap-1.5">
                  <Radio size={12} className="animate-pulse" />
                  Say &quot;Echo...&quot;
                </span>
              )}
              <Volume2 size={16} className={isSpeaking ? "text-amber-400 animate-pulse" : "text-on-surface-variant"} />
            </div>
          </div>

          {/* Non-Clickable Circular Voice Output Hero Section */}
          <div className="flex flex-col items-center justify-center py-1 mb-2 relative shrink-0 select-none">
            {/* Outer Circular Outline Container Frame */}
            <div
              className={`w-32 h-32 rounded-full border-2 flex flex-col items-center justify-center p-2 relative overflow-hidden transition-all duration-300 ${
                geminiLive.isUserSpeaking
                  ? "border-[#00ff41] bg-surface-container-lowest/90 shadow-[0_0_40px_rgba(0,255,65,0.6)] scale-105"
                  : isSpeaking
                  ? "border-amber-400 bg-surface-container-lowest/90 shadow-[0_0_35px_rgba(245,158,11,0.5)]"
                  : geminiLive.isListening
                  ? "border-red-500 bg-surface-container-lowest/90 shadow-[0_0_25px_rgba(239,68,68,0.35)]"
                  : "border-[#00ff41]/50 bg-surface-container-lowest/90 shadow-[0_0_15px_rgba(0,255,65,0.25)]"
              }`}
            >
              {/* Particle Canvas Orb */}
              <VoiceParticleOrb isSpeaking={isSpeaking || geminiLive.isUserSpeaking || geminiLive.isListening} />

              {/* Audio Wave Visualizer Bars inside circular frame */}
              <div className="flex items-center justify-center gap-0.5 h-3 mt-1 w-full px-2">
                {[30, 70, 40, 85, 55, 90, 45, 95, 60, 35, 75, 40].map((h, i) => (
                  <div
                    key={i}
                    className={`w-0.5 rounded-full transition-all duration-300 ${
                      geminiLive.isUserSpeaking
                        ? "bg-[#00ff41] animate-bounce"
                        : isSpeaking
                        ? "bg-amber-400 animate-pulse"
                        : geminiLive.isListening
                        ? "bg-red-400 animate-pulse"
                        : "bg-[#00ff41]/60"
                    }`}
                    style={{
                      height: (isSpeaking || geminiLive.isUserSpeaking || geminiLive.isListening) ? `${Math.max(15, (h * (i % 2 === 0 ? 1 : 0.7)))}%` : "15%",
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Voice Output Status Label */}
            <span className={`font-label-caps text-[10px] font-semibold mt-1 transition-colors duration-300 ${
              geminiLive.isUserSpeaking
                ? "text-[#00ff41] drop-shadow-[0_0_10px_rgba(0,255,65,0.8)] animate-pulse"
                : isSpeaking
                ? "text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                : geminiLive.isListening
                ? "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                : "text-[#00ff41]"
            }`}>
              {geminiLive.isUserSpeaking
                ? "Listening... Audio Input Detected"
                : isSpeaking
                ? "AI Twin Speaking Output..."
                : geminiLive.isListening
                ? "Gemini Live Mic Streaming..."
                : "AI Voice Engine • Ready"}
            </span>
          </div>

          {/* Real-time Voice Chat Transcript Stream */}
          <div className="flex-1 border-t border-border-tech pt-3 flex flex-col justify-between overflow-hidden min-h-0">
            <span className="font-label-caps text-[10px] text-on-surface-variant mb-2 block shrink-0">
              LIVE CONVERSATION TRANSCRIPT
            </span>

            <div className="flex-1 overflow-y-auto scroll-hidden space-y-3 pr-1 min-h-0">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed ${
                      msg.sender === "user"
                        ? "bg-primary-container/15 border border-primary-container/30 text-on-surface rounded-br-none"
                        : "bg-surface-container-high border border-border-tech text-on-surface-variant rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="font-label-caps text-[9px] text-on-surface-variant/60 mt-1 px-1">
                    {msg.timestamp} {msg.isVoice ? "• Voice Input" : ""}
                  </span>
                </div>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="flex gap-2 mt-3 pt-2 border-t border-border-tech">
              <input
                type="text"
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="Type query to trigger voice response..."
                className="flex-1 bg-surface-container-lowest border border-border-tech rounded px-3 py-1.5 font-code-sm text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
              />
              <button
                type="submit"
                className="p-2 bg-primary-container text-on-primary rounded hover:bg-primary-fixed transition-colors"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
