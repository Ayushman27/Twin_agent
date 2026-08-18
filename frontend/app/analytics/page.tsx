import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Analytics"
      description="Performance across the platform."
      bullets={[
        "Employee / agent / task performance",
        "SLM vs LLM usage, latency, hallucination rate",
        "Cost & risk",
      ]}
    />
  );
}
