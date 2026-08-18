import { useQuery } from "@tanstack/react-query";
import { agentService } from "@/services/agent.service";

export function useAgents() {
  return useQuery({ queryKey: ["agents"], queryFn: agentService.list });
}
