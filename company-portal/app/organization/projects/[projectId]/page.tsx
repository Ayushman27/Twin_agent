"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { projectService } from "@/services/project.service";
import { teamService } from "@/services/team.service";
import { organizationService, DetailedMember } from "@shared/services/organization.service";
import type { Team, TeamDetail } from "@shared/types/team";
import type {
  ConnectGithubPayload,
  ConnectJiraPayload,
  MilestoneHealthItem,
  MilestoneHealthStatus,
  ProjectAIWorkforceResponse,
  ProjectDeliveryAnalyticsResponse,
  ProjectDetail,
  ProjectHealthDiagnosticsResponse,
  ProjectHealthStatus,
  ProjectIntegration,
  ProjectMember,
  ProjectMemberCreatePayload,
  ProjectMemberUpdatePayload,
  ProjectMemberWorkforceItem,
  ProjectMilestone,
  ProjectMilestoneCreatePayload,
  ProjectMilestoneStatus,
  ProjectMilestoneUpdatePayload,
  ProjectPriority,
  ProjectRiskLevel,
  ProjectStatus,
  ProjectTask,
  ProjectTaskCreatePayload,
  ProjectTaskStatus,
  ProjectTaskUpdatePayload,
  ProjectUpdatePayload,
} from "@shared/types/project";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  ArrowLeft,
  Briefcase,
  Users,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  TrendingUp,
  ShieldAlert,
  FolderGit2,
  Bot,
  Cpu,
  Zap,
  Activity,
  Settings,
  CheckSquare,
  Milestone,
  GitBranch,
  Github,
  Trello,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ChevronRight,
  Sparkles,
  UserPlus,
  Crown,
  UserX,
  Plus,
  Filter,
  Check,
  Circle,
  AlertOctagon,
  Ban,
  Link2,
  Unlink,
  Lock,
} from "lucide-react";

type ProjectTab =
  | "overview"
  | "team"
  | "tasks"
  | "milestones"
  | "ai_workforce"
  | "integrations"
  | "health"
  | "settings";

