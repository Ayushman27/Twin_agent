export interface Organization {
  id: string;
  name: string;
}

export interface PublicCompany {
  id: string;
  company_name: string;
  industry?: string;
  city?: string;
  country?: string;
}

export interface Employee {
  id: string;
  name: string;
  avatarUrl?: string;
  department: string;
  roleId: string;
  managerId?: string;
  skills: string[];
  currentProjectId?: string;
  currentTaskId?: string;
  availability: "available" | "busy" | "offline";
  twinStatus: "active" | "incomplete" | "inactive";
  agentStatus: "idle" | "running" | "error";
}

export interface Team {
  id: string;
  name: string;
  managerId: string;
  memberIds: string[];
  projectIds: string[];
  workloadPercent: number;
  performanceScore: number;
}

export interface JobRole {
  id: string;
  name: string;
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  knowledgeSourceIds: string[];
  assignedEmployeeIds: string[];
  roleTwinStatus: "active" | "incomplete";
}

export interface Project {
  id: string;
  name: string;
  managerId: string;
  teamId: string;
  progressPercent: number;
  taskIds: string[];
  risks: string[];
  dependencies: string[];
  githubRepo?: string;
  jiraProjectKey?: string;
}
