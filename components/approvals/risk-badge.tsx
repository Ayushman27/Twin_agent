type Risk = "low" | "medium" | "high" | "critical";

const styles: Record<Risk, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export function RiskBadge({ level }: { level: Risk }) {
  return <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${styles[level]}`}>{level}</span>;
}