const PROJECT_ROLE_PRESETS = [
  "Project Lead",
  "Tech Lead",
  "Architect",
  "Developer",
  "QA Specialist",
  "DevOps Engineer",
  "Contributor",
  "Reviewer",
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const { user, isLoading: isAuthLoading, isAuthenticated, isOrgAdmin } = useAuth();
  const orgId = user?.organization_id || user?.organizationId;

  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [aiWorkforce, setAiWorkforce] = useState<ProjectAIWorkforceResponse | null>(null);
  const [integrations, setIntegrations] = useState<ProjectIntegration[]>([]);
  const [healthData, setHealthData] = useState<ProjectHealthDiagnosticsResponse | null>(null);
  const [analyticsData, setAnalyticsData] = useState<ProjectDeliveryAnalyticsResponse | null>(null);
  const [assignedTeam, setAssignedTeam] = useState<TeamDetail | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [orgMembers, setOrgMembers] = useState<DetailedMember[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Task Filters
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("");
  const [taskMilestoneFilter, setTaskMilestoneFilter] = useState<string>("");
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>("");

  // Settings / Edit Form State
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

  // Integration Settings
  const [formGithubRepo, setFormGithubRepo] = useState("");
  const [formGithubBranch, setFormGithubBranch] = useState("main");
  const [formJiraKey, setFormJiraKey] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Member Management Modals
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<ProjectMember | null>(null);
  const [memberFormEmployeeId, setMemberFormEmployeeId] = useState("");
  const [memberFormProjectRole, setMemberFormProjectRole] = useState("Contributor");
  const [memberFormStatus, setMemberFormStatus] = useState("ACTIVE");
  const [isMemberSaving, setIsMemberSaving] = useState(false);

  // Milestone Modals & Form
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | null>(null);
  const [deletingMilestone, setDeletingMilestone] = useState<ProjectMilestone | null>(null);
  const [msFormName, setMsFormName] = useState("");
  const [msFormDesc, setMsFormDesc] = useState("");
  const [msFormStatus, setMsFormStatus] = useState<ProjectMilestoneStatus>("PLANNED");
  const [msFormPriority, setMsFormPriority] = useState<ProjectPriority>("MEDIUM");
  const [msFormStartDate, setMsFormStartDate] = useState("");
  const [msFormDueDate, setMsFormDueDate] = useState("");
  const [msFormProgress, setMsFormProgress] = useState(0);
  const [isMsSaving, setIsMsSaving] = useState(false);

  // Task Modals & Form
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<ProjectTask | null>(null);
  const [taskFormTitle, setTaskFormTitle] = useState("");
  const [taskFormDesc, setTaskFormDesc] = useState("");
  const [taskFormMilestoneId, setTaskFormMilestoneId] = useState("");
  const [taskFormAssigneeId, setTaskFormAssigneeId] = useState("");
  const [taskFormAgentGroupId, setTaskFormAgentGroupId] = useState("");
  const [taskFormStatus, setTaskFormStatus] = useState<ProjectTaskStatus>("TODO");
  const [taskFormPriority, setTaskFormPriority] = useState<ProjectPriority>("MEDIUM");
  const [taskFormDueDate, setTaskFormDueDate] = useState("");
  const [taskFormProgress, setTaskFormProgress] = useState(0);
  const [taskFormBlockedReason, setTaskFormBlockedReason] = useState("");
  const [isTaskSaving, setIsTaskSaving] = useState(false);

  // External Integration Modals & State
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [ghRepoUrl, setGhRepoUrl] = useState("");
  const [ghProjectName, setGhProjectName] = useState("");
  const [ghDefaultBranch, setGhDefaultBranch] = useState("main");
  const [ghAccessToken, setGhAccessToken] = useState("");
  const [isGhSaving, setIsGhSaving] = useState(false);

  const [isJiraModalOpen, setIsJiraModalOpen] = useState(false);
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [jiraProjectKey, setJiraProjectKey] = useState("");
  const [jiraProjectName, setJiraProjectName] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [isJiraSaving, setIsJiraSaving] = useState(false);

  const [syncingIntegrationId, setSyncingIntegrationId] = useState<string | null>(null);

  // Auto-hide success alert
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load project details, members, milestones, tasks, AI workforce, integrations, health, and delivery analytics
  const fetchProjectData = useCallback(
    async (isBackground = false) => {
      if (!orgId || !projectId) return;
      if (!isBackground) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const [
          projData,
          membersList,
          milestonesList,
          tasksList,
          aiWorkforceData,
          integrationsList,
          healthRes,
          analyticsRes,
          teamsRes,
          orgMembersRes,
        ] = await Promise.all([
          projectService.getProject(orgId, projectId),
          projectService.getProjectMembers(orgId, projectId).catch(() => []),
          projectService.getProjectMilestones(orgId, projectId).catch(() => []),
          projectService.getProjectTasks(orgId, projectId).catch(() => []),
          projectService.getProjectAIWorkforce(orgId, projectId).catch(() => null),
          projectService.getProjectIntegrations(orgId, projectId).catch(() => []),
          projectService.getProjectHealth(orgId, projectId).catch(() => null),
          projectService.getProjectAnalytics(orgId, projectId).catch(() => null),
          teamService.getTeams(orgId).catch(() => ({ teams: [], total: 0 })),
          organizationService.getDetailedMembers(orgId, "ACTIVE").catch(() => []),
        ]);

        setProject(projData);
        setProjectMembers(membersList || []);
        setMilestones(milestonesList || []);
        setTasks(tasksList || []);
        setAiWorkforce(aiWorkforceData);
        setIntegrations(integrationsList || []);
        setHealthData(healthRes);
        setAnalyticsData(analyticsRes);
        
        let activeMembers = (orgMembersRes || []).filter(
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


        // Initialize form state
        setFormName(projData.name);
        setFormCode(projData.project_code);
        setFormDesc(projData.description || "");
        setFormOwnerId(projData.owner_id || "");
        setFormTeamId(projData.team_id || "");
        setFormStatus(projData.status || "PLANNING");
        setFormPriority(projData.priority || "MEDIUM");
        setFormRiskLevel(projData.risk_level || "LOW");
        setFormStartDate(projData.start_date ? projData.start_date.slice(0, 10) : "");
        setFormTargetDate(projData.target_end_date ? projData.target_end_date.slice(0, 10) : "");
        setFormProgress(projData.progress_percent || 0);

        // Bindings
        const repoBindings = (projData.repository_bindings || {}) as any;
        setFormGithubRepo(repoBindings.repo_url || "");
        setFormGithubBranch(repoBindings.branch || "main");

        const jiraBindings = (projData.issue_tracker_bindings || {}) as any;
        setFormJiraKey(jiraBindings.project_key || "");

        // Load assigned team details if present
        if (projData.team_id) {
          try {
            const teamDetail = await teamService.getTeam(orgId, projData.team_id);
            setAssignedTeam(teamDetail);
          } catch {
            setAssignedTeam(null);
          }
        } else {
          setAssignedTeam(null);
        }
      } catch (err: any) {
        console.error("Failed to load project details:", err);
        setErrorMessage(
          err?.response?.data?.error?.message ||
            err?.message ||
            "Failed to load initiative details from backend service."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [orgId, projectId, user]
  );

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && orgId && projectId) {
      fetchProjectData();
    }
  }, [isAuthLoading, isAuthenticated, orgId, projectId, fetchProjectData]);

  // Handle Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !projectId) return;

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
        owner_id: formOwnerId || "",
        team_id: formTeamId || "",
        status: formStatus,
        priority: formPriority,
        risk_level: formRiskLevel,
        start_date: formStartDate ? new Date(formStartDate).toISOString() : undefined,
        target_end_date: formTargetDate ? new Date(formTargetDate).toISOString() : undefined,
        progress_percent: Number(formProgress) || 0,
        repository_bindings: formGithubRepo
          ? {
              provider: "github",
              repo_url: formGithubRepo.trim(),
              branch: formGithubBranch.trim() || "main",
              status: "connected",
            }
          : {},
        issue_tracker_bindings: formJiraKey
          ? {
              provider: "jira",
              project_key: formJiraKey.trim().toUpperCase(),
              status: "connected",
            }
          : {},
      };

      await projectService.updateProject(orgId, projectId, payload);
      setSuccessMessage("Project configuration saved successfully.");
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update project");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Project
  const handleDeleteProject = async () => {
    if (!orgId || !projectId) return;
    setIsDeleting(true);
    try {
      await projectService.deleteProject(orgId, projectId);
      router.push("/organization/projects");
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to delete project");
      setIsDeleting(false);
    }
  };

  // ── Member Operations ──────────────────────────────────────────
  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !projectId || !memberFormEmployeeId.trim()) return;

    setIsMemberSaving(true);
    try {
      const payload: ProjectMemberCreatePayload = {
        employee_id: memberFormEmployeeId.trim(),
        project_role: memberFormProjectRole.trim() || "Contributor",
        status: memberFormStatus,
      };

      await projectService.addProjectMember(orgId, projectId, payload);
      setIsAddMemberModalOpen(false);
      setMemberFormEmployeeId("");
      setMemberFormProjectRole("Contributor");
      setSuccessMessage("Member added to project successfully.");
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to add project member");
    } finally {
      setIsMemberSaving(false);
    }
  };

  const handleUpdateMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !projectId || !editingMember) return;

    setIsMemberSaving(true);
    try {
      const payload: ProjectMemberUpdatePayload = {
        project_role: memberFormProjectRole.trim() || "Contributor",
        status: memberFormStatus,
      };

      await projectService.updateProjectMember(orgId, projectId, editingMember.user_id, payload);
      setEditingMember(null);
      setSuccessMessage("Member role updated successfully.");
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update member role");
    } finally {
      setIsMemberSaving(false);
    }
  };

  const handleRemoveMemberSubmit = async () => {
    if (!orgId || !projectId || !deletingMember) return;

    setIsMemberSaving(true);
    try {
      await projectService.removeProjectMember(orgId, projectId, deletingMember.user_id);
      setDeletingMember(null);
      setSuccessMessage("Member removed from project.");
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to remove member");
    } finally {
      setIsMemberSaving(false);
    }
  };

  // ── Milestone Operations ───────────────────────────────────────
  const handleOpenCreateMilestone = () => {
    setEditingMilestone(null);
    setMsFormName("");
    setMsFormDesc("");
    setMsFormStatus("PLANNED");
    setMsFormPriority("MEDIUM");
    setMsFormStartDate("");
    setMsFormDueDate("");
    setMsFormProgress(0);
    setIsMilestoneModalOpen(true);
  };

  const handleOpenEditMilestone = (m: ProjectMilestone) => {
    setEditingMilestone(m);
    setMsFormName(m.name);
    setMsFormDesc(m.description || "");
    setMsFormStatus(m.status);
    setMsFormPriority(m.priority);
    setMsFormStartDate(m.start_date ? m.start_date.slice(0, 10) : "");
    setMsFormDueDate(m.due_date ? m.due_date.slice(0, 10) : "");
    setMsFormProgress(m.progress_percent || 0);
    setIsMilestoneModalOpen(true);
  };

  const handleSaveMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !projectId || !msFormName.trim()) return;

    if (msFormStartDate && msFormDueDate && msFormDueDate < msFormStartDate) {
      alert("Due Date must be on or after Start Date.");
      return;
    }

    setIsMsSaving(true);
    try {
      if (editingMilestone) {
        const payload: ProjectMilestoneUpdatePayload = {
          name: msFormName.trim(),
          description: msFormDesc.trim() || undefined,
          status: msFormStatus,
          priority: msFormPriority,
          start_date: msFormStartDate ? new Date(msFormStartDate).toISOString() : undefined,
          due_date: msFormDueDate ? new Date(msFormDueDate).toISOString() : undefined,
          progress_percent: Number(msFormProgress) || 0,
        };
        await projectService.updateProjectMilestone(orgId, projectId, editingMilestone.id, payload);
        setSuccessMessage("Milestone updated successfully.");
      } else {
        const payload: ProjectMilestoneCreatePayload = {
          name: msFormName.trim(),
          description: msFormDesc.trim() || undefined,
          status: msFormStatus,
          priority: msFormPriority,
          start_date: msFormStartDate ? new Date(msFormStartDate).toISOString() : undefined,
          due_date: msFormDueDate ? new Date(msFormDueDate).toISOString() : undefined,
          progress_percent: Number(msFormProgress) || 0,
        };
        await projectService.createProjectMilestone(orgId, projectId, payload);
        setSuccessMessage("Milestone created successfully.");
      }
      setIsMilestoneModalOpen(false);
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to save milestone");
    } finally {
      setIsMsSaving(false);
    }
  };

  const handleDeleteMilestoneSubmit = async () => {
    if (!orgId || !projectId || !deletingMilestone) return;
    setIsMsSaving(true);
    try {
      await projectService.deleteProjectMilestone(orgId, projectId, deletingMilestone.id);
      setDeletingMilestone(null);
      setSuccessMessage("Milestone deleted successfully.");
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to delete milestone");
    } finally {
      setIsMsSaving(false);
    }
  };

  // ── Task Operations ────────────────────────────────────────────
  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setTaskFormTitle("");
    setTaskFormDesc("");
    setTaskFormMilestoneId("");
    setTaskFormAssigneeId("");
    setTaskFormAgentGroupId("");
    setTaskFormStatus("TODO");
    setTaskFormPriority("MEDIUM");
    setTaskFormDueDate("");
    setTaskFormProgress(0);
    setTaskFormBlockedReason("");
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (t: ProjectTask) => {
    setEditingTask(t);
    setTaskFormTitle(t.title);
    setTaskFormDesc(t.description || "");
    setTaskFormMilestoneId(t.milestone_id || "");
    setTaskFormAssigneeId(t.assignee_id || "");
    setTaskFormAgentGroupId(t.assigned_agent_group_id || "");
    setTaskFormStatus(t.status);
    setTaskFormPriority(t.priority);
    setTaskFormDueDate(t.due_date ? t.due_date.slice(0, 10) : "");
    setTaskFormProgress(t.progress_percent || 0);
    setTaskFormBlockedReason(t.blocked_reason || "");
    setIsTaskModalOpen(true);
  };

  const handleSaveTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !projectId || !taskFormTitle.trim()) return;

    setIsTaskSaving(true);
    try {
      if (editingTask) {
        const payload: ProjectTaskUpdatePayload = {
          title: taskFormTitle.trim(),
          description: taskFormDesc.trim() || undefined,
          milestone_id: taskFormMilestoneId || undefined,
          assignee_id: taskFormAssigneeId || undefined,
          assigned_agent_group_id: taskFormAgentGroupId || undefined,
          status: taskFormStatus,
          priority: taskFormPriority,
          due_date: taskFormDueDate ? new Date(taskFormDueDate).toISOString() : undefined,
          progress_percent: Number(taskFormProgress) || 0,
          blocked_reason: taskFormStatus === "BLOCKED" ? taskFormBlockedReason.trim() || undefined : undefined,
        };
        await projectService.updateProjectTask(orgId, projectId, editingTask.id, payload);
        setSuccessMessage("Task updated successfully.");
      } else {
        const payload: ProjectTaskCreatePayload = {
          title: taskFormTitle.trim(),
          description: taskFormDesc.trim() || undefined,
          milestone_id: taskFormMilestoneId || undefined,
          assignee_id: taskFormAssigneeId || undefined,
          assigned_agent_group_id: taskFormAgentGroupId || undefined,
          status: taskFormStatus,
          priority: taskFormPriority,
          due_date: taskFormDueDate ? new Date(taskFormDueDate).toISOString() : undefined,
          progress_percent: Number(taskFormProgress) || 0,
          blocked_reason: taskFormStatus === "BLOCKED" ? taskFormBlockedReason.trim() || undefined : undefined,
        };
        await projectService.createProjectTask(orgId, projectId, payload);
        setSuccessMessage("Task created successfully.");
      }
      setIsTaskModalOpen(false);
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to save task");
    } finally {
      setIsTaskSaving(false);
    }
  };

  // ── Integration Operations ────────────────────────────────────
  const handleOpenConnectGithub = () => {
    const existing = integrations.find((i) => i.provider === "GITHUB");
    setGhRepoUrl(existing?.repository_url || formGithubRepo || "");
    setGhProjectName(existing?.external_project_name || "");
    setGhDefaultBranch(existing?.config?.default_branch || formGithubBranch || "main");
    setGhAccessToken("");
    setIsGithubModalOpen(true);
  };

  const handleConnectGithubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !projectId || !ghRepoUrl.trim()) return;

    setIsGhSaving(true);
    try {
      const payload: ConnectGithubPayload = {
        repository_url: ghRepoUrl.trim(),
        external_project_name: ghProjectName.trim() || undefined,
        default_branch: ghDefaultBranch.trim() || "main",
        access_token: ghAccessToken.trim() || undefined,
      };
      await projectService.connectGithub(orgId, projectId, payload);
      setSuccessMessage("GitHub repository connected successfully.");
      setIsGithubModalOpen(false);
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to connect GitHub");
    } finally {
      setIsGhSaving(false);
    }
  };

  const handleDisconnectGithub = async () => {
    if (!orgId || !projectId) return;
    if (!confirm("Are you sure you want to disconnect this GitHub repository?")) return;
    try {
      await projectService.disconnectGithub(orgId, projectId);
      setSuccessMessage("GitHub repository disconnected.");
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to disconnect GitHub");
    }
  };

  const handleOpenConnectJira = () => {
    const existing = integrations.find((i) => i.provider === "JIRA");
    setJiraBaseUrl(existing?.base_url || "");
    setJiraProjectKey(existing?.external_project_id || formJiraKey || "");
    setJiraProjectName(existing?.external_project_name || "");
    setJiraApiToken("");
    setIsJiraModalOpen(true);
  };

  const handleConnectJiraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !projectId || !jiraBaseUrl.trim() || !jiraProjectKey.trim()) return;

    setIsJiraSaving(true);
    try {
      const payload: ConnectJiraPayload = {
        base_url: jiraBaseUrl.trim(),
        project_key: jiraProjectKey.trim().toUpperCase(),
        external_project_name: jiraProjectName.trim() || undefined,
        api_token: jiraApiToken.trim() || undefined,
      };
      await projectService.connectJira(orgId, projectId, payload);
      setSuccessMessage("Jira project tracker connected successfully.");
      setIsJiraModalOpen(false);
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to connect Jira");
    } finally {
      setIsJiraSaving(false);
    }
  };

  const handleDisconnectJira = async () => {
    if (!orgId || !projectId) return;
    if (!confirm("Are you sure you want to disconnect this Jira project tracker?")) return;
    try {
      await projectService.disconnectJira(orgId, projectId);
      setSuccessMessage("Jira project tracker disconnected.");
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to disconnect Jira");
    }
  };

  const handleSyncIntegration = async (integrationId: string) => {
    if (!orgId || !projectId) return;
    setSyncingIntegrationId(integrationId);
    try {
      await projectService.syncProjectIntegration(orgId, projectId, integrationId);
      setSuccessMessage("Integration status synced successfully.");
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to sync integration");
    } finally {
      setSyncingIntegrationId(null);
    }
  };

  const handleDeleteTaskSubmit = async () => {
    if (!orgId || !projectId || !deletingTask) return;
    setIsTaskSaving(true);
    try {
      await projectService.deleteProjectTask(orgId, projectId, deletingTask.id);
      setDeletingTask(null);
      setSuccessMessage("Task deleted successfully.");
      await fetchProjectData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to delete task");
    } finally {
      setIsTaskSaving(false);
    }
  };



  // Format Date Helper
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

  if (isAuthLoading || (isLoading && !project)) {
    return <LoadingState label="Loading project hub, tasks, and delivery milestones..." />;
  }

  if (errorMessage && !project) {
    return (
      <div className="p-8 border border-border-tech bg-surface-container-low text-center rounded-sm">
        <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
        <h2 className="font-display-xl text-lg text-on-surface font-semibold">
          Initiative Not Found
        </h2>
        <p className="font-code-sm text-xs text-on-surface-variant mt-1">{errorMessage}</p>
        <Link
          href="/organization/projects"
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-tech text-primary-container font-code-sm text-xs rounded-sm hover:border-primary-container"
        >
          <ArrowLeft size={13} />
          <span>Back to Projects Directory</span>
        </Link>
      </div>
    );
  }

  if (!project) return null;

  const progress = project.progress_percent || 0;
  const enrolledUserIds = new Set(projectMembers.map((m) => m.user_id));
  const availableOrgMembers = orgMembers.filter((m) => !enrolledUserIds.has(m.user_id));

  // Filtered tasks
  const filteredTasks = tasks.filter((t) => {
    if (taskStatusFilter && t.status !== taskStatusFilter) return false;
    if (taskMilestoneFilter && t.milestone_id !== taskMilestoneFilter) return false;
    if (taskAssigneeFilter && t.assignee_id !== taskAssigneeFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up pb-16">
      {/* ── SUCCESS NOTIFICATION BANNER ──────────────────────────────── */}
      {successMessage && (
        <div className="p-3 border border-primary-container/50 bg-primary-container/10 text-primary-container font-code-sm text-xs flex items-center gap-2 rounded-sm animate-fade-in">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── BREADCRUMB & BACK ────────────────────────────────────────── */}
      <div className="flex items-center gap-2 font-code-sm text-xs text-on-surface-variant">
        <Link
          href="/organization/projects"
          className="hover:text-primary-container flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={13} />
          <span>Projects Directory</span>
        </Link>
        <span>/</span>
        <span className="text-on-surface font-semibold">{project.name}</span>
        <span className="px-1.5 py-0.2 rounded bg-surface-container-lowest border border-border-tech text-[10px] font-mono text-primary-container">
          {project.project_code}
        </span>
      </div>

      {/* ── HEADER & TOP STATUS SUMMARY ─────────────────────────────── */}
      <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-sm bg-surface-container-lowest border border-border-tech text-primary-container shrink-0 mt-0.5">
            <Briefcase size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display-xl text-xl sm:text-2xl text-on-surface font-bold">
                {project.name}
              </h1>
              <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-border-tech text-xs font-mono text-primary-container font-semibold">
                {project.project_code}
              </span>

              {/* Status Badge */}
              <span
                className={`px-2 py-0.5 rounded-sm text-[11px] font-bold uppercase ${
                  project.status === "ACTIVE"
                    ? "bg-primary-container/10 text-primary-container border border-primary-container/40"
                    : project.status === "COMPLETED"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/40"
                    : project.status === "PLANNING"
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/40"
                    : project.status === "ON_HOLD"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/40"
                    : "bg-surface-container-lowest text-on-surface-variant border border-border-tech"
                }`}
              >
                {project.status.replace("_", " ")}
              </span>

              {/* Priority Badge */}
              <span
                className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                  project.priority === "CRITICAL"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    : project.priority === "HIGH"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : "bg-surface-container-lowest text-on-surface border border-border-tech"
                }`}
              >
                {project.priority} Priority
              </span>

              {/* Risk Badge */}
              <span
                className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                  project.risk_level === "CRITICAL"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/40"
                    : project.risk_level === "HIGH"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/40"
                    : project.risk_level === "MEDIUM"
                    ? "bg-yellow-500/10 text-yellow-300 border border-yellow-500/40"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/40"
                }`}
              >
                {project.risk_level} Risk
              </span>
            </div>

            <p className="font-code-sm text-xs text-on-surface-variant mt-1.5 max-w-3xl">
              {project.description || "No project description provided."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            type="button"
            onClick={() => fetchProjectData(true)}
            disabled={isRefreshing}
            className="px-3 py-1.5 border border-border-tech hover:border-primary-container/50 bg-surface-container-lowest text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw
              size={13}
              className={isRefreshing ? "animate-spin text-primary-container" : ""}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── TAB NAVIGATION ─────────────────────────────────────────── */}
      <div className="flex overflow-x-auto border-b border-border-tech gap-1 font-code-sm text-xs">
        {[
          { id: "overview", label: "Overview", icon: Layers },
          { id: "team", label: `Team (${projectMembers.length})`, icon: Users },
          { id: "tasks", label: `Tasks (${tasks.length})`, icon: CheckSquare },
          { id: "milestones", label: `Milestones (${milestones.length})`, icon: Milestone },
          { id: "ai_workforce", label: "AI Workforce", icon: Bot },
          { id: "integrations", label: "Integrations", icon: FolderGit2 },
          { id: "health", label: "Health", icon: Activity },
          { id: "settings", label: "Settings", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ProjectTab)}
              className={`px-3.5 py-2.5 font-medium border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                isActive
                  ? "border-primary-container text-primary-container bg-primary-container/5"
                  : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-border-tech"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: OVERVIEW & DELIVERY ANALYTICS ───────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-in font-code-sm">
          {/* ── 1. OVERVIEW METRICS CARDS (7 KPI CARDS) ────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {/* Progress Card */}
            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                  Progress
                </div>
                <div className="text-2xl font-bold text-primary-container font-mono">
                  {analyticsData?.progress_percent ?? progress}%
                </div>
              </div>
              <div className="space-y-1 mt-2">
                <div className="w-full h-1.5 bg-surface-container-lowest rounded-full overflow-hidden border border-border-tech/50">
                  <div
                    className="h-full bg-primary-container transition-all duration-300"
                    style={{ width: `${analyticsData?.progress_percent ?? progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-on-surface-variant/80 block truncate">
                  Status: {project.status}
                </span>
              </div>
            </div>

            {/* Risk Card */}
            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                  Risk Level
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded-sm text-xs font-bold uppercase ${
                      (analyticsData?.risk.current_risk || project.risk_level) === "CRITICAL"
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/40"
                        : (analyticsData?.risk.current_risk || project.risk_level) === "HIGH"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/40"
                        : (analyticsData?.risk.current_risk || project.risk_level) === "MEDIUM"
                        ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/40"
                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                    }`}
                  >
                    {analyticsData?.risk.current_risk || project.risk_level}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-on-surface-variant/70 mt-2 truncate">
                Priority: {project.priority}
              </div>
            </div>

            {/* Health Card */}
            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Health</span>
                  <Activity size={12} className="text-primary-container" />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {(() => {
                    const health = analyticsData?.health_status || healthData?.overall_health || "HEALTHY";
                    if (health === "CRITICAL") {
                      return (
                        <span className="px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          <span>CRITICAL</span>
                        </span>
                      );
                    }
                    if (health === "AT_RISK") {
                      return (
                        <span className="px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/40 flex items-center gap-1">
                          <AlertCircle size={12} />
                          <span>AT RISK</span>
                        </span>
                      );
                    }
                    return (
                      <span className="px-2 py-0.5 rounded-sm text-xs font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        <span>HEALTHY</span>
                      </span>
                    );
                  })()}
                </div>
              </div>
              <p className="text-[10px] text-on-surface-variant/80 mt-2 truncate">
                {healthData?.health_reasons?.[0] || "All tracks nominal"}
              </p>
            </div>

            {/* Tasks Card */}
            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Tasks</span>
                  <CheckSquare size={12} className="text-primary-container" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold font-mono text-on-surface">
                    {analyticsData?.tasks.completed ?? tasks.filter((t) => t.status === "DONE").length}
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">
                    / {analyticsData?.tasks.total ?? tasks.length}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-primary-container font-semibold mt-2">
                {analyticsData?.tasks.completion_rate ?? 0}% Complete
              </div>
            </div>

            {/* Milestones Card */}
            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Milestones</span>
                  <Milestone size={12} className="text-primary-container" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold font-mono text-on-surface">
                    {analyticsData?.milestones.completed ?? milestones.filter((m) => m.status === "COMPLETED" || m.progress_percent === 100).length}
                  </span>
                  <span className="text-xs text-on-surface-variant font-mono">
                    / {analyticsData?.milestones.total ?? milestones.length}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-on-surface-variant/80 mt-2 truncate">
                {(analyticsData?.milestones.blocked ?? 0) > 0
                  ? `${analyticsData?.milestones.blocked} Blocked`
                  : (analyticsData?.milestones.overdue ?? 0) > 0
                  ? `${analyticsData?.milestones.overdue} Overdue`
                  : "On Schedule"}
              </div>
            </div>

            {/* Team Members Card */}
            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm flex flex-col justify-between">
              <div>
                <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Team</span>
                  <Users size={12} className="text-primary-container" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold font-mono text-on-surface">
                    {analyticsData?.team.members_count ?? projectMembers.length}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">Members</span>
                </div>
              </div>
              <div className="text-[10px] text-on-surface-variant/80 mt-2 truncate">
                {analyticsData?.team.team_name || (assignedTeam ? assignedTeam.name : "No Squad Assigned")}
              </div>
            </div>

            {/* AI Workforces Card */}
            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm flex flex-col justify-between col-span-2 sm:col-span-1">
              <div>
                <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>AI Workforce</span>
                  <Bot size={12} className="text-primary-container" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold font-mono text-primary-container">
                    {analyticsData?.team.active_workforces ?? aiWorkforce?.active_workforces ?? 0}
                  </span>
                  <span className="text-[11px] text-on-surface-variant">Active</span>
                </div>
              </div>
              <div className="text-[10px] text-on-surface-variant/80 mt-2 truncate">
                {analyticsData?.team.total_agents ?? aiWorkforce?.total_agents ?? 0} Total Agents
              </div>
            </div>
          </div>

          {/* ── 2. TIMELINE & SCHEDULE ANALYSIS ───────────────────────── */}
          <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-tech/60 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
                  <Calendar size={15} className="text-primary-container" />
                  <span>Project Delivery Timeline &amp; Schedule Analysis</span>
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Real-time schedule tracking comparing elapsed timeframe against actual work deliverables completed.
                </p>
              </div>

              {analyticsData?.timeline?.days_remaining !== undefined && analyticsData?.timeline?.days_remaining !== null ? (
                <div className="flex items-center gap-2">
                  {analyticsData.timeline.is_overdue ? (
                    <span className="px-2.5 py-1 rounded-sm text-xs font-bold font-mono bg-rose-500/15 text-rose-400 border border-rose-500/40">
                      Overdue by {Math.abs(analyticsData.timeline.days_remaining)} Days
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-sm text-xs font-bold font-mono bg-primary-container/10 text-primary-container border border-primary-container/30">
                      {analyticsData.timeline.days_remaining} Days Remaining
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-on-surface-variant">Timeline N/A</span>
              )}
            </div>

            {project.start_date || project.target_end_date ? (
              <div className="space-y-4">
                {/* Timeline Progress Bar & Key Markers */}
                <div className="relative pt-6 pb-2">
                  {/* Timeline Range Bar */}
                  <div className="w-full h-2 bg-surface-container-lowest rounded-full overflow-hidden border border-border-tech/60 relative">
                    <div
                      className={`h-full transition-all duration-300 ${
                        analyticsData?.timeline?.is_overdue
                          ? "bg-rose-500"
                          : "bg-gradient-to-r from-primary-container to-emerald-400"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          analyticsData?.timeline?.time_elapsed_percent ?? 0
                        )}%`,
                      }}
                    />
                  </div>

                  {/* Start, Today, and End Markers */}
                  <div className="flex items-center justify-between text-xs mt-3">
                    <div>
                      <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">
                        Project Start
                      </span>
                      <span className="font-semibold text-on-surface font-mono">
                        {formatDate(project.start_date)}
                      </span>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-primary-container font-semibold block uppercase tracking-wider">
                        Current Date
                      </span>
                      <span className="font-semibold text-primary-container font-mono">
                        Today ({formatDate(new Date().toISOString())})
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-on-surface-variant block uppercase tracking-wider">
                        Target Completion
                      </span>
                      <span
                        className={`font-semibold font-mono ${
                          analyticsData?.timeline?.is_overdue ? "text-rose-400" : "text-on-surface"
                        }`}
                      >
                        {formatDate(project.target_end_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comparative Schedule vs Work Metric Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border-tech/40 text-xs">
                  <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm">
                    <span className="text-[11px] text-on-surface-variant block mb-0.5">
                      Schedule Duration Elapsed
                    </span>
                    <span className="text-base font-bold text-on-surface font-mono">
                      {analyticsData?.timeline?.time_elapsed_percent !== null && analyticsData?.timeline?.time_elapsed_percent !== undefined
                        ? `${analyticsData.timeline.time_elapsed_percent}%`
                        : "N/A"}{" "}
                      <span className="text-xs font-normal text-on-surface-variant">
                        ({analyticsData?.timeline?.days_elapsed ?? "N/A"} / {analyticsData?.timeline?.days_total ?? "N/A"} Days)
                      </span>
                    </span>
                  </div>

                  <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm">
                    <span className="text-[11px] text-on-surface-variant block mb-0.5">
                      Work Progress Completed
                    </span>
                    <span className="text-base font-bold text-primary-container font-mono">
                      {analyticsData?.progress_percent ?? progress}%{" "}
                      <span className="text-xs font-normal text-on-surface-variant">
                        ({analyticsData?.tasks.completed ?? 0} / {analyticsData?.tasks.total ?? 0} Tasks)
                      </span>
                    </span>
                  </div>

                  <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm">
                    <span className="text-[11px] text-on-surface-variant block mb-0.5">
                      Schedule Alignment
                    </span>
                    {(() => {
                      const elapsed = analyticsData?.timeline?.time_elapsed_percent;
                      const prog = analyticsData?.progress_percent ?? progress;
                      if (elapsed === null || elapsed === undefined) {
                        return <span className="text-on-surface-variant font-semibold">Not enough data</span>;
                      }
                      if (analyticsData?.timeline?.is_overdue) {
                        return <span className="text-rose-400 font-bold">Overdue Deadline</span>;
                      }
                      if (elapsed > prog + 20) {
                        return <span className="text-amber-400 font-bold">Behind Schedule ({elapsed - prog}% Lag)</span>;
                      }
                      return <span className="text-emerald-400 font-bold">On Track with Roadmap</span>;
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-surface-container-lowest border border-dashed border-border-tech rounded-sm text-center text-xs text-on-surface-variant">
                Not enough data — Start and Target End dates must be configured in Settings to generate schedule analytics.
              </div>
            )}
          </div>

          {/* ── 3. DELIVERY & MILESTONES BREAKDOWN MATRIX ──────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Delivery Tasks Status */}
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-on-surface flex items-center gap-2">
                    <CheckSquare size={15} className="text-primary-container" />
                    <span>Delivery Tasks Breakdown</span>
                  </h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Aggregated task execution states across all work milestones.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-sm text-xs font-mono font-bold bg-surface-container-lowest border border-border-tech text-on-surface">
                  {analyticsData?.tasks.total ?? tasks.length} Total Tasks
                </span>
              </div>

              {/* Segmented Distribution Bar */}
              {((analyticsData?.tasks.total ?? tasks.length) > 0) ? (
                <div className="space-y-3">
                  <div className="w-full h-2.5 bg-surface-container-lowest rounded-full overflow-hidden flex border border-border-tech/60">
                    <div
                      className="bg-emerald-400 transition-all"
                      style={{
                        width: `${((analyticsData?.tasks.completed ?? 0) / (analyticsData?.tasks.total || 1)) * 100}%`,
                      }}
                      title={`Completed: ${analyticsData?.tasks.completed}`}
                    />
                    <div
                      className="bg-sky-400 transition-all"
                      style={{
                        width: `${((analyticsData?.tasks.in_progress ?? 0) / (analyticsData?.tasks.total || 1)) * 100}%`,
                      }}
                      title={`In Progress: ${analyticsData?.tasks.in_progress}`}
                    />
                    <div
                      className="bg-rose-500 transition-all"
                      style={{
                        width: `${((analyticsData?.tasks.blocked ?? 0) / (analyticsData?.tasks.total || 1)) * 100}%`,
                      }}
                      title={`Blocked: ${analyticsData?.tasks.blocked}`}
                    />
                    <div
                      className="bg-amber-400 transition-all"
                      style={{
                        width: `${((analyticsData?.tasks.overdue ?? 0) / (analyticsData?.tasks.total || 1)) * 100}%`,
                      }}
                      title={`Overdue: ${analyticsData?.tasks.overdue}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-surface-container-lowest border border-border-tech rounded-sm">
                      <span className="text-[10px] text-emerald-400 font-semibold block uppercase">
                        Completed
                      </span>
                      <span className="text-lg font-bold font-mono text-on-surface">
                        {analyticsData?.tasks.completed ?? 0}
                      </span>
                    </div>

                    <div className="p-2.5 bg-surface-container-lowest border border-border-tech rounded-sm">
                      <span className="text-[10px] text-sky-400 font-semibold block uppercase">
                        In Progress
                      </span>
                      <span className="text-lg font-bold font-mono text-on-surface">
                        {analyticsData?.tasks.in_progress ?? 0}
                      </span>
                    </div>

                    <div className="p-2.5 bg-surface-container-lowest border border-border-tech rounded-sm">
                      <span className="text-[10px] text-rose-400 font-semibold block uppercase">
                        Blocked
                      </span>
                      <span className="text-lg font-bold font-mono text-rose-400">
                        {analyticsData?.tasks.blocked ?? 0}
                      </span>
                    </div>

                    <div className="p-2.5 bg-surface-container-lowest border border-border-tech rounded-sm">
                      <span className="text-[10px] text-amber-400 font-semibold block uppercase">
                        Overdue
                      </span>
                      <span className="text-lg font-bold font-mono text-amber-400">
                        {analyticsData?.tasks.overdue ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-surface-container-lowest border border-dashed border-border-tech rounded-sm text-center text-xs text-on-surface-variant">
                  No tasks created yet for this project initiative.
                </div>
              )}
            </div>

            {/* Milestones Delivery Status */}
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-on-surface flex items-center gap-2">
                    <Milestone size={15} className="text-primary-container" />
                    <span>Milestones Breakdown</span>
                  </h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Progress indicators and status distribution across key roadmap gates.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-sm text-xs font-mono font-bold bg-surface-container-lowest border border-border-tech text-on-surface">
                  {analyticsData?.milestones.total ?? milestones.length} Total Milestones
                </span>
              </div>

              {((analyticsData?.milestones.total ?? milestones.length) > 0) ? (
                <div className="space-y-3">
                  <div className="w-full h-2.5 bg-surface-container-lowest rounded-full overflow-hidden flex border border-border-tech/60">
                    <div
                      className="bg-emerald-400 transition-all"
                      style={{
                        width: `${((analyticsData?.milestones.completed ?? 0) / (analyticsData?.milestones.total || 1)) * 100}%`,
                      }}
                      title={`Completed: ${analyticsData?.milestones.completed}`}
                    />
                    <div
                      className="bg-sky-400 transition-all"
                      style={{
                        width: `${((analyticsData?.milestones.in_progress ?? 0) / (analyticsData?.milestones.total || 1)) * 100}%`,
                      }}
                      title={`In Progress: ${analyticsData?.milestones.in_progress}`}
                    />
                    <div
                      className="bg-rose-500 transition-all"
                      style={{
                        width: `${((analyticsData?.milestones.blocked ?? 0) / (analyticsData?.milestones.total || 1)) * 100}%`,
                      }}
                      title={`Blocked: ${analyticsData?.milestones.blocked}`}
                    />
                    <div
                      className="bg-amber-400 transition-all"
                      style={{
                        width: `${((analyticsData?.milestones.overdue ?? 0) / (analyticsData?.milestones.total || 1)) * 100}%`,
                      }}
                      title={`Overdue: ${analyticsData?.milestones.overdue}`}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-surface-container-lowest border border-border-tech rounded-sm">
                      <span className="text-[10px] text-emerald-400 font-semibold block uppercase">
                        Completed
                      </span>
                      <span className="text-lg font-bold font-mono text-on-surface">
                        {analyticsData?.milestones.completed ?? 0}
                      </span>
                    </div>

                    <div className="p-2.5 bg-surface-container-lowest border border-border-tech rounded-sm">
                      <span className="text-[10px] text-sky-400 font-semibold block uppercase">
                        In Progress
                      </span>
                      <span className="text-lg font-bold font-mono text-on-surface">
                        {analyticsData?.milestones.in_progress ?? 0}
                      </span>
                    </div>

                    <div className="p-2.5 bg-surface-container-lowest border border-border-tech rounded-sm">
                      <span className="text-[10px] text-rose-400 font-semibold block uppercase">
                        Blocked
                      </span>
                      <span className="text-lg font-bold font-mono text-rose-400">
                        {analyticsData?.milestones.blocked ?? 0}
                      </span>
                    </div>

                    <div className="p-2.5 bg-surface-container-lowest border border-border-tech rounded-sm">
                      <span className="text-[10px] text-amber-400 font-semibold block uppercase">
                        Overdue
                      </span>
                      <span className="text-lg font-bold font-mono text-amber-400">
                        {analyticsData?.milestones.overdue ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-surface-container-lowest border border-dashed border-border-tech rounded-sm text-center text-xs text-on-surface-variant">
                  No milestones configured yet for this initiative.
                </div>
              )}
            </div>
          </div>

          {/* ── 4. RISK ANALYSIS & DRIVING FACTORS ────────────────────── */}
          <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-tech/60 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
                  <ShieldAlert size={15} className="text-amber-400" />
                  <span>Risk Analysis &amp; Driving Factors</span>
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Dynamic risk factors generated from actual task blockers, overdue work items, and schedule metrics.
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-sm text-xs font-bold uppercase ${
                  (analyticsData?.risk.current_risk || project.risk_level) === "CRITICAL"
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/40"
                    : (analyticsData?.risk.current_risk || project.risk_level) === "HIGH"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/40"
                    : (analyticsData?.risk.current_risk || project.risk_level) === "MEDIUM"
                    ? "bg-yellow-500/15 text-yellow-300 border border-yellow-500/40"
                    : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                }`}
              >
                {(analyticsData?.risk.current_risk || project.risk_level)} Risk
              </span>
            </div>

            {analyticsData?.risk.risk_factors && analyticsData.risk.risk_factors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {analyticsData.risk.risk_factors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface-container-lowest border border-amber-500/30 rounded-sm flex items-start gap-2 text-xs text-on-surface"
                  >
                    <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-surface-container-lowest border border-border-tech/80 rounded-sm text-xs text-on-surface-variant flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                <span>Zero active risk factors detected. Project timeline and task execution are fully on track.</span>
              </div>
            )}
          </div>

          {/* ── 5. AI DELIVERY TRACK ──────────────────────────────────── */}
          <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border-tech/60 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
                  <Bot size={15} className="text-primary-container" />
                  <span>AI Delivery Track</span>
                </h3>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Autonomous delivery tracks mapped directly to enrolled project members and their provisioned AgentGroups.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("ai_workforce")}
                className="text-xs text-primary-container hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Manage Workforce</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {analyticsData?.ai_tracks && analyticsData.ai_tracks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {analyticsData.ai_tracks.map((track, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-surface-container-lowest border border-border-tech rounded-sm space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-semibold text-xs text-on-surface">{track.track_name}</h5>
                          <span className="text-[10px] text-on-surface-variant">{track.department || "General"}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono bg-primary-container/10 text-primary-container border border-primary-container/30">
                          {track.agent_count} {track.agent_count === 1 ? "Agent" : "Agents"}
                        </span>
                      </div>

                      {/* Enrolled Team Members */}
                      <div className="space-y-1">
                        <span className="text-[10px] text-on-surface-variant font-semibold block uppercase">
                          Enrolled Members ({track.employee_count})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {track.members.map((m, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 bg-surface-container-low border border-border-tech/60 rounded text-[10px] text-on-surface"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bound AgentGroups */}
                      {track.agent_groups.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-on-surface-variant font-semibold block uppercase">
                            Bound AgentGroups
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {track.agent_groups.map((g, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-primary-container/5 border border-primary-container/20 rounded text-[10px] text-primary-container font-mono"
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Capability Tags */}
                    {track.capabilities.length > 0 && (
                      <div className="pt-2 border-t border-border-tech/40">
                        <span className="text-[10px] text-on-surface-variant block mb-1">Active Capabilities:</span>
                        <div className="flex flex-wrap gap-1">
                          {track.capabilities.slice(0, 4).map((cap, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface-container-low text-on-surface-variant"
                            >
                              {cap}
                            </span>
                          ))}
                          {track.capabilities.length > 4 && (
                            <span className="text-[9px] text-on-surface-variant/70 font-mono">
                              +{track.capabilities.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 bg-surface-container-lowest border border-dashed border-border-tech rounded-sm text-center text-xs text-on-surface-variant space-y-1">
                <Bot size={20} className="text-on-surface-variant mx-auto mb-1 opacity-60" />
                <p className="font-semibold text-on-surface">Not enough data</p>
                <p className="text-[11px] text-on-surface-variant/70">
                  No AI Workforces are currently provisioned for the project members. Assign roles and provision workforces in People / Roles.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: TEAM & MEMBERS ───────────────────────────────────── */}
      {activeTab === "team" && (
        <div className="space-y-5 animate-fade-in font-code-sm text-xs">
          {/* Squad Card */}
          {assignedTeam ? (
            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-0.5">
                  Assigned Delivery Squad
                </div>
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <Users size={16} className="text-primary-container" />
                    <span>{assignedTeam.name}</span>
                    <span className="text-xs font-normal text-on-surface-variant">
                      ({assignedTeam.department || "General"})
                    </span>
                  </h3>
                  {assignedTeam.team_lead && (
                    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant border-l border-border-tech pl-3">
                      <Crown size={13} className="text-amber-400" />
                      <span>Lead:</span>
                      <strong className="text-on-surface">{assignedTeam.team_lead.name || assignedTeam.team_lead.email}</strong>
                    </div>
                  )}
                </div>
              </div>
              <Link
                href={`/organization/teams/${assignedTeam.id}`}
                className="px-3 py-1.5 border border-border-tech hover:border-primary-container bg-surface-container-lowest text-primary-container rounded-sm flex items-center gap-1.5 transition-colors"
              >
                <span>View Squad Hub</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="border border-border-tech bg-surface-container-low p-6 text-center rounded-sm">
              <Users className="w-8 h-8 text-on-surface-variant/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-on-surface">No Squad Assigned</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Assign an organizational team in the Settings tab to link delivery capacity.
              </p>
            </div>
          )}

          {/* Members Table */}
          <div className="border border-border-tech bg-surface-container-low rounded-sm overflow-hidden">
            <div className="p-3.5 border-b border-border-tech bg-surface-container-lowest flex items-center justify-between">
              <div>
                <span className="font-semibold text-xs text-on-surface">
                  Project Members ({projectMembers.length})
                </span>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Employees assigned to this project with their specialized project delivery roles.
                </p>
              </div>

              {isOrgAdmin && (
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="px-3 py-1.5 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-semibold rounded-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm text-xs"
                >
                  <UserPlus size={13} />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-tech bg-surface-container-lowest text-[11px] uppercase tracking-wider text-on-surface-variant">
                  <th className="py-2.5 px-4 font-semibold">Employee</th>
                  <th className="py-2.5 px-4 font-semibold">Organizational Role</th>
                  <th className="py-2.5 px-4 font-semibold">Project Role</th>
                  <th className="py-2.5 px-4 font-semibold">AI Workforce</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Joined Date</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-tech/40">
                {projectMembers.length > 0 ? (
                  projectMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-surface-container-high/30 transition-colors text-xs text-on-surface">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-sm bg-surface-container-lowest border border-border-tech flex items-center justify-center font-bold text-[11px] text-on-surface shrink-0">
                            {(m.name || m.email || "U").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-on-surface flex items-center gap-1.5">
                              <span>{m.name || "Employee"}</span>
                              {m.employee_id && (
                                <span className="text-[10px] text-on-surface-variant/70 font-mono">
                                  ({m.employee_id})
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-on-surface-variant font-mono">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-border-tech text-[11px] text-on-surface font-mono">
                          {m.organizational_role || m.job_title || "General"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-primary-container">
                          {m.project_role || m.role_in_project || "Contributor"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-primary-container/10 text-primary-container border border-primary-container/30 flex items-center gap-1 w-fit">
                          <Bot size={11} />
                          <span>Workforce Active</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant font-mono text-[11px]">
                        {formatDate(m.joined_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isOrgAdmin ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMember(m);
                                setMemberFormProjectRole(m.project_role || m.role_in_project || "Contributor");
                                setMemberFormStatus(m.status || "ACTIVE");
                              }}
                              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                              title="Edit Project Role"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingMember(m)}
                              className="p-1.5 text-on-surface-variant hover:text-rose-400 hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                              title="Remove from Project"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                      No project members enrolled yet. Click &quot;Add Member&quot; to assign team members.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: TASKS ────────────────────────────────────────────── */}
      {activeTab === "tasks" && (
        <div className="space-y-4 animate-fade-in font-code-sm text-xs">
          {/* Top Bar & Filters */}
          <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-on-surface-variant mr-1">
                <Filter size={13} />
                <span>Filter:</span>
              </div>

              {/* Status Filter */}
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="bg-surface-container-lowest border border-border-tech rounded-sm px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-primary-container"
              >
                <option value="">All Statuses</option>
                <option value="TODO">Todo</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="DONE">Done</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Milestone Filter */}
              <select
                value={taskMilestoneFilter}
                onChange={(e) => setTaskMilestoneFilter(e.target.value)}
                className="bg-surface-container-lowest border border-border-tech rounded-sm px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-primary-container"
              >
                <option value="">All Milestones</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>

              {/* Assignee Filter */}
              <select
                value={taskAssigneeFilter}
                onChange={(e) => setTaskAssigneeFilter(e.target.value)}
                className="bg-surface-container-lowest border border-border-tech rounded-sm px-2.5 py-1 text-xs text-on-surface focus:outline-none focus:border-primary-container"
              >
                <option value="">All Assignees</option>
                {orgMembers.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>

              {(taskStatusFilter || taskMilestoneFilter || taskAssigneeFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setTaskStatusFilter("");
                    setTaskMilestoneFilter("");
                    setTaskAssigneeFilter("");
                  }}
                  className="px-2 py-1 text-on-surface-variant hover:text-primary-container text-[11px] underline cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {isOrgAdmin && (
              <button
                type="button"
                onClick={handleOpenCreateTask}
                className="px-3 py-1.5 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-semibold rounded-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm text-xs self-end md:self-auto"
              >
                <Plus size={13} />
                <span>Create Task</span>
              </button>
            )}
          </div>

          {/* Tasks Table */}
          <div className="border border-border-tech bg-surface-container-low rounded-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-tech bg-surface-container-lowest text-[11px] uppercase tracking-wider text-on-surface-variant">
                  <th className="py-2.5 px-4 font-semibold">Task</th>
                  <th className="py-2.5 px-4 font-semibold">Milestone</th>
                  <th className="py-2.5 px-4 font-semibold">Assignee</th>
                  <th className="py-2.5 px-4 font-semibold">Priority</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold">Due Date</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-tech/40">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-container-high/30 transition-colors text-xs text-on-surface">
                      {/* Title & Desc */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-on-surface flex items-center gap-1.5">
                          <span>{t.title}</span>
                          {t.status === "DONE" && <CheckCircle2 size={13} className="text-emerald-400" />}
                        </div>
                        {t.description && (
                          <div className="text-[11px] text-on-surface-variant/80 truncate mt-0.5">
                            {t.description}
                          </div>
                        )}
                        {t.status === "BLOCKED" && t.blocked_reason && (
                          <div className="mt-1 p-1.5 rounded-sm bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-400 flex items-center gap-1">
                            <AlertOctagon size={11} className="shrink-0" />
                            <span>Blocked: {t.blocked_reason}</span>
                          </div>
                        )}
                      </td>

                      {/* Milestone */}
                      <td className="py-3 px-4">
                        {t.milestone_name ? (
                          <span className="px-2 py-0.5 rounded bg-surface-container-lowest border border-border-tech text-[10px] text-on-surface font-mono">
                            {t.milestone_name}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/50 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4">
                        {t.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-sm bg-surface-container-lowest border border-border-tech flex items-center justify-center font-bold text-[9px] text-on-surface shrink-0">
                              {(t.assignee.name || t.assignee.email || "U").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium truncate max-w-[120px]">
                              {t.assignee.name || t.assignee.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant/50 text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-1.5 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                            t.priority === "CRITICAL"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              : t.priority === "HIGH"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-surface-container-lowest text-on-surface border border-border-tech"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                            t.status === "DONE"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : t.status === "IN_PROGRESS"
                              ? "bg-primary-container/10 text-primary-container border border-primary-container/30"
                              : t.status === "BLOCKED"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              : "bg-surface-container-lowest text-on-surface-variant border border-border-tech"
                          }`}
                        >
                          {t.status.replace("_", " ")}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td className="py-3 px-4 text-on-surface-variant font-mono text-[11px]">
                        {formatDate(t.due_date)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {isOrgAdmin ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditTask(t)}
                              className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                              title="Edit Task"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingTask(t)}
                              className="p-1.5 text-on-surface-variant hover:text-rose-400 hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-on-surface-variant">
                      No organizational tasks found. Click &quot;Create Task&quot; to define project work items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: MILESTONES ───────────────────────────────────────── */}
      {activeTab === "milestones" && (
        <div className="space-y-5 animate-fade-in font-code-sm text-xs">
          <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
                <Milestone size={15} className="text-primary-container" />
                <span>Project Milestones &amp; Checkpoints</span>
              </h3>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Key delivery stages, target completion checkpoints, and progress markers.
              </p>
            </div>

            {isOrgAdmin && (
              <button
                type="button"
                onClick={handleOpenCreateMilestone}
                className="px-3 py-1.5 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-semibold rounded-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm text-xs"
              >
                <Plus size={13} />
                <span>Create Milestone</span>
              </button>
            )}
          </div>

          {/* Milestones Cards */}
          <div className="space-y-3">
            {milestones.length > 0 ? (
              milestones.map((m) => (
                <div
                  key={m.id}
                  className="p-4 border border-border-tech bg-surface-container-low rounded-sm space-y-3 hover:border-primary-container/40 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2 rounded-sm border shrink-0 ${
                          m.status === "COMPLETED"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : m.status === "IN_PROGRESS"
                            ? "bg-primary-container/10 border-primary-container/30 text-primary-container"
                            : m.status === "BLOCKED"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            : "bg-surface-container-lowest border-border-tech text-on-surface-variant"
                        }`}
                      >
                        <Milestone size={16} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-on-surface">{m.name}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono mt-0.5">
                          <span>Target: {formatDate(m.due_date)}</span>
                          {m.start_date && <span>&bull; Starts: {formatDate(m.start_date)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                          m.priority === "CRITICAL"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            : m.priority === "HIGH"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            : "bg-surface-container-lowest text-on-surface border border-border-tech"
                        }`}
                      >
                        {m.priority}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase ${
                          m.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : m.status === "IN_PROGRESS"
                            ? "bg-primary-container/10 text-primary-container border border-primary-container/30"
                            : m.status === "BLOCKED"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                            : "bg-surface-container-lowest text-on-surface-variant border border-border-tech"
                        }`}
                      >
                        {m.status.replace("_", " ")}
                      </span>

                      {isOrgAdmin && (
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditMilestone(m)}
                            className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                            title="Edit Milestone"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingMilestone(m)}
                            className="p-1.5 text-on-surface-variant hover:text-rose-400 hover:bg-surface-container-lowest border border-transparent hover:border-border-tech transition-colors rounded-sm cursor-pointer"
                            title="Delete Milestone"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {m.description && (
                    <p className="text-xs text-on-surface-variant leading-relaxed pl-10">
                      {m.description}
                    </p>
                  )}

                  {/* Progress Bar & Linked Task Stats */}
                  <div className="pt-2 border-t border-border-tech/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-3 w-full sm:w-1/2">
                      <span className="text-[11px] text-on-surface-variant">Progress:</span>
                      <div className="flex-1 h-1.5 bg-surface-container-lowest rounded-full overflow-hidden border border-border-tech/50">
                        <div
                          className="h-full bg-primary-container transition-all"
                          style={{ width: `${m.progress_percent || 0}%` }}
                        />
                      </div>
                      <span className="font-bold text-xs text-primary-container">
                        {m.progress_percent || 0}%
                      </span>
                    </div>

                    <div className="text-[11px] text-on-surface-variant font-mono">
                      Attached Tasks: <strong>{m.completed_task_count || 0}</strong> /{" "}
                      <strong>{m.task_count || 0}</strong> Completed
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 border border-border-tech bg-surface-container-low text-center rounded-sm">
                <Milestone className="w-8 h-8 text-on-surface-variant/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-on-surface">No Milestones Defined</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Define milestone checkpoints to track roadmap completion and task bundling.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: AI WORKFORCE ─────────────────────────────────────── */}
      {activeTab === "ai_workforce" && (
        <div className="space-y-6 animate-fade-in font-code-sm text-xs">
          {/* Top Capacity Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm">
              <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                Project Enrolled Workforce
              </div>
              <div className="text-2xl font-bold text-on-surface">
                {aiWorkforce?.total_members || projectMembers.length}
              </div>
              <div className="text-[11px] text-on-surface-variant/70 mt-0.5">
                Assigned Team Members
              </div>
            </div>

            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm">
              <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                Active AgentGroups
              </div>
              <div className="text-2xl font-bold text-primary-container">
                {aiWorkforce?.active_workforces || 0}
              </div>
              <div className="text-[11px] text-on-surface-variant/70 mt-0.5">
                Provisioned AI Workforces
              </div>
            </div>

            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm">
              <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                Autonomous Agents
              </div>
              <div className="text-2xl font-bold text-emerald-400">
                {aiWorkforce?.total_agents || 0}
              </div>
              <div className="text-[11px] text-on-surface-variant/70 mt-0.5">
                Active Sub-Agents Across Members
              </div>
            </div>

            <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm">
              <div className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                Mesh Routing Status
              </div>
              <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                <CheckCircle2 size={16} />
                <span>AI Mesh Active</span>
              </div>
              <div className="text-[11px] text-on-surface-variant/70 mt-0.5">
                Role-Based Agent Routing
              </div>
            </div>
          </div>

          {/* Aggregated Capabilities Bar */}
          <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-on-surface flex items-center gap-2">
                <Sparkles size={14} className="text-primary-container" />
                <span>Aggregated Project AI Capabilities</span>
              </span>
              <span className="text-[11px] text-on-surface-variant font-mono">
                {aiWorkforce?.aggregated_capabilities?.length || 0} Core Skills Available
              </span>
            </div>

            {aiWorkforce?.aggregated_capabilities && aiWorkforce.aggregated_capabilities.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {aiWorkforce.aggregated_capabilities.map((cap) => (
                  <span
                    key={cap}
                    className="px-2.5 py-1 rounded-sm bg-primary-container/10 border border-primary-container/30 text-primary-container font-mono text-xs font-semibold flex items-center gap-1"
                  >
                    <Zap size={11} />
                    <span>{cap}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">
                No role capabilities currently assigned to enrolled project members.
              </p>
            )}
          </div>

          {/* Member AI Workforce Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs text-on-surface uppercase tracking-wider">
                Member AI Workforces &amp; Agent Topologies
              </h3>
            </div>

            {aiWorkforce?.members && aiWorkforce.members.length > 0 ? (
              aiWorkforce.members.map((memberItem) => (
                <div
                  key={memberItem.user_id}
                  className="p-4 border border-border-tech bg-surface-container-low rounded-sm space-y-3 hover:border-primary-container/40 transition-colors"
                >
                  {/* Top Row: Employee Profile + AgentGroup Status */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-sm bg-surface-container-lowest border border-border-tech flex items-center justify-center font-bold text-xs text-on-surface shrink-0">
                        {(memberItem.name || memberItem.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-on-surface flex items-center gap-2">
                          <span>{memberItem.name || "Employee"}</span>
                          {memberItem.employee_id && (
                            <span className="text-[10px] text-on-surface-variant font-mono">
                              ({memberItem.employee_id})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5">
                          <span>Role: <strong>{memberItem.job_role_name || memberItem.job_title || "General"}</strong></span>
                          <span>&bull;</span>
                          <span className="text-primary-container font-semibold">
                            Project: {memberItem.role_in_project}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {memberItem.agent_group ? (
                        <span className="px-2.5 py-1 rounded-sm text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                          <Bot size={13} />
                          <span>Active Workforce ({memberItem.agent_group.agents?.length || 0} Agents)</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-sm text-xs font-medium bg-surface-container-lowest text-on-surface-variant border border-border-tech flex items-center gap-1.5">
                          <AlertCircle size={13} className="text-amber-400" />
                          <span>No AI workforce provisioned</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Agent Topology or No-workforce state */}
                  {memberItem.agent_group ? (
                    <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
                        <span>AgentGroup: <strong className="text-on-surface">{memberItem.agent_group.name}</strong></span>
                        <span className="text-[10px]">{memberItem.agent_group.id}</span>
                      </div>

                      {/* Agents Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                        {memberItem.agent_group.agents?.map((ag) => (
                          <div
                            key={ag.id}
                            className="p-2 border border-border-tech/70 bg-surface-container-low rounded-sm space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-on-surface flex items-center gap-1">
                                <Cpu size={12} className="text-primary-container" />
                                <span>{ag.name}</span>
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-bold uppercase">
                                {ag.status}
                              </span>
                            </div>
                            {ag.capability && (
                              <div className="text-[10px] text-on-surface-variant font-mono truncate">
                                Capability: {ag.capability.name}
                              </div>
                            )}
                            {ag.assigned_tools && ag.assigned_tools.length > 0 && (
                              <div className="text-[10px] text-on-surface-variant/70 truncate">
                                Tools: {ag.assigned_tools.join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-surface-container-lowest border border-dashed border-border-tech rounded-sm text-center text-on-surface-variant">
                      <p className="text-xs">
                        No AI workforce provisioned for this member yet.
                      </p>
                      <p className="text-[11px] text-on-surface-variant/70 mt-0.5">
                        Workforces are automatically created when an employee is assigned an organizational role in Settings &gt; Employees.
                      </p>
                    </div>
                  )}

                  {/* Bottom Row: Assigned Member Capabilities */}
                  {memberItem.capabilities && memberItem.capabilities.length > 0 && (
                    <div className="pt-2 border-t border-border-tech/50 flex items-center gap-2">
                      <span className="text-[11px] text-on-surface-variant font-medium">Assigned Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {memberItem.capabilities.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 rounded bg-surface-container-lowest border border-border-tech text-[10px] text-on-surface font-mono"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 border border-border-tech bg-surface-container-low text-center rounded-sm">
                <Bot className="w-8 h-8 text-on-surface-variant/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-on-surface">No Project Members Enrolled</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Enroll members into this project in the Team tab to aggregate their AI workforce capacity.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: INTEGRATIONS ─────────────────────────────────────── */}
      {activeTab === "integrations" && (
        <div className="space-y-6 animate-fade-in font-code-sm text-xs">
          <div className="border border-border-tech bg-surface-container-low p-4 rounded-sm">
            <h3 className="font-semibold text-xs text-on-surface uppercase tracking-wider mb-1">
              External Project Integrations
            </h3>
            <p className="text-xs text-on-surface-variant">
              Bind your codebase and issue tracker to this initiative for autonomous PR review, commit analysis, and delivery telemetry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* GitHub Repository Card */}
            {(() => {
              const gh = integrations.find((i) => i.provider === "GITHUB");
              const isConnected = gh?.status === "CONNECTED";
              const isSyncing = syncingIntegrationId === gh?.id || gh?.status === "SYNCING";

              return (
                <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm flex flex-col justify-between space-y-4 hover:border-primary-container/30 transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-sm bg-surface-container-lowest border border-border-tech text-on-surface">
                          <Github size={22} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-on-surface">GitHub Repository</h3>
                          <p className="text-[11px] text-on-surface-variant">
                            Source code repository &amp; pull request tracking
                          </p>
                        </div>
                      </div>

                      {isConnected ? (
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          <span>Connected</span>
                        </span>
                      ) : gh?.status === "ERROR" ? (
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <AlertCircle size={11} />
                          <span>Error</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-medium bg-surface-container-lowest text-on-surface-variant border border-border-tech flex items-center gap-1">
                          <Circle size={10} className="text-on-surface-variant/40" />
                          <span>Not Connected</span>
                        </span>
                      )}
                    </div>

                    {isConnected && gh ? (
                      <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-on-surface-variant text-[11px]">Repository:</span>
                          <a
                            href={gh.repository_url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-primary-container hover:underline flex items-center gap-1"
                          >
                            <span>{gh.external_project_name || gh.repository_url}</span>
                            <ExternalLink size={11} />
                          </a>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-on-surface-variant">Default Branch:</span>
                          <span className="font-mono text-on-surface bg-surface-container-low px-1.5 py-0.2 rounded border border-border-tech/60">
                            {gh.config?.default_branch || "main"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-on-surface-variant">Last Synced:</span>
                          <span className="font-mono text-on-surface-variant">
                            {formatDate(gh.last_synced_at)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-surface-container-lowest border border-dashed border-border-tech rounded-sm text-center text-on-surface-variant">
                        <p className="text-xs">
                          No GitHub repository connected to this project.
                        </p>
                        <p className="text-[11px] text-on-surface-variant/70 mt-1">
                          Link a repository to enable commit correlation and automated code reviews.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border-tech/60 flex items-center justify-end gap-2">
                    {isConnected && gh ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSyncIntegration(gh.id)}
                          disabled={isSyncing}
                          className="px-3 py-1.5 border border-border-tech hover:border-primary-container/60 bg-surface-container-lowest text-on-surface hover:text-primary-container rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={isSyncing ? "animate-spin text-primary-container" : ""} />
                          <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnectGithub}
                          className="px-3 py-1.5 border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Unlink size={12} />
                          <span>Disconnect</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenConnectGithub}
                        className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-semibold rounded-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Link2 size={13} />
                        <span>Connect GitHub</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Jira / Issue Tracker Card */}
            {(() => {
              const jira = integrations.find((i) => i.provider === "JIRA");
              const isConnected = jira?.status === "CONNECTED";
              const isSyncing = syncingIntegrationId === jira?.id || jira?.status === "SYNCING";

              return (
                <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm flex flex-col justify-between space-y-4 hover:border-primary-container/30 transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-sm bg-surface-container-lowest border border-border-tech text-blue-400">
                          <Trello size={22} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-on-surface">Jira Project</h3>
                          <p className="text-[11px] text-on-surface-variant">
                            Issue tracker &amp; sprint progress synchronization
                          </p>
                        </div>
                      </div>

                      {isConnected ? (
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          <span>Connected</span>
                        </span>
                      ) : jira?.status === "ERROR" ? (
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <AlertCircle size={11} />
                          <span>Error</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-medium bg-surface-container-lowest text-on-surface-variant border border-border-tech flex items-center gap-1">
                          <Circle size={10} className="text-on-surface-variant/40" />
                          <span>Not Connected</span>
                        </span>
                      )}
                    </div>

                    {isConnected && jira ? (
                      <div className="p-3 bg-surface-container-lowest border border-border-tech rounded-sm space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-on-surface-variant text-[11px]">Instance:</span>
                          <span className="font-mono text-on-surface truncate max-w-[200px]">
                            {jira.base_url}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-on-surface-variant">Project Key:</span>
                          <span className="font-mono font-bold text-primary-container bg-surface-container-low px-1.5 py-0.2 rounded border border-border-tech/60">
                            {jira.external_project_id || jira.config?.project_key}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-on-surface-variant">Last Synced:</span>
                          <span className="font-mono text-on-surface-variant">
                            {formatDate(jira.last_synced_at)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-surface-container-lowest border border-dashed border-border-tech rounded-sm text-center text-on-surface-variant">
                        <p className="text-xs">
                          No Jira project connected to this initiative.
                        </p>
                        <p className="text-[11px] text-on-surface-variant/70 mt-1">
                          Link Jira to correlate tickets, user stories, and delivery milestones.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border-tech/60 flex items-center justify-end gap-2">
                    {isConnected && jira ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSyncIntegration(jira.id)}
                          disabled={isSyncing}
                          className="px-3 py-1.5 border border-border-tech hover:border-primary-container/60 bg-surface-container-lowest text-on-surface hover:text-primary-container rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw size={12} className={isSyncing ? "animate-spin text-primary-container" : ""} />
                          <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDisconnectJira}
                          className="px-3 py-1.5 border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Unlink size={12} />
                          <span>Disconnect</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenConnectJira}
                        className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-semibold rounded-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        <Link2 size={13} />
                        <span>Connect Jira</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── TAB 7: HEALTH & BLOCKER DIAGNOSTICS ─────────────────────── */}
      {activeTab === "health" && (
        <div className="space-y-6 animate-fade-in font-code-sm text-xs">
          {/* ── OVERALL HEALTH & RULES EVALUATION BANNER ──────────────── */}
          <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-tech pb-4">
              <div>
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block mb-1">
                  Deterministic Project Health Status
                </span>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-on-surface">Project Diagnostic Report</h3>
                  {(() => {
                    const health = healthData?.overall_health || "HEALTHY";
                    if (health === "CRITICAL") {
                      return (
                        <span className="px-3 py-1 rounded-sm text-xs font-bold uppercase bg-rose-500/15 text-rose-400 border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                          <AlertTriangle size={14} />
                          <span>CRITICAL</span>
                        </span>
                      );
                    }
                    if (health === "AT_RISK") {
                      return (
                        <span className="px-3 py-1 rounded-sm text-xs font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                          <AlertCircle size={14} />
                          <span>AT RISK</span>
                        </span>
                      );
                    }
                    return (
                      <span className="px-3 py-1 rounded-sm text-xs font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                        <CheckCircle2 size={14} />
                        <span>HEALTHY</span>
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-on-surface-variant text-[11px] block">Overall Progress</span>
                  <span className="text-lg font-bold text-primary-container font-mono">
                    {healthData?.progress_percent ?? progress}%
                  </span>
                </div>
                <div className="border-l border-border-tech pl-4">
                  <span className="text-on-surface-variant text-[11px] block">Risk Level</span>
                  <span className="font-semibold text-on-surface">
                    {healthData?.risk_level ?? project.risk_level}
                  </span>
                </div>
                <div className="border-l border-border-tech pl-4">
                  <span className="text-on-surface-variant text-[11px] block">Deadline Status</span>
                  <span
                    className={`font-semibold ${
                      healthData?.is_project_overdue ? "text-rose-400" : "text-on-surface"
                    }`}
                  >
                    {healthData?.is_project_overdue ? "Overdue" : formatDate(project.target_end_date)}
                  </span>
                </div>
              </div>
            </div>

            {/* Diagnostic Reasons Breakdown */}
            <div className="space-y-2">
              <span className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider block">
                Rule-Derived Diagnostic Indicators
              </span>
              {healthData?.health_reasons && healthData.health_reasons.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {healthData.health_reasons.map((reason, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-surface-container-lowest border border-border-tech/80 rounded-sm flex items-center gap-2 text-xs text-on-surface"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-container shrink-0" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-surface-container-lowest border border-border-tech/80 rounded-sm text-on-surface-variant text-xs flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  <span>No blocking issues or overdue tasks detected. Project execution is on track.</span>
                </div>
              )}
            </div>
          </div>

          {/* ── BLOCKER DETECTION & OVERDUE WORK GRID ─────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Blocker Detection Card */}
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-sm bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <AlertTriangle size={15} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-on-surface">Blocker Detection</h4>
                    <p className="text-[11px] text-on-surface-variant">
                      Tasks flagged with BLOCKED status and obstruction reasons
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-sm text-xs font-bold font-mono bg-surface-container-lowest border border-border-tech text-on-surface">
                  {healthData?.blocked_tasks?.length || 0} Blocked
                </span>
              </div>

              {healthData?.blocked_tasks && healthData.blocked_tasks.length > 0 ? (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {healthData.blocked_tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-surface-container-lowest border border-rose-500/30 rounded-sm space-y-2 hover:border-rose-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs text-on-surface">{task.title}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            task.priority === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-300"
                              : task.priority === "HIGH"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-surface-container-low text-on-surface-variant"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      {task.blocked_reason && (
                        <div className="p-2 bg-rose-500/5 border-l-2 border-rose-500 rounded-sm text-[11px] text-rose-300">
                          <strong>Obstruction:</strong> {task.blocked_reason}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-on-surface-variant/80 pt-1 border-t border-border-tech/40">
                        <span>Milestone: {task.milestone_name || "Unassigned"}</span>
                        <span>Assignee: {task.assignee_name || "Unassigned"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-surface-container-lowest border border-dashed border-border-tech rounded-sm text-center text-on-surface-variant space-y-1">
                  <CheckCircle2 size={20} className="text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-on-surface">Zero Active Blockers</p>
                  <p className="text-[11px] text-on-surface-variant/70">
                    No tasks are currently stalled or flagged with delivery impediments.
                  </p>
                </div>
              )}
            </div>

            {/* Overdue Tasks Card */}
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-sm bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Calendar size={15} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-on-surface">Overdue Tasks</h4>
                    <p className="text-[11px] text-on-surface-variant">
                      Incomplete tasks whose target due date has passed
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-sm text-xs font-bold font-mono bg-surface-container-lowest border border-border-tech text-on-surface">
                  {healthData?.overdue_tasks?.length || 0} Overdue
                </span>
              </div>

              {healthData?.overdue_tasks && healthData.overdue_tasks.length > 0 ? (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {healthData.overdue_tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-surface-container-lowest border border-amber-500/30 rounded-sm space-y-2 hover:border-amber-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-xs text-on-surface">{task.title}</span>
                        <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {task.days_overdue} {task.days_overdue === 1 ? "Day" : "Days"} Overdue
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-on-surface-variant/80 pt-1 border-t border-border-tech/40">
                        <span>Due: {formatDate(task.due_date)}</span>
                        <span>Assignee: {task.assignee_name || "Unassigned"}</span>
                        <span>Status: {task.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-surface-container-lowest border border-dashed border-border-tech rounded-sm text-center text-on-surface-variant space-y-1">
                  <CheckCircle2 size={20} className="text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-on-surface">All Tasks On Schedule</p>
                  <p className="text-[11px] text-on-surface-variant/70">
                    No incomplete delivery tasks have passed their target completion deadline.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── MILESTONE HEALTH DIAGNOSTICS MATRIX ───────────────────── */}
          <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
            <div>
              <h4 className="font-semibold text-sm text-on-surface flex items-center gap-2">
                <Milestone size={15} className="text-primary-container" />
                <span>Milestone Health Diagnostic Matrix</span>
              </h4>
              <p className="text-[11px] text-on-surface-variant mt-0.5">
                Evaluation of individual roadmap milestones against task dependencies and delivery commitments.
              </p>
            </div>

            {healthData?.milestones_health && healthData.milestones_health.length > 0 ? (
              <div className="space-y-3">
                {healthData.milestones_health.map((ms) => (
                  <div
                    key={ms.milestone_id}
                    className="p-4 bg-surface-container-lowest border border-border-tech rounded-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-tech/50 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-xs text-on-surface">{ms.name}</span>
                        <span className="text-[10px] text-on-surface-variant px-1.5 py-0.2 bg-surface-container-low border border-border-tech/60 rounded">
                          {ms.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-on-surface-variant">
                          Due: {formatDate(ms.due_date)}
                        </span>
                        {ms.health === "HEALTHY" && (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Healthy
                          </span>
                        )}
                        {ms.health === "AT_RISK" && (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            At Risk
                          </span>
                        )}
                        {ms.health === "BLOCKED" && (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Blocked
                          </span>
                        )}
                        {ms.health === "OVERDUE" && (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Overdue
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                          <span>Milestone Completion</span>
                          <span className="font-mono text-on-surface font-semibold">
                            {ms.progress_percent}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container-low rounded-full overflow-hidden border border-border-tech/40">
                          <div
                            className="h-full bg-primary-container transition-all"
                            style={{ width: `${ms.progress_percent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-on-surface-variant">
                        <div>
                          <span className="block text-[10px]">Tasks</span>
                          <span className="font-semibold text-on-surface">
                            {ms.completed_tasks} / {ms.total_tasks} Done
                          </span>
                        </div>
                        {ms.blocked_tasks_count > 0 && (
                          <div>
                            <span className="block text-[10px] text-rose-400">Blocked</span>
                            <span className="font-semibold text-rose-400">
                              {ms.blocked_tasks_count}
                            </span>
                          </div>
                        )}
                        {ms.overdue_tasks_count > 0 && (
                          <div>
                            <span className="block text-[10px] text-amber-400">Overdue</span>
                            <span className="font-semibold text-amber-400">
                              {ms.overdue_tasks_count}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-[11px] text-on-surface-variant/80 space-y-0.5">
                        {ms.reasons.map((r, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-primary-container shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-surface-container-lowest border border-dashed border-border-tech rounded-sm text-center text-xs text-on-surface-variant">
                No milestones defined for this initiative yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 8: SETTINGS ─────────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="space-y-6 animate-fade-in font-code-sm text-xs">
          <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm">
            <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2 mb-4">
              <Settings size={15} className="text-primary-container" />
              <span>Initiative Configuration &amp; Bindings</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
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
                <label className="block text-on-surface-variant mb-1">Scope &amp; Description</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Owner */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Project Owner</label>
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

                {/* Squad */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Assigned Squad</label>
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
                  <label className="block text-on-surface-variant mb-1 font-semibold">Status</label>
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
                  <label className="block text-on-surface-variant mb-1 font-semibold">Priority</label>
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

                {/* Risk */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Risk Level</label>
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
                  <label className="block text-on-surface-variant mb-1 font-semibold">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>

                {/* Target Date */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Target End Date</label>
                  <input
                    type="date"
                    value={formTargetDate}
                    onChange={(e) => setFormTargetDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>

                {/* Progress */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Progress ({formProgress}%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formProgress}
                    onChange={(e) =>
                      setFormProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))
                    }
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              {/* Bindings Section */}
              <div className="border-t border-border-tech pt-3 space-y-3">
                <h4 className="font-semibold text-xs text-on-surface">External Tool Bindings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-on-surface-variant mb-1">GitHub Repo URL</label>
                    <input
                      type="text"
                      value={formGithubRepo}
                      onChange={(e) => setFormGithubRepo(e.target.value)}
                      placeholder="https://github.com/org/repo"
                      className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface-variant mb-1">Jira Project Key</label>
                    <input
                      type="text"
                      value={formJiraKey}
                      onChange={(e) => setFormJiraKey(e.target.value.toUpperCase())}
                      placeholder="e.g. CORE"
                      className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t border-border-tech">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold rounded-sm transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSaving ? "Saving..." : "Save Project Settings"}
                </button>
              </div>
            </form>
          </div>

          {/* Danger Zone */}
          {isOrgAdmin && (
            <div className="border border-rose-500/30 bg-surface-container-low p-5 rounded-sm space-y-3">
              <h3 className="font-semibold text-sm text-rose-400 flex items-center gap-2">
                <ShieldAlert size={15} />
                <span>Danger Zone</span>
              </h3>
              <p className="text-xs text-on-surface-variant">
                Deleting this project will permanently remove its milestones, tasks, issue bindings, and project-owned records. Assigned employees, teams, roles, and AgentGroups will remain untouched.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-3.5 py-1.5 border border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-code-sm text-xs font-semibold rounded-sm transition-colors cursor-pointer"
                >
                  Delete Project
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADD MEMBER MODAL ────────────────────────────────────────── */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-code-sm text-xs">
          <div className="bg-surface-container-low w-full max-w-md border border-border-tech shadow-2xl overflow-hidden rounded-sm">
            <div className="p-4 border-b border-border-tech bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <UserPlus size={15} />
                </div>
                <h3 className="font-semibold text-sm text-on-surface">Add Project Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-sm cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold">
                  Employee <span className="text-error">*</span>
                </label>
                <select
                  required
                  value={memberFormEmployeeId}
                  onChange={(e) => setMemberFormEmployeeId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
                >
                  <option value="">-- Select Active Employee --</option>
                  {availableOrgMembers.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.name || m.email} ({m.department || "General"})
                    </option>
                  ))}
                </select>
                {availableOrgMembers.length === 0 && (
                  <p className="text-[10px] text-amber-400 mt-1">
                    All organization employees are already enrolled in this project.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold">
                  Project Role <span className="text-error">*</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    value={memberFormProjectRole}
                    onChange={(e) => setMemberFormProjectRole(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
                  >
                    {PROJECT_ROLE_PRESETS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={memberFormProjectRole}
                    onChange={(e) => setMemberFormProjectRole(e.target.value)}
                    placeholder="Or type custom project role..."
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container placeholder:text-on-surface-variant/40"
                  />
                </div>
                <p className="text-[10px] text-on-surface-variant/70 mt-1">
                  Project roles specify responsibilities for this initiative without changing the employee&apos;s organizational role.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-3 py-1.5 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMemberSaving || !memberFormEmployeeId.trim()}
                  className="px-4 py-1.5 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-semibold rounded-sm transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isMemberSaving ? "Enrolling..." : "Enroll Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MEMBER ROLE MODAL ──────────────────────────────────── */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-code-sm text-xs">
          <div className="bg-surface-container-low w-full max-w-md border border-border-tech shadow-2xl overflow-hidden rounded-sm">
            <div className="p-4 border-b border-border-tech bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <Edit2 size={15} />
                </div>
                <h3 className="font-semibold text-sm text-on-surface">
                  Edit Role: {editingMember.name || editingMember.email}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-sm cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleUpdateMemberSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold">
                  Project Role <span className="text-error">*</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    value={memberFormProjectRole}
                    onChange={(e) => setMemberFormProjectRole(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
                  >
                    {PROJECT_ROLE_PRESETS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={memberFormProjectRole}
                    onChange={(e) => setMemberFormProjectRole(e.target.value)}
                    placeholder="Or type custom project role..."
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold">
                  Member Status
                </label>
                <select
                  value={memberFormStatus}
                  onChange={(e) => setMemberFormStatus(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-3 py-1.5 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMemberSaving || !memberFormProjectRole.trim()}
                  className="px-4 py-1.5 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-semibold rounded-sm transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isMemberSaving ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REMOVE MEMBER MODAL ─────────────────────────────────────── */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in font-code-sm text-xs">
          <div className="bg-surface-container-low w-full max-w-md border border-rose-500/40 shadow-2xl overflow-hidden rounded-sm">
            <div className="p-4 border-b border-border-tech bg-surface-container-lowest flex items-center gap-3">
              <div className="p-2 rounded-sm bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <UserX size={17} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-on-surface">Remove Project Member</h3>
                <p className="text-xs text-on-surface-variant">{deletingMember.name || deletingMember.email}</p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-on-surface-variant">
              <p className="text-on-surface">
                Remove <strong>{deletingMember.name || deletingMember.email}</strong> from project{" "}
                <strong>&quot;{project.name}&quot;</strong>?
              </p>
              <p className="text-[11px] text-on-surface-variant/80">
                The employee and their AgentGroups will <strong>not</strong> be deleted from the organization.
              </p>
            </div>

            <div className="p-4 border-t border-border-tech bg-surface-container-lowest flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                disabled={isMemberSaving}
                className="px-3 py-1.5 border border-border-tech hover:border-on-surface-variant bg-surface-container-low text-on-surface-variant rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMemberSubmit}
                disabled={isMemberSaving}
                className="px-4 py-1.5 border border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isMemberSaving ? "Removing..." : "Confirm Removal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MILESTONE MODAL ───────────────────────────── */}
      {isMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-code-sm text-xs">
          <div className="bg-surface-container-low w-full max-w-lg border border-border-tech shadow-2xl overflow-hidden rounded-sm">
            <div className="p-4 border-b border-border-tech bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <Milestone size={16} />
                </div>
                <h3 className="font-semibold text-sm text-on-surface">
                  {editingMilestone ? "Edit Milestone Checkpoint" : "Create Milestone Checkpoint"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMilestoneModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-sm cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveMilestoneSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold">
                  Milestone Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={msFormName}
                  onChange={(e) => setMsFormName(e.target.value)}
                  placeholder="e.g. Core API & Database Foundation"
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1">Description &amp; Goals</label>
                <textarea
                  rows={2}
                  value={msFormDesc}
                  onChange={(e) => setMsFormDesc(e.target.value)}
                  placeholder="Describe checkpoint deliverables and criteria..."
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Status</label>
                  <select
                    value={msFormStatus}
                    onChange={(e) => setMsFormStatus(e.target.value as ProjectMilestoneStatus)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
                  >
                    <option value="PLANNED">Planned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Priority</label>
                  <select
                    value={msFormPriority}
                    onChange={(e) => setMsFormPriority(e.target.value as ProjectPriority)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Progress ({msFormProgress}%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={msFormProgress}
                    onChange={(e) =>
                      setMsFormProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))
                    }
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Start Date</label>
                  <input
                    type="date"
                    value={msFormStartDate}
                    onChange={(e) => setMsFormStartDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Due Date</label>
                  <input
                    type="date"
                    value={msFormDueDate}
                    onChange={(e) => setMsFormDueDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setIsMilestoneModalOpen(false)}
                  className="px-3 py-1.5 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isMsSaving || !msFormName.trim()}
                  className="px-4 py-1.5 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-semibold rounded-sm transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isMsSaving ? "Saving..." : editingMilestone ? "Save Milestone" : "Create Milestone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE MILESTONE CONFIRMATION MODAL ──────────────────────── */}
      {deletingMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in font-code-sm text-xs">
          <div className="bg-surface-container-low w-full max-w-md border border-rose-500/40 shadow-2xl overflow-hidden rounded-sm">
            <div className="p-4 border-b border-border-tech bg-surface-container-lowest flex items-center gap-3">
              <div className="p-2 rounded-sm bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <Trash2 size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-on-surface">Delete Milestone</h3>
                <p className="text-xs text-on-surface-variant">{deletingMilestone.name}</p>
              </div>
            </div>

            <div className="p-5 space-y-2 text-on-surface-variant">
              <p className="text-on-surface">
                Delete milestone checkpoint <strong>&quot;{deletingMilestone.name}&quot;</strong>?
              </p>
              <p className="text-[11px] text-on-surface-variant/80">
                Tasks assigned to this milestone will have their milestone unlinked, but will not be deleted.
              </p>
            </div>

            <div className="p-4 border-t border-border-tech bg-surface-container-lowest flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingMilestone(null)}
                disabled={isMsSaving}
                className="px-3 py-1.5 border border-border-tech hover:border-on-surface-variant bg-surface-container-low text-on-surface-variant rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMilestoneSubmit}
                disabled={isMsSaving}
                className="px-4 py-1.5 border border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isMsSaving ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT TASK MODAL ────────────────────────────────── */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-code-sm text-xs">
          <div className="bg-surface-container-low w-full max-w-lg border border-border-tech shadow-2xl overflow-hidden rounded-sm">
            <div className="p-4 border-b border-border-tech bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-sm bg-primary-container/10 text-primary-container border border-primary-container/30">
                  <CheckSquare size={16} />
                </div>
                <h3 className="font-semibold text-sm text-on-surface">
                  {editingTask ? "Edit Work Task" : "Create Project Task"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-sm cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveTaskSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold">
                  Task Title <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={taskFormTitle}
                  onChange={(e) => setTaskFormTitle(e.target.value)}
                  placeholder="e.g. Implement schema migration for database tables"
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1">Description &amp; Acceptance Criteria</label>
                <textarea
                  rows={2}
                  value={taskFormDesc}
                  onChange={(e) => setTaskFormDesc(e.target.value)}
                  placeholder="Details, technical requirements, acceptance criteria..."
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Milestone */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Milestone</label>
                  <select
                    value={taskFormMilestoneId}
                    onChange={(e) => setTaskFormMilestoneId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
                  >
                    <option value="">-- No Milestone Assigned --</option>
                    {milestones.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Assignee</label>
                  <select
                    value={taskFormAssigneeId}
                    onChange={(e) => setTaskFormAssigneeId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
                  >
                    <option value="">-- Unassigned --</option>
                    {orgMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.name || m.email} ({m.department || "Engineering"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional AI Workforce (AgentGroup) Assignment */}
              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold">
                  Assigned AI Workforce (Optional)
                </label>
                <select
                  value={taskFormAgentGroupId}
                  onChange={(e) => setTaskFormAgentGroupId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
                >
                  <option value="">-- No AI Workforce Assigned --</option>
                  {aiWorkforce?.members
                    .filter((m) => !!m.agent_group)
                    .map((m) => (
                      <option key={m.agent_group!.id} value={m.agent_group!.id}>
                        {m.agent_group!.name} ({m.name || m.email} - {m.agent_group!.agents?.length || 0} Agents)
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-on-surface-variant/70 mt-1">
                  Optionally route this task through an employee&apos;s active AgentGroup topology.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Status */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Status</label>
                  <select
                    value={taskFormStatus}
                    onChange={(e) => setTaskFormStatus(e.target.value as ProjectTaskStatus)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
                  >
                    <option value="TODO">Todo</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="DONE">Done</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Priority</label>
                  <select
                    value={taskFormPriority}
                    onChange={(e) => setTaskFormPriority(e.target.value as ProjectPriority)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">Due Date</label>
                  <input
                    type="date"
                    value={taskFormDueDate}
                    onChange={(e) => setTaskFormDueDate(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              {/* Blocked Reason Input if BLOCKED */}
              {taskFormStatus === "BLOCKED" && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-sm space-y-1">
                  <label className="block text-rose-400 font-semibold text-xs">
                    Blocked Reason <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={taskFormBlockedReason}
                    onChange={(e) => setTaskFormBlockedReason(e.target.value)}
                    placeholder="e.g. Waiting on third-party API keys or access permissions"
                    className="w-full bg-surface-container-lowest border border-rose-500/40 rounded-sm px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-rose-400"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3 py-1.5 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTaskSaving || !taskFormTitle.trim()}
                  className="px-4 py-1.5 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-semibold rounded-sm transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isTaskSaving ? "Saving..." : editingTask ? "Save Task" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE TASK CONFIRMATION MODAL ──────────────────────────── */}
      {deletingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in font-code-sm text-xs">
          <div className="bg-surface-container-low w-full max-w-md border border-rose-500/40 shadow-2xl overflow-hidden rounded-sm">
            <div className="p-4 border-b border-border-tech bg-surface-container-lowest flex items-center gap-3">
              <div className="p-2 rounded-sm bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <Trash2 size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-on-surface">Delete Task</h3>
                <p className="text-xs text-on-surface-variant">{deletingTask.title}</p>
              </div>
            </div>

            <div className="p-5 space-y-2 text-on-surface-variant">
              <p className="text-on-surface">
                Delete work task <strong>&quot;{deletingTask.title}&quot;</strong>?
              </p>
              <p className="text-[11px] text-on-surface-variant/80">
                This action cannot be undone.
              </p>
            </div>

            <div className="p-4 border-t border-border-tech bg-surface-container-lowest flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingTask(null)}
                disabled={isTaskSaving}
                className="px-3 py-1.5 border border-border-tech hover:border-on-surface-variant bg-surface-container-low text-on-surface-variant rounded-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTaskSubmit}
                disabled={isTaskSaving}
                className="px-4 py-1.5 border border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold rounded-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isTaskSaving ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE PROJECT CONFIRMATION MODAL ────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in font-code-sm">
          <div className="bg-surface-container-low w-full max-w-md border border-rose-500/40 shadow-2xl overflow-hidden rounded-sm">
            <div className="p-5 border-b border-border-tech bg-surface-container-lowest flex items-center gap-3">
              <div className="p-2 rounded-sm bg-rose-500/10 text-rose-400 border border-rose-500/30">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="font-display-xl text-base text-on-surface font-semibold">
                  Delete Project
                </h3>
                <p className="text-xs text-on-surface-variant">
                  {project.project_code} &bull; {project.name}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs text-on-surface-variant">
              <p className="text-on-surface">
                Are you sure you want to delete <strong>&quot;{project.name}&quot;</strong>?
              </p>
              <p className="text-[11px] text-on-surface-variant/80">
                This will remove project records, milestones, and tasks. Employees, teams, roles, and AgentGroups will <strong>not</strong> be deleted.
              </p>
            </div>

            <div className="p-4 border-t border-border-tech bg-surface-container-lowest flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-3 py-2 border border-border-tech hover:border-on-surface-variant bg-surface-container-low text-on-surface-variant text-xs rounded-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2 border border-rose-500 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONNECT GITHUB MODAL ────────────────────────────────────── */}
      {isGithubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-code-sm">
          <div className="bg-surface-container-low w-full max-w-lg border border-border-tech shadow-2xl overflow-hidden rounded-sm">
            <div className="p-4 border-b border-border-tech bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-sm bg-surface-container-low border border-border-tech text-on-surface">
                  <Github size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-on-surface">Connect GitHub Repository</h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Bind codebase for pull request tracking and commit telemetry
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGithubModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-sm transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConnectGithubSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold">
                  Repository URL or Path <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ghRepoUrl}
                  onChange={(e) => setGhRepoUrl(e.target.value)}
                  placeholder="https://github.com/organization/repository or org/repo"
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Display Name / Alias
                  </label>
                  <input
                    type="text"
                    value={ghProjectName}
                    onChange={(e) => setGhProjectName(e.target.value)}
                    placeholder="e.g. Core Backend Service"
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Default Branch
                  </label>
                  <input
                    type="text"
                    value={ghDefaultBranch}
                    onChange={(e) => setGhDefaultBranch(e.target.value)}
                    placeholder="main"
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold flex items-center justify-between">
                  <span>GitHub Personal Access Token (Optional)</span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <Lock size={10} /> Secure Vault Storage
                  </span>
                </label>
                <input
                  type="password"
                  value={ghAccessToken}
                  onChange={(e) => setGhAccessToken(e.target.value)}
                  placeholder="ghp_••••••••••••••••••••••••••••••••"
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
                />
                <p className="text-[10px] text-on-surface-variant/70 mt-1">
                  Tokens are stored securely in backend vault references and never exposed to the frontend.
                </p>
              </div>

              <div className="p-3 bg-surface-container-lowest border border-border-tech/80 rounded-sm space-y-1 text-[11px] text-on-surface-variant">
                <div className="font-semibold text-on-surface flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-primary-container" />
                  <span>Integration Telemetry Scope</span>
                </div>
                <p>
                  Connecting GitHub correlates autonomous agent PR checks, branch deployments, and issue resolution metrics.
                </p>
              </div>

              <div className="pt-3 border-t border-border-tech flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsGithubModalOpen(false)}
                  disabled={isGhSaving}
                  className="px-3 py-1.5 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant rounded-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGhSaving}
                  className="px-4 py-1.5 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-semibold rounded-sm transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Link2 size={12} />
                  <span>{isGhSaving ? "Connecting..." : "Save Connection"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CONNECT JIRA MODAL ──────────────────────────────────────── */}
      {isJiraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in font-code-sm">
          <div className="bg-surface-container-low w-full max-w-lg border border-border-tech shadow-2xl overflow-hidden rounded-sm">
            <div className="p-4 border-b border-border-tech bg-surface-container-lowest flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-sm bg-surface-container-low border border-border-tech text-blue-400">
                  <Trello size={16} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-on-surface">Connect Jira Project</h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Synchronize backlog items, sprints, and epic delivery status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsJiraModalOpen(false)}
                className="p-1 text-on-surface-variant hover:text-on-surface rounded-sm transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConnectJiraSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold">
                  Jira Instance Base URL <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={jiraBaseUrl}
                  onChange={(e) => setJiraBaseUrl(e.target.value)}
                  placeholder="https://your-company.atlassian.net"
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Project Key <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={jiraProjectKey}
                    onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                    placeholder="e.g. CORE, PROJ, PLAT"
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-on-surface-variant mb-1 font-semibold">
                    Project Name / Alias
                  </label>
                  <input
                    type="text"
                    value={jiraProjectName}
                    onChange={(e) => setJiraProjectName(e.target.value)}
                    placeholder="e.g. Core Infrastructure Sprint"
                    className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  />
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-1 font-semibold flex items-center justify-between">
                  <span>Jira API / Service Token (Optional)</span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <Lock size={10} /> Secure Vault Storage
                  </span>
                </label>
                <input
                  type="password"
                  value={jiraApiToken}
                  onChange={(e) => setJiraApiToken(e.target.value)}
                  placeholder="ATATT••••••••••••••••••••••••"
                  className="w-full bg-surface-container-lowest border border-border-tech rounded-sm px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
                />
                <p className="text-[10px] text-on-surface-variant/70 mt-1">
                  Tokens are stored securely in backend vault references and never exposed to the frontend.
                </p>
              </div>

              <div className="p-3 bg-surface-container-lowest border border-border-tech/80 rounded-sm space-y-1 text-[11px] text-on-surface-variant">
                <div className="font-semibold text-on-surface flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-primary-container" />
                  <span>Issue Tracking Correlation</span>
                </div>
                <p>
                  Connecting Jira allows automatic synchronization of tasks with organizational milestones.
                </p>
              </div>

              <div className="pt-3 border-t border-border-tech flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsJiraModalOpen(false)}
                  disabled={isJiraSaving}
                  className="px-3 py-1.5 border border-border-tech hover:border-on-surface-variant bg-surface-container-lowest text-on-surface-variant rounded-sm transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJiraSaving}
                  className="px-4 py-1.5 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-semibold rounded-sm transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Link2 size={12} />
                  <span>{isJiraSaving ? "Connecting..." : "Save Connection"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

