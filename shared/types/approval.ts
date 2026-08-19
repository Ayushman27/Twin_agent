export interface Approval {
  id: string;
  taskId: string;
  requestedByAgentId: string;
  employeeId: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  proposedAction: string;
  evidenceIds: string[];
  reason: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
}
