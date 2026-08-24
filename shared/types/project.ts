export type ProjectStatus =
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "ARCHIVED";

export type ProjectPriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export type ProjectRiskLevel =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

export interface ProjectOwnerSummary {
  id: string;
  name?: string;
  email: string;
  employee_id?: string;
  job_title?: string;
}

export interface ProjectTeamSummary {
  id: string;
  name: string;
  department?: string;
}

export interface ProjectMemberItem {
  id: string;
  user_id: string;
  employee_id?: string;
  name?: string;
  email: string;
  avatar_url?: string;
  department?: string;
  job_title?: string;
  organizational_role?: string;
  project_role: string;
  role_in_project: string;
  status: string;
  joined_at: string;
}

export type ProjectMember = ProjectMemberItem;

export interface ProjectMemberCreatePayload {
  employee_id?: string;
  user_id?: string;
  project_role?: string;
  role_in_project?: string;
  status?: string;
}

export interface ProjectMemberUpdatePayload {
  project_role?: string;
  role_in_project?: string;
  status?: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  project_code: string;
  description?: string;
  owner_id?: string;
  owner?: ProjectOwnerSummary;
  team_id?: string;
  team?: ProjectTeamSummary;
  status: ProjectStatus;
  priority: ProjectPriority;
  risk_level: ProjectRiskLevel;
  start_date?: string;
  target_end_date?: string;
  actual_end_date?: string;
  progress_percent: number;
  repository_bindings: Record<string, any>;
  issue_tracker_bindings: Record<string, any>;
  ai_delivery_policy: Record<string, any>;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
  members: ProjectMemberItem[];
}

export interface ProjectCreatePayload {
  name: string;
  project_code: string;
  description?: string;
  owner_id?: string;
  team_id?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  risk_level?: ProjectRiskLevel;
  start_date?: string;
  target_end_date?: string;
  progress_percent?: number;
  repository_bindings?: Record<string, any>;
  issue_tracker_bindings?: Record<string, any>;
  ai_delivery_policy?: Record<string, any>;
}

