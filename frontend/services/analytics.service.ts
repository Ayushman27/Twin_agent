import { config } from "@/lib/config";
import { apiClient } from "@/services/api-client";
import type { AnalyticsMetric } from "@/types";

export const analyticsService = {
  async getOverview(): Promise<AnalyticsMetric[]> {
    if (config.useMocks) {
      return [
        { key: "active_tasks", label: "Active Tasks", value: 24 },
        { key: "agent_success_rate", label: "Agent Success Rate", value: 91.4, unit: "%", trendPercent: 2.1 },
        { key: "slm_share", label: "SLM Usage Share", value: 78, unit: "%" },
        { key: "avg_completion_time", label: "Avg Task Completion", value: 3.2, unit: "hrs" },
      ];
    }
    return apiClient.get<AnalyticsMetric[]>("/analytics/overview");
  },
};
