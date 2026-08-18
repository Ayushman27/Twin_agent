import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Approvals"
      description="Human-in-the-loop review queue."
      bullets={[
        "Requested by agent, risk level, proposed action",
        "Approve / Reject / Request changes",
      ]}
    />
  );
}
