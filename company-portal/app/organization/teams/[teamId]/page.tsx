"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { teamService } from "@/services/team.service";
import { organizationService, DetailedMember } from "@shared/services/organization.service";
import { roleService } from "@shared/services/role.service";
import type { OrganizationRole } from "@shared/types/role";
import type {
  TeamAIRoute,
  TeamAIRouteCreatePayload,
  TeamAIWorkforceResponse,
  TeamDetail,
  TeamKnowledgeOverviewResponse,
  TeamKnowledgePolicyUpdatePayload,
  TeamKnowledgeSource,
  TeamKnowledgeSourceCreatePayload,
  TeamMember,
  TeamMemberCreatePayload,
  TeamMemberWorkforceItem,
  TeamMetricsOverviewResponse,
  TeamStatus,
  TeamUpdatePayload,
} from "@shared/types/team";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  ArrowLeft,
  Users,
  Search,
  Plus,
  RefreshCw,
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
  ShieldAlert,
  UserPlus,
  Crown,
  FileText,
  Activity,
  Zap,
  Settings,
  Shield,
  Brain,
  Sliders,
  Check,
  Code2,
  Terminal,
  FolderGit2,
  KeyRound,
  Wrench,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Workflow,
  Info,
  SlidersHorizontal,
  BookOpen,
  Database,
  Lock,
  Share2,
  Clock,
  CheckSquare,
  AlertCircle,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

const TEAM_ROLE_OPTIONS = ["Contributor", "Lead", "Reviewer", "Specialist", "Architect"];

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

const ROUTE_CONDITION_PRESETS = [
  { id: "on_success", label: "On Success (Default)", desc: "Trigger next role when the prior role completes successfully" },
  { id: "code_review_passed", label: "Code Review Passed", desc: "Trigger after review approval" },
  { id: "qa_verified", label: "QA Verified", desc: "Trigger deployment when test suite succeeds" },
  { id: "on_approval", label: "On Human Approval", desc: "Trigger only after designated human approves" },
  { id: "on_failure", label: "On Failure / Bug Found", desc: "Route back to source for diagnostics" },
  { id: "always", label: "Always Hand-Off", desc: "Unconditional pipeline execution" },
];

const MEMORY_ISOLATION_OPTIONS = [
  {
    value: "TEAM_ISOLATED",
    label: "TEAM_ISOLATED (Recommended Default)",
    desc: "Memory and learned context shared strictly within this team's authorized agents.",
  },
  {
    value: "STRICT_PRIVATE",
    label: "STRICT_PRIVATE (Zero Sharing)",
    desc: "Personal twin memory only. No cross-member memory persistence or sharing.",
  },
  {
    value: "SHARED_DEPARTMENT",
    label: "SHARED_DEPARTMENT (Broad Scope)",
    desc: "Cross-accessible across all squads within the same department.",
  },
];

const KNOWLEDGE_SCOPE_OPTIONS = [
  { value: "TEAM", label: "Team-Scoped (Default)", desc: "Accessible only to this squad's contributors and AI workforces" },
  { value: "DEPARTMENT", label: "Department-Scoped", desc: "Accessible to all squads in the same department" },
  { value: "ORGANIZATION", label: "Organization-Wide", desc: "Accessible company-wide" },
];

const ACCESS_RULE_OPTIONS = [
  { value: "TEAM_MEMBERS_ONLY", label: "Team Members Only (Strict)", desc: "Only active squad members may query" },
  { value: "ROLE_RESTRICTED", label: "Role Restricted", desc: "Filtered based on contributor Job Role" },
  { value: "ORGANIZATION_WIDE", label: "Organization Wide", desc: "Open to any verified employee" },
];

const SOURCE_TYPE_OPTIONS = [
  { value: "DOCUMENT_REPOSITORY", label: "Document Repository / Specs" },
  { value: "CONFLUENCE_SPACE", label: "Confluence / Wiki Space" },
  { value: "GITHUB_WIKI", label: "GitHub Wiki / Markdown Repo" },
  { value: "API_DOCUMENTATION", label: "API Docs & Schemas" },
  { value: "INTERNAL_GUIDE", label: "Internal SOP & Playbook" },
];

