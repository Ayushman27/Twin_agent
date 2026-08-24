export type RoleStatus = "ACTIVE" | "INACTIVE" | "DRAFT";
export type RoleRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RoleCapabilitySummary {
  id: string;
  name: string;
  description: string;
  risk_level: string;
  approval_required: boolean;
  enabled: boolean;
  version: string;
  required_tools?: string[];
  required_permissions?: string[];
}

export interface OrganizationRole {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  department?: string | null;
  responsibilities: string[];
  required_skills: string[];
  tools: string[];
  permissions: string[];
  persona: Record<string, any>;
  risk_level: RoleRiskLevel;
  approval_rules: Record<string, any>;
  status: RoleStatus;
  employee_count?: number;
  capabilities_count?: number;
  agent_groups_count?: number;
  created_at: string;
  updated_at: string;
  capabilities?: RoleCapabilitySummary[];
}

export type OrgRole = OrganizationRole;

export interface RoleCreatePayload {
  name: string;
  description?: string;
  department?: string;
  responsibilities?: string[];
  required_skills?: string[];
  tools?: string[];
  permissions?: string[];
  persona?: Record<string, any>;
  risk_level?: RoleRiskLevel;
  approval_rules?: Record<string, any>;
  status?: RoleStatus;
}

export interface RoleUpdatePayload {
  name?: string;
  description?: string;
  department?: string;
  responsibilities?: string[];
  required_skills?: string[];
  tools?: string[];
  permissions?: string[];
  persona?: Record<string, any>;
  risk_level?: RoleRiskLevel;
  approval_rules?: Record<string, any>;
  status?: RoleStatus;
}

export interface RoleListResponse {
  roles: OrganizationRole[];
  total: number;
}

export interface RoleCapabilitiesUpdateRequest {
  capabilities: string[];
}

export interface RoleCapabilitiesListResponse {
  role_id: string;
  role_name: string;
  capabilities: RoleCapabilitySummary[];
  total: number;
}

export interface EmployeeRoleAssignPayload {
  role_id: string;
}

export interface EmployeeRoleAssignmentResponse {
  id?: string | null;
  organization_id: string;
  user_id: string;
  employee_name?: string | null;
  employee_email?: string | null;
  membership_role: string;
  assigned_role?: OrganizationRole | null;
  status: string;
  assigned_by?: string | null;
  assigned_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}
