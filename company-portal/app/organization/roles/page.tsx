import { PageStub } from "@shared/components/layout/page-stub";

export default function RolesPage() {
  return (
    <PageStub
      title="Roles &amp; Permissions"
      description="Define organizational roles, permissions, and AI twin capabilities."
      bullets={[
        "Role list & hierarchy (Admin, Manager, Developer, QA, HR)",
        "Job role twin standard operating procedures (SOPs)",
        "Autonomous agent action limits and approval triggers",
        "Knowledge base access bindings per role",
      ]}
    />
  );
}
