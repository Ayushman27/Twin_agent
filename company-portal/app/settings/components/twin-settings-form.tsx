"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  Bot,
  Brain,
  Database,
  Layers,
  Sparkles,
  Sliders,
  CheckCircle2,
  Save,
  RotateCcw,
  ShieldAlert,
  GitBranch,
  FileText,
  Briefcase,
  CheckSquare,
  Calendar,
  Mail,
  MessageSquare,
  Github,
  HardDrive,
} from "lucide-react";

export function TwinSettingsForm() {
  const { isLoading: isAuthLoading } = useAuth();

  // Section A: Twin Creation / Provisioning
  const [employeeTwinCreation, setEmployeeTwinCreation] = useState(true);
  const [autoTwinInit, setAutoTwinInit] = useState(true);
  const [requireAdminApproval, setRequireAdminApproval] = useState(false);

  // Section B: Twin Learning & Adaptation
  const [autoProfileBuilding, setAutoProfileBuilding] = useState(true);
  const [learningFromActivity, setLearningFromActivity] = useState(true);
  const [roleAdaptation, setRoleAdaptation] = useState(true);
  const [continuousLearning, setContinuousLearning] = useState(true);

  // Section C: Twin Data Sources (Multi-select)
  const [dataSources, setDataSources] = useState({
    profile: true,
    projects: true,
    tasks: true,
    documents: true,
    roleInfo: true,
    calendar: false,
    email: false,
    slack: false,
    github: false,
  });

  // Section D: Memory & Context Horizon
  const [longTermMemory, setLongTermMemory] = useState(true);
  const [conversationMemory, setConversationMemory] = useState(true);
  const [workActivityMemory, setWorkActivityMemory] = useState(true);
  const [memoryRetention, setMemoryRetention] = useState("90_days");

  // Section E: Twin Behavior & Autonomy
  const [proactiveSuggestions, setProactiveSuggestions] = useState(true);
  const [autonomousActions, setAutonomousActions] = useState(false);
  const [humanApprovalRequired, setHumanApprovalRequired] = useState(true);
  const [roleAwareResponses, setRoleAwareResponses] = useState(true);

  // UI Feedback States
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const toggleDataSource = (key: keyof typeof dataSources) => {
    setDataSources((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSuccessMessage("AI Twin organization policies updated in session. Backend twin governance pipeline will enforce provisioning rules.");
      setTimeout(() => setSuccessMessage(null), 5000);
    }, 600);
  };

  if (isAuthLoading) {
    return <LoadingState label="Loading AI Twin governance context..." />;
  }

  return (
    <form onSubmit={handleSaveSettings} className="space-y-8 animate-fade-in-up pb-12">
      {/* Global Success Banner */}
      {successMessage && (
        <div className="p-3.5 bg-primary-container/10 border border-primary-container/40 text-primary-container text-xs font-code-sm flex items-center justify-between rounded-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{successMessage}</span>
          </div>
          <span className="text-[10px] font-mono border border-primary-container/30 px-1.5 py-0.5">
            SAVED
          </span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 1: SECTION A — TWIN INITIALIZATION & CREATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Bot size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section A — AI Twin Provisioning &amp; Initialization
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Govern how employee digital twins are created, initialized, and verified.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-primary-container uppercase px-2 py-0.5 border border-primary-container/30 bg-primary-container/10 rounded-sm">
            Twin Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Setting 1: Employee Twin Creation */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Employee Twin Creation
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Allow registered organization employees to have a personalized AI Twin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEmployeeTwinCreation(!employeeTwinCreation)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                employeeTwinCreation
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  employeeTwinCreation
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Setting 2: Automatic Twin Initialization */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Automatic Initialization
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Automatically initialize an AI Twin when a new employee completes onboarding.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoTwinInit(!autoTwinInit)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                autoTwinInit
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  autoTwinInit
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Setting 3: Require Admin Approval */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Require Admin Approval
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Require an organization administrator to approve twin provisioning before activation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRequireAdminApproval(!requireAdminApproval)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                requireAdminApproval
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  requireAdminApproval
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 2: SECTION B — TWIN LEARNING & ADAPTATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Brain size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section B — Twin Learning &amp; Role Adaptation
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Configure contextual skill extraction, activity learning, and persona alignment.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Learning Pipeline
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Setting 1: Auto Profile Building */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Automatic Profile Building
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Synthesize employee background, job title, and verified skills into twin baseline context.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoProfileBuilding(!autoProfileBuilding)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                autoProfileBuilding
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  autoProfileBuilding
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Setting 2: Learning From Work Activity */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Learning From Work Activity
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Extract workflow patterns and domain expertise from completed tasks and active projects.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLearningFromActivity(!learningFromActivity)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                learningFromActivity
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  learningFromActivity
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Setting 3: Role Adaptation */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Role Adaptation
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Align twin terminology, tone, and communication style with assigned organizational role.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRoleAdaptation(!roleAdaptation)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                roleAdaptation
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  roleAdaptation
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Setting 4: Continuous Learning */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Continuous Learning
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Dynamically update twin memory vectors as new task interactions occur.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setContinuousLearning(!continuousLearning)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                continuousLearning
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  continuousLearning
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 3: SECTION C — TWIN DATA SOURCES */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Database size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section C — Authorized Twin Context Data Sources
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Select enterprise repositories that feed knowledge vectors into employee twins.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-primary-container uppercase px-2 py-0.5 border border-primary-container/30 bg-primary-container/10 rounded-sm">
            RAG Ingestion
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Source 1: Employee Profile */}
          <div
            onClick={() => toggleDataSource("profile")}
            className={`p-3.5 rounded-sm border flex items-center justify-between cursor-pointer transition-colors ${
              dataSources.profile
                ? "bg-surface-layer border-primary-container/50 text-on-surface"
                : "bg-surface-container-high/30 border-border-tech text-on-surface-variant"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Briefcase size={16} className={dataSources.profile ? "text-primary-container" : "text-neutral-500"} />
              <div>
                <div className="font-label-caps text-xs font-semibold uppercase">Employee Profile</div>
                <div className="font-code-sm text-[10px] text-on-surface-variant">Name, skills, department, role</div>
              </div>
            </div>
            <input type="checkbox" checked={dataSources.profile} readOnly className="accent-primary-container" />
          </div>

          {/* Source 2: Assigned Projects */}
          <div
            onClick={() => toggleDataSource("projects")}
            className={`p-3.5 rounded-sm border flex items-center justify-between cursor-pointer transition-colors ${
              dataSources.projects
                ? "bg-surface-layer border-primary-container/50 text-on-surface"
                : "bg-surface-container-high/30 border-border-tech text-on-surface-variant"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <GitBranch size={16} className={dataSources.projects ? "text-primary-container" : "text-neutral-500"} />
              <div>
                <div className="font-label-caps text-xs font-semibold uppercase">Assigned Projects</div>
                <div className="font-code-sm text-[10px] text-on-surface-variant">Project boards, deliverables</div>
              </div>
            </div>
            <input type="checkbox" checked={dataSources.projects} readOnly className="accent-primary-container" />
          </div>

          {/* Source 3: Tasks */}
          <div
            onClick={() => toggleDataSource("tasks")}
            className={`p-3.5 rounded-sm border flex items-center justify-between cursor-pointer transition-colors ${
              dataSources.tasks
                ? "bg-surface-layer border-primary-container/50 text-on-surface"
                : "bg-surface-container-high/30 border-border-tech text-on-surface-variant"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CheckSquare size={16} className={dataSources.tasks ? "text-primary-container" : "text-neutral-500"} />
              <div>
                <div className="font-label-caps text-xs font-semibold uppercase">Completed Tasks</div>
                <div className="font-code-sm text-[10px] text-on-surface-variant">Work items, task descriptions</div>
              </div>
            </div>
            <input type="checkbox" checked={dataSources.tasks} readOnly className="accent-primary-container" />
          </div>

          {/* Source 4: Documents */}
          <div
            onClick={() => toggleDataSource("documents")}
            className={`p-3.5 rounded-sm border flex items-center justify-between cursor-pointer transition-colors ${
              dataSources.documents
                ? "bg-surface-layer border-primary-container/50 text-on-surface"
                : "bg-surface-container-high/30 border-border-tech text-on-surface-variant"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText size={16} className={dataSources.documents ? "text-primary-container" : "text-neutral-500"} />
              <div>
                <div className="font-label-caps text-xs font-semibold uppercase">Workspace Documents</div>
                <div className="font-code-sm text-[10px] text-on-surface-variant">Handbooks, architecture docs</div>
              </div>
            </div>
            <input type="checkbox" checked={dataSources.documents} readOnly className="accent-primary-container" />
          </div>

          {/* Source 5: Role Information */}
          <div
            onClick={() => toggleDataSource("roleInfo")}
            className={`p-3.5 rounded-sm border flex items-center justify-between cursor-pointer transition-colors ${
              dataSources.roleInfo
                ? "bg-surface-layer border-primary-container/50 text-on-surface"
                : "bg-surface-container-high/30 border-border-tech text-on-surface-variant"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers size={16} className={dataSources.roleInfo ? "text-primary-container" : "text-neutral-500"} />
              <div>
                <div className="font-label-caps text-xs font-semibold uppercase">Role Competency Standards</div>
                <div className="font-code-sm text-[10px] text-on-surface-variant">Role twin benchmarks</div>
              </div>
            </div>
            <input type="checkbox" checked={dataSources.roleInfo} readOnly className="accent-primary-container" />
          </div>

          {/* Source 6: Calendar (Planned) */}
          <div
            onClick={() => toggleDataSource("calendar")}
            className={`p-3.5 rounded-sm border flex items-center justify-between cursor-pointer transition-colors ${
              dataSources.calendar
                ? "bg-surface-layer border-primary-container/50 text-on-surface"
                : "bg-surface-container-high/30 border-border-tech text-on-surface-variant"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar size={16} className={dataSources.calendar ? "text-primary-container" : "text-neutral-500"} />
              <div>
                <div className="font-label-caps text-xs font-semibold uppercase">Calendar &amp; Agendas</div>
                <div className="font-code-sm text-[10px] text-on-surface-variant">Upcoming meetings (Planned)</div>
              </div>
            </div>
            <input type="checkbox" checked={dataSources.calendar} readOnly className="accent-primary-container" />
          </div>

          {/* Source 7: Email (Planned) */}
          <div
            onClick={() => toggleDataSource("email")}
            className={`p-3.5 rounded-sm border flex items-center justify-between cursor-pointer transition-colors ${
              dataSources.email
                ? "bg-surface-layer border-primary-container/50 text-on-surface"
                : "bg-surface-container-high/30 border-border-tech text-on-surface-variant"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Mail size={16} className={dataSources.email ? "text-primary-container" : "text-neutral-500"} />
              <div>
                <div className="font-label-caps text-xs font-semibold uppercase">Corporate Email Threads</div>
                <div className="font-code-sm text-[10px] text-on-surface-variant">Thread context (Planned)</div>
              </div>
            </div>
            <input type="checkbox" checked={dataSources.email} readOnly className="accent-primary-container" />
          </div>

          {/* Source 8: Slack (Planned) */}
          <div
            onClick={() => toggleDataSource("slack")}
            className={`p-3.5 rounded-sm border flex items-center justify-between cursor-pointer transition-colors ${
              dataSources.slack
                ? "bg-surface-layer border-primary-container/50 text-on-surface"
                : "bg-surface-container-high/30 border-border-tech text-on-surface-variant"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare size={16} className={dataSources.slack ? "text-primary-container" : "text-neutral-500"} />
              <div>
                <div className="font-label-caps text-xs font-semibold uppercase">Slack / Teams Messages</div>
                <div className="font-code-sm text-[10px] text-on-surface-variant">Channel summaries (Planned)</div>
              </div>
            </div>
            <input type="checkbox" checked={dataSources.slack} readOnly className="accent-primary-container" />
          </div>

          {/* Source 9: GitHub (Planned) */}
          <div
            onClick={() => toggleDataSource("github")}
            className={`p-3.5 rounded-sm border flex items-center justify-between cursor-pointer transition-colors ${
              dataSources.github
                ? "bg-surface-layer border-primary-container/50 text-on-surface"
                : "bg-surface-container-high/30 border-border-tech text-on-surface-variant"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Github size={16} className={dataSources.github ? "text-primary-container" : "text-neutral-500"} />
              <div>
                <div className="font-label-caps text-xs font-semibold uppercase">GitHub / Code Repos</div>
                <div className="font-code-sm text-[10px] text-on-surface-variant">PR reviews &amp; code (Planned)</div>
              </div>
            </div>
            <input type="checkbox" checked={dataSources.github} readOnly className="accent-primary-container" />
          </div>
        </div>

        <div className="p-3.5 border border-border-tech bg-surface-layer font-code-sm text-xs text-on-surface-variant rounded-sm flex items-start gap-2">
          <Sparkles size={14} className="text-primary-container shrink-0 mt-0.5" />
          <span>
            <strong className="text-on-surface">Data Integration Scope: </strong>
            Core workspace profile, projects, tasks, and documents feed the twin context. External connectors (Calendar, Email, Slack, GitHub) are configuration declarations that activate upon adapter integration.
          </span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 4: SECTION D — MEMORY & RETENTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <HardDrive size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section D — Memory Retention &amp; Vector Horizon
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Configure SQLite episodic recall, conversational context horizons, and data retention windows.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Vector Store
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Long-Term Memory */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Long-Term Vector Memory
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Retain episodic memory in SQLite vector database for semantic recall.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLongTermMemory(!longTermMemory)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                longTermMemory
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  longTermMemory
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Conversation Memory */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Conversation Memory
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Preserve full chat history within active session context.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConversationMemory(!conversationMemory)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                conversationMemory
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  conversationMemory
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Work Activity Memory */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Work Activity Memory
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Index task completions and action log history into twin memory.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setWorkActivityMemory(!workActivityMemory)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                workActivityMemory
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  workActivityMemory
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Memory Retention Dropdown */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm space-y-2">
            <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
              Memory Retention Window
            </div>
            <select
              value={memoryRetention}
              onChange={(e) => setMemoryRetention(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-2.5 py-1.5 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none"
            >
              <option value="30_days">30 Days</option>
              <option value="90_days">90 Days (Recommended)</option>
              <option value="180_days">180 Days</option>
              <option value="365_days">1 Year</option>
              <option value="indefinite">Indefinite (Permanent)</option>
            </select>
            <p className="font-code-sm text-[10px] text-on-surface-variant">
              Purges stale episodic memory vectors older than the retention threshold.
            </p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 5: SECTION E — TWIN BEHAVIOR & AUTONOMY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section E — Twin Behavioral Policies &amp; Autonomy
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Enforce proactive response triggers, human approvals, and role-aware formatting.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Behavior Engine
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Proactive Suggestions */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Proactive Suggestions
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Allow the twin to proactively suggest task completions, draft replies, and summarize agendas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProactiveSuggestions(!proactiveSuggestions)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                proactiveSuggestions
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  proactiveSuggestions
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Autonomous Actions */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Autonomous Actions
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Permit the twin to perform multi-step background tool executions without prior confirmation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutonomousActions(!autonomousActions)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                autonomousActions
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  autonomousActions
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Human-in-the-Loop Approval Required */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase flex items-center gap-2">
                <span>Human Approval Required</span>
                <span className="text-[9px] text-primary-container border border-primary-container/40 px-1">RECOMMENDED</span>
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Require user or admin confirmation before executing external API calls or modifying data.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHumanApprovalRequired(!humanApprovalRequired)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                humanApprovalRequired
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  humanApprovalRequired
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Role-Aware Responses */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Role-Aware Responses
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Enforce role-based response formatting aligned with corporate governance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRoleAwareResponses(!roleAwareResponses)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                roleAwareResponses
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  roleAwareResponses
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ACTION FOOTER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-surface-container-high border border-border-tech rounded-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-code-sm text-on-surface-variant">
          <Sparkles size={14} className="text-primary-container" />
          <span>AI Twin governance policies apply organization-wide across all employee digital twins.</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary-container hover:bg-primary-fixed-dim text-black font-code-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,65,0.2)]"
          >
            {isSaving ? (
              <span>Saving Twin Policies...</span>
            ) : (
              <>
                <Save size={14} />
                <span>Save AI Twin Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
