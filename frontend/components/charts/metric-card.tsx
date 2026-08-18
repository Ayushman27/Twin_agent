import type { AnalyticsMetric } from "@/types";

export function MetricCard({ metric }: { metric: AnalyticsMetric }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="text-xs text-muted-foreground">{metric.label}</p>
      <p className="text-2xl font-semibold mt-1">
        {metric.value}
        {metric.unit && <span className="text-sm font-normal ml-1">{metric.unit}</span>}
      </p>
      {metric.trendPercent !== undefined && (
        <p className={`text-xs mt-1 ${metric.trendPercent >= 0 ? "text-green-600" : "text-red-500"}`}>
          {metric.trendPercent >= 0 ? "+" : ""}{metric.trendPercent}%
        </p>
      )}
    </div>
  );
}
