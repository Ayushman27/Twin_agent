import { useQuery } from "@tanstack/react-query";
import { organizationService } from "@/services/organization.service";

export function useEmployees() {
  return useQuery({ queryKey: ["employees"], queryFn: organizationService.list });
}
