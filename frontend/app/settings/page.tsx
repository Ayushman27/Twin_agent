import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Settings"
      description="Platform configuration."
      bullets={[
        "Profile, organization, users, roles, permissions",
        "AI / model / RAG configuration",
        "Agent policies & audit logs",
      ]}
    />
  );
}
