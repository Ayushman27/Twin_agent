import { PageStub } from "@shared/components/layout/page-stub";

export default function RoleTwinPage() {
  return (
    <PageStub
      title="Role Twin"
      description="Operational responsibilities, standard operating procedures, and automated execution policies."
      bullets={[
        "Assigned organizational responsibilities",
        "Quality standards and testing thresholds",
        "Connected knowledge sources and domain documentation",
        "Expected behavior guidelines for autonomous sub-agents",
      ]}
    />
  );
}
