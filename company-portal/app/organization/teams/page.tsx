"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { teamService } from "@/services/team.service";
import { organizationService, DetailedMember } from "@shared/services/organization.service";
import type {
  Team,
  TeamCreatePayload,
  TeamDetail,
  TeamStatus,
  TeamUpdatePayload,
} from "@shared/types/team";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Bot,
  X,
  Layers,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Network,
  Cpu,
  Power,
  ShieldAlert,
} from "lucide-react";

const DEPARTMENT_PRESETS = [
  "Engineering",
  "Product",
  "QA & Testing",
  "DevOps & SRE",
  "Design",
  "Data & AI",
  "Operations",
  "Security",
  "Human Resources",
  "Sales & Marketing",
];

const MEMORY_ISOLATION_OPTIONS = [
  { value: "TEAM_ISOLATED", label: "TEAM_ISOLATED (Default)", desc: "Memory and context shared only within this team's agents" },
  { value: "SHARED_DEPARTMENT", label: "SHARED_DEPARTMENT", desc: "Cross-accessible across all teams in the department" },
  { value: "STRICT_PRIVATE", label: "STRICT_PRIVATE", desc: "Zero cross-member memory persistence" },
];

export default function TeamsPage() {
  const { user, isLoading: isAuthLoading, isAuthenticated, isOrgAdmin } = useAuth();
  const orgId = user?.organization_id || user?.organizationId;

  const [teams, setTeams] = useState<Team[]>([]);
  const [orgMembers, setOrgMembers] = useState<DetailedMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");

  // Modals & Drawers state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewingTeam, setViewingTeam] = useState<TeamDetail | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create / Edit Form State
  const [formName, setFormName] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formLeadId, setFormLeadId] = useState("");
  const [formStatus, setFormStatus] = useState<TeamStatus>("ACTIVE");
  const [formMemoryIsolation, setFormMemoryIsolation] = useState("TEAM_ISOLATED");
  const [formRoutingMode, setFormRoutingMode] = useState("lead_directed");
  const [formFallbackToAll, setFormFallbackToAll] = useState(true);

  // Auto-hide success alert
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load Teams and Members data from live FastAPI APIs
  const fetchTeamsData = useCallback(
    async (isBackground = false) => {
      if (!orgId) return;
      if (!isBackground) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const [teamsRes, membersRes] = await Promise.all([
          teamService.getTeams(orgId),
          organizationService.getDetailedMembers(orgId, "ACTIVE").catch(() => []),
        ]);
        setTeams(teamsRes.teams || []);
        setOrgMembers(membersRes.filter((m) => m.status === "ACTIVE"));
      } catch (err: any) {
        console.error("Failed to load organizational teams:", err);
        setErrorMessage(err?.response?.data?.error?.message || err?.message || "Failed to load teams from backend service.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && orgId) {
      fetchTeamsData();
    }
  }, [isAuthLoading, isAuthenticated, orgId, fetchTeamsData]);

  // Open Create Modal with clean fields
  const handleOpenCreateModal = () => {
    setFormName("");
    setFormDept("");
    setFormDesc("");
    setFormLeadId("");
    setFormStatus("ACTIVE");
    setFormMemoryIsolation("TEAM_ISOLATED");
    setFormRoutingMode("lead_directed");
    setFormFallbackToAll(true);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal with team fields
  const handleOpenEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormName(team.name);
    setFormDept(team.department || "");
    setFormDesc(team.description || "");
    setFormLeadId(team.team_lead_id || "");
    setFormStatus(team.status || "ACTIVE");
    setFormMemoryIsolation(team.memory_isolation_level || "TEAM_ISOLATED");
    setFormRoutingMode(team.ai_routing_policy?.routing_mode || "lead_directed");
    setFormFallbackToAll(team.ai_routing_policy?.fallback_to_all ?? true);
  };

  // View Team Details Drawer
  const handleViewTeam = async (team: Team) => {
    if (!orgId) return;
    setIsLoadingDetail(true);
    try {
      const detail = await teamService.getTeam(orgId, team.id);
      setViewingTeam(detail);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to load team details");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Submit Create Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;
    const trimmedName = formName.trim();
    if (!trimmedName) {
      alert("Team Name is required.");
      return;
    }

    // Validate selected team lead if provided
    if (formLeadId) {
      const isLeadInOrg = orgMembers.some((m) => m.user_id === formLeadId);
      if (!isLeadInOrg) {
        alert("The selected team lead does not belong to your organization.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: TeamCreatePayload = {
        name: trimmedName,
        department: formDept.trim() || undefined,
        description: formDesc.trim() || undefined,
        team_lead_id: formLeadId.trim() || undefined,
        status: formStatus,
        memory_isolation_level: formMemoryIsolation,
        ai_routing_policy: {
          routing_mode: formRoutingMode,
          fallback_to_all: formFallbackToAll,
        },
        knowledge_access_config: {
          accessible_categories: ["TECHNICAL_DOCUMENT", "PROCESS_DOCUMENT"],
        },
      };

      await teamService.createTeam(orgId, payload);
      setIsCreateModalOpen(false);
      setSuccessMessage(`Team "${payload.name}" created successfully.`);
      await fetchTeamsData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to create team");
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Edit Team
  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !editingTeam) return;
    const trimmedName = formName.trim();
    if (!trimmedName) {
      alert("Team Name is required.");
      return;
    }

    // Validate selected team lead if provided
    if (formLeadId) {
      const isLeadInOrg = orgMembers.some((m) => m.user_id === formLeadId);
      if (!isLeadInOrg) {
        alert("The selected team lead does not belong to your organization.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload: TeamUpdatePayload = {
        name: trimmedName,
        department: formDept.trim() || undefined,
        description: formDesc.trim() || undefined,
        team_lead_id: formLeadId.trim() || undefined,
        status: formStatus,
        memory_isolation_level: formMemoryIsolation,
        ai_routing_policy: {
          routing_mode: formRoutingMode,
          fallback_to_all: formFallbackToAll,
        },
      };

      await teamService.updateTeam(orgId, editingTeam.id, payload);
      setEditingTeam(null);
      setSuccessMessage(`Team "${payload.name}" updated successfully.`);
      await fetchTeamsData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update team");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Team Status (Active <-> Inactive)
  const handleToggleStatus = async (team: Team) => {
    if (!orgId) return;
    const nextStatus: TeamStatus = team.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await teamService.updateTeam(orgId, team.id, { status: nextStatus });
      setSuccessMessage(`Team "${team.name}" is now ${nextStatus}.`);
      await fetchTeamsData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update team status");
    }
  };

  // Confirm and Execute Team Deletion / Archival
  const handleConfirmDelete = async () => {
    if (!orgId || !deletingTeam) return;
    setIsDeleting(true);
    try {
      await teamService.deleteTeam(orgId, deletingTeam.id);
      setSuccessMessage(`Team "${deletingTeam.name}" has been archived.`);
      setDeletingTeam(null);
      await fetchTeamsData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to delete team");
    } finally {
      setIsDeleting(false);
    }
  };

  // Dynamic Departments from existing teams + presets
  const availableDepartments = useMemo(() => {
    const set = new Set<string>(DEPARTMENT_PRESETS);
    teams.forEach((t) => {
      if (t.department) set.add(t.department);
    });
    return Array.from(set).sort();
  }, [teams]);

  // Filtered Teams
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSearch =
        searchQuery === "" ||
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (team.description && team.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (team.department && team.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (team.team_lead?.name && team.team_lead.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (team.team_lead?.email && team.team_lead.email.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "ALL" || team.status === statusFilter;
      const matchesDept = departmentFilter === "ALL" || team.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [teams, searchQuery, statusFilter, departmentFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = teams.length;
    const active = teams.filter((t) => t.status === "ACTIVE").length;
    const totalMembers = teams.reduce((acc, t) => acc + (t.member_count || 0), 0);
    const departments = new Set(teams.map((t) => t.department).filter(Boolean)).size;
    return { total, active, totalMembers, departments };
  }, [teams]);

  if (isAuthLoading || (isLoading && !isRefreshing && teams.length === 0)) {
    return <LoadingState label="Loading organizational teams & AI workforce boundaries..." />;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up pb-12">
      {/* ── SUCCESS NOTIFICATION BANNER ──────────────────────────────── */}
      {successMessage && (
        <div className="p-3 border border-primary-container/50 bg-primary-container/10 text-primary-container font-code-sm text-xs flex items-center gap-2 rounded-sm animate-fade-in">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-tech pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 font-code-sm text-[10px] text-primary-container uppercase tracking-wider">
              Teams &amp; Collaboration
            </span>
            <span className="font-code-sm text-xs text-on-surface-variant">
              {teams.length} {teams.length === 1 ? "Team Defined" : "Teams Defined"}
            </span>
          </div>
          <h1 className="font-display-xl text-[26px] sm:text-[30px] text-on-surface">
            Teams &amp; AI Workforce
          </h1>
          <p className="font-code-sm text-xs text-on-surface-variant mt-1">
            Manage organizational teams, members, AI workforce relationships, and collaboration boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchTeamsData(true)}
            disabled={isLoading || isRefreshing}
            className="px-3 py-2 border border-border-tech hover:border-primary-container/50 bg-surface-container-low text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Reload teams from backend"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-primary-container" : ""} />
            <span>Refresh</span>
          </button>

          {isOrgAdmin && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>Create Team</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI METRIC CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Total Teams</span>
            <FolderTree size={14} className="text-primary-container" />
          </div>
          <div className="font-code-sm text-2xl text-on-surface font-bold">{stats.total}</div>
          <div className="font-code-sm text-[11px] text-on-surface-variant/70 mt-0.5">Configured squads</div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Active Squads</span>
            <Layers size={14} className="text-primary-container" />
          </div>
          <div className="font-code-sm text-2xl text-primary-container font-bold">{stats.active}</div>
          <div className="font-code-sm text-[11px] text-primary-container/80 mt-0.5">Operational &amp; routing</div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Enrolled Members</span>
            <Users size={14} className="text-on-surface-variant" />
          </div>
          <div className="font-code-sm text-2xl text-on-surface font-bold">{stats.totalMembers}</div>
          <div className="font-code-sm text-[11px] text-on-surface-variant/70 mt-0.5">Assigned contributors</div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Departments</span>
            <Network size={14} className="text-primary-container" />
          </div>
          <div className="font-code-sm text-2xl text-on-surface font-bold">{stats.departments}</div>
          <div className="font-code-sm text-[11px] text-on-surface-variant/70 mt-0.5">Cross-functional units</div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border border-border-tech bg-surface-container-low p-3 rounded-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams by name, department, lead..."
            className="w-full bg-surface-container-lowest border border-border-tech rounded-sm pl-9 pr-3 py-1.5 font-code-sm text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-code-sm text-[11px] text-on-surface-variant">Dept:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-surface-container-lowest border border-border-tech rounded-sm px-2.5 py-1.5 font-code-sm text-xs text-on-surface focus:outline-none focus:border-primary-container"
            >
              <option value="ALL">All Departments</option>
              {availableDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-code-sm text-[11px] text-on-surface-variant">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-lowest border border-border-tech rounded-sm px-2.5 py-1.5 font-code-sm text-xs text-on-surface focus:outline-none focus:border-primary-container"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── ERROR BANNER ────────────────────────────────────────────── */}
      {errorMessage && (
        <div className="p-4 border border-error/40 bg-error-container/20 rounded-sm flex items-center justify-between">
          <div className="flex items-center gap-2 text-error font-code-sm text-xs">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchTeamsData()}
            className="px-3 py-1.5 border border-error/50 hover:bg-error-container/20 text-error font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── TEAMS DIRECTORY TABLE ───────────────────────────────────── */}
      {!errorMessage && filteredTeams.length === 0 ? (
        <div className="border border-border-tech bg-surface-container-low p-12 text-center rounded-sm">
          <FolderTree className="w-10 h-10 text-on-surface-variant/40 mx-auto mb-3" />
          <p className="font-display-xl text-lg text-on-surface font-semibold">No Teams Found</p>
          <p className="font-code-sm text-xs text-on-surface-variant mt-1 max-w-md mx-auto">
            {searchQuery || statusFilter !== "ALL" || departmentFilter !== "ALL"
              ? "No organizational squads match the current query or filter criteria."
              : "No teams have been created for this organization yet. Click [+ Create Team] to assemble your first squad."}
          </p>
          {isOrgAdmin && !searchQuery && statusFilter === "ALL" && departmentFilter === "ALL" && (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                <span>Create Team</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-border-tech bg-surface-container-low overflow-hidden rounded-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-tech bg-surface-container-lowest text-[11px] font-code-sm uppercase tracking-wider text-on-surface-variant">
                  <th className="py-3 px-4 font-semibold">Team</th>
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th className="py-3 px-4 font-semibold">Team Lead</th>
                  <th className="py-3 px-4 font-semibold text-center">Members</th>
                  <th className="py-3 px-4 font-semibold text-center">AI Workforces</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-tech/40">
                {filteredTeams.map((team) => {
                  return (
                    <tr
                      key={team.id}
                      className="hover:bg-surface-container-high/40 transition-colors font-code-sm text-xs text-on-surface group"
                    >
                      {/* Team Name & Scope */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30 mt-0.5 shrink-0">
                            <FolderTree size={14} />
                          </div>
                          <div>
                            <Link
                              href={`/organization/teams/${team.id}`}
                              className="font-semibold text-on-surface hover:text-primary-container transition-colors flex items-center gap-2"
                            >
                              <span>{team.name}</span>
                            </Link>
                            {team.description ? (
                              <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5 max-w-sm">
                                {team.description}
                              </p>
                            ) : (
                              <p className="text-[11px] text-on-surface-variant/40 italic mt-0.5">
                                No scope description
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        {team.department ? (
                          <span className="border border-border-tech bg-surface-container-lowest font-code-sm text-[11px] text-on-surface px-2 py-0.5 rounded-sm">
                            {team.department}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/50 font-mono">—</span>
                        )}
                      </td>

                      {/* Team Lead */}
                      <td className="py-3.5 px-4">
                        {team.team_lead ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-sm border border-primary-container/40 bg-surface-container-lowest text-primary-container flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                              {(team.team_lead.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-on-surface">
                                {team.team_lead.name || "Unnamed"}
                              </div>
                              <div className="text-on-surface-variant text-[10px] font-mono">
                                {team.team_lead.email || team.team_lead.job_title || "Lead"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/50 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Members Count */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm font-code-sm text-xs border border-border-tech bg-surface-container-lowest text-on-surface">
                          <Users size={12} className="text-on-surface-variant" />
                          <span>{team.member_count || 0} Members</span>
                        </span>
                      </td>

                      {/* AI Workforces (Honest '—' display) */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-code-sm text-[11px] text-on-surface-variant/70 bg-surface-container-lowest border border-border-tech"
                          title="Team AI routing active per member workforce"
                        >
                          <Bot size={12} className="text-on-surface-variant/60" />
                          <span>—</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-code-sm font-bold uppercase ${
                            team.status === "ACTIVE"
                              ? "border border-primary-container/40 bg-primary-container/10 text-primary-container"
                              : team.status === "DRAFT"
                              ? "border border-amber-500/40 bg-amber-500/10 text-amber-400"
                              : team.status === "ARCHIVED"
                              ? "border border-rose-500/40 bg-rose-500/10 text-rose-400"
                              : "border border-border-tech bg-surface-container-lowest text-on-surface-variant"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              team.status === "ACTIVE"
                                ? "bg-primary-container pulse-green"
                                : team.status === "DRAFT"
                                ? "bg-amber-400"
                                : team.status === "ARCHIVED"
                                ? "bg-rose-400"
                                : "bg-zinc-500"
                            }`}
                          />
                          {team.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/organization/teams/${team.id}`}
                            className="p-1.5 text-on-surface-variant hover:text-primary-container hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer inline-flex items-center"
                            title="View Team Details & Members"
                          >
                            <Eye size={14} />
                          </Link>
                          {isOrgAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(team)}
                                className={`p-1.5 border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer ${
                                  team.status === "ACTIVE"
                                    ? "text-on-surface-variant hover:text-amber-400"
                                    : "text-on-surface-variant hover:text-primary-container"
                                }`}
                                title={team.status === "ACTIVE" ? "Deactivate Team" : "Activate Team"}
                              >
                                <Power size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(team)}
                                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                                title="Edit Team"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTeam(team)}
                                className="p-1.5 text-on-surface-variant hover:text-rose-400 hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                                title="Archive / Delete Team"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
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

      {/* ── CREATE TEAM MODAL ───────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-lg border border-border-tech shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-tech bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <FolderTree size={15} />
                </div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Create New Team
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest rounded-sm"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-5 space-y-4 overflow-y-auto font-code-sm text-xs">
              <div>
                <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                  Team Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Core Platform Engineering"
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    placeholder="e.g. Engineering"
                    list="dept-create-opts"
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                  <datalist id="dept-create-opts">
                    {DEPARTMENT_PRESETS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TeamStatus)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                  Designated Team Lead (Optional)
                </label>
                <select
                  value={formLeadId}
                  onChange={(e) => setFormLeadId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                >
                  <option value="">No Lead Assigned</option>
                  {orgMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name || m.email} {m.job_title ? `(${m.job_title})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-on-surface-variant/70 mt-1">
                  Team lead must be an active employee in your organization and will be enrolled as Lead.
                </p>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                  Scope &amp; Mission Description
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describe squad responsibilities, deliverables, and boundaries..."
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              {/* AI Boundary & Memory Isolation */}
              <div className="pt-3 border-t border-border-tech">
                <div className="flex items-center gap-1.5 font-code-sm text-[11px] text-primary-container font-semibold mb-2">
                  <Cpu size={13} />
                  <span>AI Collaboration Boundaries</span>
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-code-sm text-[10px]">
                    Memory Isolation Scope
                  </label>
                  <select
                    value={formMemoryIsolation}
                    onChange={(e) => setFormMemoryIsolation(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    {MEMORY_ISOLATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
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
                  disabled={isSaving}
                  className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Team</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT TEAM MODAL ─────────────────────────────────────────── */}
      {editingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-lg border border-border-tech shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-tech bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <Edit2 size={15} />
                </div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Edit Team Configuration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeam(null)}
                className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest rounded-sm"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateTeam} className="p-5 space-y-4 overflow-y-auto font-code-sm text-xs">
              <div>
                <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                  Team Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    list="dept-edit-opts"
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                  <datalist id="dept-edit-opts">
                    {DEPARTMENT_PRESETS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TeamStatus)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                  Team Lead
                </label>
                <select
                  value={formLeadId}
                  onChange={(e) => setFormLeadId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                >
                  <option value="">No Lead Assigned</option>
                  {orgMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name || m.email} {m.job_title ? `(${m.job_title})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                  Scope Description
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => {
                    const t = editingTeam;
                    setEditingTeam(null);
                    setDeletingTeam(t);
                  }}
                  className="px-3 py-2 border border-rose-500/40 hover:bg-rose-500/10 text-rose-400 font-code-sm text-xs rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Archive Team</span>
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingTeam(null)}
                    className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE / ARCHIVE TEAM CONFIRMATION MODAL ────────────────── */}
      {deletingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-md border border-rose-500/40 shadow-2xl overflow-hidden rounded-sm">
            <div className="p-5 border-b border-border-tech bg-surface-container-lowest flex items-center gap-3">
              <div className="p-2 rounded-sm bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Archive Team Unit
                </h3>
                <p className="font-code-sm text-xs text-on-surface-variant">
                  {deletingTeam.name}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4 font-code-sm text-xs text-on-surface-variant">
              {deletingTeam.member_count > 0 ? (
                <div className="p-3 border border-amber-500/40 bg-amber-500/10 text-amber-300 rounded-sm flex items-start gap-2.5">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <div className="font-bold text-amber-400">
                      Active Member Warning
                    </div>
                    <div className="text-[11px] mt-0.5">
                      This team currently contains <strong>{deletingTeam.member_count} member(s)</strong>.
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-on-surface">
                  Are you sure you want to archive the team <strong>&quot;{deletingTeam.name}&quot;</strong>?
                </p>
              )}

              <div className="p-3 border border-border-tech bg-surface-container-lowest rounded-sm space-y-1.5 text-[11px]">
                <div className="font-semibold text-on-surface flex items-center gap-1.5 text-primary-container">
                  <CheckCircle2 size={13} />
                  <span>Non-Destructive Boundary Guarantee:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-on-surface-variant/80">
                  <li>Employee user accounts remain intact</li>
                  <li>Job &amp; AI Role assignments remain active</li>
                  <li>AgentGroups and individual Agents are NOT deleted</li>
                  <li>Execution histories and logs are fully preserved</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-border-tech bg-surface-container-lowest flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingTeam(null)}
                disabled={isDeleting}
                className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-low text-on-surface-variant font-code-sm text-xs rounded-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 border border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-code-sm text-xs font-semibold rounded-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Confirm Archive</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TEAM DETAILS DRAWER ─────────────────────────────────────── */}
      {viewingTeam && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-xl border-l border-border-tech h-full flex flex-col shadow-2xl animate-fade-in">
            {/* Drawer Header */}
            <div className="p-5 border-b border-border-tech flex items-start justify-between bg-surface-container-lowest">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30 mt-0.5">
                  <FolderTree size={18} />
                </div>
                <div>
                  <h2 className="font-display-xl text-lg text-on-surface font-bold">
                    {viewingTeam.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingTeam.department && (
                      <span className="font-code-sm text-[10px] text-on-surface-variant bg-surface-container-lowest px-2 py-0.5 rounded-sm border border-border-tech">
                        {viewingTeam.department}
                      </span>
                    )}
                    <span
                      className={`font-code-sm text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase ${
                        viewingTeam.status === "ACTIVE"
                          ? "border border-primary-container/40 bg-primary-container/10 text-primary-container"
                          : "border border-border-tech bg-surface-container-lowest text-on-surface-variant"
                      }`}
                    >
                      {viewingTeam.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingTeam(null)}
                className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest rounded-sm transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 font-code-sm text-xs">
              {/* Description */}
              {viewingTeam.description && (
                <div>
                  <div className="font-code-sm text-[11px] text-on-surface-variant uppercase mb-1">
                    Squad Mission &amp; Scope
                  </div>
                  <p className="text-xs text-on-surface bg-surface-container-lowest p-3 rounded-sm border border-border-tech">
                    {viewingTeam.description}
                  </p>
                </div>
              )}

              {/* Team Lead Card */}
              <div>
                <div className="font-code-sm text-[11px] text-on-surface-variant uppercase mb-1.5">
                  Designated Team Lead
                </div>
                {viewingTeam.team_lead ? (
                  <div className="flex items-center gap-3 p-3 rounded-sm bg-surface-container-lowest border border-primary-container/30">
                    <div className="w-9 h-9 rounded-sm bg-surface-container-low border border-primary-container text-primary-container flex items-center justify-center font-bold font-code-sm text-xs">
                      {(viewingTeam.team_lead.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-on-surface">
                        {viewingTeam.team_lead.name || "Unnamed"}
                      </div>
                      <div className="text-on-surface-variant text-[11px] font-mono">
                        {viewingTeam.team_lead.email}
                      </div>
                      {viewingTeam.team_lead.job_title && (
                        <div className="text-[10px] text-primary-container mt-0.5">
                          {viewingTeam.team_lead.job_title}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-sm border border-dashed border-border-tech text-[11px] text-on-surface-variant text-center">
                    No lead assigned yet.
                  </div>
                )}
              </div>

              {/* Member Roster */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-code-sm text-[11px] text-on-surface-variant uppercase">
                    Enrolled Contributors ({viewingTeam.members?.length || 0})
                  </div>
                </div>

                {!viewingTeam.members || viewingTeam.members.length === 0 ? (
                  <div className="p-4 rounded-sm bg-surface-container-lowest border border-dashed border-border-tech text-[11px] text-on-surface-variant text-center">
                    No members enrolled in this squad yet.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {viewingTeam.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-2.5 rounded-sm bg-surface-container-lowest border border-border-tech hover:border-primary-container/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-sm bg-surface-container-low border border-border-tech flex items-center justify-center text-[10px] font-code-sm font-semibold text-on-surface">
                            {(member.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-on-surface text-xs">
                              {member.name || "Unnamed"}
                            </div>
                            <div className="text-[10px] text-on-surface-variant font-mono">
                              {member.email}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-code-sm text-[10px] text-primary-container bg-primary-container/10 border border-primary-container/30 px-2 py-0.5 rounded-sm">
                            {member.role_in_team}
                          </span>
                          {member.job_role_name && (
                            <div className="text-[10px] text-on-surface-variant mt-0.5">
                              {member.job_role_name}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Collaboration Policy & Memory Isolation */}
              <div className="pt-3 border-t border-border-tech space-y-2">
                <div className="font-code-sm text-[11px] text-on-surface-variant uppercase">
                  AI Collaboration &amp; Memory Scope
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-sm bg-surface-container-lowest border border-border-tech">
                    <span className="text-on-surface-variant text-[10px] block font-code-sm">Memory Scope</span>
                    <span className="font-mono text-on-surface font-semibold mt-0.5 block">
                      {viewingTeam.memory_isolation_level}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-sm bg-surface-container-lowest border border-border-tech">
                    <span className="text-on-surface-variant text-[10px] block font-code-sm">Routing Mode</span>
                    <span className="font-mono text-primary-container font-semibold mt-0.5 block">
                      {viewingTeam.ai_routing_policy?.routing_mode || "lead_directed"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-border-tech bg-surface-container-lowest flex justify-end">
              <button
                type="button"
                onClick={() => setViewingTeam(null)}
                className="px-3 py-1.5 border border-border-tech hover:border-primary-container/50 bg-surface-container-low text-on-surface font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
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
