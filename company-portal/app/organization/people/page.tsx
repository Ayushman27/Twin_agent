"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { organizationService, DetailedMember } from "@shared/services/organization.service";
import { LoadingState } from "@shared/components/status/loading-state";
import { Users, Search, User, BadgeCheck, Briefcase, RefreshCw } from "lucide-react";

export default function PeoplePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, isAuthenticated, isOrgAdmin } = useAuth();

  const [members, setMembers] = useState<DetailedMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const orgId = user?.organization_id || user?.organizationId;

  const fetchMembers = useCallback(async () => {
    if (!orgId) return;
    setIsLoadingMembers(true);
    try {
      // Fetch all members enrolled in the organization database
      const data = await organizationService.getDetailedMembers(orgId);
      setMembers(data);
    } catch (err) {
      console.error("Failed to load organization members:", err);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.push("/login?error=unauthorized");
      } else if (!isOrgAdmin) {
        router.push("/login?error=employee_forbidden");
      } else if (orgId) {
        fetchMembers();
      }
    }
  }, [isAuthLoading, isAuthenticated, isOrgAdmin, orgId, router, fetchMembers]);

  // Filter members by name, role, or employee ID
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase().trim();
    return members.filter((m) => {
      const nameMatch = m.name?.toLowerCase().includes(q);
      const roleMatch = (m.job_title || m.role)?.toLowerCase().includes(q);
      const empIdMatch = m.employee_id?.toLowerCase().includes(q);
      return nameMatch || roleMatch || empIdMatch;
    });
  }, [members, searchQuery]);

  if (isAuthLoading) {
    return <LoadingState label="Authenticating administrator session..." />;
  }

  if (!isAuthenticated || !isOrgAdmin) {
    return <LoadingState label="Redirecting to Company Login..." />;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-tech pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 font-code-sm text-[10px] text-primary-container uppercase">
              Directory
            </span>
            <span className="font-code-sm text-xs text-on-surface-variant">
              {members.length} {members.length === 1 ? "Person" : "People"} Enrolled
            </span>
          </div>
          <h1 className="font-display-xl text-[26px] sm:text-[30px] text-on-surface">
            People
          </h1>
          <p className="font-code-sm text-xs text-on-surface-variant mt-1">
            All employees and members in the organization.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchMembers}
          disabled={isLoadingMembers}
          className="px-3 py-2 border border-border-tech hover:border-primary-container/50 bg-surface-container-low text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={isLoadingMembers ? "animate-spin text-primary-container" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <Search size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, role, or employee ID..."
            className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* People Table */}
      <div className="border border-border-tech bg-surface-container-low rounded-sm overflow-hidden">
        {isLoadingMembers ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="font-code-sm text-xs text-on-surface-variant">
              Loading enrolled employees from database...
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-10 h-10 border border-border-tech bg-surface-layer flex items-center justify-center text-on-surface-variant mx-auto rounded-sm">
              <Users size={18} />
            </div>
            <div className="font-code-sm text-sm font-bold text-on-surface">
              {searchQuery ? "No matching people found" : "No enrolled employees found"}
            </div>
            <p className="font-code-sm text-xs text-on-surface-variant max-w-sm mx-auto">
              {searchQuery
                ? `No people matched "${searchQuery}". Try a different search term.`
                : "When employees register through the Employee Portal (Port 3001), their records will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-tech bg-surface-layer font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-primary-container" />
                      <span>Employee Name</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={13} className="text-primary-container" />
                      <span>Role</span>
                    </div>
                  </th>
                  <th className="py-3 px-4 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <BadgeCheck size={13} className="text-primary-container" />
                      <span>Employee ID</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-tech/60 font-code-sm text-xs text-on-surface">
                {filteredMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-surface-container-high/40 transition-colors group"
                  >
                    {/* Employee Name */}
                    <td className="py-3.5 px-4 font-semibold text-on-surface">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 border border-primary-container/40 bg-primary-container/10 flex items-center justify-center text-primary-container font-mono font-bold text-xs shrink-0 rounded-sm">
                          {member.name ? member.name.charAt(0).toUpperCase() : "E"}
                        </div>
                        <span className="group-hover:text-primary-container transition-colors">
                          {member.name || "Unnamed Employee"}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4 text-on-surface-variant">
                      <span className="px-2 py-0.5 bg-surface-layer border border-border-tech rounded-sm text-on-surface">
                        {member.job_title || member.role || "Employee"}
                      </span>
                    </td>

                    {/* Employee ID */}
                    <td className="py-3.5 px-4 font-mono text-on-surface-variant">
                      {member.employee_id ? (
                        <span className="text-primary-container font-semibold">
                          {member.employee_id}
                        </span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
