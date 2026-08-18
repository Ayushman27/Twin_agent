import { config } from "@/lib/config";
import { apiClient } from "@/services/api-client";
import type { Employee } from "@/types";
import { mockEmployees } from "@/lib/mock";

export const organizationService = {
  async list(): Promise<Employee[]> {
    if (config.useMocks) return Promise.resolve(mockEmployees);
    return apiClient.get<Employee[]>("/employees");
  },

  async getById(id: string): Promise<Employee | undefined> {
    if (config.useMocks) return Promise.resolve(mockEmployees.find((x) => x.id === id));
    return apiClient.get<Employee>(`/employees/${id}`);
  },
};
