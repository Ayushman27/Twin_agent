import { apiClient } from "./api-client";
import type {
  ConnectGithubPayload,
  ConnectJiraPayload,
  Project,
  ProjectAIWorkforceResponse,
  ProjectCreatePayload,
  ProjectDeliveryAnalyticsResponse,
  ProjectDetail,
  ProjectHealthDiagnosticsResponse,
  ProjectIntegration,
  ProjectListResponse,
  ProjectMember,
  ProjectMemberCreatePayload,
  ProjectMemberUpdatePayload,
  ProjectMilestone,
  ProjectMilestoneCreatePayload,
  ProjectMilestoneUpdatePayload,
  ProjectTask,
  ProjectTaskCreatePayload,
  ProjectTaskUpdatePayload,
  ProjectUpdatePayload,
} from "../types/project";

export const projectService = {
  /**
   * List all projects for an organization with optional filters & search.
   */
  async getProjects(
    orgId: string,
    params?: {
      status?: string;
      priority?: string;
      risk_level?: string;
      team_id?: string;
      owner_id?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<ProjectListResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.priority) query.append("priority", params.priority);
    if (params?.risk_level) query.append("risk_level", params.risk_level);
    if (params?.team_id) query.append("team_id", params.team_id);
    if (params?.owner_id) query.append("owner_id", params.owner_id);
    if (params?.search) query.append("search", params.search);
    if (params?.limit !== undefined) query.append("limit", params.limit.toString());
    if (params?.offset !== undefined) query.append("offset", params.offset.toString());

    const queryString = query.toString() ? `?${query.toString()}` : "";
    return await apiClient.get<ProjectListResponse>(
      `/organizations/${orgId}/projects${queryString}`
    );
  },

  /**
   * Get single project details including owner, team, and members.
   */
  async getProject(orgId: string, projectId: string): Promise<ProjectDetail> {
    return await apiClient.get<ProjectDetail>(
      `/organizations/${orgId}/projects/${projectId}`
    );
  },

  /**
   * Create a new project in the organization (Admin only).
   */
  async createProject(
    orgId: string,
    payload: ProjectCreatePayload
  ): Promise<Project> {
    return await apiClient.post<Project>(
      `/organizations/${orgId}/projects`,
      payload
    );
  },

  /**
   * Update an existing project configuration or status (Admin only).
   */
  async updateProject(
    orgId: string,
    projectId: string,
    payload: ProjectUpdatePayload
  ): Promise<Project> {
    return await apiClient.patch<Project>(
      `/organizations/${orgId}/projects/${projectId}`,
      payload
    );
  },

  /**
   * Archive or permanently delete a project (Admin only).
   */
  async deleteProject(orgId: string, projectId: string): Promise<void> {
    await apiClient.delete(`/organizations/${orgId}/projects/${projectId}`);
  },

  /**
   * List enrolled members for a specific project.
   */
  async getProjectMembers(orgId: string, projectId: string): Promise<ProjectMember[]> {
    return await apiClient.get<ProjectMember[]>(
      `/organizations/${orgId}/projects/${projectId}/members`
    );
  },

  /**
   * Add / enroll an employee as a project member (Admin only).
   */
  async addProjectMember(
    orgId: string,
    projectId: string,
    payload: ProjectMemberCreatePayload
  ): Promise<ProjectMember> {
    return await apiClient.post<ProjectMember>(
      `/organizations/${orgId}/projects/${projectId}/members`,
      payload
    );
  },

  /**
   * Update a project member's project role or status (Admin only).
   */
  async updateProjectMember(
    orgId: string,
    projectId: string,
    employeeId: string,
    payload: ProjectMemberUpdatePayload
  ): Promise<ProjectMember> {
    return await apiClient.patch<ProjectMember>(
      `/organizations/${orgId}/projects/${projectId}/members/${employeeId}`,
      payload
    );
  },

  /**
   * Remove a member from a project (Admin only).
   */
  async removeProjectMember(
    orgId: string,
    projectId: string,
    employeeId: string
  ): Promise<void> {
    await apiClient.delete(
      `/organizations/${orgId}/projects/${projectId}/members/${employeeId}`
    );
  },

  /**
   * List all milestones for a project.
   */
  async getProjectMilestones(
    orgId: string,
    projectId: string
  ): Promise<ProjectMilestone[]> {
    return await apiClient.get<ProjectMilestone[]>(
      `/organizations/${orgId}/projects/${projectId}/milestones`
    );
  },

  /**
   * Create a milestone in a project (Admin only).
   */
  async createProjectMilestone(
    orgId: string,
    projectId: string,
    payload: ProjectMilestoneCreatePayload
  ): Promise<ProjectMilestone> {
    return await apiClient.post<ProjectMilestone>(
      `/organizations/${orgId}/projects/${projectId}/milestones`,
      payload
    );
  },

  /**
   * Update a project milestone (Admin only).
   */
  async updateProjectMilestone(
    orgId: string,
    projectId: string,
    milestoneId: string,
    payload: ProjectMilestoneUpdatePayload
  ): Promise<ProjectMilestone> {
    return await apiClient.patch<ProjectMilestone>(
      `/organizations/${orgId}/projects/${projectId}/milestones/${milestoneId}`,
      payload
    );
  },

  /**
   * Delete a project milestone (Admin only).
   */
  async deleteProjectMilestone(
    orgId: string,
    projectId: string,
    milestoneId: string
  ): Promise<void> {
    await apiClient.delete(
      `/organizations/${orgId}/projects/${projectId}/milestones/${milestoneId}`
    );
  },

  /**
   * List all tasks for a project with optional filters.
   */
  async getProjectTasks(
    orgId: string,
    projectId: string,
    filters?: { milestone_id?: string; assignee_id?: string; status?: string }
  ): Promise<ProjectTask[]> {
    const params = new URLSearchParams();
    if (filters?.milestone_id) params.append("milestone_id", filters.milestone_id);
    if (filters?.assignee_id) params.append("assignee_id", filters.assignee_id);
    if (filters?.status) params.append("status", filters.status);

    const qs = params.toString() ? `?${params.toString()}` : "";
    return await apiClient.get<ProjectTask[]>(
      `/organizations/${orgId}/projects/${projectId}/tasks${qs}`
    );
  },

  /**
   * Create a task in a project (Admin only).
   */
  async createProjectTask(
    orgId: string,
    projectId: string,
    payload: ProjectTaskCreatePayload
  ): Promise<ProjectTask> {
    return await apiClient.post<ProjectTask>(
      `/organizations/${orgId}/projects/${projectId}/tasks`,
      payload
    );
  },

  /**
   * Update a project task (Admin only).
   */
  async updateProjectTask(
    orgId: string,
    projectId: string,
    taskId: string,
    payload: ProjectTaskUpdatePayload
  ): Promise<ProjectTask> {
    return await apiClient.patch<ProjectTask>(
      `/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`,
      payload
    );
  },

  /**
   * Delete a project task (Admin only).
   */
  async deleteProjectTask(
    orgId: string,
    projectId: string,
    taskId: string
  ): Promise<void> {
    await apiClient.delete(
      `/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`
    );
  },

  /**
   * Get aggregated AI Workforce topology for a project.
   */
  async getProjectAIWorkforce(
    orgId: string,
    projectId: string
  ): Promise<ProjectAIWorkforceResponse> {
    return await apiClient.get<ProjectAIWorkforceResponse>(
      `/organizations/${orgId}/projects/${projectId}/ai-workforce`
    );
  },

  /**
   * List all integrations for a project.
   */
  async getProjectIntegrations(
    orgId: string,
    projectId: string
  ): Promise<ProjectIntegration[]> {
    return await apiClient.get<ProjectIntegration[]>(
      `/organizations/${orgId}/projects/${projectId}/integrations`
    );
  },

  /**
   * Connect or update GitHub repository integration.
   */
  async connectGithub(
    orgId: string,
    projectId: string,
    payload: ConnectGithubPayload
  ): Promise<ProjectIntegration> {
    return await apiClient.post<ProjectIntegration>(
      `/organizations/${orgId}/projects/${projectId}/integrations/github/connect`,
      payload
    );
  },

  /**
   * Disconnect GitHub repository integration.
   */
  async disconnectGithub(
    orgId: string,
    projectId: string
  ): Promise<ProjectIntegration> {
    return await apiClient.post<ProjectIntegration>(
      `/organizations/${orgId}/projects/${projectId}/integrations/github/disconnect`
    );
  },

  /**
   * Connect or update Jira project integration.
   */
  async connectJira(
    orgId: string,
    projectId: string,
    payload: ConnectJiraPayload
  ): Promise<ProjectIntegration> {
    return await apiClient.post<ProjectIntegration>(
      `/organizations/${orgId}/projects/${projectId}/integrations/jira/connect`,
      payload
    );
  },

  /**
   * Disconnect Jira project integration.
   */
  async disconnectJira(
    orgId: string,
    projectId: string
  ): Promise<ProjectIntegration> {
    return await apiClient.post<ProjectIntegration>(
      `/organizations/${orgId}/projects/${projectId}/integrations/jira/disconnect`
    );
  },

  /**
   * Trigger sync for an external integration.
   */
  async syncProjectIntegration(
    orgId: string,
    projectId: string,
    integrationId: string
  ): Promise<ProjectIntegration> {
    return await apiClient.post<ProjectIntegration>(
      `/organizations/${orgId}/projects/${projectId}/integrations/${integrationId}/sync`
    );
  },

  /**
   * Delete an external integration record.
   */
  async deleteProjectIntegration(
    orgId: string,
    projectId: string,
    integrationId: string
  ): Promise<void> {
    await apiClient.delete(
      `/organizations/${orgId}/projects/${projectId}/integrations/${integrationId}`
    );
  },

  /**
   * Get deterministic project health, milestone health, blockers, and overdue tasks.
   */
  async getProjectHealth(
    orgId: string,
    projectId: string
  ): Promise<ProjectHealthDiagnosticsResponse> {
    return await apiClient.get<ProjectHealthDiagnosticsResponse>(
      `/organizations/${orgId}/projects/${projectId}/health`
    );
  },

  /**
   * Get deterministic project delivery analytics for overview dashboard.
   */
  async getProjectAnalytics(
    orgId: string,
    projectId: string
  ): Promise<ProjectDeliveryAnalyticsResponse> {
    return await apiClient.get<ProjectDeliveryAnalyticsResponse>(
      `/organizations/${orgId}/projects/${projectId}/analytics`
    );
  },
};



