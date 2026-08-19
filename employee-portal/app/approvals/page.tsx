import { PageStub } from "@shared/components/layout/page-stub";

export default function ApprovalsPage() {
  return (
    <PageStub
      title="Action Approvals"
      description="Human-in-the-loop review for high-risk agentic actions."
      bullets={[
        "Pending approval queue sorted by risk level (Critical, High, Medium, Low)",
        "Proposed action diff viewer and rationale summary",
        "One-click Approve, Reject, or Request Changes",
        "Automated timeout & escalation handling",
      ]}
    />
  );
}
