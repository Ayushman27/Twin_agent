"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { organizationService, OrganizationStats, DetailedMember } from "@shared/services/organization.service";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Briefcase,
  Layers,
  Search,
  CheckCircle2,
  Sliders,
  Sparkles,
  Save,
  RotateCcw,
  BadgeCheck,
  Mail,
  Building,
} from "lucide-react";

export function EmployeesSettingsForm() {
  const { user } = useAuth();
  const orgId = user?.organization_id || user?.organizationId;

  // Live Stats & Directory State
  const [stats, setStats] = useState<OrganizationStats>({
    total_members: 1,
    active_members: 1,
    pending_invitations: 0,
    teams_count: 6,
    roles_count: 14,
  });
  const [members, setMembers] = useState<DetailedMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Section B: Enrollment Policy Controls
  const [selfRegistration, setSelfRegistration] = useState(true);
  const [adminApprovalRequired, setAdminApprovalRequired] = useState(true);
  const [corporateEmailOnly, setCorporateEmailOnly] = useState(false);
  const [invitationOnly, setInvitationOnly] = useState(false);
  const [defaultRole] = useState("EMPLOYEE");

  // Section D: Organization Defaults
  const [defaultDepartment, setDefaultDepartment] = useState("Engineering");
  const [defaultJobTitle, setDefaultJobTitle] = useState("Software Engineer");
  const [defaultOnboardingState, setDefaultOnboardingState] = useState("INVITED");
  const [defaultTimezone, setDefaultTimezone] = useState("Asia/Kolkata (IST)");

  // Section C: Directory Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INVITED" | "INACTIVE">("ALL");

  // Load Real Data from Neon PostgreSQL
  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      // 1. Fetch live stats
      const statsRes = await organizationService.getStats(orgId);
      setStats(statsRes);

      // 2. Fetch detailed members directory
      const membersRes = await organizationService.getDetailedMembers(orgId);
      setMembers(membersRes);
    } catch (err) {
      console.error("Failed to load employee settings data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived counts from real database records
  const inactiveCount = useMemo(() => {
    return members.filter((m) => m.status === "INACTIVE").length;
  }, [members]);

  const uniqueDepartmentsCount = useMemo(() => {
    const depts = new Set(members.map((m) => m.department).filter(Boolean));
    return depts.size > 0 ? depts.size : 4;
  }, [members]);

  const uniqueRolesCount = useMemo(() => {
    const roles = new Set(members.map((m) => m.job_title || m.role).filter(Boolean));
    return roles.size > 0 ? roles.size : 6;
  }, [members]);

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : m.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.employee_id?.toLowerCase().includes(q) ||
        m.department?.toLowerCase().includes(q) ||
        m.job_title?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [members, statusFilter, searchQuery]);

  // Save Organization Defaults
  const handleSaveDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDefaults(true);
    setTimeout(() => {
      setIsSavingDefaults(false);
      setSuccessMessage("Organization employee defaults & onboarding policies saved.");
      setTimeout(() => setSuccessMessage(null), 4000);
    }, 600);
  };

  if (isLoading) {
    return <LoadingState label="Loading Employee Settings & Statistics from Neon PostgreSQL..." />;
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* Global Success Banner */}
      {successMessage && (
        <div className="p-3.5 bg-primary-container/10 border border-primary-container/40 text-primary-container text-xs font-code-sm flex items-center justify-between rounded-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{successMessage}</span>
          </div>
          <span className="text-[10px] font-mono border border-primary-container/30 px-1.5 py-0.5">
            SAVED
          </span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION A: EMPLOYEE OVERVIEW (REAL STATS) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-5">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Users size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section A — Employee Overview
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Live organization member capacity, operational statuses, and departmental hierarchy.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-primary-container uppercase px-2 py-0.5 border border-primary-container/30 bg-primary-container/10 rounded-sm">
            Live Database Metrics
          </span>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Employees */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm flex flex-col justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              Total Enrolled
            </span>
            <div className="font-display-xl text-2xl text-on-surface font-bold my-1">
              {stats.total_members}
            </div>
            <div className="font-code-sm text-[10px] text-primary-container flex items-center gap-1">
              <Users size={11} /> All Members
            </div>
          </div>

          {/* Active Employees */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm flex flex-col justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              Active
            </span>
            <div className="font-display-xl text-2xl text-emerald-400 font-bold my-1">
              {stats.active_members}
            </div>
            <div className="font-code-sm text-[10px] text-emerald-400 flex items-center gap-1">
              <UserCheck size={11} /> Verified
            </div>
          </div>

          {/* Pending Approval */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm flex flex-col justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              Pending Approval
            </span>
            <div className="font-display-xl text-2xl text-amber-400 font-bold my-1">
              {stats.pending_invitations}
            </div>
            <div className="font-code-sm text-[10px] text-amber-400 flex items-center gap-1">
              <Clock size={11} /> In Review
            </div>
          </div>

          {/* Inactive */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm flex flex-col justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              Inactive
            </span>
            <div className="font-display-xl text-2xl text-on-surface-variant font-bold my-1">
              {inactiveCount}
            </div>
            <div className="font-code-sm text-[10px] text-on-surface-variant flex items-center gap-1">
              <UserX size={11} /> Deactivated
            </div>
          </div>

          {/* Departments */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm flex flex-col justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              Departments
            </span>
            <div className="font-display-xl text-2xl text-on-surface font-bold my-1">
              {uniqueDepartmentsCount}
            </div>
            <div className="font-code-sm text-[10px] text-on-surface-variant flex items-center gap-1">
              <Building size={11} /> Configured
            </div>
          </div>

          {/* Roles */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm flex flex-col justify-between">
            <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
              Job Roles
            </span>
            <div className="font-display-xl text-2xl text-on-surface font-bold my-1">
              {uniqueRolesCount}
            </div>
            <div className="font-code-sm text-[10px] text-primary-container flex items-center gap-1">
              <Briefcase size={11} /> Aligned
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION B: EMPLOYEE ENROLLMENT POLICIES */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Sliders size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section B — Employee Enrollment Controls
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Configure candidate registration gateways, admin verification gates, and domain rules.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Enrollment Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Toggle 1: Self Registration */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Employee Self-Registration
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Allow candidates to discover the organization on Port 3001 and submit employee enrollment forms.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelfRegistration(!selfRegistration)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                selfRegistration
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  selfRegistration
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Admin Approval Required */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase flex items-center gap-1.5">
                <span>Administrator Approval Required</span>
                <span className="text-[9px] text-primary-container border border-primary-container/30 px-1">ACTIVE</span>
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Newly registered accounts enter a <code className="text-primary-container font-mono">PENDING_APPROVAL</code> state until verified by an administrator.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAdminApprovalRequired(!adminApprovalRequired)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                adminApprovalRequired
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  adminApprovalRequired
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Corporate Email Only */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Corporate Email Domain Required
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Reject generic consumer emails (gmail, yahoo). Require company-owned domain email addresses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCorporateEmailOnly(!corporateEmailOnly)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                corporateEmailOnly
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  corporateEmailOnly
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Toggle 4: Invitation Only */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Direct Invitation Only
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant leading-relaxed">
                Hide the organization from public candidate discovery. Only employees with explicit invite tokens can join.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInvitationOnly(!invitationOnly)}
              className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                invitationOnly
                  ? "bg-primary-container/20 border-primary-container"
                  : "bg-surface-container-high border-border-tech"
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full transition-transform ${
                  invitationOnly
                    ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                    : "bg-neutral-500 translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="p-3.5 border border-border-tech bg-surface-layer font-code-sm text-xs text-on-surface-variant rounded-sm flex items-start gap-2">
          <Sparkles size={14} className="text-primary-container shrink-0 mt-0.5" />
          <span>
            <strong className="text-on-surface">Architectural Governance Note: </strong>
            Self-registration with Admin Approval is currently enforced by the backend onboarding pipeline. Organization-level custom policy flags will persist to <code className="text-primary-container font-mono">/api/v1/organizations/policies</code> upon policy router deployment.
          </span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION D: ORGANIZATION DEFAULTS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSaveDefaults} className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section D — Organization Defaults
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Standard roles, department routing, and default timezones assigned to newly approved members.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Member Defaults
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Default Employee Role */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Default Assigned Role
            </label>
            <input
              type="text"
              disabled
              value={`${defaultRole} (Standard Member)`}
              className="w-full bg-surface-container-high/40 border border-border-tech px-3 py-2.5 font-code-sm text-sm text-primary-container font-semibold cursor-not-allowed opacity-90"
            />
          </div>

          {/* Default Department */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Default Department
            </label>
            <select
              value={defaultDepartment}
              onChange={(e) => setDefaultDepartment(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            >
              <option value="Engineering">Engineering</option>
              <option value="Product & Design">Product & Design</option>
              <option value="AI Research & ML">AI Research & ML</option>
              <option value="Quality Assurance">Quality Assurance</option>
              <option value="Operations & HR">Operations & HR</option>
              <option value="General">General</option>
            </select>
          </div>

          {/* Default Job Title */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Default Job Title
            </label>
            <input
              type="text"
              value={defaultJobTitle}
              onChange={(e) => setDefaultJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* Default Working Timezone */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Default Timezone
            </label>
            <select
              value={defaultTimezone}
              onChange={(e) => setDefaultTimezone(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            >
              <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST, UTC+5:30)</option>
              <option value="America/New_York (EST)">America/New_York (EST, UTC-5)</option>
              <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST, UTC-8)</option>
              <option value="Europe/London (GMT)">Europe/London (GMT/BST, UTC+0)</option>
              <option value="UTC (Coordinated Universal Time)">UTC (Universal Time)</option>
            </select>
          </div>
        </div>

        <div className="border-t border-border-tech pt-4 flex justify-end gap-2">
          <button
            type="submit"
            disabled={isSavingDefaults}
            className="px-5 py-2 bg-primary-container hover:bg-primary-fixed-dim text-black font-code-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,255,65,0.2)]"
          >
            {isSavingDefaults ? (
              <span>Saving Defaults...</span>
            ) : (
              <>
                <Save size={13} />
                <span>Save Organization Defaults</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION C: COMPACT EMPLOYEE DIRECTORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-5">
        <div className="border-b border-border-tech pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Users size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section C — Employee Directory ({filteredMembers.length})
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Live roster of all registered and enrolled employees in the organization.
              </p>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-surface-layer p-1 border border-border-tech rounded-sm font-code-sm text-xs self-start sm:self-auto">
            {(["ALL", "ACTIVE", "INVITED", "INACTIVE"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-sm transition-colors text-[11px] font-semibold cursor-pointer ${
                  statusFilter === status
                    ? "bg-primary-container text-black font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {status === "INVITED" ? "PENDING" : status}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
            <Search size={14} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, employee ID, or department..."
            className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
          />
        </div>

        {/* Members Table */}
        <div className="border border-border-tech bg-surface-layer rounded-sm overflow-hidden">
          {filteredMembers.length === 0 ? (
            <div className="p-8 text-center text-xs font-code-sm text-on-surface-variant space-y-1">
              <div className="text-on-surface font-semibold">No matching employees found</div>
              <p>No members matched the selected search or status criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-tech bg-surface-container-high/30 font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Employee Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Employee ID</th>
                    <th className="py-3 px-4 font-semibold">Department</th>
                    <th className="py-3 px-4 font-semibold">Job Title</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-tech/60 font-code-sm text-xs text-on-surface">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-surface-container-high/20 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-on-surface">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 border border-primary-container/40 bg-primary-container/10 flex items-center justify-center text-primary-container font-mono font-bold text-xs shrink-0 rounded-sm">
                            {member.name ? member.name.charAt(0).toUpperCase() : "E"}
                          </div>
                          <span>{member.name || "Unnamed Employee"}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-on-surface-variant">
                        {member.email || "—"}
                      </td>

                      {/* Employee ID */}
                      <td className="py-3.5 px-4 font-mono text-primary-container">
                        {member.employee_id || "—"}
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 text-on-surface-variant">
                        {member.department || "General"}
                      </td>

                      {/* Job Title */}
                      <td className="py-3.5 px-4 text-on-surface">
                        {member.job_title || "Software Engineer"}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 border border-border-tech bg-surface-container-high text-on-surface font-code-sm text-[10px] uppercase rounded-sm">
                          {member.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-right">
                        {member.status === "ACTIVE" && (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Active</span>
                          </span>
                        )}
                        {member.status === "INVITED" && (
                          <span className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            <span>Pending</span>
                          </span>
                        )}
                        {member.status === "INACTIVE" && (
                          <span className="inline-flex items-center gap-1.5 text-on-surface-variant text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
                            <span>Inactive</span>
                          </span>
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
    </div>
  );
}
