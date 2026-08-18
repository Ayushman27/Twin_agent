import { PageStub } from "@/components/layout/page-stub";

export default function Page() {
  return (
    <PageStub
      title="Agent Activity"
      description="Real-time activity feed (WebSocket-ready)."
      bullets={[
        "Task started / tool called / approval requested",
        "Live streaming updates",
      ]}
    />
  );
}
