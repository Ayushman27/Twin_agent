export type AgentStatus = "idle" | "planning" | "running" | "waiting_approval" | "completed" | "failed";

export interface Agent {
  id: string;
  name: string;
  type: "orchestrator" | "pm" | "developer" | "designer" | "qa" | "devops" | "other";
  status: AgentStatus;
  currentTaskId?: string;
  assignedEmployeeId?: string;
  health: "healthy" | "degraded" | "down";
  lastActivityAt: string;
  parentAgentId?: string;
}

export interface AgentExecution {
  id: string;
  agentId: string;
  taskId: string;
  startedAt: string;
  durationMs: number;
  status: AgentStatus;
  modelUsed: "slm" | "llm";
  toolCalls: number;
  verificationScore: number;
  approvalStatus: "not_required" | "pending" | "approved" | "rejected";
}

export interface AgentActivityEvent {
  id: string;
  agentId: string;
  type:
    | "agent.started" | "agent.planning" | "agent.tool_called"
    | "agent.waiting_approval" | "agent.completed" | "agent.failed";
  message: string;
  timestamp: string;
}
