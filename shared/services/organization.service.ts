import { apiClient } from "./api-client";
import { config } from "../lib/config";
import type { PublicCompany } from "../types";

export const organizationService = {
  async searchPublicCompanies(search?: string, limit = 50): Promise<PublicCompany[]> {
    if (config.useMocks) {
      const mockList: PublicCompany[] = [
        {
          id: "org_1",
          company_name: "Twin Agent Technologies Inc.",
          industry: "Artificial Intelligence",
          city: "San Francisco",
          country: "United States",
        },
        {
          id: "org_2",
          company_name: "Acme Technologies",
          industry: "Technology",
          city: "Bengaluru",
          country: "India",
        },
        {
          id: "org_3",
          company_name: "Horizon Labs",
          industry: "Software",
          city: "Hyderabad",
          country: "India",
        },
      ];

      if (!search || !search.trim()) {
        return mockList;
      }
      const q = search.trim().toLowerCase();
      return mockList.filter((org) => org.company_name.toLowerCase().includes(q));
    }

    const queryParams = new URLSearchParams();
    if (search && search.trim()) {
      queryParams.set("search", search.trim());
    }
    if (limit) {
      queryParams.set("limit", limit.toString());
    }

    const qs = queryParams.toString();
    const endpoint = `/onboarding/companies${qs ? `?${qs}` : ""}`;
    const res = await apiClient.get<{
      success: boolean;
      total: number;
      data: PublicCompany[];
    }>(endpoint);

    return res.data || [];
  },
};
