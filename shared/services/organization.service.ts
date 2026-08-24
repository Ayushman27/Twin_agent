import { apiClient } from "./api-client";
import { config } from "../lib/config";
import type { PublicCompany } from "../types";

export interface OrganizationStats {
  total_members: number;
  active_members: number;
  pending_invitations: number;
  teams_count: number;
  roles_count: number;
}

export interface DetailedMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: "ACTIVE" | "INACTIVE" | "INVITED";
  name?: string;
  email?: string;
  employee_id?: string;
  department?: string;
  job_title?: string;
  job_role_id?: string;
  job_role_name?: string;
  job_role_department?: string;
  created_at?: string;
}

export interface OrganizationDetails {
  id: string;
  company_name: string;
  company_email?: string;
  company_phone?: string;
  industry?: string;
  company_size?: string;
  employee_count?: number;
  website?: string;
  country?: string;
  city?: string;
  description?: string;
  business_model?: string;
  primary_contact?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  // Extended profile fields
  logo_url?: string;
  legal_name?: string;
  registration_number?: string;
  company_type?: string;
  founded_year?: number | string;
  support_email?: string;
  alternate_phone?: string;
  state?: string;
  address?: string;
  postal_code?: string;
  primary_products?: string;
  company_domain?: string;
  linkedin_url?: string;
}

export interface OrganizationUpdatePayload {
  company_name?: string;
  company_email?: string;
  company_phone?: string;
  industry?: string;
  company_size?: string;
  employee_count?: number;
  website?: string;
  country?: string;
  city?: string;
  description?: string;
  business_model?: string;
  primary_contact?: string;
}

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

  async getOrganization(orgId: string): Promise<OrganizationDetails> {
    return await apiClient.get<OrganizationDetails>(`/organizations/${orgId}`);
  },

  async updateOrganization(orgId: string, payload: OrganizationUpdatePayload): Promise<OrganizationDetails> {
    return await apiClient.put<OrganizationDetails>(`/organizations/${orgId}`, payload);
  },

  async getStats(orgId: string): Promise<OrganizationStats> {
    return await apiClient.get<OrganizationStats>(`/organizations/${orgId}/stats`);
  },

  async getDetailedMembers(orgId: string, status?: string): Promise<DetailedMember[]> {
    const qs = status ? `?status=${status}` : "";
    return await apiClient.get<DetailedMember[]>(`/organizations/${orgId}/members/detailed${qs}`);
  },

  async approveMember(orgId: string, memberId: string): Promise<DetailedMember> {
    return await apiClient.post<DetailedMember>(`/organizations/${orgId}/members/${memberId}/approve`, {});
  },

  async rejectMember(orgId: string, memberId: string): Promise<DetailedMember> {
    return await apiClient.post<DetailedMember>(`/organizations/${orgId}/members/${memberId}/reject`, {});
  },
};
