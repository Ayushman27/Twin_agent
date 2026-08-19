export type Role =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "MANAGER"
  | "DEVELOPER"
  | "QA"
  | "HR"
  | "EMPLOYEE"
  | "DEMO_USER"
  | string;

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  job_title?: string;
  phone?: string;
  is_active?: boolean;
  organizationId?: string;
  organization_id?: string;
  created_at?: string;
}

export interface Permission {
  resource: string;
  actions: Array<"view" | "create" | "edit" | "delete" | "approve">;
}
