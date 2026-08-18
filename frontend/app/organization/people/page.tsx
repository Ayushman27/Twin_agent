import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="People"
      description="All employees in the organization."
      bullets={[
        "Employee data table (avatar, role, manager, skills)",
        "Twin status",
        "Agent status",
        "Assign task / view twin actions",
      ]}
    />
  );
}
