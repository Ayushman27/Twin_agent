export interface AnalyticsMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
  trendPercent?: number;
}
