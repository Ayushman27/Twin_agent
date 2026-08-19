import { PageStub } from "@shared/components/layout/page-stub";

export default function SettingsPage() {
  return (
    <PageStub
      title="Employee Settings"
      description="Personal digital twin preferences, notifications, and profile details."
      bullets={[
        "Personal profile (Name, Avatar, Job Title, Department)",
        "Twin notification triggers & threshold alerts",
        "Local Desktop Agent sync connection status",
        "API tokens & personal authentication keys",
      ]}
    />
  );
}
