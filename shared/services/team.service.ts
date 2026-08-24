import { apiClient } from "./api-client";
import type {
  Team,
  TeamAIWorkforceResponse,
  TeamCreatePayload,
  TeamDetail,
  TeamListResponse,
  TeamMember,
  TeamMemberCreatePayload,
  TeamStatus,
  TeamUpdatePayload,
} from "../types/team";

export const teamService = {
  /**
   * List organizational teams with optional search and filters.
   */
  async getTeams(
    organizationId: string,
    params?: {
      department?: string;
      status?: TeamStatus;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<TeamListResponse> {
    return apiClient.get<TeamListResponse>(`/organizations/${organizationId}/teams`, {
      params: {
        department: params?.department,
        status: params?.status,
        search: params?.search,
        limit: params?.limit,
        offset: params?.offset,
      },
    });
  },

  /**
   * Get single team details including member roster.
   */
  async getTeam(organizationId: string, teamId: string): Promise<TeamDetail> {
    return apiClient.get<TeamDetail>(`/organizations/${organizationId}/teams/${teamId}`);
  },

  /**
   * Create a new organizational Team.
   */
  async createTeam(organizationId: string, payload: TeamCreatePayload): Promise<Team> {
    return apiClient.post<Team>(`/organizations/${organizationId}/teams`, payload);
  },

  /**
   * Update an existing team.
   */
  async updateTeam(
    organizationId: string,
    teamId: string,
    payload: TeamUpdatePayload
  ): Promise<Team> {
    return apiClient.patch<Team>(`/organizations/${organizationId}/teams/${teamId}`, payload);
  },

  /**
   * Delete / archive a team.
   */
  async deleteTeam(organizationId: string, teamId: string): Promise<void> {
    return apiClient.delete<void>(`/organizations/${organizationId}/teams/${teamId}`);
  },

  /**
   * List members of a team.
   */
  async getTeamMembers(organizationId: string, teamId: string): Promise<TeamMember[]> {
    return apiClient.get<TeamMember[]>(`/organizations/${organizationId}/teams/${teamId}/members`);
  },

  /**
   * Add a member to a team.
   */
  async addTeamMember(
    organizationId: string,
    teamId: string,
    payload: TeamMemberCreatePayload
  ): Promise<TeamMember> {
    return apiClient.post<TeamMember>(
      `/organizations/${organizationId}/teams/${teamId}/members`,
      payload
    );
  },

  /**
   * Remove a member from a team.
   */
  async removeTeamMember(
    organizationId: string,
    teamId: string,
    userId: string
  ): Promise<void> {
    return apiClient.delete<void>(
      `/organizations/${organizationId}/teams/${teamId}/members/${userId}`
    );
  },

  /**
   * Get aggregated AI Workforce data for all members of a Team.
   */
  async getTeamAIWorkforce(
    organizationId: string,
    teamId: string
  ): Promise<TeamAIWorkforceResponse> {
    return apiClient.get<TeamAIWorkforceResponse>(
      `/organizations/${organizationId}/teams/${teamId}/ai-workforce`
    );
  },

  /**
   * List AI Mesh Routing rules for a team.
   */
  async listTeamRoutes(
    organizationId: string,
    teamId: string
  ): Promise<import("../types/team").TeamAIRouteListResponse> {
    return apiClient.get<import("../types/team").TeamAIRouteListResponse>(
      `/organizations/${organizationId}/teams/${teamId}/routes`
    );
  },

  /**
   * Create an AI Mesh Routing rule for a team.
   */
  async createTeamRoute(
    organizationId: string,
    teamId: string,
    payload: import("../types/team").TeamAIRouteCreatePayload
  ): Promise<import("../types/team").TeamAIRoute> {
    return apiClient.post<import("../types/team").TeamAIRoute>(
      `/organizations/${organizationId}/teams/${teamId}/routes`,
      payload
    );
  },

  /**
   * Update an AI Mesh Routing rule (priority, condition, enabled).
   */
  async updateTeamRoute(
    organizationId: string,
    teamId: string,
    routeId: string,
    payload: import("../types/team").TeamAIRouteUpdatePayload
  ): Promise<import("../types/team").TeamAIRoute> {
    return apiClient.patch<import("../types/team").TeamAIRoute>(
      `/organizations/${organizationId}/teams/${teamId}/routes/${routeId}`,
      payload
    );
  },

  /**
   * Delete an AI Mesh Routing rule.
   */
  async deleteTeamRoute(
    organizationId: string,
    teamId: string,
    routeId: string
  ): Promise<void> {
    return apiClient.delete<void>(
      `/organizations/${organizationId}/teams/${teamId}/routes/${routeId}`
    );
  },

  /**
   * Get team knowledge policy & configured knowledge sources.
   */
  async getTeamKnowledge(
    organizationId: string,
    teamId: string
  ): Promise<import("../types/team").TeamKnowledgeOverviewResponse> {
    return apiClient.get<import("../types/team").TeamKnowledgeOverviewResponse>(
      `/organizations/${organizationId}/teams/${teamId}/knowledge`
    );
  },

  /**
   * Update team knowledge access policy and memory isolation.
   */
  async updateTeamKnowledgePolicy(
    organizationId: string,
    teamId: string,
    payload: import("../types/team").TeamKnowledgePolicyUpdatePayload
  ): Promise<import("../types/team").TeamKnowledgeOverviewResponse> {
    return apiClient.put<import("../types/team").TeamKnowledgeOverviewResponse>(
      `/organizations/${organizationId}/teams/${teamId}/knowledge/policy`,
      payload
    );
  },

  /**
   * Create an explicit team knowledge source configuration.
   */
  async createTeamKnowledgeSource(
    organizationId: string,
    teamId: string,
    payload: import("../types/team").TeamKnowledgeSourceCreatePayload
  ): Promise<import("../types/team").TeamKnowledgeSource> {
    return apiClient.post<import("../types/team").TeamKnowledgeSource>(
      `/organizations/${organizationId}/teams/${teamId}/knowledge/sources`,
      payload
    );
  },

  /**
   * Update a team knowledge source configuration.
   */
  async updateTeamKnowledgeSource(
    organizationId: string,
    teamId: string,
    sourceId: string,
    payload: import("../types/team").TeamKnowledgeSourceUpdatePayload
  ): Promise<import("../types/team").TeamKnowledgeSource> {
    return apiClient.patch<import("../types/team").TeamKnowledgeSource>(
      `/organizations/${organizationId}/teams/${teamId}/knowledge/sources/${sourceId}`,
      payload
    );
  },

  /**
   * Delete a team knowledge source configuration.
   */
  async deleteTeamKnowledgeSource(
    organizationId: string,
    teamId: string,
    sourceId: string
  ): Promise<void> {
    return apiClient.delete<void>(
      `/organizations/${organizationId}/teams/${teamId}/knowledge/sources/${sourceId}`
    );
  },

  /**
   * Get team runtime execution metrics & workload status.
   */
  async getTeamMetrics(
    organizationId: string,
    teamId: string
  ): Promise<import("../types/team").TeamMetricsOverviewResponse> {
    return apiClient.get<import("../types/team").TeamMetricsOverviewResponse>(
      `/organizations/${organizationId}/teams/${teamId}/metrics`
    );
  },
};
