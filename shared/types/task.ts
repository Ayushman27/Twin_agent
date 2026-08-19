export type TaskStatus =
  | "NEW" | "PLANNED" | "ASSIGNED" | "IN_PROGRESS" | "BLOCKED"
  | "READY_FOR_REVIEW" | "VERIFICATION" | "PENDING_APPROVAL" | "COMPLETED" | "FAILED";

export interface Task {
  id: string;
  title: string;
  requirement: string;
  projectId: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | "critical";
  assignedEmployeeId?: string;
  assignedAgentId?: string;
  dueDate?: string;
  riskLevel: "low" | "medium" | "high";
  verificationStatus: "unverified" | "verified" | "failed";
}
