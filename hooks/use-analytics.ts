import { useQuery } from "@tanstack/react-query";
import { analyticsService } from "@/services/analytics.service";

export function useAnalyticsOverview() {
  return useQuery({ queryKey: ["analytics", "overview"], queryFn: analyticsService.getOverview });
}
