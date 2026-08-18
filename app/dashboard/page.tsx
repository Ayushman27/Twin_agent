import { PageHeader } from "@/components/layout/page-header";
import { MetricsGrid } from "@/features/dashboard";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Dashboard" description="Organizational intelligence overview." />
      <MetricsGrid />
    </div>
  );
}
