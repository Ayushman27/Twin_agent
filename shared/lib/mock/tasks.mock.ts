import type { Task } from "../../types";

export const mockTasks: Task[] = [
  { id: "task_1", title: "Implement login API", requirement: "OIDC-ready login endpoint", projectId: "proj_1", status: "IN_PROGRESS", priority: "high", assignedEmployeeId: "emp_1", assignedAgentId: "agt_dev", riskLevel: "low", verificationStatus: "unverified" },
  { id: "task_2", title: "Write E2E tests for approvals", requirement: "Playwright coverage", projectId: "proj_1", status: "PENDING_APPROVAL", priority: "medium", assignedEmployeeId: "emp_2", assignedAgentId: "agt_qa", riskLevel: "medium", verificationStatus: "verified" },
];
