import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Teams"
      description="Teams, managers and workload."
      bullets={[
        "Team roster",
        "Projects per team",
        "Team performance & workload",
      ]}
    />
  );
}
