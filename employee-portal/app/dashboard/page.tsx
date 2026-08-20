"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@shared/components/status/loading-state";
import { 
  Mic, 
  MicOff, 
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
  Play
} from "lucide-react";

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

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isEmployee, hasOrganization } = useAuth();

  // Task State
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [taskFilter, setTaskFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Voice Chat Interface State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "ai",
      text: "Hello Rohan! I am your AI Twin. I'm actively monitoring your 5 assigned tasks. How can I assist you by voice?",
      timestamp: "10:40 AM",
    },
  ]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login?error=unauthorized");
      } else if (!isEmployee) {
        router.push("/login?error=admin_restricted");
      } else if (!hasOrganization) {
        router.push("/login?error=no_organization");
      }
    }
  }, [isLoading, isAuthenticated, isEmployee, hasOrganization, router]);

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

  // Voice Chat Handlers
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      setIsSpeaking(false);
      // Simulate speech recognition result after 2.5 seconds
      setTimeout(() => {
        setIsListening(false);
        const userQuery = "Summarize the critical tasks requiring my approval.";
        addMessage("user", userQuery, true);
        
        // AI Voice Response
        setIsSpeaking(true);
        setTimeout(() => {
          addMessage(
            "ai",
            "You have 1 Critical task pending approval: 'Approve CI/CD deployment to staging'. Would you like me to approve it for you?",
            false
          );
          setTimeout(() => setIsSpeaking(false), 3000);
        }, 1200);
      }, 2500);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!voiceText.trim()) return;

    const text = voiceText.trim();
    addMessage("user", text);
    setVoiceText("");

    // AI Response Simulation
    setIsSpeaking(true);
    setTimeout(() => {
      addMessage("ai", `Received query: "${text}". Processing via Twin Knowledge Base... All tasks remain synchronized.`);
      setIsSpeaking(false);
    }, 1000);
  };

  const addMessage = (sender: "user" | "ai", text: string, isVoice = false) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setChatMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, sender, text, timestamp: time, isVoice },
    ]);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-grid_unit h-full animate-fade-in-up">
      {/* ── Left & Center Columns: All Tasks Workspace (Span 2) ── */}
      <div className="lg:col-span-2 flex flex-col gap-grid_unit">
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
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto scroll-hidden pr-1">
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
      <div className="lg:col-span-1 flex flex-col gap-grid_unit">
        {/* Voice Assistant Module */}
        <div className="dark-glass rounded p-grid_unit flex flex-col flex-1 border border-border-tech relative overflow-hidden min-h-[580px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-tech pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-primary-container/10 border border-primary-container/20 text-primary-container">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-label-caps text-xs font-bold text-on-surface">Voice Assistant</h3>
                <span className="font-code-sm text-[10px] text-primary-container flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-container pulse-green" />
                  Twin AI Active
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Volume2 size={16} className="text-on-surface-variant" />
            </div>
          </div>

          {/* Interactive Mic Visualizer Hero */}
          <div className="bg-surface-container-lowest border border-border-tech rounded-lg p-5 mb-4 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Audio Wave Animated Bars */}
            <div className="flex items-center justify-center gap-1.5 h-12 mb-4 w-full px-4">
              {[40, 75, 30, 90, 50, 80, 45, 95, 60, 30, 70, 40].map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isListening || isSpeaking
                      ? "bg-primary-container animate-pulse"
                      : "bg-border-tech"
                  }`}
                  style={{
                    height: isListening || isSpeaking ? `${Math.max(15, (h * (i % 2 === 0 ? 1 : 0.7)))}%` : "12%",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>

            {/* Large Glowing Mic Toggle Button */}
            <button
              onClick={toggleListening}
              className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                isListening
                  ? "bg-primary-container text-on-primary shadow-[0_0_30px_rgba(0,255,65,0.6)] scale-105"
                  : isSpeaking
                  ? "bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                  : "bg-surface-container-high text-primary-container border border-primary-container/40 hover:border-primary-container hover:shadow-[0_0_15px_rgba(0,255,65,0.2)]"
              }`}
            >
              {isListening ? (
                <MicOff size={28} className="animate-pulse" />
              ) : (
                <Mic size={28} />
              )}
            </button>

            <span className="font-label-caps text-xs font-semibold mt-3 text-on-surface">
              {isListening
                ? "Listening... Speak Now"
                : isSpeaking
                ? "Twin AI Speaking..."
                : "Click Mic to Start Voice Command"}
            </span>
          </div>

          {/* Quick Voice Prompts */}
          <div className="mb-4">
            <span className="font-label-caps text-[10px] text-on-surface-variant mb-2 block">
              SUGGESTED VOICE PROMPTS
            </span>
            <div className="flex flex-col gap-1.5">
              {[
                "Summarize critical tasks for today",
                "Approve pending deployment task",
                "Run automated security audit",
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setVoiceText(prompt);
                    handleSendMessage();
                  }}
                  className="w-full text-left px-3 py-1.5 rounded bg-surface-layer border border-border-tech hover:border-primary-container font-code-sm text-xs text-on-surface-variant hover:text-primary-container transition-colors flex items-center justify-between"
                >
                  <span>&quot;{prompt}&quot;</span>
                  <ArrowRight size={12} />
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Voice Chat Transcript Stream */}
          <div className="flex-1 border-t border-border-tech pt-3 flex flex-col justify-between overflow-hidden">
            <span className="font-label-caps text-[10px] text-on-surface-variant mb-2 block">
              LIVE CONVERSATION TRANSCRIPT
            </span>

            <div className="flex-1 overflow-y-auto scroll-hidden space-y-3 pr-1 max-h-[220px]">
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
                placeholder="Type or click mic to speak..."
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
