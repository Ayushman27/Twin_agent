"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { projectService } from "@/services/project.service";
import { teamService } from "@/services/team.service";
import { organizationService, DetailedMember } from "@shared/services/organization.service";
import type { Team } from "@shared/types/team";
import type {
  Project,
  ProjectCreatePayload,
  ProjectPriority,
  ProjectRiskLevel,
  ProjectStatus,
  ProjectUpdatePayload,
} from "@shared/types/project";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  Briefcase,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Users,
  Calendar,
  Layers,
  ArrowUpDown,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Clock,
  Zap,
} from "lucide-react";

export default function ProjectsPage() {
  const { user, isLoading: isAuthLoading, isAuthenticated, isOrgAdmin } = useAuth();
  const orgId = user?.organization_id || user?.organizationId;

  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [orgMembers, setOrgMembers] = useState<DetailedMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [riskFilter, setRiskFilter] = useState<string>("ALL");
  const [teamFilter, setTeamFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<
    "recently_updated" | "target_date" | "progress_desc" | "risk_desc" | "priority_desc"
  >("recently_updated");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create / Edit Form State
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formOwnerId, setFormOwnerId] = useState("");
  const [formTeamId, setFormTeamId] = useState("");
  const [formStatus, setFormStatus] = useState<ProjectStatus>("PLANNING");
  const [formPriority, setFormPriority] = useState<ProjectPriority>("MEDIUM");
  const [formRiskLevel, setFormRiskLevel] = useState<ProjectRiskLevel>("LOW");
  const [formStartDate, setFormStartDate] = useState("");
  const [formTargetDate, setFormTargetDate] = useState("");
  const [formProgress, setFormProgress] = useState(0);

  // Auto-hide success notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load Projects, Teams, and Members
  const fetchProjectsData = useCallback(
    async (isBackground = false) => {
      if (!orgId) return;
      if (!isBackground) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const [projRes, teamsRes, membersRes] = await Promise.all([
          projectService.getProjects(orgId),
          teamService.getTeams(orgId).catch(() => ({ teams: [], total: 0 })),
          organizationService.getDetailedMembers(orgId).catch(() => []),
        ]);
        setProjects(projRes.projects || []);
        setTeams(teamsRes.teams || []);

        let activeMembers = (membersRes || []).filter(
          (m) => !m.status || m.status.toUpperCase() === "ACTIVE"
        );
        if (user && user.id && !activeMembers.some((m) => m.user_id === user.id || m.id === user.id)) {
          activeMembers = [
            {
              id: user.id,
              organization_id: orgId,
              user_id: user.id,
              role: user.role || "ORG_ADMIN",
              status: "ACTIVE",
              name: user.name || user.email || "Administrator",
              email: user.email,
              department: "Administration",
            },
            ...activeMembers,
          ];
        }
        setOrgMembers(activeMembers);
      } catch (err: any) {
        console.error("Failed to load organizational projects:", err);
        setErrorMessage(
          err?.response?.data?.error?.message ||
            err?.message ||
            "Failed to load projects from backend service."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [orgId, user]
  );

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && orgId) {
      fetchProjectsData();
    }
  }, [isAuthLoading, isAuthenticated, orgId, fetchProjectsData]);

  // Generate suggested project code
  const handleNameChange = (name: string) => {
    setFormName(name);
    if (!editingProject && !formCode) {
      const words = name.trim().split(/\s+/).filter(Boolean);
      let suggested = "";
      if (words.length === 1 && words[0]) {
        suggested = words[0].slice(0, 4).toUpperCase();
      } else if (words.length > 1) {
        suggested = words
          .slice(0, 3)
          .map((w) => w || "")
          .join("")
          .toUpperCase();
      }
      if (suggested) {
        setFormCode(`${suggested}-01`);
      }
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormName("");
    setFormCode("");
    setFormDesc("");
    const defaultOwner = (user && user.id) || (orgMembers[0]?.user_id ?? "");
    setFormOwnerId(defaultOwner);
    setFormTeamId("");
    setFormStatus("PLANNING");
    setFormPriority("MEDIUM");
    setFormRiskLevel("LOW");
    setFormStartDate("");
    setFormTargetDate("");
    setFormProgress(0);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (project: Project) => {
    setEditingProject(project);
    setFormName(project.name);
    setFormCode(project.project_code);
    setFormDesc(project.description || "");
    setFormOwnerId(project.owner_id || "");
    setFormTeamId(project.team_id || "");
    setFormStatus(project.status || "PLANNING");
    setFormPriority(project.priority || "MEDIUM");
    setFormRiskLevel(project.risk_level || "LOW");
    setFormStartDate(project.start_date ? project.start_date.slice(0, 10) : "");
    setFormTargetDate(project.target_end_date ? project.target_end_date.slice(0, 10) : "");
    setFormProgress(project.progress_percent || 0);
  };

  // Submit Create Project
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !formName.trim() || !formCode.trim()) return;

    if (formStartDate && formTargetDate && formTargetDate < formStartDate) {
      alert("Target End Date must be on or after Start Date.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: ProjectCreatePayload = {
        name: formName.trim(),
        project_code: formCode.trim().toUpperCase(),
        description: formDesc.trim() || undefined,
        owner_id: formOwnerId.trim() || undefined,
        team_id: formTeamId.trim() || undefined,
        status: formStatus,
        priority: formPriority,
        risk_level: formRiskLevel,
        start_date: formStartDate ? new Date(formStartDate).toISOString() : undefined,
        target_end_date: formTargetDate ? new Date(formTargetDate).toISOString() : undefined,
        progress_percent: 0, // Progress always starts at 0%
      };

      await projectService.createProject(orgId, payload);
      setIsCreateModalOpen(false);
      setSuccessMessage(`Project "${formName}" created successfully.`);
      await fetchProjectsData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to create project");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Edit Project
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !editingProject || !formName.trim() || !formCode.trim()) return;

    if (formStartDate && formTargetDate && formTargetDate < formStartDate) {
      alert("Target End Date must be on or after Start Date.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: ProjectUpdatePayload = {
        name: formName.trim(),
        project_code: formCode.trim().toUpperCase(),
        description: formDesc.trim() || undefined,
        owner_id: formOwnerId ? formOwnerId : "",
        team_id: formTeamId ? formTeamId : "",
        status: formStatus,
        priority: formPriority,
        risk_level: formRiskLevel,
        start_date: formStartDate ? new Date(formStartDate).toISOString() : undefined,
        target_end_date: formTargetDate ? new Date(formTargetDate).toISOString() : undefined,
        progress_percent: Number(formProgress) || 0,
      };

      await projectService.updateProject(orgId, editingProject.id, payload);
      setEditingProject(null);
      setSuccessMessage(`Project "${formName}" updated successfully.`);
      await fetchProjectsData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Delete Project
  const handleDeleteSubmit = async () => {
    if (!orgId || !deletingProject) return;
    setIsDeleting(true);
    try {
      await projectService.deleteProject(orgId, deletingProject.id);
      setSuccessMessage(`Project "${deletingProject.name}" removed.`);
      setDeletingProject(null);
      await fetchProjectsData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.project_code.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.owner?.name && p.owner.name.toLowerCase().includes(q)) ||
          (p.owner?.email && p.owner.email.toLowerCase().includes(q)) ||
          (p.team?.name && p.team.name.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "ALL") {
      result = result.filter((p) => p.priority === priorityFilter);
    }

    // Risk filter
    if (riskFilter !== "ALL") {
      result = result.filter((p) => p.risk_level === riskFilter);
    }

    // Team filter
    if (teamFilter !== "ALL") {
      result = result.filter((p) => p.team_id === teamFilter);
    }

    // Sorting
    const priorityWeight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const riskWeight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

    result.sort((a, b) => {
      if (sortBy === "target_date") {
        if (!a.target_end_date) return 1;
        if (!b.target_end_date) return -1;
        return new Date(a.target_end_date).getTime() - new Date(b.target_end_date).getTime();
      }
      if (sortBy === "progress_desc") {
        return (b.progress_percent || 0) - (a.progress_percent || 0);
      }
      if (sortBy === "risk_desc") {
        return (riskWeight[b.risk_level] || 0) - (riskWeight[a.risk_level] || 0);
      }
      if (sortBy === "priority_desc") {
        return (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      }
      // recently_updated (default)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return result;
  }, [projects, searchQuery, statusFilter, priorityFilter, riskFilter, teamFilter, sortBy]);

  // Aggregate KPI Stats
  const kpiStats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "ACTIVE").length;
    const highRisk = projects.filter(
      (p) => p.risk_level === "HIGH" || p.risk_level === "CRITICAL"
    ).length;
    const avgProgress =
      total > 0
        ? Math.round(
            projects.reduce((acc, p) => acc + (p.progress_percent || 0), 0) / total
          )
        : 0;
    return { total, active, highRisk, avgProgress };
  }, [projects]);

  // Date Formatter Helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  if (isAuthLoading || (isLoading && projects.length === 0)) {
    return <LoadingState label="Loading company initiatives and delivery projects..." />;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up pb-16">
      {/* ── SUCCESS NOTIFICATION BANNER ──────────────────────────────── */}
      {successMessage && (
        <div className="p-3 border border-primary-container/50 bg-primary-container/10 text-primary-container font-code-sm text-xs flex items-center gap-2 rounded-sm animate-fade-in">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border-tech pb-4 gap-4">
        <div>
          <h1 className="font-display-xl text-[24px] sm:text-[28px] text-on-surface flex items-center gap-2">
            <span>Projects</span>
          </h1>
          <p className="font-code-sm text-xs text-on-surface-variant mt-1 max-w-2xl">
            Manage company initiatives, delivery teams, AI workforces, milestones, and project health.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchProjectsData(true)}
            disabled={isLoading || isRefreshing}
            className="px-3 py-2 border border-border-tech hover:border-primary-container/50 bg-surface-container-low text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Reload project directory"
          >
            <RefreshCw
              size={13}
              className={isRefreshing ? "animate-spin text-primary-container" : ""}
            />
            <span>Refresh</span>
          </button>

          {isOrgAdmin && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>Create Project</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI METRICS CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Total Projects</span>
            <Briefcase size={14} className="text-primary-container" />
          </div>
          <div className="font-code-sm text-2xl text-on-surface font-bold">
            {kpiStats.total}
          </div>
          <div className="font-code-sm text-[11px] text-on-surface-variant/70 mt-0.5">
            Tracked initiatives
          </div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Active Tracks</span>
            <Zap size={14} className="text-emerald-400" />
          </div>
          <div className="font-code-sm text-2xl text-emerald-400 font-bold">
            {kpiStats.active}
          </div>
          <div className="font-code-sm text-[11px] text-emerald-400/80 mt-0.5">
            In active delivery
          </div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>High / Critical Risk</span>
            <ShieldAlert size={14} className="text-rose-400" />
          </div>
          <div className="font-code-sm text-2xl text-rose-400 font-bold">
            {kpiStats.highRisk}
          </div>
          <div className="font-code-sm text-[11px] text-rose-400/80 mt-0.5">
            Requires intervention
          </div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Avg Progress</span>
            <TrendingUp size={14} className="text-primary-container" />
          </div>
          <div className="font-code-sm text-2xl text-primary-container font-bold">
            {kpiStats.avgProgress}%
          </div>
          <div className="font-code-sm text-[11px] text-primary-container/80 mt-0.5">
            Overall completion
          </div>
        </div>
      </div>

      {/* ── TOOLBAR: SEARCH, FILTERS & SORT ─────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by project name, code (e.g. AOP-01), owner, squad..."
            className="w-full bg-surface-container-lowest border border-border-tech rounded-sm pl-9 pr-3 py-1.5 font-code-sm text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 font-code-sm text-xs">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-lowest border border-border-tech rounded-sm px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PLANNING">Planning</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-surface-container-lowest border border-border-tech rounded-sm px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="bg-surface-container-lowest border border-border-tech rounded-sm px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
          >
            <option value="ALL">All Risks</option>
            <option value="CRITICAL">Critical Risk</option>
            <option value="HIGH">High Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="LOW">Low Risk</option>
          </select>

          {/* Team Filter */}
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="bg-surface-container-lowest border border-border-tech rounded-sm px-2.5 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer max-w-[150px]"
          >
            <option value="ALL">All Squads</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <div className="flex items-center gap-1 bg-surface-container-lowest border border-border-tech rounded-sm px-2 py-1">
            <ArrowUpDown size={12} className="text-on-surface-variant" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-on-surface focus:outline-none cursor-pointer"
            >
              <option value="recently_updated">Recently Updated</option>
              <option value="target_date">Target Date (Earliest)</option>
              <option value="progress_desc">Progress (Highest)</option>
              <option value="risk_desc">Risk (Highest)</option>
              <option value="priority_desc">Priority (Highest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── PROJECT DIRECTORY TABLE ─────────────────────────────────── */}
      {filteredProjects.length === 0 ? (
        <div className="border border-border-tech bg-surface-container-low p-12 text-center rounded-sm">
          <Briefcase className="w-10 h-10 text-on-surface-variant/40 mx-auto mb-3" />
          <p className="font-display-xl text-lg text-on-surface font-semibold">
            {projects.length === 0 ? "No projects created yet." : "No matching projects found."}
          </p>
          <p className="font-code-sm text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
            {projects.length === 0
              ? "Initialize strategic company projects, attach delivery squads, and track AI-assisted execution."
              : "Try adjusting your search keywords or filter criteria."}
          </p>

          {isOrgAdmin && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : (
        <div className="border border-border-tech bg-surface-container-low overflow-hidden rounded-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-tech bg-surface-container-lowest text-[11px] font-code-sm uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-4 font-semibold">Project</th>
                  <th className="py-3 px-4 font-semibold">Owner</th>
                  <th className="py-3 px-4 font-semibold">Team / Squad</th>
                  <th className="py-3 px-4 font-semibold min-w-[140px]">Progress</th>
                  <th className="py-3 px-4 font-semibold text-center">Risk</th>
                  <th className="py-3 px-4 font-semibold text-center">Priority</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold">Target Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-tech/40">
                {filteredProjects.map((proj) => {
                  const progress = proj.progress_percent || 0;

                  return (
                    <tr
                      key={proj.id}
                      className="hover:bg-surface-container-high/40 transition-colors font-code-sm text-xs text-on-surface group"
                    >
                      {/* Project Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-sm bg-surface-container-lowest border border-border-tech text-primary-container shrink-0 mt-0.5">
                            <Briefcase size={14} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/organization/projects/${proj.id}`}
                                className="font-semibold text-on-surface hover:text-primary-container transition-colors"
                              >
                                {proj.name}
                              </Link>
                              <span className="px-1.5 py-0.5 rounded bg-surface-container-lowest border border-border-tech text-[10px] font-mono text-primary-container">
                                {proj.project_code}
                              </span>
                            </div>
                            {proj.description && (
                              <p className="text-[11px] text-on-surface-variant line-clamp-1 max-w-sm mt-0.5">
                                {proj.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4">
                        {proj.owner ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-sm bg-surface-container-lowest border border-border-tech flex items-center justify-center font-bold text-[10px] text-on-surface shrink-0">
                              {(proj.owner.name || proj.owner.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-medium text-xs text-on-surface truncate">
                                {proj.owner.name || "Owner"}
                              </div>
                              <div className="text-[10px] text-on-surface-variant font-mono truncate">
                                {proj.owner.email}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/60 italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Assigned Squad */}
                      <td className="py-3.5 px-4">
                        {proj.team ? (
                          <div>
                            <div className="font-medium text-xs text-on-surface flex items-center gap-1">
                              <Users size={12} className="text-primary-container" />
                              <span>{proj.team.name}</span>
                            </div>
                            {proj.team.department && (
                              <span className="text-[10px] text-on-surface-variant font-mono">
                                {proj.team.department}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/60 italic">
                            No squad assigned
                          </span>
                        )}
                      </td>

                      {/* Progress Bar */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-on-surface">{progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-container-lowest rounded-full overflow-hidden border border-border-tech/50">
                            <div
                              className={`h-full transition-all duration-300 ${
                                progress >= 100
                                  ? "bg-emerald-400"
                                  : progress >= 50
                                  ? "bg-primary-container"
                                  : "bg-amber-400"
                              }`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Risk Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                            proj.risk_level === "CRITICAL"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/40"
                              : proj.risk_level === "HIGH"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/40"
                              : proj.risk_level === "MEDIUM"
                              ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/40"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/40"
                          }`}
                        >
                          {proj.risk_level}
                        </span>
                      </td>

                      {/* Priority Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                            proj.priority === "CRITICAL"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              : proj.priority === "HIGH"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : proj.priority === "MEDIUM"
                              ? "bg-surface-container-lowest text-on-surface border border-border-tech"
                              : "bg-surface-container-lowest text-on-surface-variant border border-border-tech"
                          }`}
                        >
                          {proj.priority}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                            proj.status === "ACTIVE"
                              ? "bg-primary-container/10 text-primary-container border border-primary-container/40"
                              : proj.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/40"
                              : proj.status === "PLANNING"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/40"
                              : proj.status === "ON_HOLD"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/40"
                              : "bg-surface-container-lowest text-on-surface-variant border border-border-tech"
                          }`}
                        >
                          {proj.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Target Date */}
                      <td className="py-3.5 px-4 text-on-surface-variant font-mono text-[11px]">
                        {formatDate(proj.target_end_date)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/organization/projects/${proj.id}`}
                            className="p-1.5 text-on-surface-variant hover:text-primary-container hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                            title="View Project Hub"
                          >
                            <ArrowRight size={14} />
                          </Link>
                          {isOrgAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(proj)}
                              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                              title="Edit Project Configuration"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {isOrgAdmin && (
                            <button
                              type="button"
                              onClick={() => setDeletingProject(proj)}
                              className="p-1.5 text-on-surface-variant hover:text-rose-400 hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                              title="Delete Project"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CREATE PROJECT MODAL ────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-xl border border-border-tech shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-tech bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <Briefcase size={16} />
                </div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Create New Initiative
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest rounded-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 overflow-y-auto font-code-sm text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Project Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. AI Workflow Automation Platform"
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container placeholder:text-on-surface-variant/50"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Project Code <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. AOP-01"
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono placeholder:text-on-surface-variant/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1">
                  Scope &amp; Description
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Summarize initiative goals, deliverables, and architecture requirements..."
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container placeholder:text-on-surface-variant/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Project Owner */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Project Owner
                  </label>
                  <select
                    value={formOwnerId}
                    onChange={(e) => setFormOwnerId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="">-- No Owner Assigned --</option>
                    {orgMembers.length === 0 && user && (
                      <option value={user.id}>
                        {user.name || user.email} (Current User)
                      </option>
                    )}
                    {orgMembers.map((m) => (
                      <option key={m.user_id || m.id} value={m.user_id || m.id}>
                        {m.name || m.email} {m.department ? `(${m.department})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Squad */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Assigned Squad
                  </label>
                  <select
                    value={formTeamId}
                    onChange={(e) => setFormTeamId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="">-- No Squad Assigned --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.department || "General"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as ProjectPriority)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                {/* Risk Level */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Risk Level
                  </label>
                  <select
                    value={formRiskLevel}
                    onChange={(e) => setFormRiskLevel(e.target.value as ProjectRiskLevel)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="LOW">Low Risk</option>
                    <option value="MEDIUM">Medium Risk</option>
                    <option value="HIGH">High Risk</option>
                    <option value="CRITICAL">Critical Risk</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Start Date */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>

                {/* Target Date */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Target End Date
                  </label>
                  <input
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>

                {/* Progress % */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Initial Progress ({formProgress}%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formProgress}
                    onChange={(e) => setFormProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formName.trim() || !formCode.trim()}
                  className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT PROJECT MODAL ──────────────────────────────────────── */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-xl border border-border-tech shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-tech bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <Edit2 size={15} />
                </div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Edit Initiative: {editingProject.project_code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest rounded-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 overflow-y-auto font-code-sm text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Project Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Project Code <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1">
                  Scope &amp; Description
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Project Owner */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Project Owner
                  </label>
                  <select
                    value={formOwnerId}
                    onChange={(e) => setFormOwnerId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="">-- No Owner Assigned --</option>
                    {orgMembers.length === 0 && user && (
                      <option value={user.id}>
                        {user.name || user.email} (Current User)
                      </option>
                    )}
                    {orgMembers.map((m) => (
                      <option key={m.user_id || m.id} value={m.user_id || m.id}>
                        {m.name || m.email} {m.department ? `(${m.department})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Squad */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Assigned Squad
                  </label>
                  <select
                    value={formTeamId}
                    onChange={(e) => setFormTeamId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="">-- No Squad Assigned --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.department || "General"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as ProjectPriority)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                {/* Risk Level */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Risk Level
                  </label>
                  <select
                    value={formRiskLevel}
                    onChange={(e) => setFormRiskLevel(e.target.value as ProjectRiskLevel)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="LOW">Low Risk</option>
                    <option value="MEDIUM">Medium Risk</option>
                    <option value="HIGH">High Risk</option>
                    <option value="CRITICAL">Critical Risk</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Start Date */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>

                {/* Target Date */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Target End Date
                  </label>
                  <input
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>

                {/* Progress % */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Progress ({formProgress}%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formProgress}
                    onChange={(e) => setFormProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !formName.trim() || !formCode.trim()}
                  className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ───────────────────────────────── */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-md border border-rose-500/40 shadow-2xl overflow-hidden rounded-sm">
            <div className="p-5 border-b border-border-tech bg-surface-container-lowest flex items-center gap-3">
              <div className="p-2 rounded-sm bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Delete Initiative
                </h3>
                <p className="font-code-sm text-xs text-on-surface-variant">
                  {deletingProject.project_code} &bull; {deletingProject.name}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 font-code-sm text-xs text-on-surface-variant">
              <p className="text-on-surface">
                Are you sure you want to delete the initiative <strong>&quot;{deletingProject.name}&quot;</strong>?
              </p>
              <p className="text-[11px] text-on-surface-variant/80">
                All associated milestone definitions, tasks, and historical records will be permanently removed.
              </p>
            </div>

            <div className="p-4 border-t border-border-tech bg-surface-container-lowest flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                disabled={isDeleting}
                className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-low text-on-surface-variant font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isDeleting}
                className="px-4 py-2 border border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-code-sm text-xs font-semibold rounded-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
