"use client";

// @ts-ignore
import dynamic from "next/dynamic";

// @ts-ignore
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export function EChart({ option, height = 280 }: { option: any; height?: number }) {
  return <ReactECharts option={option} style={{ height }} />;
}
