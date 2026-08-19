import { config } from "@shared/lib/config";
import { apiClient } from "@shared/services/api-client";
import type { Integration } from "@shared/types";

export const integrationService = {
  async list(): Promise<Integration[]> {
    if (config.useMocks) {
      return [
        { id: "int_gh", name: "github", connected: true, lastSyncAt: new Date().toISOString(), permissions: ["repo:read", "repo:write"], availableActions: ["open_pr", "read_issues"] },
        { id: "int_jira", name: "jira", connected: false, permissions: [], availableActions: [] },
      ];
    }
    return apiClient.get<Integration[]>("/integrations");
  },

  async disconnect(id: string): Promise<void> {
    if (config.useMocks) return Promise.resolve();
    await apiClient.post(`/integrations/${id}/disconnect`);
  },
};
