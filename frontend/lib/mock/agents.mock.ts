import type { Agent, AgentExecution, AgentActivityEvent } from "@/types";

export const mockAgents: Agent[] = [
  { id: "agt_orch", name: "Orchestrator", type: "orchestrator", status: "running", health: "healthy", lastActivityAt: new Date().toISOString() },
  { id: "agt_pm", name: "Product Manager Agent", type: "pm", status: "planning", health: "healthy", lastActivityAt: new Date().toISOString(), parentAgentId: "agt_orch" },
  { id: "agt_dev", name: "Developer Agent", type: "developer", status: "running", assignedEmployeeId: "emp_1", health: "healthy", lastActivityAt: new Date().toISOString(), parentAgentId: "agt_orch" },
  { id: "agt_qa", name: "QA Agent", type: "qa", status: "idle", assignedEmployeeId: "emp_2", health: "healthy", lastActivityAt: new Date().toISOString(), parentAgentId: "agt_orch" },
];

export const mockExecutions: AgentExecution[] = [
  {
    id: "exec_1", agentId: "agt_dev", taskId: "task_1", startedAt: new Date().toISOString(),
    durationMs: 42_000, status: "completed", modelUsed: "slm", toolCalls: 4,
    verificationScore: 0.94, approvalStatus: "approved",
  },
];

export const mockActivity: AgentActivityEvent[] = [
  { id: "act_1", agentId: "agt_dev", type: "agent.started", message: "Developer Agent started task_1", timestamp: new Date().toISOString() },
  { id: "act_2", agentId: "agt_dev", type: "agent.tool_called", message: "Called GitHub: open PR", timestamp: new Date().toISOString() },
  { id: "act_3", agentId: "agt_dev", type: "agent.waiting_approval", message: "Requested human approval", timestamp: new Date().toISOString() },
];
