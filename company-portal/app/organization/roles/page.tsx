"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { roleService } from "@shared/services/role.service";
import type {
  OrganizationRole,
  RoleCreatePayload,
  RoleUpdatePayload,
  RoleCapabilitySummary,
  RoleRiskLevel,
  RoleStatus,
} from "@shared/types/role";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  Briefcase,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Cpu,
  Users,
  Bot,
  X,
  Layers,
  Sparkles,
  Check,
  AlertTriangle,
  FileText,
  Wrench,
  KeyRound,
} from "lucide-react";

export default function RolesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, isAuthenticated, isOrgAdmin } = useAuth();

  const [roles, setRoles] = useState<OrganizationRole[]>([]);
  const [availableCapabilities, setAvailableCapabilities] = useState<RoleCapabilitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<OrganizationRole | null>(null);
  const [viewingRole, setViewingRole] = useState<OrganizationRole | null>(null);
  const [isCapabilitiesModalOpen, setIsCapabilitiesModalOpen] = useState(false);
  const [selectedRoleForCaps, setSelectedRoleForCaps] = useState<OrganizationRole | null>(null);
  const [selectedCapabilityNames, setSelectedCapabilityNames] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for Create / Edit
  const [formName, setFormName] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formRisk, setFormRisk] = useState<RoleRiskLevel>("LOW");
  const [formStatus, setFormStatus] = useState<RoleStatus>("ACTIVE");
  const [formResponsibilities, setFormResponsibilities] = useState("");
  const [formSkills, setFormSkills] = useState("");
  const [formTools, setFormTools] = useState("");
  const [formPermissions, setFormPermissions] = useState("");

  const orgId = user?.organization_id || user?.organizationId;

  // Fetch roles and available capabilities
  const fetchRolesData = useCallback(
    async (isBackground = false) => {
      if (!orgId) return;
      if (!isBackground) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const [rolesRes, capsRes] = await Promise.all([
          roleService.getRoles(orgId),
          roleService.getAvailableAgentCapabilities().catch(() => []),
        ]);
        setRoles(rolesRes.roles || []);
        setAvailableCapabilities(capsRes || []);
      } catch (err: any) {
        console.error("Failed to load organizational roles:", err);
        setErrorMessage(err?.message || "Failed to load roles from backend service.");
      } finally {
        setIsLoading(false);
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
        fetchRolesData();
      }
    }
  }, [isAuthLoading, isAuthenticated, isOrgAdmin, orgId, router, fetchRolesData]);

  // Extract unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    roles.forEach((r) => {
      if (r.department) set.add(r.department);
    });
    return Array.from(set).sort();
  }, [roles]);

  // Filtered roles
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = role.name.toLowerCase().includes(q);
      const deptMatch = role.department?.toLowerCase().includes(q) || false;
      const matchesSearch = !q || nameMatch || deptMatch;

      const matchesStatus =
        statusFilter === "ALL" || role.status === statusFilter;
      const matchesDept =
        departmentFilter === "ALL" || role.department === departmentFilter;

      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [roles, searchQuery, statusFilter, departmentFilter]);

  // Quick stats
  const totalEmployees = useMemo(
    () => roles.reduce((acc, r) => acc + (r.employee_count || 0), 0),
    [roles]
  );
  const totalAgentGroups = useMemo(
    () => roles.reduce((acc, r) => acc + (r.agent_groups_count || 0), 0),
    [roles]
  );
  const activeRolesCount = useMemo(
    () => roles.filter((r) => r.status === "ACTIVE").length,
    [roles]
  );

  // Open Create Modal
  const openCreateModal = () => {
    setFormName("");
    setFormDept("");
    setFormDesc("");
    setFormRisk("LOW");
    setFormStatus("ACTIVE");
    setFormResponsibilities("");
    setFormSkills("");
    setFormTools("github, terminal");
    setFormPermissions("github:read, github:write");
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (role: OrganizationRole) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDept(role.department || "");
    setFormDesc(role.description || "");
    setFormRisk(role.risk_level || "LOW");
    setFormStatus(role.status || "ACTIVE");
    setFormResponsibilities((role.responsibilities || []).join("\n"));
    setFormSkills((role.required_skills || []).join(", "));
    setFormTools((role.tools || []).join(", "));
    setFormPermissions((role.permissions || []).join(", "));
  };

  // Open View Details Drawer
  const openViewModal = async (role: OrganizationRole) => {
    setViewingRole(role);
    if (orgId) {
      try {
        const fullRole = await roleService.getRole(orgId, role.id);
        setViewingRole(fullRole);
      } catch (err) {
        console.error("Failed to fetch full role details:", err);
      }
    }
  };

  // Open Capabilities Configuration Modal
  const openCapabilitiesModal = async (role: OrganizationRole) => {
    setSelectedRoleForCaps(role);
    setIsCapabilitiesModalOpen(true);
    if (orgId) {
      try {
        const capRes = await roleService.getRoleCapabilities(orgId, role.id);
        setSelectedCapabilityNames(capRes.capabilities.map((c) => c.name));
      } catch {
        setSelectedCapabilityNames(role.capabilities?.map((c) => c.name) || []);
      }
    }
  };

  // Handle Create Role Submit
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !formName.trim()) return;
    setIsSaving(true);
    try {
      const payload: RoleCreatePayload = {
        name: formName.trim(),
        department: formDept.trim() || undefined,
        description: formDesc.trim() || undefined,
        risk_level: formRisk,
        status: formStatus,
        responsibilities: formResponsibilities
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        required_skills: formSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tools: formTools
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        permissions: formPermissions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        persona: {
          communication_style: "professional",
          tone: "concise",
        },
      };

      await roleService.createRole(orgId, payload);
      setIsCreateModalOpen(false);
      await fetchRolesData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to create role");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Edit Role Submit
  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !editingRole || !formName.trim()) return;
    setIsSaving(true);
    try {
      const payload: RoleUpdatePayload = {
        name: formName.trim(),
        department: formDept.trim() || undefined,
        description: formDesc.trim() || undefined,
        risk_level: formRisk,
        status: formStatus,
        responsibilities: formResponsibilities
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        required_skills: formSkills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tools: formTools
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        permissions: formPermissions
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      await roleService.updateRole(orgId, editingRole.id, payload);
      setEditingRole(null);
      await fetchRolesData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update role");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Role Status (Activate / Deactivate)
  const toggleRoleStatus = async (role: OrganizationRole) => {
    if (!orgId) return;
    const newStatus: RoleStatus = role.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await roleService.updateRole(orgId, role.id, { status: newStatus });
      await fetchRolesData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update role status");
    }
  };

  // Save Capabilities Mapping
  const handleSaveCapabilities = async () => {
    if (!orgId || !selectedRoleForCaps) return;
    setIsSaving(true);
    try {
      await roleService.updateRoleCapabilities(
        orgId,
        selectedRoleForCaps.id,
        selectedCapabilityNames
      );
      setIsCapabilitiesModalOpen(false);
      setSelectedRoleForCaps(null);
      await fetchRolesData(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to save capabilities");
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading) {
    return <LoadingState label="Authenticating administrator session..." />;
  }

  if (!isAuthenticated || !isOrgAdmin) {
    return <LoadingState label="Redirecting to Company Login..." />;
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-tech pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 font-code-sm text-[10px] text-primary-container uppercase tracking-wider">
              Directory // AI Workforce
            </span>
            <span className="font-code-sm text-xs text-on-surface-variant">
              {roles.length} {roles.length === 1 ? "Role Defined" : "Roles Defined"}
            </span>
          </div>
          <h1 className="font-display-xl text-[26px] sm:text-[30px] text-on-surface">
            Roles &amp; AI Workforce
          </h1>
          <p className="font-code-sm text-xs text-on-surface-variant mt-1">
            Define organizational roles, AI capabilities, permissions, and employee AI workforce configuration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fetchRolesData(true)}
            disabled={isLoading || isRefreshing}
            className="px-3 py-2 border border-border-tech hover:border-primary-container/50 bg-surface-container-low text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Reload roles from backend"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-primary-container" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Plus size={14} />
            <span>Create Role</span>
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Total Roles</span>
            <Briefcase size={14} className="text-primary-container" />
          </div>
          <div className="font-mono text-xl font-bold text-on-surface">{roles.length}</div>
          <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
            {activeRolesCount} active in network
          </div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Enrolled Employees</span>
            <Users size={14} className="text-primary-container" />
          </div>
          <div className="font-mono text-xl font-bold text-on-surface">{totalEmployees}</div>
          <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
            Mapped across roles
          </div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Agent Capabilities</span>
            <Cpu size={14} className="text-primary-container" />
          </div>
          <div className="font-mono text-xl font-bold text-on-surface">
            {availableCapabilities.length}
          </div>
          <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
            Reusable AI modules
          </div>
        </div>

        <div className="border border-border-tech bg-surface-container-low p-3.5 rounded-sm">
          <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
            <span>Provisioned Agent Groups</span>
            <Bot size={14} className="text-primary-container" />
          </div>
          <div className="font-mono text-xl font-bold text-on-surface">{totalAgentGroups}</div>
          <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
            Employee runtime twins
          </div>
        </div>
      </div>

      {/* Error Message if any */}
      {errorMessage && (
        <div className="p-3 border border-red-500/40 bg-red-950/20 text-red-400 font-code-sm text-xs flex items-center justify-between rounded-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchRolesData(true)}
            className="underline hover:text-red-300 ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <Search size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by role title or department..."
            className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-surface-container-low border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none transition-colors cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* Status Filter Tabs */}
          <div className="flex items-center border border-border-tech bg-surface-container-low p-0.5 rounded-sm">
            {(["ALL", "ACTIVE", "INACTIVE", "DRAFT"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 font-code-sm text-[11px] transition-colors rounded-sm cursor-pointer ${
                  statusFilter === st
                    ? "bg-primary-container/20 text-primary-container font-semibold border border-primary-container/40"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {st === "ALL" ? "All Status" : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Roles Table */}
      <div className="border border-border-tech bg-surface-container-low rounded-sm overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <div className="font-code-sm text-xs text-on-surface-variant">
              Loading organizational roles and capability matrix from database...
            </div>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 border border-border-tech bg-surface-layer flex items-center justify-center text-on-surface-variant mx-auto rounded-sm">
              <Briefcase size={20} />
            </div>
            <div className="font-code-sm text-sm font-bold text-on-surface">
              {searchQuery || statusFilter !== "ALL" || departmentFilter !== "ALL"
                ? "No matching roles found"
                : "No organizational roles configured"}
            </div>
            <p className="font-code-sm text-xs text-on-surface-variant max-w-md mx-auto">
              {searchQuery || statusFilter !== "ALL" || departmentFilter !== "ALL"
                ? "Try adjusting your search terms or filter criteria."
                : "Get started by defining job roles, responsibilities, and mapping required AI capabilities."}
            </p>
            {(!searchQuery && statusFilter === "ALL" && departmentFilter === "ALL") && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-2 px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Create First Role</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-tech bg-surface-layer font-label-caps text-[11px] text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th className="py-3 px-4 font-semibold">Employees</th>
                  <th className="py-3 px-4 font-semibold">Capabilities</th>
                  <th className="py-3 px-4 font-semibold">Agent Groups</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-tech/60 font-code-sm text-xs text-on-surface">
                {filteredRoles.map((role) => (
                  <tr
                    key={role.id}
                    className="hover:bg-surface-container-high/40 transition-colors group"
                  >
                    {/* Role Title & Risk */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/organization/roles/${role.id}`}
                            className="font-semibold text-on-surface hover:text-primary-container transition-colors"
                          >
                            {role.name}
                          </Link>
                          {role.risk_level === "CRITICAL" && (
                            <span className="px-1.5 py-0.2 border border-red-500/40 bg-red-950/30 text-[9px] text-red-400 uppercase rounded-sm">
                              Critical Risk
                            </span>
                          )}
                          {role.risk_level === "HIGH" && (
                            <span className="px-1.5 py-0.2 border border-amber-500/40 bg-amber-950/30 text-[9px] text-amber-400 uppercase rounded-sm">
                              High Risk
                            </span>
                          )}
                        </div>
                        {role.description && (
                          <span className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                            {role.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4 text-on-surface-variant">
                      <span className="px-2 py-0.5 bg-surface-layer border border-border-tech rounded-sm text-on-surface text-[11px]">
                        {role.department || "General"}
                      </span>
                    </td>

                    {/* Employees Count */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5 text-on-surface">
                        <Users size={12} className="text-primary-container" />
                        <span>{role.employee_count ?? 0} Employees</span>
                      </div>
                    </td>

                    {/* Capabilities Count */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => openCapabilitiesModal(role)}
                        className="flex items-center gap-1.5 font-mono text-primary-container hover:underline cursor-pointer group/cap"
                        title="Click to configure capabilities"
                      >
                        <Cpu size={12} className="group-hover/cap:scale-110 transition-transform" />
                        <span>{role.capabilities_count ?? role.capabilities?.length ?? 0} Capabilities</span>
                      </button>
                    </td>

                    {/* Agent Groups Count */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-1.5 text-on-surface-variant">
                        <Bot size={12} className="text-primary-container" />
                        <span>{role.agent_groups_count ?? role.employee_count ?? 0} Agent Groups</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {role.status === "ACTIVE" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 text-primary-container text-[10px] uppercase font-bold rounded-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse" />
                          Active
                        </span>
                      ) : role.status === "DRAFT" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-amber-500/40 bg-amber-950/20 text-amber-400 text-[10px] uppercase font-bold rounded-sm">
                          Draft
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 border border-neutral-700 bg-neutral-900/40 text-neutral-400 text-[10px] uppercase font-bold rounded-sm">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/organization/roles/${role.id}`}
                          className="px-2 py-1 border border-border-tech hover:border-primary-container/60 hover:bg-surface-layer text-on-surface font-code-sm text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="View Role Blueprint & Capabilities"
                        >
                          <Eye size={11} />
                          <span>View</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => openEditModal(role)}
                          className="px-2 py-1 border border-border-tech hover:border-primary-container/60 hover:bg-surface-layer text-on-surface font-code-sm text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          title="Edit Role Blueprint"
                        >
                          <Edit2 size={11} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleRoleStatus(role)}
                          className={`px-2 py-1 border text-[11px] font-code-sm flex items-center gap-1 transition-colors cursor-pointer ${
                            role.status === "ACTIVE"
                              ? "border-border-tech text-neutral-400 hover:border-red-500/50 hover:text-red-400 hover:bg-red-950/20"
                              : "border-primary-container/40 text-primary-container hover:bg-primary-container/10"
                          }`}
                          title={role.status === "ACTIVE" ? "Deactivate Role" : "Activate Role"}
                        >
                          {role.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE / EDIT ROLE MODAL ────────────────────────────────────── */}
      {(isCreateModalOpen || editingRole) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="border border-border-tech bg-surface-container-low w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-tech p-4 bg-surface-layer">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-primary-container" />
                <h3 className="font-code-sm text-sm font-bold text-on-surface">
                  {editingRole ? `Edit Role Blueprint // ${editingRole.name}` : "Create Organizational Role Blueprint"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingRole(null);
                }}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={editingRole ? handleEditRole : handleCreateRole} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role Title */}
                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                    Role Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Senior Full-Stack Engineer"
                    className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    placeholder="e.g. Engineering, DevOps, Product"
                    className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                  Description / Purpose
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Primary objective and scope of this role..."
                  className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Risk Level */}
                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                    Risk Level
                  </label>
                  <select
                    value={formRisk}
                    onChange={(e) => setFormRisk(e.target.value as RoleRiskLevel)}
                    className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none cursor-pointer"
                  >
                    <option value="LOW">LOW (Standard tasks, non-destructive)</option>
                    <option value="MEDIUM">MEDIUM (Code generation, PR creation)</option>
                    <option value="HIGH">HIGH (Infrastructure, DB queries)</option>
                    <option value="CRITICAL">CRITICAL (Production deployment)</option>
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                    Lifecycle Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as RoleStatus)}
                    className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (Available for assignment)</option>
                    <option value="DRAFT">DRAFT (Under review)</option>
                    <option value="INACTIVE">INACTIVE (Disabled)</option>
                  </select>
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                  Core Responsibilities (One per line)
                </label>
                <textarea
                  rows={3}
                  value={formResponsibilities}
                  onChange={(e) => setFormResponsibilities(e.target.value)}
                  placeholder="Implement high-throughput backend APIs&#10;Conduct automated code reviews&#10;Maintain unit and integration tests"
                  className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                />
              </div>

              {/* Required Skills & Tools */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                    Required Skills (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={formSkills}
                    onChange={(e) => setFormSkills(e.target.value)}
                    placeholder="Python, FastAPI, TypeScript, React"
                    className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                    Assigned Tools (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={formTools}
                    onChange={(e) => setFormTools(e.target.value)}
                    placeholder="github, jira, terminal"
                    className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                  />
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                  Assigned Permissions (Comma separated)
                </label>
                <input
                  type="text"
                  value={formPermissions}
                  onChange={(e) => setFormPermissions(e.target.value)}
                  placeholder="github:read, github:write, jira:write"
                  className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingRole(null);
                  }}
                  className="px-4 py-2 border border-border-tech hover:bg-surface-layer text-on-surface font-code-sm text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 border border-primary-container bg-primary-container/20 hover:bg-primary-container/30 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <RefreshCw size={12} className="animate-spin" />}
                  <span>{editingRole ? "Save Changes" : "Create Role"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW ROLE DETAILS DRAWER / MODAL ───────────────────────────── */}
      {viewingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="border border-border-tech bg-surface-container-low w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-tech p-4 bg-surface-layer">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-primary-container" />
                <h3 className="font-code-sm text-sm font-bold text-on-surface">
                  Role Blueprint // {viewingRole.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRole(null)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Role Header Info */}
              <div className="flex items-start justify-between border-b border-border-tech pb-4">
                <div>
                  <h2 className="font-display-xl text-xl text-on-surface font-bold">
                    {viewingRole.name}
                  </h2>
                  <p className="font-code-sm text-xs text-on-surface-variant mt-0.5">
                    Department: <span className="text-on-surface">{viewingRole.department || "General"}</span>
                  </p>
                  {viewingRole.description && (
                    <p className="font-code-sm text-xs text-neutral-300 mt-2 bg-surface-layer p-2.5 border border-border-tech rounded-sm">
                      {viewingRole.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 text-primary-container font-code-sm text-[10px] uppercase font-bold rounded-sm">
                    {viewingRole.status}
                  </span>
                  <span className="font-mono text-[10px] text-on-surface-variant">
                    Risk: {viewingRole.risk_level}
                  </span>
                </div>
              </div>

              {/* Configured Capabilities Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Cpu size={14} className="text-primary-container" />
                    <h4 className="font-label-caps text-xs text-on-surface uppercase font-bold">
                      Configured AI Capabilities ({viewingRole.capabilities?.length || 0})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const r = viewingRole;
                      setViewingRole(null);
                      openCapabilitiesModal(r);
                    }}
                    className="px-2 py-1 border border-primary-container/40 text-primary-container hover:bg-primary-container/10 font-code-sm text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Wrench size={11} />
                    <span>Manage Capabilities</span>
                  </button>
                </div>

                {(!viewingRole.capabilities || viewingRole.capabilities.length === 0) ? (
                  <div className="p-4 border border-dashed border-border-tech bg-surface-layer text-center font-code-sm text-xs text-on-surface-variant rounded-sm">
                    No capabilities mapped yet. Click &quot;Manage Capabilities&quot; to assign autonomous agent capabilities to this role.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {viewingRole.capabilities.map((cap) => (
                      <div
                        key={cap.id}
                        className="border border-border-tech bg-surface-layer p-3 rounded-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-code-sm text-xs font-bold text-primary-container">
                              {cap.name}
                            </span>
                            <span className="text-[9px] font-mono px-1.5 py-0.2 border border-border-tech bg-surface-container-low text-on-surface-variant uppercase rounded-sm">
                              v{cap.version}
                            </span>
                          </div>
                          <p className="font-code-sm text-[11px] text-on-surface-variant line-clamp-2">
                            {cap.description}
                          </p>
                        </div>

                        {cap.required_tools && cap.required_tools.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap mt-2 pt-2 border-t border-border-tech/40">
                            <span className="text-[9px] text-neutral-500 font-label-caps">Tools:</span>
                            {cap.required_tools.map((t) => (
                              <span key={t} className="px-1 py-0.2 bg-neutral-900 border border-neutral-700 text-[9px] font-mono text-neutral-300 rounded-sm">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Responsibilities */}
              {viewingRole.responsibilities && viewingRole.responsibilities.length > 0 && (
                <div>
                  <h4 className="font-label-caps text-xs text-on-surface uppercase font-bold mb-1.5 flex items-center gap-1.5">
                    <FileText size={13} className="text-primary-container" />
                    <span>Responsibilities</span>
                  </h4>
                  <ul className="space-y-1 bg-surface-layer border border-border-tech p-3 rounded-sm font-code-sm text-xs text-on-surface">
                    {viewingRole.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary-container font-mono">•</span>
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills & Tools Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-label-caps text-xs text-on-surface uppercase font-bold mb-1.5 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-primary-container" />
                    <span>Required Skills</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5 bg-surface-layer border border-border-tech p-2.5 rounded-sm">
                    {viewingRole.required_skills && viewingRole.required_skills.length > 0 ? (
                      viewingRole.required_skills.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-surface-container-low border border-border-tech font-code-sm text-xs text-on-surface rounded-sm">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="font-code-sm text-xs text-on-surface-variant">None specified</span>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-label-caps text-xs text-on-surface uppercase font-bold mb-1.5 flex items-center gap-1.5">
                    <KeyRound size={13} className="text-primary-container" />
                    <span>Assigned Permissions</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5 bg-surface-layer border border-border-tech p-2.5 rounded-sm">
                    {viewingRole.permissions && viewingRole.permissions.length > 0 ? (
                      viewingRole.permissions.map((p, i) => (
                        <span key={i} className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 font-mono text-[11px] text-primary-container rounded-sm">
                          {p}
                        </span>
                      ))
                    ) : (
                      <span className="font-code-sm text-xs text-on-surface-variant">None specified</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <div className="flex items-center justify-end pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setViewingRole(null)}
                  className="px-4 py-2 border border-border-tech hover:bg-surface-layer text-on-surface font-code-sm text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIGURE CAPABILITIES MODAL ────────────────────────────────── */}
      {isCapabilitiesModalOpen && selectedRoleForCaps && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="border border-border-tech bg-surface-container-low w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-tech p-4 bg-surface-layer">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-primary-container" />
                <h3 className="font-code-sm text-sm font-bold text-on-surface">
                  Configure Capabilities // {selectedRoleForCaps.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCapabilitiesModalOpen(false);
                  setSelectedRoleForCaps(null);
                }}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="font-code-sm text-xs text-on-surface-variant">
                Select the reusable AI agent capabilities required for this role. When employees are provisioned, the AgentFactory will dynamically instantiate agents for these capabilities.
              </p>

              {availableCapabilities.length === 0 ? (
                <div className="p-6 border border-dashed border-border-tech text-center font-code-sm text-xs text-on-surface-variant bg-surface-layer rounded-sm">
                  No active capabilities available in the Capability Registry.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {availableCapabilities.map((cap) => {
                    const isSelected = selectedCapabilityNames.includes(cap.name);
                    return (
                      <div
                        key={cap.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedCapabilityNames(selectedCapabilityNames.filter((n) => n !== cap.name));
                          } else {
                            setSelectedCapabilityNames([...selectedCapabilityNames, cap.name]);
                          }
                        }}
                        className={`p-3 border rounded-sm cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? "border-primary-container bg-primary-container/10 text-on-surface"
                            : "border-border-tech bg-surface-layer text-on-surface-variant hover:border-border-tech/80"
                        }`}
                      >
                        <div className={`w-4 h-4 mt-0.5 border flex items-center justify-center rounded-sm shrink-0 ${
                          isSelected ? "border-primary-container bg-primary-container text-black" : "border-border-tech bg-surface-container-low"
                        }`}>
                          {isSelected && <Check size={11} className="stroke-[3]" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`font-code-sm text-xs font-bold ${isSelected ? "text-primary-container" : "text-on-surface"}`}>
                              {cap.name}
                            </span>
                            <span className="font-mono text-[9px] px-1.5 py-0.2 border border-border-tech bg-surface-container-low text-neutral-400 uppercase rounded-sm">
                              {cap.risk_level} Risk
                            </span>
                          </div>
                          <p className="font-code-sm text-[11px] text-on-surface-variant">
                            {cap.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border-tech">
                <span className="font-code-sm text-xs text-on-surface-variant">
                  {selectedCapabilityNames.length} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCapabilitiesModalOpen(false);
                      setSelectedRoleForCaps(null);
                    }}
                    className="px-4 py-2 border border-border-tech hover:bg-surface-layer text-on-surface font-code-sm text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCapabilities}
                    disabled={isSaving}
                    className="px-5 py-2 border border-primary-container bg-primary-container/20 hover:bg-primary-container/30 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving && <RefreshCw size={12} className="animate-spin" />}
                    <span>Save Capabilities</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
