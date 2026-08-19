import { config } from "@shared/lib/config";
import { apiClient } from "@shared/services/api-client";
import type { Agent } from "@shared/types";
import { mockAgents } from "@shared/lib/mock";

export const agentService = {
  async list(): Promise<Agent[]> {
    if (config.useMocks) return Promise.resolve(mockAgents);
    return apiClient.get<Agent[]>("/agents");
  },

  async getById(id: string): Promise<Agent | undefined> {
    if (config.useMocks) return Promise.resolve(mockAgents.find((x) => x.id === id));
    return apiClient.get<Agent>(`/agents/${id}`);
  },
};
