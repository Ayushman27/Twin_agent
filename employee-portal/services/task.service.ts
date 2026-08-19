import { config } from "@shared/lib/config";
import { apiClient } from "@shared/services/api-client";
import type { Task } from "@shared/types";
import { mockTasks } from "@shared/lib/mock";

export const taskService = {
  async list(): Promise<Task[]> {
    if (config.useMocks) return Promise.resolve(mockTasks);
    return apiClient.get<Task[]>("/tasks");
  },

  async getById(id: string): Promise<Task | undefined> {
    if (config.useMocks) return Promise.resolve(mockTasks.find((x) => x.id === id));
    return apiClient.get<Task>(`/tasks/${id}`);
  },
};
