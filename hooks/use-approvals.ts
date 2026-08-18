import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approvalService } from "@/services/approval.service";

export function useApprovals() {
  return useQuery({ queryKey: ["approvals"], queryFn: approvalService.list });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approved" | "rejected" | "changes_requested" }) =>
      approvalService.decide(id, decision),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  });
}
