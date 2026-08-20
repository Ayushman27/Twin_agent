export type AgentStatusType = "Ready" | "Active" | "Idle" | "Waiting" | "Disabled";

export interface CapabilityAgent {
  id: string;
  name: string;
  type: string;
  purpose: string;
  status: AgentStatusType;
  capability: string;
  description: string;
  responsibilities: string[];
  connectedTools: string[];
  currentActivity?: string;
  icon: string;
}

export interface RoleAgentNetwork {
  role: string;
  department: string;
  status: "Active" | "Inactive";
  capabilityCount: number;
  overview: {
    description: string;
    primaryResponsibilities: string[];
    requiredSkills: string[];
    decisionAuthority: string[];
    typicalTasks: string[];
  };
  metrics: {
    totalAgents: number;
    activeAgents: number;
    tasksAssisted: number;
    successRate: number;
  };
  agents: CapabilityAgent[];
}

export const mockRoleAgentNetwork: RoleAgentNetwork = {
  role: "Software Engineer",
  department: "Engineering",
  status: "Active",
  capabilityCount: 10,
  overview: {
    description:
      "Operational AI capability network tailored for Software Engineer responsibilities, automating routine development, testing, research, and review workflows.",
    primaryResponsibilities: [
      "Software development & feature implementation",
      "Code review & static security analysis",
      "Debugging & root cause diagnosis",
      "Automated unit & integration testing",
      "Technical documentation & API spec generation",
    ],
    requiredSkills: [
      "Python, FastAPI, TypeScript, React",
      "System Architecture & Microservices",
      "Docker, Kubernetes, CI/CD Pipelines",
      "PostgreSQL, Redis, Data Modeling",
    ],
    decisionAuthority: [
      "Auto-approve non-breaking PRs with 100% test coverage",
      "Execute automated staging deployments",
      "Query internal vector database & documentation",
    ],
    typicalTasks: [
      "Dependency version resolution",
      "Generating boilerplate & API endpoints",
      "Writing regression test suites",
      "Parsing legacy codebase refactors",
    ],
  },
  metrics: {
    totalAgents: 10,
    activeAgents: 3,
    tasksAssisted: 42,
    successRate: 94,
  },
  agents: [
    {
      id: "agent-planning",
      name: "Planning Agent",
      type: "Planning",
      purpose: "Analyzes project requirements and plans execution roadmaps.",
      status: "Ready",
      capability: "Sprint & Architecture Planning",
      description: "Decomposes complex feature epics into atomic development sub-tasks and dependency graphs.",
      responsibilities: [
        "Task decomposition & estimation",
        "Dependency graph calculation",
        "Milestone tracking & bottleneck identification",
      ],
      connectedTools: ["Jira", "GitHub Projects", "Confluence"],
      currentActivity: "No active execution (Standby)",
      icon: "account_tree",
    },
    {
      id: "agent-task-mgmt",
      name: "Task Management Agent",
      type: "Management",
      purpose: "Schedules and prioritizes assigned tasks in real-time.",
      status: "Active",
      capability: "Workload Orchestration",
      description: "Monitors employee task queues and automatically syncs status updates with external board systems.",
      responsibilities: [
        "Auto-updating task status",
        "Prioritizing high-risk tickets",
        "Sending deadline reminders",
      ],
      connectedTools: ["Jira", "Linear", "Slack"],
      currentActivity: "Syncing 5 active workspace tasks with Jira board",
      icon: "checklist",
    },
    {
      id: "agent-coding",
      name: "Coding Agent",
      type: "Development",
      purpose: "Assists with implementation, code generation, and refactoring.",
      status: "Active",
      capability: "Software Development",
      description: "Generates production-grade code snippets, boilerplates, and resolves structural refactoring tasks.",
      responsibilities: [
        "Code generation & feature scaffolding",
        "Code explanation & inline documentation",
        "Refactoring legacy monoliths",
        "Debugging assistance & fix proposals",
        "Technical implementation suggestions",
      ],
      connectedTools: ["GitHub", "Terminal", "VS Code IDE"],
      currentActivity: "Analyzing dependency conflicts in lib-auth v2.4",
      icon: "code",
    },
    {
      id: "agent-review",
      name: "Code Review Agent",
      type: "Quality",
      purpose: "Performs automated peer reviews and static code checks.",
      status: "Ready",
      capability: "Quality Assurance & Linting",
      description: "Scans pull requests against organizational style guidelines, security rules, and performance standards.",
      responsibilities: [
        "Static code analysis & lint checking",
        "Security vulnerability scanning",
        "PR summary generation",
      ],
      connectedTools: ["GitHub Actions", "SonarQube", "Prettier"],
      currentActivity: "Waiting for next incoming Pull Request",
      icon: "verified",
    },
    {
      id: "agent-debugging",
      name: "Debugging Agent",
      type: "Diagnostic",
      purpose: "Diagnoses runtime errors and traces stack trace failures.",
      status: "Active",
      capability: "Root Cause Diagnosis",
      description: "Inspects application logs, exception tracebacks, and identifies faulty code lines automatically.",
      responsibilities: [
        "Stack trace parsing",
        "Log line correlation",
        "Patch suggestion & hotfix drafting",
      ],
      connectedTools: ["Sentry", "DataDog", "Terminal"],
      currentActivity: "Monitoring staging server logs for unhandled exceptions",
      icon: "bug_report",
    },
    {
      id: "agent-testing",
      name: "Testing Agent",
      type: "Quality",
      purpose: "Generates and executes unit, integration, and E2E tests.",
      status: "Waiting",
      capability: "Test Automation",
      description: "Writes comprehensive pytest/Jest test cases to achieve maximum code coverage.",
      responsibilities: [
        "Unit test generation",
        "Regression test suite execution",
        "Coverage report generation",
      ],
      connectedTools: ["PyTest", "Jest", "Playwright"],
      currentActivity: "Awaiting approval for staging deployment test suite",
      icon: "flaky",
    },
    {
      id: "agent-research",
      name: "Research Agent",
      type: "Knowledge",
      purpose: "Searches documentation, APIs, and tech stack benchmarks.",
      status: "Idle",
      capability: "Technical Investigation",
      description: "Conducts deep web and internal RAG searches for package documentation and architectural best practices.",
      responsibilities: [
        "Package registry querying",
        "API documentation extraction",
        "Technology comparison reports",
      ],
      connectedTools: ["Browser", "DevDocs", "Internal Vector DB"],
      currentActivity: "Idle (Ready for query)",
      icon: "search",
    },
    {
      id: "agent-docs",
      name: "Documentation Agent",
      type: "Documentation",
      purpose: "Maintains API specs, READMEs, and technical documentation.",
      status: "Idle",
      capability: "Technical Writing",
      description: "Generates OpenAPI specifications, docstrings, and keeps developer portals synchronized.",
      responsibilities: [
        "OpenAPI / Swagger spec generation",
        "Docstring generation & verification",
        "Changelog compilation",
      ],
      connectedTools: ["Swagger", "Confluence", "Notion"],
      currentActivity: "Idle",
      icon: "description",
    },
    {
      id: "agent-comm",
      name: "Communication Agent",
      type: "Messaging",
      purpose: "Drafts status updates, release notes, and Slack messages.",
      status: "Idle",
      capability: "Team Coordination",
      description: "Summarizes daily progress into concise Slack huddle notes and release announcements.",
      responsibilities: [
        "Daily standup summary generation",
        "Release announcement drafting",
        "Incident notification broadcasts",
      ],
      connectedTools: ["Slack", "Microsoft Teams", "Email"],
      currentActivity: "Idle",
      icon: "forum",
    },
    {
      id: "agent-project-mgmt",
      name: "Project Management Agent",
      type: "Management",
      purpose: "Tracks cross-team milestones and resource allocation.",
      status: "Disabled",
      capability: "Portfolio Supervision",
      description: "Supervises high-level roadmap velocity across engineering pods.",
      responsibilities: [
        "Sprint velocity calculation",
        "Resource allocation tracking",
        "Risk escalation to Engineering Manager",
      ],
      connectedTools: ["Jira Portfolio", "Asana"],
      currentActivity: "Disabled by Organization Policy",
      icon: "bar_chart",
    },
  ],
};
