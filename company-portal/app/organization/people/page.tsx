import { PageStub } from "@shared/components/layout/page-stub";

export default function PeoplePage() {
  return (
    <PageStub
      title="People"
      description="All employees and members in the organization."
      bullets={[
        "Employee data table (avatar, role, manager, skills)",
        "Digital Twin enrollment status",
        "Agent permissions and action thresholds",
        "Invite new team member & role assignment",
      ]}
    />
  );
}
