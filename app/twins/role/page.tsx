import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Role Twin"
      description="Role-specific behavior and policies."
      bullets={[
        "Job description & responsibilities",
        "Policies & standards",
        "Role-specific workflows",
      ]}
    />
  );
}
