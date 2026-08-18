import type { Employee } from "@/types";

export const mockEmployees: Employee[] = [
  {
    id: "emp_1", name: "Asha Verma", department: "Engineering", roleId: "role_dev",
    managerId: "emp_3", skills: ["TypeScript", "React", "FastAPI"],
    currentProjectId: "proj_1", currentTaskId: "task_1", availability: "available",
    twinStatus: "active", agentStatus: "running",
  },
  {
    id: "emp_2", name: "Rohit Nair", department: "QA", roleId: "role_qa",
    managerId: "emp_3", skills: ["Playwright", "Test Design"],
    currentProjectId: "proj_1", availability: "busy",
    twinStatus: "active", agentStatus: "idle",
  },
  {
    id: "emp_3", name: "Priya Shah", department: "Engineering", roleId: "role_manager",
    skills: ["Leadership", "Architecture"], currentProjectId: "proj_1",
    availability: "available", twinStatus: "incomplete", agentStatus: "idle",
  },
];
