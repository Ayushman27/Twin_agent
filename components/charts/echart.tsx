"use client";

import dynamic from "next/dynamic";
import type { EChartsOption } from "echarts";

// Dynamically imported so heavy charting code is excluded from the initial bundle.
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export function EChart({ option, height = 280 }: { option: EChartsOption; height?: number }) {
  return <ReactECharts option={option} style={{ height }} />;
}
