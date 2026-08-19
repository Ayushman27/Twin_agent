import { config } from "@shared/lib/config";
import { apiClient } from "@shared/services/api-client";
import type { Approval } from "@shared/types";

export const approvalService = {
  async list(): Promise<Approval[]> {
    if (config.useMocks) {
      return [{
        id: "appr_1", taskId: "task_2", requestedByAgentId: "agt_qa",
        employeeId: "emp_2", riskLevel: "medium",
        proposedAction: "Merge PR #42 to main", evidenceIds: ["ev_1"],
        reason: "All checks passed, verification score 0.94",
        createdAt: new Date().toISOString(), status: "pending",
      }];
    }
    return apiClient.get<Approval[]>("/approvals");
  },

  async decide(id: string, decision: "approved" | "rejected" | "changes_requested"): Promise<void> {
    if (config.useMocks) return Promise.resolve();
    await apiClient.patch(`/approvals/${id}`, { status: decision });
  },
};