const DOCUMENT_CATEGORIES = [
  { id: "TECHNICAL_DOCUMENT", label: "Technical Documents & Architecture Specs" },
  { id: "PROCESS_DOCUMENT", label: "Process Guides & Standard Operating Procedures" },
  { id: "POLICY", label: "Engineering & Compliance Policies" },
  { id: "ROLE_DESCRIPTION", label: "Role Descriptions & Job Guidelines" },
  { id: "COMPANY_PROFILE", label: "Company Profile & Mission" },
];

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.teamId as string;

  const { user, isLoading: isAuthLoading, isAuthenticated, isOrgAdmin } = useAuth();
  const orgId = user?.organization_id || user?.organizationId;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [teamWorkforce, setTeamWorkforce] = useState<TeamAIWorkforceResponse | null>(null);
  const [teamRoutes, setTeamRoutes] = useState<TeamAIRoute[]>([]);
  const [teamKnowledge, setTeamKnowledge] = useState<TeamKnowledgeOverviewResponse | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetricsOverviewResponse | null>(null);
  const [orgMembers, setOrgMembers] = useState<DetailedMember[]>([]);
  const [orgRoles, setOrgRoles] = useState<OrganizationRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    "overview" | "members" | "workforce" | "mesh" | "knowledge" | "workload" | "performance" | "settings"
  >("overview");

  // Modals
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inspectingMemberWf, setInspectingMemberWf] = useState<TeamMemberWorkforceItem | null>(null);

  // Add Route Modal
  const [isAddRouteModalOpen, setIsAddRouteModalOpen] = useState(false);
  const [selectedSourceRoleId, setSelectedSourceRoleId] = useState("");
  const [selectedTargetRoleId, setSelectedTargetRoleId] = useState("");
  const [routePriority, setRoutePriority] = useState(1);
  const [routeCondition, setRouteCondition] = useState("on_success");
  const [routeDescription, setRouteDescription] = useState("");
  const [routeEnabled, setRouteEnabled] = useState(true);
  const [deletingRouteId, setDeletingRouteId] = useState<string | null>(null);

  // Knowledge & Memory Boundaries State
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState("DOCUMENT_REPOSITORY");
  const [sourceIdentifier, setSourceIdentifier] = useState("");
  const [sourceDescription, setSourceDescription] = useState("");
  const [sourceIsActive, setSourceIsActive] = useState(true);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);

  // Knowledge Policy State Form
  const [sharedKnowledgeEnabled, setSharedKnowledgeEnabled] = useState(true);
  const [knowledgeScope, setKnowledgeScope] = useState("TEAM");
  const [memoryIsolationLevel, setMemoryIsolationLevel] = useState("TEAM_ISOLATED");
  const [accessRule, setAccessRule] = useState("TEAM_MEMBERS_ONLY");
  const [selectedDocCategories, setSelectedDocCategories] = useState<string[]>([
    "TECHNICAL_DOCUMENT",
    "PROCESS_DOCUMENT",
  ]);
  const [allowCrossTeamQuery, setAllowCrossTeamQuery] = useState(false);

  // Add Member Form
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState("");
  const [selectedRoleInTeam, setSelectedRoleInTeam] = useState("Contributor");
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [workforceSearchQuery, setWorkforceSearchQuery] = useState("");

  // Edit Team Form
  const [formName, setFormName] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formLeadId, setFormLeadId] = useState("");
  const [formStatus, setFormStatus] = useState<TeamStatus>("ACTIVE");

  // AI Mesh Policy Form
  const [meshRoutingMode, setMeshRoutingMode] = useState("lead_directed");
  const [meshFallbackToAll, setMeshFallbackToAll] = useState(true);

  // Auto-hide success notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Fetch Team Details, AI Workforce, Routes, Knowledge, Metrics, and Roles
  const fetchTeamData = useCallback(
    async (isBackground = false) => {
      if (!orgId || !teamId) return;
      if (!isBackground) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const [teamData, workforceData, routesData, knowledgeData, metricsData, allMembers, rolesData] = await Promise.all([
          teamService.getTeam(orgId, teamId),
          teamService.getTeamAIWorkforce(orgId, teamId).catch(() => null),
          teamService.listTeamRoutes(orgId, teamId).catch(() => ({ routes: [], total: 0 })),
          teamService.getTeamKnowledge(orgId, teamId).catch(() => null),
          teamService.getTeamMetrics(orgId, teamId).catch(() => null),
          organizationService.getDetailedMembers(orgId, "ACTIVE").catch(() => []),
          roleService.getRoles(orgId).catch(() => ({ roles: [], total: 0 })),
        ]);
        setTeam(teamData);
        setTeamWorkforce(workforceData);
        setTeamRoutes(routesData.routes || []);
        setTeamKnowledge(knowledgeData);
        setTeamMetrics(metricsData);
        setOrgMembers(allMembers.filter((m) => m.status === "ACTIVE"));
        setOrgRoles((rolesData?.roles || []).filter((r: OrganizationRole) => r.status === "ACTIVE"));

        // Initialize Edit & Policy States
        setFormName(teamData.name);
        setFormDept(teamData.department || "");
        setFormDesc(teamData.description || "");
        setFormLeadId(teamData.team_lead_id || "");
        setFormStatus(teamData.status);
        setMeshRoutingMode(teamData.ai_routing_policy?.routing_mode || "lead_directed");
        setMeshFallbackToAll(teamData.ai_routing_policy?.fallback_to_all ?? true);

        // Initialize Knowledge States
        if (knowledgeData) {
          setSharedKnowledgeEnabled(knowledgeData.shared_knowledge_enabled);
          setKnowledgeScope(knowledgeData.knowledge_scope);
          setMemoryIsolationLevel(knowledgeData.memory_isolation_level);
          setAccessRule(knowledgeData.access_rule);
          setSelectedDocCategories(knowledgeData.accessible_categories || ["TECHNICAL_DOCUMENT", "PROCESS_DOCUMENT"]);
          setAllowCrossTeamQuery(knowledgeData.allow_cross_team_query);
        } else {
          setMemoryIsolationLevel(teamData.memory_isolation_level || "TEAM_ISOLATED");
          if (teamData.knowledge_access_config?.accessible_categories) {
            setSelectedDocCategories(teamData.knowledge_access_config.accessible_categories);
          }
        }
      } catch (err: any) {
        console.error("Failed to load team details:", err);
        setErrorMessage(err?.response?.data?.error?.message || err?.message || "Failed to load team details from backend.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [orgId, teamId]
  );

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && orgId && teamId) {
      fetchTeamData();
    }
  }, [isAuthLoading, isAuthenticated, orgId, teamId, fetchTeamData]);

  // Non-enrolled eligible employees for Add Member modal
  const nonEnrolledMembers = useMemo(() => {
    if (!team) return [];
    const enrolledUserIds = new Set(team.members?.map((m) => m.user_id) || []);
    return orgMembers.filter((m) => !enrolledUserIds.has(m.user_id));
  }, [team, orgMembers]);

  // Aggregate Stats
  const squadStats = useMemo(() => {
    const totalMembers = teamWorkforce?.total_members ?? team?.members?.length ?? 0;
    const activeWorkforces = teamWorkforce?.active_workforces ?? 0;
    const totalAgents = teamWorkforce?.total_agents ?? 0;
    return { totalMembers, activeWorkforces, totalAgents };
  }, [teamWorkforce, team?.members]);

  // Filtered members in Members tab
  const filteredSquadMembers = useMemo(() => {
    if (!team?.members) return [];
    if (!memberSearchQuery.trim()) return team.members;
    const q = memberSearchQuery.toLowerCase().trim();
    return team.members.filter(
      (m) =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.job_role_name && m.job_role_name.toLowerCase().includes(q)) ||
        (m.employee_id && m.employee_id.toLowerCase().includes(q)) ||
        (m.role_in_team && m.role_in_team.toLowerCase().includes(q))
    );
  }, [team?.members, memberSearchQuery]);

  // Filtered workforce items in AI Workforce tab
  const filteredWorkforceItems = useMemo(() => {
    if (!teamWorkforce?.members) return [];
    if (!workforceSearchQuery.trim()) return teamWorkforce.members;
    const q = workforceSearchQuery.toLowerCase().trim();
    return teamWorkforce.members.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.email && item.email.toLowerCase().includes(q)) ||
        (item.job_role_name && item.job_role_name.toLowerCase().includes(q)) ||
        (item.agent_group?.name && item.agent_group.name.toLowerCase().includes(q)) ||
        (item.role_in_team && item.role_in_team.toLowerCase().includes(q))
    );
  }, [teamWorkforce?.members, workforceSearchQuery]);

  // Handle Add Member Submit
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !teamId || !selectedUserIdToAdd) return;
    setIsSaving(true);
    try {
      const payload: TeamMemberCreatePayload = {
        user_id: selectedUserIdToAdd,
        role_in_team: selectedRoleInTeam,
      };
      await teamService.addTeamMember(orgId, teamId, payload);
      setIsAddMemberModalOpen(false);
      setSelectedUserIdToAdd("");
      setSelectedRoleInTeam("Contributor");
      setSuccessMessage("Member added to squad successfully.");
      await fetchTeamData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to add member to team");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Remove Member Submit
  const handleRemoveMemberSubmit = async () => {
    if (!orgId || !teamId || !removingMember) return;
    setIsSaving(true);
    try {
      await teamService.removeTeamMember(orgId, teamId, removingMember.user_id);
      setSuccessMessage(`Removed ${removingMember.name || "member"} from squad.`);
      setRemovingMember(null);
      await fetchTeamData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to remove member");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Set Member as Team Lead
  const handleSetAsLead = async (memberUserId: string) => {
    if (!orgId || !teamId) return;
    try {
      await teamService.updateTeam(orgId, teamId, { team_lead_id: memberUserId });
      setSuccessMessage("Designated team lead updated successfully.");
      await fetchTeamData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update team lead");
    }
  };

  // Handle Add AI Mesh Route Submit
  const handleAddRouteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !teamId || !selectedSourceRoleId || !selectedTargetRoleId) return;
    if (selectedSourceRoleId === selectedTargetRoleId) {
      alert("Source Role and Target Role cannot be identical.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: TeamAIRouteCreatePayload = {
        source_role_id: selectedSourceRoleId,
        target_role_id: selectedTargetRoleId,
        priority: Number(routePriority) || 1,
        condition: routeCondition,
        description: routeDescription.trim() || undefined,
        enabled: routeEnabled,
      };
      await teamService.createTeamRoute(orgId, teamId, payload);
      setIsAddRouteModalOpen(false);
      setSelectedSourceRoleId("");
      setSelectedTargetRoleId("");
      setRoutePriority(1);
      setRouteCondition("on_success");
      setRouteDescription("");
      setRouteEnabled(true);
      setSuccessMessage("AI Mesh routing rule configured successfully.");
      await fetchTeamData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to create routing rule");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Toggle Route Enabled
  const handleToggleRouteEnabled = async (route: TeamAIRoute) => {
    if (!orgId || !teamId) return;
    try {
      await teamService.updateTeamRoute(orgId, teamId, route.id, {
        enabled: !route.enabled,
      });
      setSuccessMessage(`Routing rule ${!route.enabled ? "enabled" : "disabled"}.`);
      await fetchTeamData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update rule status");
    }
  };

  // Handle Delete Route
  const handleDeleteRoute = async (routeId: string) => {
    if (!orgId || !teamId) return;
    setDeletingRouteId(routeId);
    try {
      await teamService.deleteTeamRoute(orgId, teamId, routeId);
      setSuccessMessage("Routing rule removed.");
      await fetchTeamData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to delete route");
    } finally {
      setDeletingRouteId(null);
    }
  };

  // Handle Save Knowledge & Memory Policy
  const handleSaveKnowledgePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !teamId) return;
    setIsSaving(true);
    try {
      const payload: TeamKnowledgePolicyUpdatePayload = {
        shared_knowledge_enabled: sharedKnowledgeEnabled,
        knowledge_scope: knowledgeScope,
        memory_isolation_level: memoryIsolationLevel,
        access_rule: accessRule,
        accessible_categories: selectedDocCategories,
        allow_cross_team_query: allowCrossTeamQuery,
      };
      await teamService.updateTeamKnowledgePolicy(orgId, teamId, payload);
      setSuccessMessage("Knowledge access & memory isolation policy saved.");
      await fetchTeamData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to save knowledge policy");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Add Knowledge Source Submit
  const handleAddKnowledgeSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !teamId || !sourceName.trim() || !sourceIdentifier.trim()) return;

    setIsSaving(true);
    try {
      const payload: TeamKnowledgeSourceCreatePayload = {
        name: sourceName.trim(),
        source_type: sourceType,
        source_identifier: sourceIdentifier.trim(),
        description: sourceDescription.trim() || undefined,
        is_active: sourceIsActive,
      };
      await teamService.createTeamKnowledgeSource(orgId, teamId, payload);
      setIsAddSourceModalOpen(false);
      setSourceName("");
      setSourceType("DOCUMENT_REPOSITORY");
      setSourceIdentifier("");
      setSourceDescription("");
      setSourceIsActive(true);
      setSuccessMessage("Team knowledge source configured successfully.");
      await fetchTeamData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to add knowledge source");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Knowledge Source
  const handleDeleteKnowledgeSource = async (sourceId: string) => {
    if (!orgId || !teamId) return;
    setDeletingSourceId(sourceId);
    try {
      await teamService.deleteTeamKnowledgeSource(orgId, teamId, sourceId);
      setSuccessMessage("Knowledge source link removed.");
      await fetchTeamData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to delete knowledge source");
    } finally {
      setDeletingSourceId(null);
    }
  };

  // Handle Edit Team Submit
  const handleEditTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !teamId || !formName.trim()) return;
    setIsSaving(true);
    try {
      const payload: TeamUpdatePayload = {
        name: formName.trim(),
        department: formDept.trim() || undefined,
        description: formDesc.trim() || undefined,
        team_lead_id: formLeadId.trim() || undefined,
        status: formStatus,
        memory_isolation_level: memoryIsolationLevel,
      };
      await teamService.updateTeam(orgId, teamId, payload);
      setIsEditModalOpen(false);
      setSuccessMessage("Team configuration updated successfully.");
      await fetchTeamData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update team");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Save AI Mesh Routing Policy
  const handleSaveMeshPolicy = async () => {
    if (!orgId || !teamId) return;
    setIsSaving(true);
    try {
      await teamService.updateTeam(orgId, teamId, {
        ai_routing_policy: {
          routing_mode: meshRoutingMode,
          fallback_to_all: meshFallbackToAll,
        },
      });
      setSuccessMessage("AI Mesh routing policy saved.");
      await fetchTeamData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to save routing policy");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Archive Team
  const handleArchiveTeam = async () => {
    if (!orgId || !teamId) return;
    setIsSaving(true);
    try {
      await teamService.deleteTeam(orgId, teamId);
      router.push("/organization/teams");
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to archive team");
      setIsSaving(false);
    }
  };

  if (isAuthLoading || (isLoading && !team)) {
    return <LoadingState label="Loading squad configuration, roster, and AI workforce..." />;
  }

  if (errorMessage || !team) {
    return (
      <div className="flex flex-col gap-4 p-8">
        <Link
          href="/organization/teams"
          className="inline-flex items-center gap-1.5 font-code-sm text-xs text-on-surface-variant hover:text-primary-container transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Teams Directory</span>
        </Link>
        <div className="p-6 border border-error/40 bg-error-container/20 rounded-sm">
          <p className="font-code-sm text-sm text-error mb-3">
            {errorMessage || "Team not found or unauthorized access."}
          </p>
          <button
            onClick={() => fetchTeamData()}
            className="px-3 py-1.5 border border-error/50 hover:bg-error-container/20 text-error font-code-sm text-xs rounded-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
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

      {/* ── BREADCRUMB & BACK LINK ────────────────────────────────────── */}
      <div>
        <Link
          href="/organization/teams"
          className="inline-flex items-center gap-1.5 font-code-sm text-xs text-on-surface-variant hover:text-primary-container transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Teams Directory</span>
        </Link>
      </div>

      {/* ── HEADER & TEAM STATS BANNER ────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border-tech pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 font-code-sm text-[10px] text-primary-container uppercase tracking-wider">
              Squad // {team.department || "Cross-Functional"}
            </span>
            <span
              className={`font-code-sm text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase ${
                team.status === "ACTIVE"
                  ? "border border-primary-container/40 bg-primary-container/10 text-primary-container"
                  : team.status === "DRAFT"
                  ? "border border-amber-500/40 bg-amber-500/10 text-amber-400"
                  : "border border-border-tech bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {team.status}
            </span>
          </div>

          <h1 className="font-display-xl text-[26px] sm:text-[30px] text-on-surface flex items-center gap-2.5">
            <span>{team.name}</span>
          </h1>

          <p className="font-code-sm text-xs text-on-surface-variant mt-1 max-w-2xl">
            {team.description || "No mission description configured for this organizational unit."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchTeamData(true)}
            disabled={isLoading || isRefreshing}
            className="px-3 py-2 border border-border-tech hover:border-primary-container/50 bg-surface-container-low text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Reload squad data"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-primary-container" : ""} />
            <span>Refresh</span>
          </button>

          {isOrgAdmin && (
            <button
              type="button"
              onClick={() => setIsAddMemberModalOpen(true)}
              className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <UserPlus size={14} />
              <span>Add Member</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI METRICS CARDS (AGGREGATE COUNTS) ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Team Members</span>
            <Users size={14} className="text-primary-container" />
          </div>
          <div className="font-code-sm text-2xl text-on-surface font-bold">
            {squadStats.totalMembers}
          </div>
          <div className="font-code-sm text-[11px] text-on-surface-variant/70 mt-0.5">
            Active contributors
          </div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Active AI Workforces</span>
            <Bot size={14} className="text-primary-container" />
          </div>
          <div className="font-code-sm text-2xl text-primary-container font-bold">
            {squadStats.activeWorkforces}
          </div>
          <div className="font-code-sm text-[11px] text-primary-container/80 mt-0.5">
            Employees with AgentGroups
          </div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Total Agents</span>
            <Cpu size={14} className="text-primary-container" />
          </div>
          <div className="font-code-sm text-2xl text-primary-container font-bold">
            {squadStats.totalAgents}
          </div>
          <div className="font-code-sm text-[11px] text-primary-container/80 mt-0.5">
            Instantiated via AgentFactory
          </div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Designated Lead</span>
            <Crown size={14} className="text-amber-400" />
          </div>
          <div className="font-code-sm text-sm text-on-surface font-semibold truncate mt-1">
            {team.team_lead?.name || "Unassigned"}
          </div>
          <div className="font-code-sm text-[11px] text-on-surface-variant/70 truncate">
            {team.team_lead?.email || "No lead assigned"}
          </div>
        </div>
      </div>

      {/* ── 8 TABS NAVIGATION BAR ────────────────────────────────────── */}
      <div className="border-b border-border-tech flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 font-code-sm text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "overview"
              ? "border-primary-container text-primary-container font-semibold bg-surface-container-low"
              : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30"
          }`}
        >
          <FolderTree size={14} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2.5 font-code-sm text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "members"
              ? "border-primary-container text-primary-container font-semibold bg-surface-container-low"
              : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30"
          }`}
        >
          <Users size={14} />
          <span>Members ({team.members?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("workforce")}
          className={`px-4 py-2.5 font-code-sm text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "workforce"
              ? "border-primary-container text-primary-container font-semibold bg-surface-container-low"
              : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30"
          }`}
        >
          <Bot size={14} />
          <span>AI Workforce ({squadStats.totalAgents} Agents)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("mesh")}
          className={`px-4 py-2.5 font-code-sm text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "mesh"
              ? "border-primary-container text-primary-container font-semibold bg-surface-container-low"
              : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30"
          }`}
        >
          <Network size={14} />
          <span>AI Mesh ({teamRoutes.length} Routes)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("knowledge")}
          className={`px-4 py-2.5 font-code-sm text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "knowledge"
              ? "border-primary-container text-primary-container font-semibold bg-surface-container-low"
              : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30"
          }`}
        >
          <Brain size={14} />
          <span>Knowledge ({teamKnowledge?.total_sources || 0} Sources)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("workload")}
          className={`px-4 py-2.5 font-code-sm text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "workload"
              ? "border-primary-container text-primary-container font-semibold bg-surface-container-low"
              : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30"
          }`}
        >
          <Activity size={14} />
          <span>Workload</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("performance")}
          className={`px-4 py-2.5 font-code-sm text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "performance"
              ? "border-primary-container text-primary-container font-semibold bg-surface-container-low"
              : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30"
          }`}
        >
          <Zap size={14} />
          <span>Performance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2.5 font-code-sm text-xs flex items-center gap-2 border-b-2 transition-colors cursor-pointer shrink-0 ${
            activeTab === "settings"
              ? "border-primary-container text-primary-container font-semibold bg-surface-container-low"
              : "border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/30"
          }`}
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
      </div>

      {/* ── TAB 1: OVERVIEW ─────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Mission & Lead */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-3">
              <div className="font-code-sm text-xs text-on-surface-variant uppercase flex items-center gap-2">
                <FolderTree size={14} className="text-primary-container" />
                <span>Squad Mission &amp; Scope</span>
              </div>
              <p className="font-code-sm text-xs text-on-surface bg-surface-container-lowest p-3.5 rounded-sm border border-border-tech leading-relaxed">
                {team.description || "No specific mission statement has been documented for this squad yet."}
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm">
                  <span className="font-code-sm text-[10px] text-on-surface-variant uppercase block">
                    Department
                  </span>
                  <span className="font-code-sm text-xs text-on-surface font-semibold mt-0.5 block">
                    {team.department || "Unspecified"}
                  </span>
                </div>

                <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm">
                  <span className="font-code-sm text-[10px] text-on-surface-variant uppercase block">
                    Memory Isolation Scope
                  </span>
                  <span className="font-code-sm text-xs text-primary-container font-semibold mt-0.5 block">
                    {teamKnowledge?.memory_isolation_level || team.memory_isolation_level}
                  </span>
                </div>
              </div>
            </div>

            {/* Designated Lead Card */}
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm flex flex-col justify-between">
              <div>
                <div className="font-code-sm text-xs text-on-surface-variant uppercase flex items-center gap-2 mb-3">
                  <Crown size={14} className="text-amber-400" />
                  <span>Designated Team Lead</span>
                </div>

                {team.team_lead ? (
                  <div className="p-3.5 bg-surface-container-lowest border border-primary-container/30 rounded-sm flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-surface-container-high border border-primary-container text-primary-container flex items-center justify-center font-bold font-code-sm text-sm">
                      {(team.team_lead.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-semibold text-on-surface font-code-sm text-xs truncate">
                        {team.team_lead.name || "Unnamed"}
                      </div>
                      <div className="text-on-surface-variant text-[11px] font-mono truncate">
                        {team.team_lead.email}
                      </div>
                      {team.team_lead.job_title && (
                        <div className="text-[10px] text-primary-container mt-0.5">
                          {team.team_lead.job_title}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed border-border-tech text-xs text-on-surface-variant text-center rounded-sm font-code-sm">
                    No lead assigned yet.
                  </div>
                )}
              </div>

              {isOrgAdmin && (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="mt-4 w-full px-3 py-1.5 border border-border-tech hover:border-primary-container/50 bg-surface-container-lowest text-on-surface font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
                >
                  Change Lead / Edit Squad
                </button>
              )}
            </div>
          </div>

          {/* Quick Roster Snippet */}
          <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-code-sm text-xs text-on-surface-variant uppercase flex items-center gap-2">
                <Users size={14} className="text-primary-container" />
                <span>Squad Contributors ({team.members?.length || 0})</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("members")}
                className="font-code-sm text-xs text-primary-container hover:underline cursor-pointer"
              >
                View Full Roster &rarr;
              </button>
            </div>

            {!team.members || team.members.length === 0 ? (
              <div className="p-6 border border-dashed border-border-tech text-xs text-on-surface-variant text-center rounded-sm font-code-sm">
                No contributors enrolled yet. Click [+ Add Member] to assign employees.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {team.members.slice(0, 6).map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-sm bg-surface-container-high border border-border-tech flex items-center justify-center font-code-sm text-xs text-on-surface shrink-0">
                        {(m.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-medium text-xs text-on-surface truncate font-code-sm">
                          {m.name || "Unnamed"}
                        </div>
                        <div className="text-[10px] text-on-surface-variant font-mono truncate">
                          {m.job_role_name || m.job_title || "Employee"}
                        </div>
                      </div>
                    </div>
                    <span className="font-code-sm text-[10px] text-primary-container px-2 py-0.5 bg-primary-container/10 border border-primary-container/30 rounded-sm shrink-0">
                      {m.role_in_team}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: MEMBERS MANAGEMENT ───────────────────────────────── */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Members Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border border-border-tech bg-surface-container-low p-3 rounded-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Filter squad members by name, role, email..."
                className="w-full bg-surface-container-lowest border border-border-tech rounded-sm pl-9 pr-3 py-1.5 font-code-sm text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
              />
            </div>

            <div className="flex items-center gap-2">
              {isOrgAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <UserPlus size={14} />
                  <span>Add Member</span>
                </button>
              )}
            </div>
          </div>

          {/* Members Table */}
          {!filteredSquadMembers || filteredSquadMembers.length === 0 ? (
            <div className="border border-border-tech bg-surface-container-low p-12 text-center rounded-sm">
              <Users className="w-10 h-10 text-on-surface-variant/40 mx-auto mb-3" />
              <p className="font-display-xl text-lg text-on-surface font-semibold">No Members Found</p>
              <p className="font-code-sm text-xs text-on-surface-variant mt-1">
                {memberSearchQuery
                  ? "No squad members match the search query."
                  : "No members are currently enrolled in this squad."}
              </p>
              {isOrgAdmin && !memberSearchQuery && (
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="mt-4 px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <UserPlus size={14} />
                  <span>Add First Member</span>
                </button>
              )}
            </div>
          ) : (
            <div className="border border-border-tech bg-surface-container-low overflow-hidden rounded-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-tech bg-surface-container-lowest text-[11px] font-code-sm uppercase tracking-wider text-on-surface-variant">
                      <th className="py-3 px-4 font-semibold">Employee</th>
                      <th className="py-3 px-4 font-semibold">Employee ID</th>
                      <th className="py-3 px-4 font-semibold">Job / AI Role</th>
                      <th className="py-3 px-4 font-semibold">Department</th>
                      <th className="py-3 px-4 font-semibold text-center">AI Workforce</th>
                      <th className="py-3 px-4 font-semibold text-center">Team Role</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-tech/40">
                    {filteredSquadMembers.map((member) => {
                      const isLead = team.team_lead_id === member.user_id;
                      const wfItem = teamWorkforce?.members?.find((m) => m.user_id === member.user_id);
                      const agentCount = wfItem?.agent_group?.agents?.length || 0;

                      return (
                        <tr
                          key={member.id}
                          className="hover:bg-surface-container-high/40 transition-colors font-code-sm text-xs text-on-surface group"
                        >
                          {/* Employee Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-sm border flex items-center justify-center font-bold text-xs ${
                                  isLead
                                    ? "border-amber-400 text-amber-400 bg-amber-500/10"
                                    : "border-border-tech bg-surface-container-lowest text-on-surface"
                                }`}
                              >
                                {(member.name || "U").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-on-surface flex items-center gap-1.5">
                                  <span>{member.name || "Unnamed"}</span>
                                  {isLead && (
                                    <span title="Team Lead">
                                      <Crown size={12} className="text-amber-400 shrink-0" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-on-surface-variant font-mono">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="py-3 px-4">
                            <span className="border border-border-tech bg-surface-container-lowest font-code-sm text-[11px] text-on-surface-variant px-2 py-0.5 rounded-sm">
                              {member.employee_id || "EMP-001"}
                            </span>
                          </td>

                          {/* Job Role from Role System */}
                          <td className="py-3 px-4">
                            {member.job_role_name ? (
                              <span className="font-code-sm text-xs text-primary-container font-medium">
                                {member.job_role_name}
                              </span>
                            ) : (
                              <span className="text-[11px] text-on-surface-variant/50 italic">
                                {member.job_title || "General"}
                              </span>
                            )}
                          </td>

                          {/* Department */}
                          <td className="py-3 px-4">
                            <span className="font-code-sm text-[11px] text-on-surface-variant">
                              {member.department || team.department || "Engineering"}
                            </span>
                          </td>

                          {/* AI Workforce */}
                          <td className="py-3 px-4 text-center">
                            {agentCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-code-sm text-[11px] text-primary-container bg-primary-container/10 border border-primary-container/30">
                                <Bot size={11} />
                                <span>{agentCount} Agents</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-code-sm text-[10px] text-on-surface-variant/60 bg-surface-container-lowest border border-border-tech">
                                <span>No AI workforce provisioned</span>
                              </span>
                            )}
                          </td>

                          {/* Team Role */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-sm font-code-sm text-[10px] font-bold ${
                                member.role_in_team === "Lead" || isLead
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                  : "bg-surface-container-lowest text-on-surface border border-border-tech"
                              }`}
                            >
                              {isLead ? "Lead" : member.role_in_team}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] font-code-sm font-bold border border-primary-container/40 bg-primary-container/10 text-primary-container uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-container pulse-green" />
                              Active
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isOrgAdmin && !isLead && (
                                <button
                                  type="button"
                                  onClick={() => handleSetAsLead(member.user_id)}
                                  className="p-1.5 text-on-surface-variant hover:text-amber-400 hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                                  title="Set as Designated Squad Lead"
                                >
                                  <Crown size={14} />
                                </button>
                              )}
                              {isOrgAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setRemovingMember(member)}
                                  className="p-1.5 text-on-surface-variant hover:text-rose-400 hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                                  title="Remove Member from Squad"
                                >
                                  <Trash2 size={14} />
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
        </div>
      )}

      {/* ── TAB 3: AI WORKFORCE (CONNECTED TO AGENTGROUP ARCHITECTURE) ── */}
      {activeTab === "workforce" && (
        <div className="space-y-6">
          {/* Workforce Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-border-tech bg-surface-container-low p-4 rounded-sm">
            <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center justify-between">
              <div>
                <span className="font-code-sm text-[10px] text-on-surface-variant uppercase block">
                  Team Members
                </span>
                <span className="font-code-sm text-2xl text-on-surface font-bold mt-0.5 block">
                  {squadStats.totalMembers}
                </span>
              </div>
              <Users size={20} className="text-primary-container/70" />
            </div>

            <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center justify-between">
              <div>
                <span className="font-code-sm text-[10px] text-on-surface-variant uppercase block">
                  Active AI Workforces
                </span>
                <span className="font-code-sm text-2xl text-primary-container font-bold mt-0.5 block">
                  {squadStats.activeWorkforces}
                </span>
              </div>
              <Bot size={20} className="text-primary-container/70" />
            </div>

            <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center justify-between">
              <div>
                <span className="font-code-sm text-[10px] text-on-surface-variant uppercase block">
                  Total Instantiated Agents
                </span>
                <span className="font-code-sm text-2xl text-primary-container font-bold mt-0.5 block">
                  {squadStats.totalAgents}
                </span>
              </div>
              <Cpu size={20} className="text-primary-container/70" />
            </div>
          </div>

          {/* Search Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border border-border-tech bg-surface-container-low p-3 rounded-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60" />
              <input
                type="text"
                value={workforceSearchQuery}
                onChange={(e) => setWorkforceSearchQuery(e.target.value)}
                placeholder="Filter workforces by contributor, role, or agent group..."
                className="w-full bg-surface-container-lowest border border-border-tech rounded-sm pl-9 pr-3 py-1.5 font-code-sm text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-container"
              />
            </div>
          </div>

          {/* Member AgentGroups Grid */}
          {!filteredWorkforceItems || filteredWorkforceItems.length === 0 ? (
            <div className="border border-border-tech bg-surface-container-low p-12 text-center rounded-sm">
              <Bot className="w-10 h-10 text-on-surface-variant/40 mx-auto mb-3" />
              <p className="font-display-xl text-lg text-on-surface font-semibold">No AI Workforces Found</p>
              <p className="font-code-sm text-xs text-on-surface-variant mt-1">
                {workforceSearchQuery
                  ? "No squad workforces match the query."
                  : "No AI Workforces are currently visible for this squad."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWorkforceItems.map((item) => {
                const group = item.agent_group;
                const agents = group?.agents || [];
                const hasWorkforce = Boolean(group && agents.length > 0);

                return (
                  <div
                    key={item.user_id}
                    className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4 hover:border-primary-container/40 transition-colors"
                  >
                    {/* Contributor & AgentGroup Header */}
                    <div className="flex items-start justify-between border-b border-border-tech pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-sm bg-surface-container-lowest border border-primary-container/40 text-primary-container flex items-center justify-center font-bold text-xs">
                          {(item.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-on-surface font-code-sm">
                            {item.name || "Unnamed"}
                          </div>
                          <div className="text-[11px] text-primary-container font-mono">
                            {item.job_role_name || "Employee"} &bull; {item.role_in_team}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {hasWorkforce ? (
                          <span className="font-code-sm text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase border border-primary-container/40 bg-primary-container/10 text-primary-container">
                            {group?.status || "ACTIVE"} &bull; {agents.length} Agents
                          </span>
                        ) : (
                          <span className="font-code-sm text-[10px] px-2 py-0.5 rounded-sm text-on-surface-variant/60 bg-surface-container-lowest border border-border-tech">
                            No AI workforce provisioned
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Agent Group Name & Details */}
                    {hasWorkforce && group && (
                      <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot size={14} className="text-primary-container" />
                          <div>
                            <div className="font-semibold text-xs text-on-surface font-code-sm">
                              {group.name}
                            </div>
                            <div className="text-[10px] text-on-surface-variant font-mono">
                              Group ID: {group.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setInspectingMemberWf(item)}
                          className="px-2.5 py-1 border border-border-tech hover:border-primary-container/50 bg-surface-container-low text-on-surface font-code-sm text-[11px] rounded-sm transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Inspect Group</span>
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    )}

                    {/* Instantiated Agents List */}
                    {!hasWorkforce ? (
                      <div className="p-4 border border-dashed border-border-tech bg-surface-container-lowest text-xs text-on-surface-variant/70 text-center rounded-sm font-code-sm">
                        No AI workforce provisioned. Assign a Job Role with capabilities to provision an AgentGroup.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {agents.map((agent) => (
                          <div
                            key={agent.id}
                            className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                                <Bot size={12} />
                              </div>
                              <div>
                                <div className="font-semibold text-xs text-on-surface font-code-sm">
                                  {agent.name}
                                </div>
                                <div className="text-[10px] text-on-surface-variant font-mono">
                                  Capability: {agent.capability?.name || agent.capability_id}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {agent.assigned_tools && agent.assigned_tools.length > 0 && (
                                <span className="font-code-sm text-[9px] text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded-sm border border-border-tech">
                                  {agent.assigned_tools.length} Tools
                                </span>
                              )}
                              <span className="font-code-sm text-[9px] text-primary-container bg-primary-container/10 px-1.5 py-0.5 rounded-sm border border-primary-container/30 font-bold uppercase">
                                {agent.status || "READY"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: AI MESH ROUTING CONFIGURATION ─────────────────────── */}
      {activeTab === "mesh" && (
        <div className="space-y-6">
          {/* Architecture Guardrails & Clarification Banner */}
          <div className="p-4 bg-surface-container-low border border-border-tech rounded-sm flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30 shrink-0">
                <Network size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display-xl text-sm font-semibold text-on-surface">
                    Team AI Mesh: Routing Configuration
                  </span>
                  <span className="px-2 py-0.5 rounded-sm font-code-sm text-[10px] text-primary-container bg-primary-container/10 border border-primary-container/30 uppercase font-bold">
                    Configuration Mode
                  </span>
                </div>
                <p className="font-code-sm text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Defines organizational collaboration and hand-off paths when tasks span multiple roles (e.g. Developer &rarr; Code Review &rarr; QA &rarr; DevOps).
                  Individual agent execution is powered by each contributor&apos;s existing <code className="text-primary-container bg-surface-container-lowest px-1 py-0.5 rounded border border-border-tech">AgentGroup Orchestrator</code>.
                </p>
              </div>
            </div>

            {isOrgAdmin && (
              <button
                type="button"
                onClick={() => setIsAddRouteModalOpen(true)}
                className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0"
              >
                <Plus size={14} />
                <span>Add Route</span>
              </button>
            )}
          </div>

          {/* Visual Mesh Workflow Chains */}
          {teamRoutes.length > 0 && (
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-code-sm text-xs text-on-surface-variant uppercase flex items-center gap-2">
                  <Workflow size={14} className="text-primary-container" />
                  <span>Configured Collaboration Graph</span>
                </div>
                <span className="font-code-sm text-[11px] text-primary-container">
                  {teamRoutes.filter((r) => r.enabled).length} Active Route(s)
                </span>
              </div>

              <div className="p-4 bg-surface-container-lowest border border-border-tech rounded-sm flex flex-wrap items-center gap-3 overflow-x-auto">
                {teamRoutes.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-2 p-2.5 rounded-sm border ${
                      r.enabled
                        ? "border-primary-container/40 bg-surface-container-low"
                        : "border-border-tech bg-surface-container-high/30 opacity-60"
                    }`}
                  >
                    <div className="font-code-sm text-xs font-semibold text-on-surface">
                      {r.source_role_name || "Source Role"}
                    </div>
                    <div className="flex items-center gap-1 text-primary-container px-1">
                      <span className="text-[10px] font-mono text-on-surface-variant font-medium">
                        [{r.condition}]
                      </span>
                      <ArrowRight size={14} />
                    </div>
                    <div className="font-code-sm text-xs font-semibold text-primary-container">
                      {r.target_role_name || "Target Role"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configured Routes Table */}
          <div className="border border-border-tech bg-surface-container-low rounded-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border-tech flex items-center justify-between bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-primary-container" />
                <span className="font-code-sm text-xs font-semibold uppercase text-on-surface">
                  Routing Rules ({teamRoutes.length})
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant font-code-sm">
                Priority ordered (1 = highest priority)
              </span>
            </div>

            {teamRoutes.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Network className="w-10 h-10 text-on-surface-variant/40 mx-auto" />
                <p className="font-display-xl text-base text-on-surface font-semibold">
                  No Collaboration Routes Configured
                </p>
                <p className="font-code-sm text-xs text-on-surface-variant max-w-md mx-auto">
                  Add hand-off routing rules between organizational roles (e.g. Developer &rarr; QA &rarr; DevOps) to coordinate multi-role workflows.
                </p>
                {isOrgAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsAddRouteModalOpen(true)}
                    className="mt-2 px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Create First Route</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-code-sm text-xs">
                  <thead>
                    <tr className="border-b border-border-tech bg-surface-container-lowest text-[11px] uppercase tracking-wider text-on-surface-variant">
                      <th className="py-3 px-4 font-semibold">Priority</th>
                      <th className="py-3 px-4 font-semibold">Source Role</th>
                      <th className="py-3 px-4 font-semibold text-center">Handoff</th>
                      <th className="py-3 px-4 font-semibold">Target Role</th>
                      <th className="py-3 px-4 font-semibold">Trigger Condition</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-tech/40">
                    {teamRoutes.map((route) => (
                      <tr
                        key={route.id}
                        className="hover:bg-surface-container-high/40 transition-colors text-on-surface"
                      >
                        {/* Priority */}
                        <td className="py-3 px-4 font-bold text-primary-container">
                          #{route.priority}
                        </td>

                        {/* Source Role */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-on-surface">
                            {route.source_role_name || "Unassigned Source"}
                          </div>
                          {route.description && (
                            <div className="text-[10px] text-on-surface-variant mt-0.5 truncate max-w-xs">
                              {route.description}
                            </div>
                          )}
                        </td>

                        {/* Handoff Arrow */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center p-1 rounded bg-surface-container-lowest border border-border-tech text-primary-container">
                            <ArrowRight size={13} />
                          </span>
                        </td>

                        {/* Target Role */}
                        <td className="py-3 px-4 font-semibold text-primary-container">
                          {route.target_role_name || "Unassigned Target"}
                        </td>

                        {/* Trigger Condition */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-sm bg-surface-container-lowest border border-border-tech font-mono text-[11px] text-on-surface">
                            {route.condition}
                          </span>
                        </td>

                        {/* Status Toggle */}
                        <td className="py-3 px-4 text-center">
                          {isOrgAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleToggleRouteEnabled(route)}
                              className={`px-2.5 py-0.5 rounded-sm font-code-sm text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                route.enabled
                                  ? "border border-primary-container/40 bg-primary-container/10 text-primary-container"
                                  : "border border-border-tech bg-surface-container-lowest text-on-surface-variant"
                              }`}
                              title="Click to toggle route status"
                            >
                              {route.enabled ? "Enabled" : "Disabled"}
                            </button>
                          ) : (
                            <span
                              className={`px-2.5 py-0.5 rounded-sm font-code-sm text-[10px] font-bold uppercase ${
                                route.enabled
                                  ? "border border-primary-container/40 bg-primary-container/10 text-primary-container"
                                  : "border border-border-tech bg-surface-container-lowest text-on-surface-variant"
                              }`}
                            >
                              {route.enabled ? "Enabled" : "Disabled"}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {isOrgAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRoute(route.id)}
                              disabled={deletingRouteId === route.id}
                              className="p-1.5 text-on-surface-variant hover:text-rose-400 hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer disabled:opacity-50"
                              title="Delete route configuration"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Team-wide Routing Policy Box */}
          <div className="border border-border-tech bg-surface-container-low p-6 rounded-sm space-y-5">
            <div>
              <div className="font-code-sm text-xs text-primary-container font-semibold flex items-center gap-2">
                <Network size={16} />
                <span>Squad AI Mesh Routing Policy</span>
              </div>
              <p className="font-code-sm text-xs text-on-surface-variant mt-1">
                Configure how inbound tasks and unassigned automated triggers are dispatched to squad members.
              </p>
            </div>

            <div className="space-y-4 font-code-sm text-xs">
              <div>
                <label className="block text-on-surface-variant mb-1.5 font-semibold">
                  Routing Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "lead_directed", label: "Lead Directed", desc: "Routes through Designated Lead first" },
                    { id: "peer_collaborative", label: "Peer Collaborative", desc: "Routes to highest confidence peer agent" },
                    { id: "round_robin", label: "Round Robin", desc: "Evenly balances load across squad agents" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setMeshRoutingMode(mode.id)}
                      className={`p-3 border text-left rounded-sm transition-all cursor-pointer ${
                        meshRoutingMode === mode.id
                          ? "border-primary-container bg-primary-container/10 text-on-surface"
                          : "border-border-tech bg-surface-container-lowest text-on-surface-variant hover:border-on-surface-variant"
                      }`}
                    >
                      <div className="font-semibold text-xs text-on-surface flex items-center justify-between">
                        <span>{mode.label}</span>
                        {meshRoutingMode === mode.id && <Check size={13} className="text-primary-container" />}
                      </div>
                      <div className="text-[10px] text-on-surface-variant mt-1">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center justify-between">
                <div>
                  <div className="font-semibold text-on-surface text-xs">
                    Fallback Routing to All Squad Agents
                  </div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">
                    If the target agent or lead is unavailable, broadcast task to secondary qualified agents.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={meshFallbackToAll}
                  onChange={(e) => setMeshFallbackToAll(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {isOrgAdmin && (
                <div className="pt-3 border-t border-border-tech flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveMeshPolicy}
                    disabled={isSaving}
                    className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold rounded-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Routing Policy"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: KNOWLEDGE & MEMORY BOUNDARIES ─────────────────────── */}
      {activeTab === "knowledge" && (
        <div className="space-y-6">
          {/* Conceptual Memory Tiers Banner */}
          <div className="p-5 bg-surface-container-low border border-border-tech rounded-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                <Brain size={18} />
              </div>
              <div>
                <h3 className="font-display-xl text-sm font-semibold text-on-surface">
                  Team Knowledge &amp; Memory Isolation Architecture
                </h3>
                <p className="font-code-sm text-xs text-on-surface-variant mt-0.5">
                  Three distinct tiers govern what organizational agents can retrieve, retain, and query.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Tier 1: Personal Memory */}
              <div className="p-4 bg-surface-container-lowest border border-border-tech rounded-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-code-sm text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <Lock size={13} className="text-amber-400" />
                    <span>1. Personal Memory</span>
                  </span>
                  <span className="font-code-sm text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase font-bold">
                    Strictly Private
                  </span>
                </div>
                <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                  Belongs exclusively to the individual employee&apos;s AI Twin. Never exposed to other squad members or external agents.
                </p>
              </div>

              {/* Tier 2: Team Memory */}
              <div className="p-4 bg-surface-container-lowest border border-primary-container/40 rounded-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-code-sm text-xs font-bold text-primary-container flex items-center gap-1.5">
                    <Share2 size={13} />
                    <span>2. Team Memory</span>
                  </span>
                  <span className="font-code-sm text-[9px] px-1.5 py-0.5 rounded bg-primary-container/10 text-primary-container border border-primary-container/30 uppercase font-bold">
                    Squad Scoped
                  </span>
                </div>
                <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                  Shared across authorized squad agents. Captures squad-specific engineering context, active milestones, and team standards.
                </p>
              </div>

              {/* Tier 3: Organization Knowledge */}
              <div className="p-4 bg-surface-container-lowest border border-border-tech rounded-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-code-sm text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <Database size={13} className="text-blue-400" />
                    <span>3. Org Knowledge</span>
                  </span>
                  <span className="font-code-sm text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 uppercase font-bold">
                    Enterprise
                  </span>
                </div>
                <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                  Company-wide policies, architectural principles, compliance frameworks, and organizational guidelines.
                </p>
              </div>
            </div>
          </div>

          {/* Team Knowledge Policy Settings Card */}
          <div className="border border-border-tech bg-surface-container-low p-6 rounded-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border-tech pb-3">
              <div>
                <div className="font-code-sm text-xs text-primary-container font-semibold flex items-center gap-2">
                  <Settings size={15} />
                  <span>Squad Knowledge Access Policy</span>
                </div>
                <p className="font-code-sm text-xs text-on-surface-variant mt-0.5">
                  Configure boundaries for what documents and memory levels this squad&apos;s AI Workforce can query.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-code-sm text-xs text-on-surface font-medium">Shared Knowledge</span>
                <input
                  type="checkbox"
                  checked={sharedKnowledgeEnabled}
                  onChange={(e) => setSharedKnowledgeEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            <form onSubmit={handleSaveKnowledgePolicySubmit} className="space-y-4 font-code-sm text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Knowledge Scope */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Knowledge Boundary Scope
                  </label>
                  <select
                    value={knowledgeScope}
                    onChange={(e) => setKnowledgeScope(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    {KNOWLEDGE_SCOPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Memory Isolation Tier */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Memory Isolation Tier
                  </label>
                  <select
                    value={memoryIsolationLevel}
                    onChange={(e) => setMemoryIsolationLevel(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    {MEMORY_ISOLATION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Access Rule */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Access Permission Rule
                  </label>
                  <select
                    value={accessRule}
                    onChange={(e) => setAccessRule(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    {ACCESS_RULE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Accessible Document Categories */}
              <div>
                <label className="block text-on-surface-variant mb-2 font-semibold">
                  Allowed Document Categories for Squad Agents
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DOCUMENT_CATEGORIES.map((cat) => {
                    const isChecked = selectedDocCategories.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center justify-between cursor-pointer hover:border-primary-container/40 transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-on-surface text-xs">{cat.label}</div>
                          <div className="text-[10px] text-on-surface-variant font-mono">{cat.id}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedDocCategories(selectedDocCategories.filter((c) => c !== cat.id));
                            } else {
                              setSelectedDocCategories([...selectedDocCategories, cat.id]);
                            }
                          }}
                          className="w-4 h-4 accent-emerald-500 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Cross-Team Querying Toggle */}
              <div className="p-3.5 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center justify-between">
                <div>
                  <div className="font-semibold text-on-surface">Allow Cross-Team Knowledge Querying</div>
                  <div className="text-[11px] text-on-surface-variant mt-0.5">
                    Permit squad agents to query knowledge from peer squads within the same department.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={allowCrossTeamQuery}
                  onChange={(e) => setAllowCrossTeamQuery(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              {isOrgAdmin && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold rounded-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Knowledge & Memory Policy"}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Configured Team Knowledge Sources */}
          <div className="border border-border-tech bg-surface-container-low rounded-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border-tech flex items-center justify-between bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-primary-container" />
                <span className="font-code-sm text-xs font-semibold uppercase text-on-surface">
                  Configured Knowledge Sources ({teamKnowledge?.sources?.length || 0})
                </span>
              </div>

              {isOrgAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddSourceModalOpen(true)}
                  className="px-3 py-1.5 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Plus size={13} />
                  <span>Add Knowledge Source</span>
                </button>
              )}
            </div>

            {!teamKnowledge?.sources || teamKnowledge.sources.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Database className="w-10 h-10 text-on-surface-variant/40 mx-auto" />
                <p className="font-display-xl text-base text-on-surface font-semibold">
                  No team knowledge sources configured.
                </p>
                <p className="font-code-sm text-xs text-on-surface-variant max-w-md mx-auto">
                  Explicitly attach documentation repositories, wiki spaces, or technical specifications to make them accessible to this squad&apos;s AI Workforce.
                </p>
                {isOrgAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsAddSourceModalOpen(true)}
                    className="mt-2 px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Configure First Source</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-code-sm text-xs">
                  <thead>
                    <tr className="border-b border-border-tech bg-surface-container-lowest text-[11px] uppercase tracking-wider text-on-surface-variant">
                      <th className="py-3 px-4 font-semibold">Source Name</th>
                      <th className="py-3 px-4 font-semibold">Type</th>
                      <th className="py-3 px-4 font-semibold">Source Identifier / Slug</th>
                      <th className="py-3 px-4 font-semibold">Description</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-tech/40">
                    {teamKnowledge.sources.map((source) => (
                      <tr
                        key={source.id}
                        className="hover:bg-surface-container-high/40 transition-colors text-on-surface"
                      >
                        {/* Source Name */}
                        <td className="py-3 px-4 font-semibold">
                          {source.name}
                        </td>

                        {/* Source Type */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-sm bg-surface-container-lowest border border-border-tech text-[10px] font-mono text-primary-container">
                            {source.source_type}
                          </span>
                        </td>

                        {/* Identifier */}
                        <td className="py-3 px-4 font-mono text-[11px] text-on-surface-variant">
                          {source.source_identifier}
                        </td>

                        {/* Description */}
                        <td className="py-3 px-4 text-on-surface-variant max-w-xs truncate">
                          {source.description || "—"}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                              source.is_active
                                ? "border border-primary-container/40 bg-primary-container/10 text-primary-container"
                                : "border border-border-tech bg-surface-container-lowest text-on-surface-variant"
                            }`}
                          >
                            {source.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {isOrgAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteKnowledgeSource(source.id)}
                              disabled={deletingSourceId === source.id}
                              className="p-1.5 text-on-surface-variant hover:text-rose-400 hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer disabled:opacity-50"
                              title="Delete knowledge source link"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: TEAM WORKLOAD FOUNDATION ──────────────────────────── */}
      {activeTab === "workload" && (
        <div className="space-y-6">
          {/* Workload Status Banner */}
          <div className="p-4 bg-surface-container-low border border-border-tech rounded-sm flex items-start gap-3">
            <div className="p-2 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30 shrink-0">
              <Activity size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display-xl text-sm font-semibold text-on-surface">
                  Team Workload: Task &amp; Project Distribution
                </span>
                <span className="px-2 py-0.5 rounded-sm font-code-sm text-[10px] text-on-surface-variant bg-surface-container-high border border-border-tech uppercase font-bold">
                  Task Engine: Unintegrated
                </span>
              </div>
              <p className="font-code-sm text-xs text-on-surface-variant mt-1 leading-relaxed">
                Organizational task management and sprint workload tracking are not currently connected.
                This layout is prepared for future integrations (Jira, GitHub Issues, Linear, or internal Project models).
              </p>
            </div>
          </div>

          {/* Member Workload Table */}
          <div className="border border-border-tech bg-surface-container-low rounded-sm overflow-hidden space-y-0">
            <div className="p-4 border-b border-border-tech flex items-center justify-between bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-primary-container" />
                <span className="font-code-sm text-xs font-semibold uppercase text-on-surface">
                  Squad Contributor Workload Status ({team.members?.length || 0})
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant font-code-sm">
                Real status based on backend availability
              </span>
            </div>

            {!team.members || team.members.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Users className="w-10 h-10 text-on-surface-variant/40 mx-auto" />
                <p className="font-display-xl text-base text-on-surface font-semibold">No Members in Squad</p>
                <p className="font-code-sm text-xs text-on-surface-variant">
                  Add employees to this squad to track future workload.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-code-sm text-xs">
                  <thead>
                    <tr className="border-b border-border-tech bg-surface-container-lowest text-[11px] uppercase tracking-wider text-on-surface-variant">
                      <th className="py-3 px-4 font-semibold">Employee</th>
                      <th className="py-3 px-4 font-semibold">Role in Team</th>
                      <th className="py-3 px-4 font-semibold">Job Role</th>
                      <th className="py-3 px-4 font-semibold text-center">Active Tasks</th>
                      <th className="py-3 px-4 font-semibold text-center">In Progress</th>
                      <th className="py-3 px-4 font-semibold text-center">Blocked</th>
                      <th className="py-3 px-4 font-semibold text-center">Completed</th>
                      <th className="py-3 px-4 font-semibold text-right">Workload Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-tech/40">
                    {team.members.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-surface-container-high/40 transition-colors text-on-surface"
                      >
                        {/* Employee Info */}
                        <td className="py-3 px-4 font-semibold">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-sm bg-surface-container-lowest border border-border-tech flex items-center justify-center font-bold text-[10px]">
                              {(member.name || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div>{member.name || "Unnamed"}</div>
                              <div className="text-[10px] text-on-surface-variant font-mono">{member.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Team Role */}
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-sm bg-surface-container-lowest border border-border-tech text-[10px]">
                            {member.role_in_team}
                          </span>
                        </td>

                        {/* Job Role */}
                        <td className="py-3 px-4 text-primary-container font-medium">
                          {member.job_role_name || member.job_title || "General"}
                        </td>

                        {/* Active Tasks */}
                        <td className="py-3 px-4 text-center text-on-surface-variant">
                          —
                        </td>

                        {/* In Progress */}
                        <td className="py-3 px-4 text-center text-on-surface-variant">
                          —
                        </td>

                        {/* Blocked */}
                        <td className="py-3 px-4 text-center text-on-surface-variant">
                          —
                        </td>

                        {/* Completed */}
                        <td className="py-3 px-4 text-center text-on-surface-variant">
                          —
                        </td>

                        {/* Workload Status */}
                        <td className="py-3 px-4 text-right">
                          <span className="px-2 py-0.5 rounded-sm bg-surface-container-lowest border border-border-tech text-[10px] text-on-surface-variant font-mono">
                            Workload data unavailable
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Integration Readiness Info Box */}
          <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-2">
            <div className="font-code-sm text-xs font-semibold text-on-surface flex items-center gap-2">
              <FolderGit2 size={15} className="text-primary-container" />
              <span>Future Integrations Readiness</span>
            </div>
            <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed">
              When external task systems (Jira, GitHub Projects, Linear, Asana) or internal project boards are connected, active sprint tasks and workload capacity will automatically populate here per squad member.
            </p>
          </div>
        </div>
      )}

      {/* ── TAB 7: PERFORMANCE & RUNTIME METRICS ─────────────────────── */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          {/* Section 1: AI Runtime Execution Metrics (Real Live Data from AgentExecution) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-code-sm text-xs text-primary-container font-semibold flex items-center gap-2 uppercase tracking-wider">
                  <Bot size={15} />
                  <span>AI Workforce Runtime Metrics (Live Data)</span>
                </div>
                <p className="font-code-sm text-xs text-on-surface-variant mt-0.5">
                  Real runtime execution statistics generated by this squad&apos;s instantiated AgentGroups.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-sm font-code-sm text-[10px] text-primary-container bg-primary-container/10 border border-primary-container/30 uppercase font-bold">
                Backend Synced
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Total Executions */}
              <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
                <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
                  <span>Total Executions</span>
                  <Terminal size={13} className="text-primary-container" />
                </div>
                <div className="font-code-sm text-2xl text-on-surface font-bold">
                  {teamMetrics?.ai_runtime_metrics?.total_executions ?? 0}
                </div>
                <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
                  Agent runtime tasks
                </div>
              </div>

              {/* Completed Executions */}
              <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
                <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
                  <span>Completed</span>
                  <CheckCircle2 size={13} className="text-emerald-400" />
                </div>
                <div className="font-code-sm text-2xl text-emerald-400 font-bold">
                  {teamMetrics?.ai_runtime_metrics?.completed_executions ?? 0}
                </div>
                <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
                  Success status
                </div>
              </div>

              {/* Failed Executions */}
              <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
                <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
                  <span>Failed / Errored</span>
                  <AlertCircle size={13} className="text-rose-400" />
                </div>
                <div className="font-code-sm text-2xl text-rose-400 font-bold">
                  {teamMetrics?.ai_runtime_metrics?.failed_executions ?? 0}
                </div>
                <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
                  Runtime exceptions
                </div>
              </div>

              {/* Pending Approvals */}
              <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
                <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
                  <span>Pending Approvals</span>
                  <Shield size={13} className="text-amber-400" />
                </div>
                <div className="font-code-sm text-2xl text-amber-400 font-bold">
                  {teamMetrics?.ai_runtime_metrics?.pending_approvals ?? 0}
                </div>
                <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
                  Human-in-the-loop
                </div>
              </div>

              {/* Verified Evidences */}
              <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
                <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
                  <span>Verified Evidences</span>
                  <CheckSquare size={13} className="text-primary-container" />
                </div>
                <div className="font-code-sm text-2xl text-primary-container font-bold">
                  {teamMetrics?.ai_runtime_metrics?.verified_evidences ?? 0}
                </div>
                <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
                  Artifacts produced
                </div>
              </div>
            </div>

            {/* Member AI Runtime Breakdown Table */}
            {teamMetrics?.member_runtime_breakdown && teamMetrics.member_runtime_breakdown.length > 0 && (
              <div className="border border-border-tech bg-surface-container-low rounded-sm overflow-hidden space-y-0 mt-3">
                <div className="p-3 border-b border-border-tech bg-surface-container-lowest flex items-center justify-between font-code-sm text-xs">
                  <span className="font-semibold uppercase text-on-surface">
                    Contributor AI Runtime Breakdown
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    From SQLite AgentExecution store
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse font-code-sm text-xs">
                    <thead>
                      <tr className="border-b border-border-tech bg-surface-container-lowest text-[11px] uppercase tracking-wider text-on-surface-variant">
                        <th className="py-2.5 px-4 font-semibold">Contributor</th>
                        <th className="py-2.5 px-4 font-semibold">Job Role</th>
                        <th className="py-2.5 px-4 font-semibold">Agent Group</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Agents</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Total Executions</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Completed</th>
                        <th className="py-2.5 px-4 font-semibold text-center">Failed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-tech/40">
                      {teamMetrics.member_runtime_breakdown.map((item) => (
                        <tr
                          key={item.user_id}
                          className="hover:bg-surface-container-high/40 transition-colors text-on-surface"
                        >
                          <td className="py-2.5 px-4 font-semibold">{item.name}</td>
                          <td className="py-2.5 px-4 text-primary-container">{item.job_role_name || "—"}</td>
                          <td className="py-2.5 px-4 text-on-surface-variant">{item.agent_group_name || "None"}</td>
                          <td className="py-2.5 px-4 text-center">{item.total_agents}</td>
                          <td className="py-2.5 px-4 text-center font-bold">{item.total_executions}</td>
                          <td className="py-2.5 px-4 text-center text-emerald-400 font-semibold">{item.completed_executions}</td>
                          <td className="py-2.5 px-4 text-center text-rose-400">{item.failed_executions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Employee & Project Performance (Honest Unintegrated Foundation) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-code-sm text-xs text-on-surface-variant font-semibold flex items-center gap-2 uppercase tracking-wider">
                  <TrendingUp size={15} />
                  <span>Employee &amp; Project Performance Foundation</span>
                </div>
                <p className="font-code-sm text-xs text-on-surface-variant mt-0.5">
                  Human sprint metrics, project velocity, and completion velocity.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Tasks Completed */}
              <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
                <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
                  <span>Tasks Completed</span>
                  <CheckSquare size={13} className="text-on-surface-variant/40" />
                </div>
                <div className="font-code-sm text-lg text-on-surface-variant font-mono mt-1">
                  Unavailable
                </div>
                <div className="font-code-sm text-[10px] text-on-surface-variant/70 mt-0.5">
                  Awaiting task module
                </div>
              </div>

              {/* Avg Completion Time */}
              <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
                <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
                  <span>Avg Completion Time</span>
                  <Clock size={13} className="text-on-surface-variant/40" />
                </div>
                <div className="font-code-sm text-lg text-on-surface-variant font-mono mt-1">
                  Unavailable
                </div>
                <div className="font-code-sm text-[10px] text-on-surface-variant/70 mt-0.5">
                  Awaiting task module
                </div>
              </div>

              {/* Blocked Tasks */}
              <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
                <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
                  <span>Blocked Tasks</span>
                  <AlertTriangle size={13} className="text-on-surface-variant/40" />
                </div>
                <div className="font-code-sm text-lg text-on-surface-variant font-mono mt-1">
                  Unavailable
                </div>
                <div className="font-code-sm text-[10px] text-on-surface-variant/70 mt-0.5">
                  Awaiting task module
                </div>
              </div>

              {/* AI-Assisted Tasks */}
              <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
                <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
                  <span>AI-Assisted Tasks</span>
                  <Bot size={13} className="text-on-surface-variant/40" />
                </div>
                <div className="font-code-sm text-lg text-on-surface-variant font-mono mt-1">
                  Unavailable
                </div>
                <div className="font-code-sm text-[10px] text-on-surface-variant/70 mt-0.5">
                  Awaiting task module
                </div>
              </div>

              {/* Team Velocity */}
              <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
                <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
                  <span>Team Velocity</span>
                  <Zap size={13} className="text-on-surface-variant/40" />
                </div>
                <div className="font-code-sm text-lg text-on-surface-variant font-mono mt-1">
                  Unavailable
                </div>
                <div className="font-code-sm text-[10px] text-on-surface-variant/70 mt-0.5">
                  Awaiting task module
                </div>
              </div>
            </div>

            {/* Velocity Explanation Box */}
            <div className="p-4 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center gap-3">
              <Info size={16} className="text-primary-container shrink-0" />
              <p className="font-code-sm text-xs text-on-surface-variant">
                Project velocity will be available after project/task integration. Zero mock scores or fabricated percentages are presented.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 8: SETTINGS & DANGER ZONE ────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="space-y-6 max-w-3xl">
          <div className="border border-border-tech bg-surface-container-low p-6 rounded-sm space-y-4">
            <div className="font-code-sm text-xs text-primary-container font-semibold flex items-center gap-2">
              <Settings size={15} />
              <span>Squad Configuration</span>
            </div>

            <form onSubmit={handleEditTeamSubmit} className="space-y-4 font-code-sm text-xs">
              <div>
                <label className="block text-on-surface-variant mb-1">Squad Name</label>
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
                  <label className="block text-on-surface-variant mb-1">Department</label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    list="dept-settings-opts"
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                  <datalist id="dept-settings-opts">
                    {DEPARTMENT_PRESETS.map((d) => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1">Status</label>
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
                <label className="block text-on-surface-variant mb-1">Designated Lead</label>
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
                <label className="block text-on-surface-variant mb-1">Scope Description</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              {isOrgAdmin && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold rounded-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Danger Zone */}
          {isOrgAdmin && (
            <div className="border border-rose-500/40 bg-surface-container-low p-6 rounded-sm space-y-4">
              <div className="font-code-sm text-xs text-rose-400 font-semibold flex items-center gap-2">
                <ShieldAlert size={16} />
                <span>Danger Zone: Archive Squad</span>
              </div>
              <p className="font-code-sm text-xs text-on-surface-variant">
                Archiving this squad deactivates team boundaries. All enrolled employee accounts, job roles, AgentGroups, and execution histories remain 100% intact.
              </p>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-4 py-2 border border-rose-500/50 hover:bg-rose-500/10 text-rose-400 font-code-sm text-xs font-semibold rounded-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Archive Team</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ADD ROUTE MODAL ─────────────────────────────────────────── */}
      {isAddRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-lg border border-border-tech shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-tech bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <Workflow size={16} />
                </div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Configure AI Mesh Route
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRouteModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest rounded-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddRouteSubmit} className="p-5 space-y-4 overflow-y-auto font-code-sm text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Source Role */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Source Role <span className="text-error">*</span>
                  </label>
                  <select
                    required
                    value={selectedSourceRoleId}
                    onChange={(e) => setSelectedSourceRoleId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="">-- Select Source Role --</option>
                    {orgRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.department || "General"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Role */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Target Role <span className="text-error">*</span>
                  </label>
                  <select
                    required
                    value={selectedTargetRoleId}
                    onChange={(e) => setSelectedTargetRoleId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="">-- Select Target Role --</option>
                    {orgRoles
                      .filter((r) => r.id !== selectedSourceRoleId)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.department || "General"})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Priority & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Routing Priority (1 = Highest)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={routePriority}
                    onChange={(e) => setRoutePriority(parseInt(e.target.value) || 1)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Trigger Condition
                  </label>
                  <select
                    value={routeCondition}
                    onChange={(e) => setRouteCondition(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    {ROUTE_CONDITION_PRESETS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-on-surface-variant mb-1">
                  Description / Handoff Criteria
                </label>
                <textarea
                  rows={2}
                  value={routeDescription}
                  onChange={(e) => setRouteDescription(e.target.value)}
                  placeholder="e.g. When Developer completes code changes, automatically dispatch review task to QA..."
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container placeholder:text-on-surface-variant/50"
                />
              </div>

              {/* Enabled Checkbox */}
              <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center justify-between">
                <div>
                  <div className="font-semibold text-on-surface">Enable Route Immediately</div>
                  <div className="text-[10px] text-on-surface-variant">
                    Route will become active in this squad&apos;s AI Mesh configuration.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={routeEnabled}
                  onChange={(e) => setRouteEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setIsAddRouteModalOpen(false)}
                  className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !selectedSourceRoleId || !selectedTargetRoleId}
                  className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? "Saving..." : "Configure Route"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD KNOWLEDGE SOURCE MODAL ──────────────────────────────── */}
      {isAddSourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-lg border border-border-tech shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-tech bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <BookOpen size={16} />
                </div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Configure Knowledge Source
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSourceModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest rounded-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddKnowledgeSourceSubmit} className="p-5 space-y-4 overflow-y-auto font-code-sm text-xs">
              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold">
                  Knowledge Source Label <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g. Core Engineering Architecture Documentation"
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container placeholder:text-on-surface-variant/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Source Type
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    {SOURCE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Source Identifier / Slug <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={sourceIdentifier}
                    onChange={(e) => setSourceIdentifier(e.target.value)}
                    placeholder="e.g. docs-eng-core-arch"
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container placeholder:text-on-surface-variant/50 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={sourceDescription}
                  onChange={(e) => setSourceDescription(e.target.value)}
                  placeholder="Provides service contracts, API standards, and infrastructure guides..."
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container placeholder:text-on-surface-variant/50"
                />
              </div>

              <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm flex items-center justify-between">
                <div>
                  <div className="font-semibold text-on-surface">Active Status</div>
                  <div className="text-[10px] text-on-surface-variant">
                    Make this knowledge source queryable by this squad&apos;s AI Workforce.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sourceIsActive}
                  onChange={(e) => setSourceIsActive(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setIsAddSourceModalOpen(false)}
                  className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !sourceName.trim() || !sourceIdentifier.trim()}
                  className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? "Saving..." : "Add Source"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── INSPECT AGENTGROUP DRAWER / MODAL ───────────────────────── */}
      {inspectingMemberWf && inspectingMemberWf.agent_group && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-2xl border border-border-tech shadow-2xl overflow-hidden flex flex-col max-h-[85vh] rounded-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-tech bg-surface-container-lowest">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-display-xl text-base text-on-surface font-semibold">
                    {inspectingMemberWf.agent_group.name}
                  </h3>
                  <div className="text-[11px] text-on-surface-variant font-code-sm">
                    {inspectingMemberWf.name} &bull; {inspectingMemberWf.job_role_name || "Employee"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingMemberWf(null)}
                className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest rounded-sm cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto font-code-sm text-xs flex-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 bg-surface-container-lowest border border-border-tech rounded-sm">
                  <span className="text-[10px] text-on-surface-variant uppercase block">STATUS</span>
                  <span className="text-primary-container font-bold mt-0.5 block">
                    {inspectingMemberWf.agent_group.status}
                  </span>
                </div>
                <div className="p-2.5 bg-surface-container-lowest border border-border-tech rounded-sm">
                  <span className="text-[10px] text-on-surface-variant uppercase block">TOTAL AGENTS</span>
                  <span className="text-on-surface font-bold mt-0.5 block">
                    {inspectingMemberWf.agent_group.agents.length}
                  </span>
                </div>
                <div className="p-2.5 bg-surface-container-lowest border border-border-tech rounded-sm col-span-2">
                  <span className="text-[10px] text-on-surface-variant uppercase block">EMPLOYEE ID</span>
                  <span className="text-on-surface font-mono mt-0.5 block truncate">
                    {inspectingMemberWf.employee_id || inspectingMemberWf.user_id}
                  </span>
                </div>
              </div>

              <div>
                <div className="font-semibold text-on-surface uppercase text-[11px] mb-2">
                  Instantiated Agents ({inspectingMemberWf.agent_group.agents.length})
                </div>

                <div className="space-y-2.5">
                  {inspectingMemberWf.agent_group.agents.map((agent) => (
                    <div
                      key={agent.id}
                      className="p-3.5 bg-surface-container-lowest border border-border-tech rounded-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot size={14} className="text-primary-container" />
                          <span className="font-semibold text-on-surface">{agent.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-primary-container bg-primary-container/10 px-2 py-0.5 rounded-sm border border-primary-container/30 uppercase">
                          {agent.status}
                        </span>
                      </div>

                      {agent.capability?.description && (
                        <p className="text-[11px] text-on-surface-variant bg-surface-container-low p-2 rounded-sm border border-border-tech">
                          {agent.capability.description}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-[10px] text-on-surface-variant block uppercase">
                            Assigned Tools
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {agent.assigned_tools?.map((tool) => (
                              <span
                                key={tool}
                                className="px-1.5 py-0.5 bg-surface-container-low text-on-surface text-[10px] rounded-sm border border-border-tech font-mono"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-on-surface-variant block uppercase">
                            Permissions
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {agent.permissions?.map((perm) => (
                              <span
                                key={perm}
                                className="px-1.5 py-0.5 bg-surface-container-low text-primary-container text-[10px] rounded-sm border border-primary-container/30 font-mono"
                              >
                                {perm}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3.5 border-t border-border-tech bg-surface-container-lowest flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingMemberWf(null)}
                className="px-4 py-1.5 border border-border-tech hover:border-primary-container/50 bg-surface-container-low text-on-surface font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD MEMBER MODAL ────────────────────────────────────────── */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-lg border border-border-tech shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-tech bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <UserPlus size={15} />
                </div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Add Member to {team.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest rounded-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="p-5 space-y-4 overflow-y-auto font-code-sm text-xs">
              <div>
                <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                  Select Employee <span className="text-error">*</span>
                </label>
                {nonEnrolledMembers.length === 0 ? (
                  <div className="p-3 bg-surface-container-lowest border border-border-tech text-on-surface-variant text-center rounded-sm text-xs">
                    All organization employees are already enrolled in this squad.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedUserIdToAdd}
                    onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  >
                    <option value="">-- Choose active employee --</option>
                    {nonEnrolledMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name || m.email} &bull; {m.job_role_name || m.job_title || "Employee"} ({m.department || "Engineering"})
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[10px] text-on-surface-variant/70 mt-1">
                  Select an employee from the existing People directory. Job roles and AI workforces are preserved.
                </p>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 font-code-sm text-[11px]">
                  Role in Squad
                </label>
                <select
                  value={selectedRoleInTeam}
                  onChange={(e) => setSelectedRoleInTeam(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                >
                  {TEAM_ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !selectedUserIdToAdd}
                  className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REMOVE MEMBER CONFIRMATION MODAL ────────────────────────── */}
      {removingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-md border border-rose-500/40 shadow-2xl overflow-hidden rounded-sm">
            <div className="p-5 border-b border-border-tech bg-surface-container-lowest flex items-center gap-3">
              <div className="p-2 rounded-sm bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Remove from Squad
                </h3>
                <p className="font-code-sm text-xs text-on-surface-variant">
                  {removingMember.name}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4 font-code-sm text-xs text-on-surface-variant">
              <p className="text-on-surface">
                Are you sure you want to remove <strong>&quot;{removingMember.name}&quot;</strong> from <strong>{team.name}</strong>?
              </p>

              {team.team_lead_id === removingMember.user_id && (
                <div className="p-3 border border-amber-500/40 bg-amber-500/10 text-amber-300 rounded-sm">
                  <div className="font-bold text-amber-400">Team Lead Alert</div>
                  <div className="text-[11px] mt-0.5">
                    This member is currently the designated Team Lead. Removing them will clear the lead reference until a new lead is chosen.
                  </div>
                </div>
              )}

              <div className="p-3 border border-border-tech bg-surface-container-lowest rounded-sm space-y-1 text-[11px]">
                <div className="font-semibold text-primary-container">
                  Preservation Guarantee:
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-on-surface-variant/80">
                  <li>User profile and employee account will NOT be deleted</li>
                  <li>Job role assignment remains active</li>
                  <li>AI Workforce / AgentGroup remains intact</li>
                </ul>
              </div>
            </div>

            <div className="p-4 border-t border-border-tech bg-surface-container-lowest flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRemovingMember(null)}
                disabled={isSaving}
                className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-low text-on-surface-variant font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMemberSubmit}
                disabled={isSaving}
                className="px-4 py-2 border border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-code-sm text-xs font-semibold rounded-sm transition-all cursor-pointer shadow-sm"
              >
                {isSaving ? "Removing..." : "Confirm Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE / ARCHIVE TEAM MODAL ─────────────────────────────── */}
      {isDeleteModalOpen && (
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
                  {team.name}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4 font-code-sm text-xs text-on-surface-variant">
              {team.members && team.members.length > 0 && (
                <div className="p-3 border border-amber-500/40 bg-amber-500/10 text-amber-300 rounded-sm flex items-start gap-2.5">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <div className="font-bold text-amber-400">Active Member Warning</div>
                    <div className="text-[11px] mt-0.5">
                      This team currently contains <strong>{team.members.length} member(s)</strong>.
                    </div>
                  </div>
                </div>
              )}

              <p className="text-on-surface">
                Are you sure you want to archive the team <strong>&quot;{team.name}&quot;</strong>?
              </p>
            </div>

            <div className="p-4 border-t border-border-tech bg-surface-container-lowest flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isSaving}
                className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-low text-on-surface-variant font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveTeam}
                disabled={isSaving}
                className="px-4 py-2 border border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-code-sm text-xs font-semibold rounded-sm transition-all cursor-pointer shadow-sm"
              >
                {isSaving ? "Archiving..." : "Confirm Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT TEAM MODAL ─────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-low w-full max-w-lg border border-border-tech shadow-2xl overflow-hidden flex flex-col max-h-[90vh] rounded-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-tech bg-surface-container-lowest">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <Edit2 size={15} />
                </div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Edit Squad Configuration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest rounded-sm cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditTeamSubmit} className="p-5 space-y-4 overflow-y-auto font-code-sm text-xs">
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

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant font-code-sm text-xs rounded-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
