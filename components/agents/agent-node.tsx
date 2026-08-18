import { Handle, Position } from "reactflow";
import type { Agent } from "@/types";

const statusColor: Record<Agent["status"], string> = {
  idle: "bg-gray-400", planning: "bg-yellow-500", running: "bg-blue-500",
  waiting_approval: "bg-orange-500", completed: "bg-green-500", failed: "bg-red-500",
};

export function AgentNode({ data }: { data: Agent }) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-sm min-w-[160px]">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${statusColor[data.status]}`} />
        <span className="font-medium">{data.name}</span>
      </div>
      <p className="text-muted-foreground mt-1 capitalize">{data.type}</p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