export interface ProjectUpdatePayload {
  name?: string;
  project_code?: string;
  description?: string;
  owner_id?: string;
  team_id?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  risk_level?: ProjectRiskLevel;
  start_date?: string;
  target_end_date?: string;
  actual_end_date?: string;
  progress_percent?: number;
  repository_bindings?: Record<string, any>;
  issue_tracker_bindings?: Record<string, any>;
  ai_delivery_policy?: Record<string, any>;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

export type ProjectMilestoneStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED"
  | "CANCELLED";

export type ProjectTaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "DONE"
  | "CANCELLED";

export interface ProjectMilestone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: ProjectMilestoneStatus;
  priority: ProjectPriority;
  start_date?: string;
  due_date?: string;
  progress_percent: number;
  task_count: number;
  completed_task_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestoneCreatePayload {
  name: string;
  description?: string;
  status?: ProjectMilestoneStatus;
  priority?: ProjectPriority;
  start_date?: string;
  due_date?: string;
  progress_percent?: number;
}

export interface ProjectMilestoneUpdatePayload {
  name?: string;
  description?: string;
  status?: ProjectMilestoneStatus;
  priority?: ProjectPriority;
  start_date?: string;
  due_date?: string;
  progress_percent?: number;
}

export interface ProjectTaskAssigneeSummary {
  id: string;
  name?: string;
  email: string;
  avatar_url?: string;
  employee_id?: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  milestone_id?: string;
  milestone_name?: string;
  title: string;
  description?: string;
  assignee_id?: string;
  assignee?: ProjectTaskAssigneeSummary;
  assigned_agent_group_id?: string;
  status: ProjectTaskStatus;
  priority: ProjectPriority;
  due_date?: string;
  progress_percent: number;
  blocked_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectTaskCreatePayload {
  title: string;
  description?: string;
  milestone_id?: string;
  assignee_id?: string;
  assigned_agent_group_id?: string;
  status?: ProjectTaskStatus;
  priority?: ProjectPriority;
  due_date?: string;
  progress_percent?: number;
  blocked_reason?: string;
}

export interface ProjectTaskUpdatePayload {
  title?: string;
  description?: string;
  milestone_id?: string;
  assignee_id?: string;
  assigned_agent_group_id?: string;
  status?: ProjectTaskStatus;
  priority?: ProjectPriority;
  due_date?: string;
  progress_percent?: number;
  blocked_reason?: string;
}

export interface ProjectMemberWorkforceItem {
  user_id: string;
  name?: string;
  email?: string;
  employee_id?: string;
  job_title?: string;
  department?: string;
  job_role_name?: string;
  role_in_project: string;
  capabilities: string[];
  status: string;
  agent_group?: {
    id: string;
    organization_id: string;
    employee_id: string;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
    agents: Array<{
      id: string;
      name: string;
      capability_id: string;
      assigned_tools: string[];
      permissions: string[];
      status: string;
      capability?: {
        name: string;
        description: string;
        risk_level: string;
        approval_required: boolean;
      };
    }>;
  };
}

export interface ProjectAIWorkforceResponse {
  project_id: string;
  project_name: string;
  project_code: string;
  total_members: number;
  active_workforces: number;
  total_agents: number;
  aggregated_capabilities: string[];
  members: ProjectMemberWorkforceItem[];
}

export type IntegrationProvider = "GITHUB" | "JIRA";

export type IntegrationStatus = "CONNECTED" | "DISCONNECTED" | "ERROR" | "SYNCING";

export interface ProjectIntegration {
  id: string;
  project_id: string;
  provider: IntegrationProvider;
  external_project_id?: string;
  external_project_name?: string;
  repository_url?: string;
  base_url?: string;
  status: IntegrationStatus;
  config: Record<string, any>;
  error_message?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ConnectGithubPayload {
  repository_url: string;
  external_project_name?: string;
  default_branch?: string;
  access_token?: string;
}

export interface ConnectJiraPayload {
  base_url: string;
  project_key: string;
  external_project_name?: string;
  api_token?: string;
}

export type ProjectHealthStatus = "HEALTHY" | "AT_RISK" | "CRITICAL";

export type MilestoneHealthStatus = "HEALTHY" | "AT_RISK" | "BLOCKED" | "OVERDUE";

export interface BlockedTaskSummary {
  id: string;
  title: string;
  milestone_id?: string;
  milestone_name?: string;
  assignee_id?: string;
  assignee_name?: string;
  priority: ProjectPriority;
  status: ProjectTaskStatus;
  due_date?: string;
  is_overdue: boolean;
  blocked_reason?: string;
}

export interface OverdueTaskSummary {
  id: string;
  title: string;
  milestone_id?: string;
  milestone_name?: string;
  assignee_id?: string;
  assignee_name?: string;
  priority: ProjectPriority;
  status: ProjectTaskStatus;
  due_date: string;
  days_overdue: number;
}

export interface MilestoneHealthItem {
  milestone_id: string;
  name: string;
  status: ProjectMilestoneStatus;
  priority: ProjectPriority;
  progress_percent: number;
  start_date?: string;
  due_date?: string;
  health: MilestoneHealthStatus;
  reasons: string[];
  total_tasks: number;
  completed_tasks: number;
  blocked_tasks_count: number;
  overdue_tasks_count: number;
}

export interface ProjectHealthDiagnosticsResponse {
  project_id: string;
  project_name: string;
  project_code: string;
  overall_health: ProjectHealthStatus;
  health_reasons: string[];
  progress_percent: number;
  risk_level: ProjectRiskLevel;
  priority: ProjectPriority;
  status: ProjectStatus;
  target_end_date?: string;
  is_project_overdue: boolean;
  total_tasks: number;
  completed_tasks: number;
  blocked_tasks_count: number;
  overdue_tasks_count: number;
  blocked_tasks: BlockedTaskSummary[];
  overdue_tasks: OverdueTaskSummary[];
  total_milestones: number;
  completed_milestones: number;
  milestones_health: MilestoneHealthItem[];
  calculated_at: string;
}

// ── Phase 9: Project Delivery Analytics Types ──────────────────

export interface TimelineAnalytics {
  start_date?: string;
  current_date: string;
  target_end_date?: string;
  actual_end_date?: string;
  days_total?: number;
  days_elapsed?: number;
  days_remaining?: number;
  time_elapsed_percent?: number;
  is_overdue: boolean;
}

export interface TaskDeliveryAnalytics {
  total: number;
  completed: number;
  in_progress: number;
  blocked: number;
  overdue: number;
  completion_rate: number;
}

export interface MilestoneDeliveryAnalytics {
  total: number;
  completed: number;
  in_progress: number;
  blocked: number;
  overdue: number;
}

export interface TeamDeliveryAnalytics {
  members_count: number;
  team_name?: string;
  team_department?: string;
  active_workforces: number;
  total_agents: number;
}

export interface RiskAnalytics {
  current_risk: ProjectRiskLevel;
  risk_factors: string[];
}

export interface AIDeliveryTrackItem {
  track_name: string;
  department?: string;
  employee_count: number;
  agent_count: number;
  members: string[];
  agent_groups: string[];
  capabilities: string[];
}

export interface ProjectDeliveryAnalyticsResponse {
  project_id: string;
  project_name: string;
  project_code: string;
  progress_percent: number;
  health_status: ProjectHealthStatus;
  timeline: TimelineAnalytics;
  tasks: TaskDeliveryAnalytics;
  milestones: MilestoneDeliveryAnalytics;
  team: TeamDeliveryAnalytics;
  risk: RiskAnalytics;
  ai_tracks: AIDeliveryTrackItem[];
  generated_at: string;
}




