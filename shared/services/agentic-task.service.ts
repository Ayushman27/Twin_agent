import { apiClient } from "./api-client";

export interface TaskPlanStep {
  step_number: number;
  description: string;
  status: string;
}

export interface TaskPlan {
  task_understanding: string;
  steps: TaskPlanStep[];
  research_required: boolean;
  expected_output: string;
  acceptance_criteria: string[];
}

export interface ResearchResult {
  research_required: boolean;
  findings: string[];
  sources: string[];
  summary: string;
}

export interface VerificationResult {
  status: "PASS" | "REWORK";
  score: number;
  reason: string;
  missing_items: string[];
  feedback: string;
}

export interface ActionRecord {
  id?: string;
  execution_id?: string;
  task_id: string;
  agent_name: string;
  action: string;
  status: string;
  timestamp?: string;
  created_at?: string;
  input_summary?: string;
  output_summary?: string;
  error?: string;
  retry_number: number;
}

export interface ExecutionRecord {
  id: string;
  task_id: string;
  employee_id: string;
  organization_id: string;
  status: "PENDING" | "PLANNING" | "RESEARCHING" | "PROCESSING" | "VERIFYING" | "REWORKING" | "COMPLETED" | "FAILED";
  original_task: string;
  role?: string;
  plan?: TaskPlan;
  research_results?: ResearchResult;
  result?: {
    title: string;
    executor_role: string;
    status: string;
    content: string;
    artifacts?: Array<{ type: string; title: string; content: string }>;
    execution_metadata?: Record<string, any>;
  };
  verification_result?: VerificationResult;
  retry_count: number;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
  actions?: ActionRecord[];
}

export interface ExecutionResponse {
  execution_id?: string;
  task_id: string;
  status: "PENDING" | "PLANNING" | "RESEARCHING" | "PROCESSING" | "VERIFYING" | "REWORKING" | "COMPLETED" | "FAILED";
  original_task: string;
  role: string;
  plan?: TaskPlan;
  research_results?: ResearchResult;
  result?: {
    title: string;
    executor_role: string;
    status: string;
    content: string;
    artifacts?: Array<{ type: string; title: string; content: string }>;
    execution_metadata?: Record<string, any>;
  };
  verification_result?: VerificationResult;
  retry_count: number;
  actions: ActionRecord[];
}

export interface ExecuteTaskPayload {
  task_id?: string;
  task: string;
  employee_id?: string;
  organization_id?: string;
  role?: string;
  max_retries?: number;
}

export interface AssignTaskPayload {
  employee_id: string;
  task: string;
  organization_id?: string;
  role?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  auto_execute?: boolean;
}

export const agenticTaskService = {
  async executeTask(payload: ExecuteTaskPayload): Promise<ExecutionResponse> {
    return apiClient.post<ExecutionResponse>("/agentic/tasks/execute", payload);
  },

  async assignTask(payload: AssignTaskPayload): Promise<{
    success: boolean;
    message: string;
    execution_id?: string;
    task_id: string;
    status: string;
    result?: any;
  }> {
    return apiClient.post("/agentic/tasks/assign", payload);
  },

  async listExecutions(limit: number = 50): Promise<ExecutionRecord[]> {
    return apiClient.get<ExecutionRecord[]>(`/agentic/executions?limit=${limit}`);
  },

  async getExecution(executionId: string): Promise<ExecutionRecord> {
    return apiClient.get<ExecutionRecord>(`/agentic/executions/${executionId}`);
  },

  async getActions(executionId: string): Promise<ActionRecord[]> {
    return apiClient.get<ActionRecord[]>(`/agentic/executions/${executionId}/actions`);
  },

  async listAllLogs(limit: number = 100, executionId?: string): Promise<ActionRecord[]> {
    const query = executionId ? `?limit=${limit}&execution_id=${executionId}` : `?limit=${limit}`;
    return apiClient.get<ActionRecord[]>(`/agentic/logs${query}`);
  },

  async listTaskExecutions(taskId: string): Promise<any[]> {
    return apiClient.get<any[]>(`/agentic/tasks/${taskId}/executions`);
  },
};
