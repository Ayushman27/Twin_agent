import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Projects"
      description="Projects, progress and risk."
      bullets={[
        "Progress & tasks",
        "Risks & dependencies",
        "GitHub / Jira activity",
      ]}
    />
  );
}
