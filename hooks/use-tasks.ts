import { useQuery } from "@tanstack/react-query";
import { taskService } from "@/services/task.service";

export function useTasks() {
  return useQuery({ queryKey: ["tasks"], queryFn: taskService.list });
}
