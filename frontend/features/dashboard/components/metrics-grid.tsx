"use client";

import { useDashboardMetrics } from "../hooks/use-dashboard-metrics";
import { MetricCard } from "@/components/charts/metric-card";
import { LoadingState } from "@/components/status/loading-state";
import { ErrorState } from "@/components/status/error-state";
import { EmptyState } from "@/components/status/empty-state";

export function MetricsGrid() {
  const { data, isLoading, isError, refetch } = useDashboardMetrics();

  if (isLoading) return <LoadingState label="Loading metrics..." />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!data || data.length === 0) return <EmptyState title="No metrics yet" />;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {data.map((m) => (
        <MetricCard key={m.key} metric={m} />
      ))}
    </div>
  );
}
