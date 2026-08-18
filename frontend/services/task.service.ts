import { config } from "@/lib/config";
import { apiClient } from "@/services/api-client";
import type { Task } from "@/types";
import { mockTasks } from "@/lib/mock";

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
