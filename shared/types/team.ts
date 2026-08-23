/**
 * Team and Team Member Types for Organizational Units
 */

export type TeamStatus = "ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED";
export type TeamMemberStatus = "ACTIVE" | "INACTIVE";

export interface TeamLeadSummary {
  id: string;
  name?: string;
  email?: string;
  employee_id?: string;
  job_title?: string;
  department?: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role_in_team: string;
  status: TeamMemberStatus;
  joined_at: string;
  created_at: string;
  updated_at: string;
  name?: string;
  email?: string;
  employee_id?: string;
  job_title?: string;
  department?: string;
  job_role_name?: string;
}

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  department?: string;
  team_lead_id?: string;
  team_lead?: TeamLeadSummary;
  status: TeamStatus;
  ai_routing_policy: Record<string, any>;
  knowledge_access_config: Record<string, any>;
  memory_isolation_level: string;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface TeamDetail extends Team {
  members: TeamMember[];
}

export interface TeamListResponse {
  teams: Team[];
  total: number;
}

export interface TeamCreatePayload {
  name: string;
  description?: string;
  department?: string;
  team_lead_id?: string;
  status?: TeamStatus;
  ai_routing_policy?: Record<string, any>;
  knowledge_access_config?: Record<string, any>;
  memory_isolation_level?: string;
}

export interface TeamUpdatePayload {
  name?: string;
  description?: string;
  department?: string;
  team_lead_id?: string;
  status?: TeamStatus;
  ai_routing_policy?: Record<string, any>;
  knowledge_access_config?: Record<string, any>;
  memory_isolation_level?: string;
}

export interface TeamMemberCreatePayload {
  user_id: string;
  role_in_team?: string;
  status?: TeamMemberStatus;
}

export interface TeamMemberWorkforceItem {
  user_id: string;
  name?: string;
  email?: string;
  employee_id?: string;
  job_title?: string;
  department?: string;
  job_role_name?: string;
  role_in_team: string;
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

export interface TeamAIWorkforceResponse {
  team_id: string;
  team_name: string;
  department?: string;
  total_members: number;
  active_workforces: number;
  total_agents: number;
  members: TeamMemberWorkforceItem[];
}

export interface TeamAIRoute {
  id: string;
  team_id: string;
  organization_id: string;
  source_role_id?: string;
  target_role_id?: string;
  source_user_id?: string;
  target_user_id?: string;
  source_role_name?: string;
  target_role_name?: string;
  source_user_name?: string;
  target_user_name?: string;
  priority: number;
  condition: string;
  description?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamAIRouteCreatePayload {
  source_role_id?: string;
  target_role_id?: string;
  source_user_id?: string;
  target_user_id?: string;
  priority?: number;
  condition?: string;
  description?: string;
  enabled?: boolean;
}

export interface TeamAIRouteUpdatePayload {
  priority?: number;
  condition?: string;
  description?: string;
  enabled?: boolean;
}

export interface TeamAIRouteListResponse {
  routes: TeamAIRoute[];
  total: number;
}

export interface TeamKnowledgeSource {
  id: string;
  team_id: string;
  organization_id: string;
  name: string;
  source_type: string;
  source_identifier: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamKnowledgePolicyUpdatePayload {
  shared_knowledge_enabled?: boolean;
  knowledge_scope?: string;
  memory_isolation_level?: string;
  access_rule?: string;
  accessible_categories?: string[];
  allow_cross_team_query?: boolean;
}

export interface TeamKnowledgeSourceCreatePayload {
  name: string;
  source_type?: string;
  source_identifier: string;
  description?: string;
  is_active?: boolean;
}

export interface TeamKnowledgeSourceUpdatePayload {
  name?: string;
  source_type?: string;
  source_identifier?: string;
  description?: string;
  is_active?: boolean;
}

export interface TeamKnowledgeOverviewResponse {
  team_id: string;
  shared_knowledge_enabled: boolean;
  knowledge_scope: string;
  memory_isolation_level: string;
  access_rule: string;
  accessible_categories: string[];
  allow_cross_team_query: boolean;
  sources: TeamKnowledgeSource[];
  total_sources: number;
}

export interface TeamAIRuntimeStats {
  total_executions: number;
  completed_executions: number;
  failed_executions: number;
  running_executions: number;
  pending_approvals: number;
  verified_evidences: number;
  avg_execution_duration_seconds?: number;
}

export interface TeamMemberRuntimeStats {
  user_id: string;
  name: string;
  role_in_team: string;
  job_role_name?: string;
  agent_group_id?: string;
  agent_group_name?: string;
  total_agents: number;
  total_executions: number;
  completed_executions: number;
  failed_executions: number;
  running_executions: number;
}

export interface TeamMemberWorkloadStatus {
  user_id: string;
  name: string;
  role_in_team: string;
  job_role_name?: string;
  active_tasks?: number | null;
  in_progress?: number | null;
  blocked?: number | null;
  completed?: number | null;
  is_available: boolean;
  status_message: string;
}

export interface TeamMetricsOverviewResponse {
  team_id: string;
  ai_runtime_metrics: TeamAIRuntimeStats;
  member_runtime_breakdown: TeamMemberRuntimeStats[];
  workload_metrics_integrated: boolean;
  workload_status_message: string;
  member_workloads: TeamMemberWorkloadStatus[];
  project_velocity_integrated: boolean;
  project_velocity_message: string;
}
