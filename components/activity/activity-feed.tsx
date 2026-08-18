import type { AgentActivityEvent } from "@/types";
import { formatDate } from "@/lib/utils";

export function ActivityFeed({ events }: { events: AgentActivityEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-muted-foreground">No recent activity.</p>;

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="text-sm flex justify-between border-b border-border pb-2 last:border-0">
          <span>{e.message}</span>
          <span className="text-xs text-muted-foreground shrink-0 ml-4">{formatDate(e.timestamp)}</span>
        </li>
      ))}
    </ul>
  );
}
