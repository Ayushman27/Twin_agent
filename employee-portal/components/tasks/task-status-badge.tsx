import type { TaskStatus } from "@shared/types";

const styles: Record<TaskStatus, string> = {
  NEW: "bg-gray-100 text-gray-700",
  PLANNED: "bg-gray-100 text-gray-700",
  ASSIGNED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  BLOCKED: "bg-red-100 text-red-700",
  READY_FOR_REVIEW: "bg-purple-100 text-purple-700",
  VERIFICATION: "bg-purple-100 text-purple-700",
  PENDING_APPROVAL: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${styles[status]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
