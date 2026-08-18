export interface HumanTwin {
  employeeId: string;
  persona: string;
  communicationPreferences: string[];
  skills: string[];
  workingHours: string;
  preferences: Record<string, string>;
  tools: string[];
  permissions: string[];
  completenessPercent: number;
}

export interface RoleTwin {
  roleId: string;
  responsibilities: string[];
  policies: string[];
  standards: string[];
  knowledgeBaseIds: string[];
  expectedBehavior: string[];
}

export interface WorkTwin {
  employeeId: string;
  currentProjectId?: string;
  currentTaskId?: string;
  deadlines: { taskId: string; dueDate: string }[];
  blockers: string[];
  recentActivity: string[];
}
