"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { organizationService, DetailedMember } from "@shared/services/organization.service";
import { roleService } from "@shared/services/role.service";
import type {
  OrganizationRole,
  EmployeeRoleAssignmentResponse,
} from "@shared/types/role";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  Users,
  Search,
  User,
  BadgeCheck,
  Briefcase,
  RefreshCw,
  Shield,
  Cpu,
  Bot,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Sliders,
  Check,
  Layers,
  ChevronRight,
  Zap,
  Network,
  Wrench,
  KeyRound,
  Clock,
  RotateCcw,
  Info,
} from "lucide-react";

export default function PeoplePage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, isAuthenticated, isOrgAdmin } = useAuth();
  const orgId = user?.organization_id || user?.organizationId;

  const [members, setMembers] = useState<DetailedMember[]>([]);
  const [availableRoles, setAvailableRoles] = useState<OrganizationRole[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected Member for Details & AI Workforce View
  const [selectedMember, setSelectedMember] = useState<DetailedMember | null>(null);
  const [memberRoleData, setMemberRoleData] = useState<EmployeeRoleAssignmentResponse | null>(null);
  const [memberWorkforce, setMemberWorkforce] = useState<any | null>(null);
  const [isLoadingMemberRole, setIsLoadingMemberRole] = useState(false);
  const [isProvisioningOnDemand, setIsProvisioningOnDemand] = useState(false);

  // Regeneration Confirmation Modal State
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);

  // Role Change Modal & Preview State
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
  const [selectedTargetRoleId, setSelectedTargetRoleId] = useState<string>("");
  const [isAssigningRole, setIsAssigningRole] = useState(false);

  // Auto-hide success notification
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // Load Organization Members and Available Roles
  const fetchDirectory = useCallback(
    async (isBackground = false) => {
      if (!orgId) return;
      if (!isBackground) setIsLoadingMembers(true);
      else setIsRefreshing(true);

      try {
        const [membersData, rolesData] = await Promise.all([
          organizationService.getDetailedMembers(orgId, "ACTIVE"),
          roleService.getRoles(orgId).catch(() => ({ roles: [], total: 0 })),
        ]);
        const activeMembers = (membersData || []).filter((m) => m.status === "ACTIVE");
        setMembers(activeMembers);
        setAvailableRoles(rolesData.roles || []);
      } catch (err) {
        console.error("Failed to load organization directory:", err);
      } finally {
        setIsLoadingMembers(false);
        setIsRefreshing(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.push("/login?error=unauthorized");
      } else if (!isOrgAdmin) {
        router.push("/login?error=employee_forbidden");
      } else if (orgId) {
        fetchDirectory();
      }
    }
  }, [isAuthLoading, isAuthenticated, isOrgAdmin, orgId, router, fetchDirectory]);

  // Fetch individual employee role assignment and provisioned agent workforce
  const openMemberDetailModal = async (member: DetailedMember) => {
    setSelectedMember(member);
    setIsLoadingMemberRole(true);
    try {
      if (orgId) {
        const [roleAssignment, workforce] = await Promise.all([
          roleService.getEmployeeRole(orgId, member.user_id || member.id).catch(() => null),
          roleService.getEmployeeAgentWorkforce(orgId, member.user_id || member.id).catch(() => null),
        ]);
        setMemberRoleData(roleAssignment);
        setMemberWorkforce(workforce);
      }
    } catch (err) {
      console.error("Failed to load employee role details:", err);
      setMemberRoleData(null);
      setMemberWorkforce(null);
    } finally {
      setIsLoadingMemberRole(false);
    }
  };

  // Open Change Role Modal
  const openChangeRoleModal = (member: DetailedMember) => {
    setSelectedMember(member);
    const currentAssignedId =
      member.job_role_id ||
      availableRoles.find(
        (r) => r.name.toLowerCase() === (member.job_role_name || member.job_title || "").toLowerCase()
      )?.id ||
      "";
    const defaultTarget =
      availableRoles.find((r) => r.id !== currentAssignedId)?.id || availableRoles[0]?.id || "";
    setSelectedTargetRoleId(defaultTarget);
    setIsChangeRoleModalOpen(true);
  };

  // Target Role for Preview
  const previewTargetRole = useMemo(() => {
    return availableRoles.find((r) => r.id === selectedTargetRoleId) || null;
  }, [availableRoles, selectedTargetRoleId]);

  // Current Role Object for Preview
  const previewCurrentRoleName = useMemo(() => {
    if (!selectedMember) return "Unassigned";
    return selectedMember.job_role_name || selectedMember.job_title || "Unassigned";
  }, [selectedMember]);

  // Handle Confirm Role Assignment + Automatic AgentFactory Provisioning
  const handleConfirmRoleAssignment = async () => {
    if (!orgId || !selectedMember || !selectedTargetRoleId) return;
    setIsAssigningRole(true);
    try {
      // 1. Assign Role in Neon
      const updatedAssignment = await roleService.assignEmployeeRole(
        orgId,
        selectedMember.user_id || selectedMember.id,
        selectedTargetRoleId
      );

      // 2. Provision AgentGroup through authoritative AgentPlanner -> AgentFactory
      const provisionedWorkforce = await roleService.provisionEmployeeWorkforce(
        orgId,
        selectedMember.user_id || selectedMember.id,
        { role_id: selectedTargetRoleId, force_regenerate: true }
      );

      const targetRoleName = previewTargetRole?.name || "New Role";
      setSuccessMessage(
        `Assigned "${selectedMember.name}" to Role: ${targetRoleName}. Provisioned ${provisionedWorkforce?.agents?.length || 0} AI Agents in AgentGroup.`
      );

      setIsChangeRoleModalOpen(false);
      setMemberRoleData(updatedAssignment);
      setMemberWorkforce(provisionedWorkforce);
      await fetchDirectory(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to assign role to employee");
    } finally {
      setIsAssigningRole(false);
    }
  };

  // Trigger Workforce Regeneration (with explicit confirmation)
  const handleRegenerateWorkforce = async () => {
    if (!orgId || !selectedMember) return;
    setIsProvisioningOnDemand(true);
    try {
      const provisioned = await roleService.provisionEmployeeWorkforce(
        orgId,
        selectedMember.user_id || selectedMember.id,
        { force_regenerate: true }
      );
      setMemberWorkforce(provisioned);
      setIsRegenerateModalOpen(false);
      setSuccessMessage(`AI Workforce regenerated via AgentFactory (${provisioned?.agents?.length || 0} agents active).`);
      await fetchDirectory(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Workforce regeneration failed");
    } finally {
      setIsProvisioningOnDemand(false);
    }
  };

  // Initial Workforce Provisioning (if none exists)
  const handleInitialProvision = async () => {
    if (!orgId || !selectedMember) return;
    setIsProvisioningOnDemand(true);
    try {
      const provisioned = await roleService.provisionEmployeeWorkforce(
        orgId,
        selectedMember.user_id || selectedMember.id,
        { force_regenerate: false }
      );
      setMemberWorkforce(provisioned);
      setSuccessMessage(`AI Workforce provisioned successfully (${provisioned?.agents?.length || 0} agents instantiated).`);
      await fetchDirectory(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Workforce provisioning failed");
    } finally {
      setIsProvisioningOnDemand(false);
    }
  };

  // Extract Departments for Filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    members.forEach((m) => {
      if (m.department) set.add(m.department);
      if (m.job_role_department) set.add(m.job_role_department);
    });
    return ["ALL", ...Array.from(set)];
  }, [members]);

  // Filter members by search query and department
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = !q || m.name?.toLowerCase().includes(q);
      const emailMatch = !q || m.email?.toLowerCase().includes(q);
      const roleMatch = !q || (m.job_role_name || m.job_title || m.role)?.toLowerCase().includes(q);
      const empIdMatch = !q || m.employee_id?.toLowerCase().includes(q);
      const searchPass = nameMatch || emailMatch || roleMatch || empIdMatch;

      const deptPass =
        departmentFilter === "ALL" ||
        m.department === departmentFilter ||
        m.job_role_department === departmentFilter;

      return searchPass && deptPass;
    });
  }, [members, searchQuery, departmentFilter]);

  if (isAuthLoading) {
    return <LoadingState label="Authenticating administrator session..." />;
  }

  if (!isAuthenticated || !isOrgAdmin) {
    return <LoadingState label="Redirecting to Company Login..." />;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up pb-12">
      {/* ── SUCCESS NOTIFICATION BANNER ──────────────────────────────── */}
      {successMessage && (
        <div className="p-3 border border-primary-container/50 bg-primary-container/10 text-primary-container font-code-sm text-xs flex items-center gap-2 rounded-sm animate-fade-in">
          <CheckCircle2 size={14} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-tech pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 font-code-sm text-[10px] text-primary-container uppercase">
              Directory &amp; Workforce
            </span>
            <span className="font-code-sm text-xs text-on-surface-variant">
              {members.length} {members.length === 1 ? "Employee" : "Employees"} Enrolled
            </span>
          </div>
          <h1 className="font-display-xl text-[26px] sm:text-[30px] text-on-surface">
            People &amp; AI Workforce
          </h1>
          <p className="font-code-sm text-xs text-on-surface-variant mt-1">
            Manage organization employees, membership authorization, and inspect individual AI Workforce / Agent Networks instantiated via AgentFactory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/organization/roles"
            className="px-3 py-2 border border-border-tech hover:border-primary-container/50 hover:bg-surface-layer text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors"
          >
            <Briefcase size={13} className="text-primary-container" />
            <span>Manage Roles ({availableRoles.length})</span>
          </Link>

          <button
            type="button"
            onClick={() => fetchDirectory(true)}
            disabled={isRefreshing}
            className="px-3 py-2 border border-border-tech hover:border-primary-container/50 bg-surface-container-low text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-primary-container" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── SEARCH & FILTERS BAR ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <Search size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, role, email, or employee ID..."
            className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
          />
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <span className="font-label-caps text-[10px] text-on-surface-variant uppercase shrink-0">
            Department:
          </span>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-surface-container-low border border-border-tech px-2.5 py-1.5 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none cursor-pointer rounded-sm"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === "ALL" ? "All Departments" : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── PEOPLE & WORKFORCE TABLE ─────────────────────────────────── */}
      <div className="border border-border-tech bg-surface-container-low rounded-sm overflow-hidden shadow-sm">
        {isLoadingMembers ? (
          <div className="p-16 text-center">
            <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="font-code-sm text-xs text-on-surface-variant">
              Loading enrolled employees and AI workforce data from database...
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <div className="w-10 h-10 border border-border-tech bg-surface-layer flex items-center justify-center text-on-surface-variant mx-auto rounded-sm">
              <Users size={18} />
            </div>
            <div className="font-code-sm text-sm font-bold text-on-surface">
              {searchQuery ? "No matching employees found" : "No enrolled employees found"}
            </div>
            <p className="font-code-sm text-xs text-on-surface-variant max-w-sm mx-auto">
              {searchQuery
                ? `No people matched "${searchQuery}". Try a different search filter.`
                : "When employees register through the Employee Portal (Port 3001), their records will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-tech bg-surface-layer font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-primary-container" />
                      <span>Employee</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Shield size={13} className="text-primary-container" />
                      <span>Membership Role</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <Briefcase size={13} className="text-primary-container" />
                      <span>Job / AI Role Blueprint</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 font-semibold">
                    <div className="flex items-center gap-1.5">
                      <BadgeCheck size={13} className="text-primary-container" />
                      <span>Employee ID</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-right">
                    <span>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-tech/60 font-code-sm text-xs text-on-surface">
                {filteredMembers.map((member) => {
                  const assignedRoleName = member.job_role_name || member.job_title || null;
                  const matchingRole = availableRoles.find(
                    (r) => r.name.toLowerCase() === (assignedRoleName || "").toLowerCase()
                  );

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-surface-container-high/40 transition-colors group"
                    >
                      {/* Employee Info */}
                      <td className="py-3.5 px-4 font-semibold text-on-surface">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 border border-primary-container/40 bg-primary-container/10 flex items-center justify-center text-primary-container font-mono font-bold text-xs shrink-0 rounded-sm">
                            {member.name ? member.name.charAt(0).toUpperCase() : "E"}
                          </div>
                          <div>
                            <div className="group-hover:text-primary-container transition-colors font-bold">
                              {member.name || "Unnamed Employee"}
                            </div>
                            <div className="font-mono text-[11px] text-on-surface-variant font-normal">
                              {member.email || "No email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Organizational Membership Authorization */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-border-tech bg-surface-layer font-code-sm text-[11px] rounded-sm">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              member.role === "ORG_ADMIN" ? "bg-amber-400" : "bg-primary-container"
                            }`}
                          />
                          <span className="font-semibold uppercase">{member.role || "EMPLOYEE"}</span>
                        </div>
                      </td>

                      {/* Job / AI Role Blueprint */}
                      <td className="py-3.5 px-4">
                        {assignedRoleName ? (
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-primary-container/10 border border-primary-container/30 text-primary-container font-code-sm text-xs font-bold rounded-sm inline-flex items-center gap-1.5">
                              <Bot size={12} />
                              <span>{assignedRoleName}</span>
                            </span>
                            {matchingRole && (
                              <span className="font-mono text-[10px] text-on-surface-variant bg-surface-layer border border-border-tech px-1.5 py-0.5 rounded-sm">
                                {matchingRole.capabilities_count ?? matchingRole.capabilities?.length ?? 0} AI Caps
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-surface-layer border border-dashed border-border-tech text-neutral-500 font-code-sm text-[11px] rounded-sm">
                            Unassigned Role
                          </span>
                        )}
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

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openMemberDetailModal(member)}
                            className="px-3 py-1 border border-border-tech hover:border-primary-container/50 hover:bg-surface-layer text-on-surface font-code-sm text-xs flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Network size={12} className="text-primary-container" />
                            <span>AI Workforce View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openChangeRoleModal(member)}
                            className="px-3 py-1 border border-primary-container/50 bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Change Role</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: DETAILED EMPLOYEE AI WORKFORCE & AGENT NETWORK VIEW ── */}
      {selectedMember && !isChangeRoleModalOpen && !isRegenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="border border-border-tech bg-surface-container-low w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-sm shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-tech p-4 bg-surface-layer sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Network size={18} className="text-primary-container" />
                <h3 className="font-code-sm text-sm font-bold text-on-surface">
                  Employee AI Workforce / Agent Network // {selectedMember.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* ── SECTION 1: EMPLOYEE IDENTITY ────────────────────── */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-layer border border-border-tech p-4 rounded-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 border border-primary-container/40 bg-primary-container/10 flex items-center justify-center text-primary-container font-mono font-bold text-lg rounded-sm shrink-0">
                    {selectedMember.name ? selectedMember.name.charAt(0).toUpperCase() : "E"}
                  </div>
                  <div>
                    <h4 className="font-display-xl text-lg font-bold text-on-surface">
                      {selectedMember.name}
                    </h4>
                    <div className="font-mono text-xs text-on-surface-variant mt-0.5">
                      {selectedMember.email} • ID: <span className="text-primary-container font-semibold">{selectedMember.employee_id || "EMP-001"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1 font-code-sm text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-on-surface-variant text-[11px] font-label-caps uppercase">Department:</span>
                    <span className="font-bold text-on-surface bg-surface-container-low px-2 py-0.5 border border-border-tech rounded-sm">
                      {selectedMember.job_role_department || selectedMember.department || "Engineering"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-on-surface-variant text-[11px] font-label-caps uppercase">Access / Membership:</span>
                    <span className="font-mono text-[11px] uppercase text-primary-container font-semibold">
                      {selectedMember.role || "EMPLOYEE"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── SECTION 2: ASSIGNED JOB / AI ROLE BLUEPRINT ──────── */}
              <div className="border border-border-tech bg-surface-layer p-4 rounded-sm space-y-3">
                <div className="flex items-center justify-between border-b border-border-tech/50 pb-2">
                  <div className="flex items-center gap-2">
                    <Briefcase size={15} className="text-primary-container" />
                    <span className="font-label-caps text-xs font-bold text-on-surface uppercase">
                      Job / AI Role Blueprint
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openChangeRoleModal(selectedMember)}
                    className="px-2.5 py-1 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold cursor-pointer"
                  >
                    Change Role
                  </button>
                </div>

                {isLoadingMemberRole ? (
                  <div className="p-3 text-center text-xs font-code-sm text-on-surface-variant">
                    Loading role configuration from database...
                  </div>
                ) : memberRoleData?.assigned_role ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-surface-container-low border border-border-tech p-3 rounded-sm">
                      <div>
                        <div className="font-code-sm text-sm font-bold text-primary-container">
                          {memberRoleData.assigned_role.name}
                        </div>
                        <div className="font-code-sm text-xs text-on-surface-variant mt-0.5">
                          {memberRoleData.assigned_role.description || "Organizational job role blueprint."}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] px-2 py-0.5 border border-border-tech bg-surface-layer text-on-surface rounded-sm uppercase">
                          Risk: {memberRoleData.assigned_role.risk_level}
                        </span>
                      </div>
                    </div>

                    {/* Role Capabilities Bundle */}
                    <div>
                      <span className="text-[10px] font-label-caps text-on-surface-variant uppercase block mb-1.5">
                        Required Capabilities Bundle in Role Blueprint:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(memberRoleData.assigned_role.capabilities && memberRoleData.assigned_role.capabilities.length > 0) ? (
                          memberRoleData.assigned_role.capabilities.map((c) => (
                            <span
                              key={c.id}
                              className="px-2.5 py-1 border border-border-tech bg-surface-container-low text-xs font-mono text-on-surface rounded-sm flex items-center gap-1.5"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                              <span>{c.name}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-code-sm text-neutral-500 italic">
                            No direct capability bundle mapped.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-surface-container-low border border-dashed border-border-tech text-center font-code-sm text-xs text-on-surface-variant rounded-sm">
                    {selectedMember.job_role_name || selectedMember.job_title || "No Job/AI Role assigned yet."}
                  </div>
                )}
              </div>

              {/* ── SECTION 3: AI WORKFORCE / AGENT NETWORK (AgentGroup) ── */}
              <div className="border border-border-tech bg-surface-layer p-4 rounded-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-border-tech/50 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap size={16} className="text-primary-container" />
                      <span className="font-label-caps text-xs font-bold text-on-surface uppercase">
                        AI Workforce / Agent Network
                      </span>
                      <span className="px-1.5 py-0.2 border border-border-tech bg-surface-container-low font-mono text-[9px] text-on-surface-variant rounded-sm">
                        Backend object: AgentGroup
                      </span>
                    </div>
                    <p className="font-code-sm text-[11px] text-on-surface-variant mt-0.5">
                      Employee-specific instantiated runtime agent group assembled by AgentFactory.
                    </p>
                  </div>

                  {/* Provision / Regenerate Actions */}
                  <div className="flex items-center gap-2">
                    {memberWorkforce ? (
                      <button
                        type="button"
                        onClick={() => setIsRegenerateModalOpen(true)}
                        disabled={isProvisioningOnDemand}
                        className="px-3 py-1.5 border border-primary-container/60 hover:bg-primary-container/10 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RotateCcw size={12} className={isProvisioningOnDemand ? "animate-spin" : ""} />
                        <span>Regenerate AI Workforce</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleInitialProvision}
                        disabled={isProvisioningOnDemand}
                        className="px-3 py-1.5 border border-primary-container bg-primary-container/20 hover:bg-primary-container/30 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Zap size={12} className={isProvisioningOnDemand ? "animate-spin" : ""} />
                        <span>Provision AI Workforce</span>
                      </button>
                    )}
                  </div>
                </div>

                {isLoadingMemberRole || isProvisioningOnDemand ? (
                  <div className="p-8 text-center text-xs font-code-sm text-on-surface-variant space-y-2">
                    <div className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin mx-auto" />
                    <div>Querying active AgentGroup from Agent DB...</div>
                  </div>
                ) : memberWorkforce ? (
                  <div className="space-y-4">
                    {/* Agent Group Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-surface-container-low border border-border-tech p-3 rounded-sm font-code-sm text-xs">
                      <div>
                        <span className="text-on-surface-variant text-[10px] font-label-caps uppercase block">Agent Group Name:</span>
                        <span className="font-bold text-on-surface">{memberWorkforce.name}</span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant text-[10px] font-label-caps uppercase block">Runtime Status:</span>
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {memberWorkforce.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-on-surface-variant text-[10px] font-label-caps uppercase block">Provisioned At:</span>
                        <span className="font-mono text-on-surface-variant">
                          {memberWorkforce.created_at ? new Date(memberWorkforce.created_at).toLocaleString() : "Active"}
                        </span>
                      </div>
                    </div>

                    {/* Instantiated Agent Cards */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-label-caps text-[11px] text-on-surface-variant uppercase font-semibold">
                          Instantiated Agents in Network ({memberWorkforce.agents?.length || 0})
                        </span>
                        <span className="font-mono text-[10px] text-neutral-500">Agent DB Instances</span>
                      </div>

                      {(!memberWorkforce.agents || memberWorkforce.agents.length === 0) ? (
                        <div className="p-4 bg-surface-container-low border border-dashed border-border-tech text-center font-code-sm text-xs text-on-surface-variant">
                          No individual agents instantiated in this group.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {memberWorkforce.agents.map((agent: any) => (
                            <div
                              key={agent.id}
                              className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm space-y-2.5 hover:border-primary-container/40 transition-colors shadow-sm"
                            >
                              {/* Agent Header */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Bot size={15} className="text-primary-container" />
                                  <span className="font-code-sm text-xs font-bold text-on-surface">
                                    {agent.name}
                                  </span>
                                </div>
                                <span className="px-1.5 py-0.2 border border-emerald-500/40 bg-emerald-950/20 text-emerald-400 font-mono text-[9px] uppercase rounded-sm">
                                  {agent.status}
                                </span>
                              </div>

                              {/* Capability Description if available */}
                              {agent.capability && (
                                <p className="font-code-sm text-[11px] text-on-surface-variant line-clamp-2">
                                  {agent.capability.description}
                                </p>
                              )}

                              {/* Assigned Tools */}
                              <div className="pt-2 border-t border-border-tech/40 space-y-1.5 font-code-sm text-[11px]">
                                <div className="flex items-center gap-1 flex-wrap">
                                  <Wrench size={11} className="text-on-surface-variant shrink-0" />
                                  <span className="text-on-surface-variant font-label-caps text-[10px] uppercase">Tools:</span>
                                  {agent.assigned_tools && agent.assigned_tools.length > 0 ? (
                                    agent.assigned_tools.map((tool: string) => (
                                      <span
                                        key={tool}
                                        className="px-1.5 py-0.2 bg-surface-layer border border-border-tech font-mono text-[9px] text-neutral-300 rounded-sm"
                                      >
                                        {tool}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-neutral-500 text-[10px] font-mono">None</span>
                                  )}
                                </div>

                                {/* Permissions */}
                                <div className="flex items-center gap-1 flex-wrap">
                                  <KeyRound size={11} className="text-on-surface-variant shrink-0" />
                                  <span className="text-on-surface-variant font-label-caps text-[10px] uppercase">Permissions:</span>
                                  {agent.permissions && agent.permissions.length > 0 ? (
                                    agent.permissions.map((perm: string) => (
                                      <span
                                        key={perm}
                                        className="px-1.5 py-0.2 bg-surface-layer border border-border-tech font-mono text-[9px] text-primary-container rounded-sm"
                                      >
                                        {perm}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-neutral-500 text-[10px] font-mono">None</span>
                                  )}
                                </div>
                              </div>

                              {/* Footer Timestamp */}
                              <div className="flex items-center justify-between pt-2 border-t border-border-tech/30 font-mono text-[9px] text-neutral-500">
                                <span>ID: {agent.id ? `${agent.id.slice(0, 8)}...` : "agent"}</span>
                                <span>{agent.created_at ? new Date(agent.created_at).toLocaleDateString() : "Active"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-surface-container-low border border-dashed border-border-tech text-center font-code-sm text-xs text-on-surface-variant space-y-2 rounded-sm">
                    <Bot size={24} className="text-on-surface-variant mx-auto opacity-50" />
                    <div className="font-bold text-on-surface">No Active Agent Workforce Found</div>
                    <p className="max-w-md mx-auto">
                      This employee has not been provisioned with an AgentGroup. Click the provision button above to automatically assemble agents based on their assigned role blueprint.
                    </p>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setSelectedMember(null)}
                  className="px-4 py-2 border border-border-tech hover:bg-surface-layer text-on-surface font-code-sm text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM REGENERATE WORKFORCE ──────────────────────── */}
      {isRegenerateModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="border border-amber-500/40 bg-surface-container-low w-full max-w-md p-5 rounded-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400 font-code-sm text-sm font-bold">
              <AlertTriangle size={16} />
              <span>Confirm AI Workforce Regeneration</span>
            </div>
            <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed">
              Regenerating the AI Workforce for <span className="text-on-surface font-bold">&quot;{selectedMember.name}&quot;</span> will archive their previous <span className="text-primary-container font-mono">AgentGroup</span> and instantiate fresh agents from the current role blueprint.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-tech">
              <button
                type="button"
                onClick={() => setIsRegenerateModalOpen(false)}
                className="px-4 py-2 border border-border-tech hover:bg-surface-layer text-on-surface font-code-sm text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRegenerateWorkforce}
                disabled={isProvisioningOnDemand}
                className="px-4 py-2 border border-primary-container bg-primary-container/20 hover:bg-primary-container/30 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isProvisioningOnDemand && <RefreshCw size={12} className="animate-spin" />}
                <span>Confirm Regeneration</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ROLE PREVIEW & EXPLICIT CONFIRMATION ──────────────── */}
      {isChangeRoleModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="border border-border-tech bg-surface-container-low w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-tech p-4 bg-surface-layer">
              <div className="flex items-center gap-2">
                <Sliders size={16} className="text-primary-container" />
                <h3 className="font-code-sm text-sm font-bold text-on-surface">
                  Assign Job / AI Role // {selectedMember.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeRoleModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="font-code-sm text-xs text-on-surface-variant">
                Select a new organizational Job/AI Role blueprint for <span className="text-on-surface font-bold">&quot;{selectedMember.name}&quot;</span>. Changing this role automatically provisions a tailored AI AgentGroup through the AgentFactory without modifying membership authorization.
              </p>

              {/* Select Target Role */}
              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                  Select New Job / AI Role Blueprint *
                </label>
                <select
                  value={selectedTargetRoleId}
                  onChange={(e) => setSelectedTargetRoleId(e.target.value)}
                  className="w-full bg-surface-layer border border-border-tech px-3 py-2.5 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none cursor-pointer rounded-sm"
                >
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.department || "General"} Dept) — {r.capabilities_count ?? r.capabilities?.length ?? 0} Capabilities
                    </option>
                  ))}
                </select>
              </div>

              {/* ── ROLE PREVIEW COMPARISON CARD ───────────────────── */}
              {previewTargetRole && (
                <div className="border border-border-tech bg-surface-layer p-4 rounded-sm space-y-3 shadow-inner">
                  <div className="flex items-center justify-between border-b border-border-tech/60 pb-2">
                    <span className="font-label-caps text-[11px] text-primary-container font-bold uppercase">
                      Role Transition Preview &amp; Impact
                    </span>
                    <span className="font-mono text-[9px] text-neutral-400">
                      CriteriaEngine &amp; AgentFactory Ready
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-code-sm text-xs">
                    {/* Current Role */}
                    <div className="bg-surface-container-low border border-border-tech p-3 rounded-sm">
                      <span className="text-on-surface-variant text-[10px] font-label-caps uppercase block mb-1">
                        Current Role:
                      </span>
                      <div className="font-bold text-neutral-400">
                        {previewCurrentRoleName}
                      </div>
                    </div>

                    {/* New Role */}
                    <div className="bg-primary-container/10 border border-primary-container/40 p-3 rounded-sm">
                      <span className="text-primary-container text-[10px] font-label-caps uppercase block mb-1">
                        New Role:
                      </span>
                      <div className="font-bold text-primary-container">
                        {previewTargetRole.name}
                      </div>
                    </div>
                  </div>

                  {/* Capabilities & AI Workforce Impact */}
                  <div className="space-y-2 pt-2 border-t border-border-tech/40 text-xs font-code-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">New Capabilities:</span>
                      <span className="font-mono font-bold text-primary-container">
                        {previewTargetRole.capabilities_count ?? previewTargetRole.capabilities?.length ?? 0} Modules
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">New AI Workforce:</span>
                      <span className="text-emerald-400 font-semibold">
                        Will be provisioned via AgentFactory
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">Operational Risk Level:</span>
                      <span className="font-mono uppercase text-on-surface">
                        {previewTargetRole.risk_level}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">Membership Authorization:</span>
                      <span className="font-mono text-neutral-400 uppercase">
                        {selectedMember.role} (Unchanged)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Explicit Confirmation Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setIsChangeRoleModalOpen(false)}
                  className="px-4 py-2 border border-border-tech hover:bg-surface-layer text-on-surface font-code-sm text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRoleAssignment}
                  disabled={isAssigningRole || !selectedTargetRoleId}
                  className="px-5 py-2 border border-primary-container bg-primary-container/20 hover:bg-primary-container/30 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAssigningRole && <RefreshCw size={12} className="animate-spin" />}
                  <span>Confirm Role Assignment</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
