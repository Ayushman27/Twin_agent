export type Role = "CEO" | "MANAGER" | "DEVELOPER" | "QA" | "HR" | "EMPLOYEE";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  organizationId: string;
}

export interface Permission {
  resource: string;
  actions: Array<"view" | "create" | "edit" | "delete" | "approve">;
}
