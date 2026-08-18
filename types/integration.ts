export interface Integration {
  id: string;
  name: "github" | "jira" | "slack" | "email" | "mcp" | "browser" | "database" | "ci_cd" | "internal_api";
  connected: boolean;
  lastSyncAt?: string;
  permissions: string[];
  availableActions: string[];
}
