import { config } from "@shared/lib/config";
import { apiClient } from "@shared/services/api-client";
import type { HumanTwin, RoleTwin, WorkTwin } from "@shared/types";

export const twinService = {
  async getHumanTwin(employeeId: string): Promise<HumanTwin> {
    if (config.useMocks) {
      return {
        employeeId, persona: "Pragmatic, detail-oriented collaborator.",
        communicationPreferences: ["Async first", "Concise updates"],
        skills: ["TypeScript", "System design"], workingHours: "9am-6pm IST",
        preferences: { tone: "direct" }, tools: ["GitHub", "Jira"],
        permissions: ["read:code", "write:tasks"], completenessPercent: 82,
      };
    }
    return apiClient.get<HumanTwin>(`/twins/human/${employeeId}`);
  },

  async getRoleTwin(roleId: string): Promise<RoleTwin> {
    if (config.useMocks) {
      return {
        roleId, responsibilities: ["Ship features", "Review PRs"],
        policies: ["Two-approval merge policy"], standards: ["ESLint strict"],
        knowledgeBaseIds: ["kb_eng"], expectedBehavior: ["Write tests for new code"],
      };
    }
    return apiClient.get<RoleTwin>(`/twins/role/${roleId}`);
  },

  async getWorkTwin(employeeId: string): Promise<WorkTwin> {
    if (config.useMocks) {
      return {
        employeeId, currentProjectId: "proj_1", currentTaskId: "task_1",
        deadlines: [{ taskId: "task_1", dueDate: new Date().toISOString() }],
        blockers: [], recentActivity: ["Opened PR #42", "Resolved review comments"],
      };
    }
    return apiClient.get<WorkTwin>(`/twins/work/${employeeId}`);
  },
};
