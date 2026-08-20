export interface HumanAgentProfile {
  id: string;
  employeeId: string;
  name: string;
  avatarUrl?: string;
  role: string;
  department: string;
  status: "Synchronized" | "Calibrating" | "Offline";
  completeness: number; // e.g. 87
  persona: {
    communicationStyle: string;
    preferredTone: string;
    decisionStyle: string;
    workStyle: string;
    collaborationStyle: string;
    meetingPreference: string;
  };
  skills: Array<{
    name: string;
    percentage: number;
  }>;
  workProfile: {
    workingHours: string;
    availability: string;
    currentProject: string;
    currentTasks: string;
    workload: string;
    experience: string;
  };
  tools: Array<{
    id: string;
    name: string;
    icon: string;
    connected: boolean;
    accessLevel: string;
  }>;
  memoryContext: {
    recentWork: string[];
    pastTasks: string[];
    importantPreferences: string[];
    learnedPatterns: string[];
    recentInteractions: string[];
  };
}

export const mockHumanAgent: HumanAgentProfile = {
  id: "human-twin-001",
  employeeId: "emp-7749",
  name: "Rohan Mehta",
  role: "Software Engineer",
  department: "Engineering & Core Systems",
  status: "Synchronized",
  completeness: 87,
  persona: {
    communicationStyle: "Concise + Technical",
    preferredTone: "Direct & Structured",
    decisionStyle: "Evidence Driven",
    workStyle: "Independent & Focused",
    collaborationStyle: "Asynchronous First",
    meetingPreference: "Minimal (Async Updates Preferred)",
  },
  skills: [
    { name: "Python", percentage: 90 },
    { name: "FastAPI", percentage: 82 },
    { name: "React / Next.js", percentage: 75 },
    { name: "Docker & K8s", percentage: 80 },
    { name: "Git & CI/CD", percentage: 90 },
    { name: "Rust", percentage: 65 },
    { name: "System Architecture", percentage: 88 },
  ],
  workProfile: {
    workingHours: "09:00 - 18:00 EST (UTC-5)",
    availability: "Active • In Deep Work",
    currentProject: "Project Alpha Orionis",
    currentTasks: "v2.4 Core Upgrade & Dependency Audit",
    workload: "78% Capacity (Optimal)",
    experience: "6+ Years Distributed Systems",
  },
  tools: [
    { id: "github", name: "GitHub", icon: "code", connected: true, accessLevel: "Read / Write" },
    { id: "jira", name: "Jira / Linear", icon: "view_kanban", connected: true, accessLevel: "Full Access" },
    { id: "slack", name: "Slack / Teams", icon: "chat", connected: true, accessLevel: "Read / Write" },
    { id: "email", name: "Corporate Email", icon: "mail", connected: true, accessLevel: "Full Access" },
    { id: "browser", name: "Browser Automation", icon: "language", connected: true, accessLevel: "Exec Only" },
    { id: "database", name: "PostgreSQL Production", icon: "database", connected: true, accessLevel: "Read Only" },
    { id: "cicd", name: "GitHub Actions CI/CD", icon: "rocket_launch", connected: true, accessLevel: "Admin Review" },
  ],
  memoryContext: {
    recentWork: [
      "Parsed 4,201 lines from legacy auth.py",
      "Resolved dependency conflict in lib-auth v2.4",
      "Drafted technical RFC for Service Mesh migration",
    ],
    pastTasks: [
      "Migrated monolithic REST API to FastAPI microservices",
      "Built automated test runner for staging pipelines",
    ],
    importantPreferences: [
      "Always include unit tests with pull requests",
      "Prefer Slack messages over impromptu huddles",
      "Format code with Black/Prettier standards",
    ],
    learnedPatterns: [
      "Tends to approve staging builds after 20-min bake time",
      "High confidence in automated CI/CD evidence logs",
    ],
    recentInteractions: [
      "Coordinated with SEC_OP_09 agent on authorization policy",
      "Queried Knowledge RAG for Service Mesh documentation",
    ],
  },
};
