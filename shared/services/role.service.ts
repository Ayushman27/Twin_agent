import { apiClient } from "./api-client";
import type {
  OrganizationRole,
  RoleCreatePayload,
  RoleUpdatePayload,
  RoleListResponse,
  RoleCapabilitiesListResponse,
  RoleCapabilitySummary,
  EmployeeRoleAssignmentResponse,
} from "../types/role";

export const roleService = {
  async getRoles(
    orgId: string,
    params?: { department?: string; status?: string; search?: string; limit?: number; offset?: number }
  ): Promise<RoleListResponse> {
    const qs = new URLSearchParams();
    if (params?.department) qs.set("department", params.department);
    if (params?.status) qs.set("status", params.status);
    if (params?.search) qs.set("search", params.search);
    if (params?.limit) qs.set("limit", params.limit.toString());
    if (params?.offset) qs.set("offset", params.offset.toString());

    const queryString = qs.toString() ? `?${qs.toString()}` : "";
    return await apiClient.get<RoleListResponse>(`/organizations/${orgId}/roles${queryString}`);
  },

  async getRole(orgId: string, roleId: string): Promise<OrganizationRole> {
    return await apiClient.get<OrganizationRole>(`/organizations/${orgId}/roles/${roleId}`);
  },

  async createRole(orgId: string, payload: RoleCreatePayload): Promise<OrganizationRole> {
    return await apiClient.post<OrganizationRole>(`/organizations/${orgId}/roles`, payload);
  },

  async updateRole(orgId: string, roleId: string, payload: RoleUpdatePayload): Promise<OrganizationRole> {
    return await apiClient.patch<OrganizationRole>(`/organizations/${orgId}/roles/${roleId}`, payload);
  },

  async deleteRole(orgId: string, roleId: string): Promise<void> {
    return await apiClient.delete<void>(`/organizations/${orgId}/roles/${roleId}`);
  },

  async getRoleCapabilities(orgId: string, roleId: string): Promise<RoleCapabilitiesListResponse> {
    return await apiClient.get<RoleCapabilitiesListResponse>(`/organizations/${orgId}/roles/${roleId}/capabilities`);
  },

  async updateRoleCapabilities(
    orgId: string,
    roleId: string,
    capabilities: string[]
  ): Promise<RoleCapabilitiesListResponse> {
    return await apiClient.put<RoleCapabilitiesListResponse>(`/organizations/${orgId}/roles/${roleId}/capabilities`, {
      capabilities,
    });
  },

  async getAvailableAgentCapabilities(): Promise<RoleCapabilitySummary[]> {
    return await apiClient.get<RoleCapabilitySummary[]>("/agent-capabilities");
  },

  async getAvailableAgentTools(): Promise<any[]> {
    return await apiClient.get<any[]>("/agent-tools");
  },

  async getEmployeeRole(orgId: string, employeeId: string): Promise<EmployeeRoleAssignmentResponse> {
    return await apiClient.get<EmployeeRoleAssignmentResponse>(
      `/organizations/${orgId}/employees/${employeeId}/role`
    );
  },

  async assignEmployeeRole(
    orgId: string,
    employeeId: string,
    roleId: string
  ): Promise<EmployeeRoleAssignmentResponse> {
    return await apiClient.put<EmployeeRoleAssignmentResponse>(
      `/organizations/${orgId}/employees/${employeeId}/role`,
      { role_id: roleId }
    );
  },

  async provisionEmployeeWorkforce(
    orgId: string,
    employeeId: string,
    payload?: { role_id?: string; force_regenerate?: boolean }
  ): Promise<any> {
    return await apiClient.post<any>(
      `/organizations/${orgId}/employees/${employeeId}/agent-workforce/provision`,
      payload || {}
    );
  },

  async getEmployeeAgentWorkforce(orgId: string, employeeId: string): Promise<any> {
    return await apiClient.get<any>(
      `/organizations/${orgId}/employees/${employeeId}/agent-workforce`
    );
  },

  async getEmployeeAgentGroup(empId: string): Promise<any> {
    return await apiClient.get<any>(`/employees/${empId}/agent-group`);
  },
};
