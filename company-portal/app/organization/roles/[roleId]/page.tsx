"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { roleService } from "@shared/services/role.service";
import type {
  OrganizationRole,
  RoleCapabilitySummary,
  RoleRiskLevel,
  RoleStatus,
  RoleUpdatePayload,
} from "@shared/types/role";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  ArrowLeft,
  Briefcase,
  Cpu,
  Users,
  Bot,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  FileText,
  Sparkles,
  Wrench,
  KeyRound,
  ShieldCheck,
  Layers,
  ArrowRight,
  Sliders,
  ChevronUp,
  ChevronDown,
  Brain,
  ShieldAlert,
  Code2,
  Terminal,
  FolderGit2,
  CheckCircle2,
} from "lucide-react";

export interface RecognizedTool {
  tool_id: string;
  name: string;
  description: string;
  capabilities: string[];
  required_permissions: string[];
  risk_level: string;
  enabled: boolean;
}

export default function RoleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params?.roleId as string;

  const { user, isLoading: isAuthLoading, isAuthenticated, isOrgAdmin } = useAuth();
  const orgId = user?.organization_id || user?.organizationId;

  const [role, setRole] = useState<OrganizationRole | null>(null);
  const [availableCapabilities, setAvailableCapabilities] = useState<RoleCapabilitySummary[]>([]);
  const [availableTools, setAvailableTools] = useState<RecognizedTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"capabilities" | "governance" | "planner_preview">("capabilities");

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddCapabilityModalOpen, setIsAddCapabilityModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Capability Selection State
  const [selectedCapabilityNames, setSelectedCapabilityNames] = useState<string[]>([]);

  // Inline management states for responsibilities, skills, tools, permissions, persona, approval_rules
  const [newRespInput, setNewRespInput] = useState("");
  const [newSkillInput, setNewSkillInput] = useState("");
  const [newTraitInput, setNewTraitInput] = useState("");
  const [newPermInput, setNewPermInput] = useState("");

  // Edit Form State for Comprehensive Blueprint Edit Modal
  const [formName, setFormName] = useState("");
  const [formDept, setFormDept] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formRisk, setFormRisk] = useState<RoleRiskLevel>("LOW");
  const [formStatus, setFormStatus] = useState<RoleStatus>("ACTIVE");
  const [formPersonaName, setFormPersonaName] = useState("");
  const [formCommStyle, setFormCommStyle] = useState("Professional");
  const [formDecisionStyle, setFormDecisionStyle] = useState("Data-Driven");
  const [formAdditionalInstructions, setFormAdditionalInstructions] = useState("");

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // Load Role Details, Available Capabilities & Recognized Tools
  const fetchRoleDetails = useCallback(
    async (isBackground = false) => {
      if (!orgId || !roleId) return;
      if (!isBackground) setIsLoading(true);
      else setIsRefreshing(true);
      setErrorMessage(null);

      try {
        const [roleData, allCaps, allTools] = await Promise.all([
          roleService.getRole(orgId, roleId),
          roleService.getAvailableAgentCapabilities().catch(() => []),
          roleService.getAvailableAgentTools().catch(() => [
            {
              tool_id: "github",
              name: "GitHub Integration",
              description: "Read/write access to code repositories.",
              capabilities: ["read_repo", "create_branch", "push_code", "create_pr"],
              required_permissions: ["github:read", "github:write"],
              risk_level: "HIGH",
              enabled: true,
            },
            {
              tool_id: "jira",
              name: "Jira Integration",
              description: "Manage project tracking and issues.",
              capabilities: ["read_issue", "update_issue", "transition_issue"],
              required_permissions: ["jira:read", "jira:write"],
              risk_level: "LOW",
              enabled: true,
            },
            {
              tool_id: "terminal",
              name: "Secure Terminal",
              description: "Execute terminal commands in an isolated environment.",
              capabilities: ["execute_command"],
              required_permissions: ["system:execute"],
              risk_level: "CRITICAL",
              enabled: true,
            },
          ]),
        ]);

        setRole(roleData);
        setAvailableCapabilities(allCaps || []);
        setAvailableTools(allTools || []);
        setSelectedCapabilityNames(roleData.capabilities?.map((c) => c.name) || []);
      } catch (err: any) {
        console.error("Failed to load role details:", err);
        setErrorMessage(
          err?.response?.data?.error?.message ||
            err?.message ||
            "Failed to load role details from backend service."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [orgId, roleId]
  );

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.push("/login?error=unauthorized");
      } else if (!isOrgAdmin) {
        router.push("/login?error=employee_forbidden");
      } else if (orgId && roleId) {
        fetchRoleDetails();
      }
    }
  }, [isAuthLoading, isAuthenticated, isOrgAdmin, orgId, roleId, router, fetchRoleDetails]);

  // Populate Edit Form
  const openEditModal = () => {
    if (!role) return;
    setFormName(role.name);
    setFormDept(role.department || "");
    setFormDesc(role.description || "");
    setFormRisk(role.risk_level || "LOW");
    setFormStatus(role.status || "ACTIVE");
    setFormPersonaName(role.persona?.name || `${role.name} Twin`);
    setFormCommStyle(role.persona?.communication_style || "Professional");
    setFormDecisionStyle(role.persona?.decision_style || "Data-Driven");
    setFormAdditionalInstructions(role.persona?.additional_instructions || "");
    setIsEditModalOpen(true);
  };

  // Quick Patch Helper
  const quickUpdateRole = async (patch: RoleUpdatePayload, successText?: string) => {
    if (!orgId || !role) return;
    setIsSaving(true);
    try {
      const updated = await roleService.updateRole(orgId, role.id, patch);
      setRole(updated);
      if (successText) setSuccessMessage(successText);
      await fetchRoleDetails(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update role blueprint");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Edit Submit from Modal
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !role || !formName.trim()) return;
    setIsSaving(true);
    try {
      const currentPersona = role.persona || {};
      const payload: RoleUpdatePayload = {
        name: formName.trim(),
        department: formDept.trim() || undefined,
        description: formDesc.trim() || undefined,
        risk_level: formRisk,
        status: formStatus,
        persona: {
          ...currentPersona,
          name: formPersonaName.trim() || `${formName} Twin`,
          communication_style: formCommStyle,
          decision_style: formDecisionStyle,
          additional_instructions: formAdditionalInstructions.trim() || undefined,
        },
      };

      await roleService.updateRole(orgId, role.id, payload);
      setIsEditModalOpen(false);
      setSuccessMessage("Role blueprint updated successfully.");
      await fetchRoleDetails(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update role");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Role Status (Activate / Deactivate)
  const toggleRoleStatus = async () => {
    if (!orgId || !role) return;
    const newStatus: RoleStatus = role.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    await quickUpdateRole(
      { status: newStatus },
      `Role ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully.`
    );
  };

  // Delete Role
  const handleDeleteRole = async () => {
    if (!orgId || !role) return;
    setIsSaving(true);
    try {
      await roleService.deleteRole(orgId, role.id);
      router.push("/organization/roles");
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to delete role");
      setIsSaving(false);
    }
  };

  // ── Responsibilities Reordering & Management ─────────────────────────
  const addResponsibility = async (text: string) => {
    if (!text.trim() || !role) return;
    const current = role.responsibilities || [];
    if (current.includes(text.trim())) return;
    const updated = [...current, text.trim()];
    await quickUpdateRole({ responsibilities: updated }, "Added responsibility.");
    setNewRespInput("");
  };

  const removeResponsibility = async (index: number) => {
    if (!role) return;
    const current = [...(role.responsibilities || [])];
    current.splice(index, 1);
    await quickUpdateRole({ responsibilities: current }, "Removed responsibility.");
  };

  const moveResponsibility = async (index: number, direction: "up" | "down") => {
    if (!role || !role.responsibilities) return;
    const current = [...role.responsibilities];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const itemA = current[index];
    const itemB = current[targetIndex];
    if (itemA !== undefined && itemB !== undefined) {
      current[index] = itemB;
      current[targetIndex] = itemA;
      await quickUpdateRole({ responsibilities: current }, "Reordered responsibilities.");
    }
  };

  // ── Skills Management ────────────────────────────────────────────────
  const addSkill = async (skill: string) => {
    if (!skill.trim() || !role) return;
    const current = role.required_skills || [];
    if (current.map((s) => s.toLowerCase()).includes(skill.trim().toLowerCase())) return;
    const updated = [...current, skill.trim()];
    await quickUpdateRole({ required_skills: updated }, "Added required skill.");
    setNewSkillInput("");
  };

  const removeSkill = async (skillToRemove: string) => {
    if (!role) return;
    const updated = (role.required_skills || []).filter((s) => s !== skillToRemove);
    await quickUpdateRole({ required_skills: updated }, "Removed skill.");
  };

  // ── Persona Behavioral Traits Management ────────────────────────────
  const addBehavioralTrait = async (trait: string) => {
    if (!trait.trim() || !role) return;
    const persona = role.persona || {};
    const currentTraits: string[] = persona.behavioral_traits || ["Analytical", "Detail-oriented"];
    if (currentTraits.map((t) => t.toLowerCase()).includes(trait.trim().toLowerCase())) return;
    const updated = {
      ...persona,
      behavioral_traits: [...currentTraits, trait.trim()],
    };
    await quickUpdateRole({ persona: updated }, "Added behavioral trait.");
    setNewTraitInput("");
  };

  const removeBehavioralTrait = async (traitToRemove: string) => {
    if (!role) return;
    const persona = role.persona || {};
    const currentTraits: string[] = persona.behavioral_traits || [];
    const updated = {
      ...persona,
      behavioral_traits: currentTraits.filter((t) => t !== traitToRemove),
    };
    await quickUpdateRole({ persona: updated }, "Removed behavioral trait.");
  };

  // ── Tools Selection (Validated via ToolRegistry) ─────────────────────
  const toggleTool = async (toolId: string) => {
    if (!role) return;
    const currentTools = role.tools || [];
    const lowerCurrent = currentTools.map((t) => t.toLowerCase());
    let updatedTools: string[];

    if (lowerCurrent.includes(toolId.toLowerCase())) {
      updatedTools = currentTools.filter((t) => t.toLowerCase() !== toolId.toLowerCase());
    } else {
      updatedTools = [...currentTools, toolId];
    }
    await quickUpdateRole({ tools: updatedTools }, "Updated tool assignments.");
  };

  // ── Permissions Management (Consumed by PolicyEngine) ────────────────
  const togglePermission = async (perm: string) => {
    if (!role) return;
    const currentPerms = role.permissions || [];
    let updatedPerms: string[];
    if (currentPerms.includes(perm)) {
      updatedPerms = currentPerms.filter((p) => p !== perm);
    } else {
      updatedPerms = [...currentPerms, perm];
    }
    await quickUpdateRole({ permissions: updatedPerms }, "Updated assigned permissions.");
  };

  const addCustomPermission = async (perm: string) => {
    if (!perm.trim() || !role) return;
    const current = role.permissions || [];
    if (current.includes(perm.trim())) return;
    const updated = [...current, perm.trim()];
    await quickUpdateRole({ permissions: updated }, "Added custom permission.");
    setNewPermInput("");
  };

  // ── Risk Level & Approval Rules ──────────────────────────────────────
  const setRiskLevel = async (level: RoleRiskLevel) => {
    if (!role || role.risk_level === level) return;
    await quickUpdateRole({ risk_level: level }, `Risk level set to ${level}.`);
  };

  const toggleApprovalRule = async (ruleKey: string, defaultValue: any) => {
    if (!role) return;
    const currentRules = role.approval_rules || {};
    const updatedRules = {
      ...currentRules,
      [ruleKey]: typeof defaultValue === "boolean" ? !currentRules[ruleKey] : defaultValue,
    };
    await quickUpdateRole({ approval_rules: updatedRules }, "Updated approval rules.");
  };

  const setApprovalRuleValue = async (ruleKey: string, val: any) => {
    if (!role) return;
    const currentRules = role.approval_rules || {};
    const updatedRules = {
      ...currentRules,
      [ruleKey]: val,
    };
    await quickUpdateRole({ approval_rules: updatedRules }, "Updated approval rules.");
  };

  // ── Capabilities Modal & Single Removal ──────────────────────────────
  const openAddCapabilityModal = () => {
    setSelectedCapabilityNames(role?.capabilities?.map((c) => c.name) || []);
    setIsAddCapabilityModalOpen(true);
  };

  const handleSaveCapabilities = async () => {
    if (!orgId || !role) return;
    setIsSaving(true);
    try {
      await roleService.updateRoleCapabilities(orgId, role.id, selectedCapabilityNames);
      setIsAddCapabilityModalOpen(false);
      setSuccessMessage("AI capability bundle reconciled successfully.");
      await fetchRoleDetails(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to update capabilities bundle");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveSingleCapability = async (capabilityName: string) => {
    if (!orgId || !role) return;
    const remaining = (role.capabilities || [])
      .map((c) => c.name)
      .filter((n) => n !== capabilityName);
    try {
      await roleService.updateRoleCapabilities(orgId, role.id, remaining);
      setSuccessMessage(`Removed capability "${capabilityName}".`);
      await fetchRoleDetails(true);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || err?.message || "Failed to remove capability");
    }
  };

  // Simulated Criteria Engine & Agent Planner output structure
  const simulatedPlannerOutput = useMemo(() => {
    if (!role) return null;
    const skills = role.required_skills || [];
    const resp = role.responsibilities || [];
    const tools = role.tools || [];
    const respLower = resp.map((r) => r.toLowerCase());

    const inferredCaps: string[] = [];
    if (skills.some((s) => s.toLowerCase().includes("python")) || respLower.some((r) => r.includes("implement") || r.includes("feature"))) {
      inferredCaps.push("coding", "debugging");
    }
    if (respLower.some((r) => r.includes("test"))) {
      inferredCaps.push("testing");
    }
    if (tools.map((t) => t.toLowerCase()).includes("github") || respLower.some((r) => r.includes("review"))) {
      inferredCaps.push("github", "code_review");
    }

    const explicitCaps = role.capabilities?.map((c) => c.name) || [];
    const finalCapabilities = Array.from(new Set([...explicitCaps, ...inferredCaps]));

    let calculatedRisk = role.risk_level || "MEDIUM";
    if (respLower.some((r) => r.includes("production_deployment") || r.includes("deploy"))) {
      calculatedRisk = "CRITICAL";
    }

    return {
      role_id: role.id,
      persona: {
        name: role.persona?.name || `${role.name} Twin`,
        communication_style: role.persona?.communication_style || "Professional",
        behavioral_traits: role.persona?.behavioral_traits || ["Analytical", "Technical", "Detail-oriented"],
        decision_style: role.persona?.decision_style || "Data-Driven",
        additional_instructions: role.persona?.additional_instructions || null,
      },
      responsibilities: resp,
      skills: skills,
      tools: tools,
      capabilities_required: finalCapabilities,
      permissions: role.permissions || [],
      risk_level: calculatedRisk,
      approval_rules: role.approval_rules || {},
      agent_factory_pipeline: {
        agent_group_type: "EMPLOYEE_ROLE_TWIN",
        instantiated_agents: finalCapabilities.map((cap) => ({
          agent_name: `${cap}_agent`,
          capability: cap,
          status: "READY_FOR_EMPLOYEE_PROVISIONING",
        })),
      },
    };
  }, [role]);

  if (isAuthLoading) {
    return <LoadingState label="Authenticating administrator session..." />;
  }

  if (!isAuthenticated || !isOrgAdmin) {
    return <LoadingState label="Redirecting to Company Login..." />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up pb-12">
        <div className="flex items-center gap-2 text-xs font-code-sm text-on-surface-variant">
          <Link href="/organization/roles" className="hover:text-primary-container flex items-center gap-1">
            <ArrowLeft size={13} />
            <span>Roles Directory</span>
          </Link>
          <span>/</span>
          <span>Loading...</span>
        </div>
        <div className="p-16 text-center border border-border-tech bg-surface-container-low rounded-sm">
          <div className="w-8 h-8 border-2 border-primary-container border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="font-code-sm text-xs text-on-surface-variant">
            Loading Role Blueprint, AI Persona &amp; Capability Bundle...
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage || !role) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up pb-12">
        <div className="flex items-center gap-2 text-xs font-code-sm text-on-surface-variant">
          <Link href="/organization/roles" className="hover:text-primary-container flex items-center gap-1">
            <ArrowLeft size={13} />
            <span>Back to Roles</span>
          </Link>
        </div>
        <div className="p-12 border border-red-500/30 bg-red-950/20 text-center space-y-4 rounded-sm">
          <AlertTriangle size={28} className="text-red-400 mx-auto" />
          <h2 className="font-code-sm text-base font-bold text-on-surface">Role Blueprint Not Found</h2>
          <p className="font-code-sm text-xs text-red-300 max-w-md mx-auto">
            {errorMessage || "The requested organizational role could not be located in this organization."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/organization/roles")}
            className="px-4 py-2 border border-primary-container bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold inline-flex items-center gap-1.5"
          >
            Return to Roles Directory
          </button>
        </div>
      </div>
    );
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

      {/* ── BREADCRUMB & TOP ACTIONS ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-code-sm text-on-surface-variant">
          <Link
            href="/organization/roles"
            className="hover:text-primary-container flex items-center gap-1 transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Roles &amp; AI Workforce</span>
          </Link>
          <span>/</span>
          <span className="text-on-surface font-semibold">{role.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchRoleDetails(true)}
            disabled={isRefreshing}
            className="px-2.5 py-1.5 border border-border-tech hover:border-primary-container/50 bg-surface-container-low text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reload role from backend"
          >
            <RefreshCw size={12} className={isRefreshing ? "animate-spin text-primary-container" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={openEditModal}
            className="px-3 py-1.5 border border-border-tech hover:border-primary-container/60 hover:bg-surface-layer text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Edit2 size={12} />
            <span>Edit Blueprint</span>
          </button>

          <button
            type="button"
            onClick={toggleRoleStatus}
            className={`px-3 py-1.5 border font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              role.status === "ACTIVE"
                ? "border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:bg-neutral-800/40"
                : "border-primary-container/60 text-primary-container hover:bg-primary-container/10"
            }`}
          >
            <span>{role.status === "ACTIVE" ? "Deactivate Role" : "Activate Role"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-2.5 py-1.5 border border-neutral-800 hover:border-red-500/50 hover:bg-red-950/20 text-neutral-400 hover:text-red-400 font-code-sm text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title="Delete Role Blueprint"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* ── ROLE HEADER BANNER ────────────────────────────────────────── */}
      <div className="border border-border-tech bg-surface-container-low p-6 rounded-sm space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 bg-surface-layer border border-border-tech font-code-sm text-[10px] text-on-surface uppercase rounded-sm">
                {role.department || "General Department"}
              </span>
              {role.risk_level === "CRITICAL" && (
                <span className="px-2 py-0.5 border border-red-500/40 bg-red-950/30 text-[10px] text-red-400 font-code-sm uppercase rounded-sm">
                  Critical Risk
                </span>
              )}
              {role.risk_level === "HIGH" && (
                <span className="px-2 py-0.5 border border-amber-500/40 bg-amber-950/30 text-[10px] text-amber-400 font-code-sm uppercase rounded-sm">
                  High Risk
                </span>
              )}
              {role.risk_level === "MEDIUM" && (
                <span className="px-2 py-0.5 border border-sky-500/40 bg-sky-950/30 text-[10px] text-sky-400 font-code-sm uppercase rounded-sm">
                  Medium Risk
                </span>
              )}
              {role.risk_level === "LOW" && (
                <span className="px-2 py-0.5 border border-emerald-500/40 bg-emerald-950/30 text-[10px] text-emerald-400 font-code-sm uppercase rounded-sm">
                  Low Risk
                </span>
              )}
            </div>

            <h1 className="font-display-xl text-2xl sm:text-3xl text-on-surface font-bold">
              {role.name}
            </h1>
            {role.description ? (
              <p className="font-code-sm text-xs text-neutral-300 mt-2 max-w-3xl leading-relaxed">
                {role.description}
              </p>
            ) : (
              <p className="font-code-sm text-xs text-on-surface-variant mt-1 italic">
                No description provided for this role blueprint.
              </p>
            )}
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            {role.status === "ACTIVE" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-primary-container/40 bg-primary-container/10 text-primary-container font-code-sm text-xs font-bold uppercase rounded-sm">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                Active Blueprint
              </span>
            ) : role.status === "DRAFT" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-amber-500/40 bg-amber-950/20 text-amber-400 font-code-sm text-xs font-bold uppercase rounded-sm">
                Draft Blueprint
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 border border-neutral-700 bg-neutral-900/40 text-neutral-400 font-code-sm text-xs font-bold uppercase rounded-sm">
                Inactive Blueprint
              </span>
            )}

            <span className="font-mono text-[10px] text-on-surface-variant">
              Created: {new Date(role.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* ── STATISTICS BANNER ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-border-tech/60">
          <div className="bg-surface-layer border border-border-tech p-3.5 rounded-sm">
            <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
              <span>Enrolled Employees</span>
              <Users size={14} className="text-primary-container" />
            </div>
            <div className="font-mono text-2xl font-bold text-on-surface">
              {role.employee_count ?? 0}
            </div>
            <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
              Assigned to this role in organization
            </div>
          </div>

          <div className="bg-surface-layer border border-border-tech p-3.5 rounded-sm">
            <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
              <span>Configured AI Capabilities</span>
              <Cpu size={14} className="text-primary-container" />
            </div>
            <div className="font-mono text-2xl font-bold text-primary-container">
              {role.capabilities?.length ?? 0}
            </div>
            <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
              Reusable AI modules in bundle
            </div>
          </div>

          <div className="bg-surface-layer border border-border-tech p-3.5 rounded-sm">
            <div className="flex items-center justify-between text-on-surface-variant font-code-sm text-[11px] mb-1">
              <span>Provisioned Agent Groups</span>
              <Bot size={14} className="text-primary-container" />
            </div>
            <div className="font-mono text-2xl font-bold text-on-surface">
              {role.agent_groups_count ?? role.employee_count ?? 0}
            </div>
            <div className="font-code-sm text-[10px] text-on-surface-variant mt-0.5">
              Employee runtime twin groups
            </div>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TABS ──────────────────────────────────────────── */}
      <div className="flex items-center border-b border-border-tech gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("capabilities")}
          className={`px-4 py-2 font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === "capabilities"
              ? "border-primary-container text-primary-container bg-primary-container/5"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Cpu size={14} />
          <span>AI Capability Bundle ({role.capabilities?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("governance")}
          className={`px-4 py-2 font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === "governance"
              ? "border-primary-container text-primary-container bg-primary-container/5"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Brain size={14} />
          <span>Persona, Tools &amp; Governance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("planner_preview")}
          className={`px-4 py-2 font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-colors border-b-2 cursor-pointer ${
            activeTab === "planner_preview"
              ? "border-primary-container text-primary-container bg-primary-container/5"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <Sliders size={14} />
          <span>Criteria Engine &amp; Agent Planner Preview</span>
        </button>
      </div>

      {/* ── TAB 1: AI CAPABILITY BUNDLE ─────────────────────────────── */}
      {activeTab === "capabilities" && (
        <div className="space-y-6">
          <div className="border border-border-tech bg-surface-container-low p-6 rounded-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border-tech/60 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Cpu size={16} className="text-primary-container" />
                  <h2 className="font-display-xl text-lg text-on-surface font-bold">
                    AI Capability Bundle
                  </h2>
                  <span className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 font-mono text-[11px] text-primary-container rounded-sm">
                    {role.capabilities?.length || 0} Modules
                  </span>
                </div>
                <p className="font-code-sm text-xs text-on-surface-variant mt-1">
                  Reusable AI capability modules active for this role blueprint. When employees are provisioned, the AgentFactory instantiates dedicated agents for each capability in this bundle.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddCapabilityModal}
                className="px-4 py-2 border border-primary-container bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Plus size={14} />
                <span>Add Capability</span>
              </button>
            </div>

            {(!role.capabilities || role.capabilities.length === 0) ? (
              <div className="p-12 border border-dashed border-border-tech bg-surface-layer text-center space-y-3 rounded-sm">
                <Cpu size={28} className="text-on-surface-variant mx-auto opacity-60" />
                <div className="font-code-sm text-sm font-bold text-on-surface">
                  No AI capabilities configured in bundle
                </div>
                <p className="font-code-sm text-xs text-on-surface-variant max-w-md mx-auto">
                  Assign capabilities from the registry (e.g. coding, debugging, testing, github, code_review) so employees assigned this role receive functional AI agent twins.
                </p>
                <button
                  type="button"
                  onClick={openAddCapabilityModal}
                  className="mt-2 px-4 py-2 border border-primary-container bg-primary-container/20 hover:bg-primary-container/30 text-primary-container font-code-sm text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Configure AI Capabilities</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {role.capabilities.map((cap) => (
                  <div
                    key={cap.id}
                    className="border border-border-tech bg-surface-layer p-4 rounded-sm flex flex-col justify-between hover:border-primary-container/40 transition-colors group shadow-sm"
                  >
                    <div>
                      {/* Card Top */}
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-code-sm text-sm font-bold text-on-surface group-hover:text-primary-container transition-colors">
                            {cap.name}
                          </span>
                          <span className="font-mono text-[9px] px-1.5 py-0.2 border border-border-tech bg-surface-container-low text-on-surface-variant uppercase rounded-sm">
                            v{cap.version}
                          </span>
                        </div>

                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-mono uppercase rounded-sm border ${
                            cap.risk_level === "CRITICAL"
                              ? "border-red-500/40 bg-red-950/20 text-red-400"
                              : cap.risk_level === "HIGH"
                              ? "border-amber-500/40 bg-amber-950/20 text-amber-400"
                              : cap.risk_level === "MEDIUM"
                              ? "border-sky-500/40 bg-sky-950/20 text-sky-400"
                              : "border-emerald-500/40 bg-emerald-950/20 text-emerald-400"
                          }`}
                        >
                          {cap.risk_level}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="font-code-sm text-xs text-on-surface-variant line-clamp-3 mb-3 leading-relaxed">
                        {cap.description}
                      </p>

                      {/* Meta Tags */}
                      <div className="space-y-2 pt-2 border-t border-border-tech/40">
                        <div className="flex items-center justify-between text-[10px] font-code-sm">
                          <span className="text-on-surface-variant">Approval Required:</span>
                          <span className={`font-semibold ${cap.approval_required ? "text-amber-400" : "text-emerald-400"}`}>
                            {cap.approval_required ? "Yes (Human in the Loop)" : "No (Autonomous)"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-code-sm">
                          <span className="text-on-surface-variant">Registry Status:</span>
                          <span className={`font-semibold ${cap.enabled ? "text-primary-container" : "text-neutral-500"}`}>
                            {cap.enabled ? "Enabled & Active" : "Disabled"}
                          </span>
                        </div>

                        {cap.required_tools && cap.required_tools.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap pt-1">
                            <span className="text-[9px] text-neutral-500 font-label-caps">Tools:</span>
                            {cap.required_tools.map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.2 bg-neutral-900 border border-neutral-800 text-[9px] font-mono text-neutral-300 rounded-sm"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Action */}
                    <div className="pt-3 mt-3 border-t border-border-tech/40 flex items-center justify-between">
                      <span className="font-mono text-[9px] text-neutral-500">ID: {cap.id.slice(0, 8)}...</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSingleCapability(cap.name)}
                        className="text-neutral-500 hover:text-red-400 font-code-sm text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        title="Remove capability from role"
                      >
                        <Trash2 size={11} />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: PERSONA, TOOLS & GOVERNANCE ──────────────────────── */}
      {activeTab === "governance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: AI Persona & Responsibilities */}
          <div className="space-y-6">
            {/* ── SECTION: AI TWIN PERSONA ─────────────────────────── */}
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border-tech/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-primary-container" />
                  <h3 className="font-code-sm text-sm font-bold text-on-surface">
                    AI Twin Persona Configuration
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-primary-container bg-primary-container/10 px-2 py-0.5 border border-primary-container/30 rounded-sm">
                  AgentPlanner Spec
                </span>
              </div>

              {/* Persona Attributes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-layer border border-border-tech p-3 rounded-sm font-code-sm text-xs">
                <div>
                  <span className="text-on-surface-variant block text-[10px] uppercase font-label-caps mb-0.5">
                    Persona Name:
                  </span>
                  <span className="font-bold text-on-surface">
                    {role.persona?.name || `${role.name} Twin`}
                  </span>
                </div>

                <div>
                  <span className="text-on-surface-variant block text-[10px] uppercase font-label-caps mb-0.5">
                    Communication Style:
                  </span>
                  <select
                    value={role.persona?.communication_style || "Professional"}
                    onChange={(e) => {
                      const updated = {
                        ...(role.persona || {}),
                        communication_style: e.target.value,
                      };
                      quickUpdateRole({ persona: updated }, `Communication style set to ${e.target.value}`);
                    }}
                    className="bg-surface-container-low border border-border-tech px-2 py-1 font-code-sm text-xs text-primary-container focus:border-primary-container focus:outline-none cursor-pointer rounded-sm"
                  >
                    <option value="Professional">Professional</option>
                    <option value="Technical & Direct">Technical &amp; Direct</option>
                    <option value="Analytical & Detailed">Analytical &amp; Detailed</option>
                    <option value="Concise & Fast">Concise &amp; Fast</option>
                    <option value="Executive Summary">Executive Summary</option>
                  </select>
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-border-tech/40">
                  <span className="text-on-surface-variant block text-[10px] uppercase font-label-caps mb-0.5">
                    Decision Style:
                  </span>
                  <select
                    value={role.persona?.decision_style || "Data-Driven"}
                    onChange={(e) => {
                      const updated = {
                        ...(role.persona || {}),
                        decision_style: e.target.value,
                      };
                      quickUpdateRole({ persona: updated }, `Decision style set to ${e.target.value}`);
                    }}
                    className="bg-surface-container-low border border-border-tech px-2 py-1 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none cursor-pointer rounded-sm"
                  >
                    <option value="Data-Driven">Data-Driven (Validates with test data &amp; telemetry)</option>
                    <option value="Consensus-Seeking">Consensus-Seeking (Requests human review on ambiguities)</option>
                    <option value="Conservative">Conservative (Avoids risky optimizations without verification)</option>
                    <option value="Rapid-Iterative">Rapid-Iterative (Prototypes quickly, refines on failure)</option>
                  </select>
                </div>
              </div>

              {/* Behavioral Traits */}
              <div>
                <span className="text-on-surface-variant block text-[11px] font-label-caps uppercase mb-1.5">
                  Behavioral Traits
                </span>
                <div className="flex flex-wrap gap-1.5 bg-surface-layer border border-border-tech p-2.5 rounded-sm min-h-[44px]">
                  {(role.persona?.behavioral_traits || ["Analytical", "Technical", "Detail-oriented"]).map((trait: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container-low border border-border-tech font-code-sm text-xs text-on-surface rounded-sm group/trait"
                    >
                      <span>{trait}</span>
                      <button
                        type="button"
                        onClick={() => removeBehavioralTrait(trait)}
                        className="text-on-surface-variant hover:text-red-400 cursor-pointer ml-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newTraitInput}
                    onChange={(e) => setNewTraitInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBehavioralTrait(newTraitInput);
                      }
                    }}
                    placeholder="Add trait (e.g. Proactive, Security-First)..."
                    className="flex-1 bg-surface-layer border border-border-tech px-2.5 py-1.5 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => addBehavioralTrait(newTraitInput)}
                    className="px-3 py-1.5 border border-primary-container/50 bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold cursor-pointer"
                  >
                    Add Trait
                  </button>
                </div>
              </div>

              {/* Additional Instructions */}
              <div>
                <span className="text-on-surface-variant block text-[11px] font-label-caps uppercase mb-1.5">
                  Additional Persona Guidance &amp; Constraints
                </span>
                <textarea
                  rows={2}
                  value={role.persona?.additional_instructions || ""}
                  onChange={(e) => {
                    const updated = {
                      ...(role.persona || {}),
                      additional_instructions: e.target.value,
                    };
                    quickUpdateRole({ persona: updated });
                  }}
                  placeholder="e.g. Always generate type annotations, adhere to strict PEP8 and ESLint guidelines, never commit secrets..."
                  className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                />
              </div>
            </div>

            {/* ── SECTION: ROLE RESPONSIBILITIES ───────────────────── */}
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border-tech/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-primary-container" />
                  <h3 className="font-code-sm text-sm font-bold text-on-surface">
                    Role Responsibilities (Ordered)
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  {role.responsibilities?.length || 0} Defined
                </span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-neutral-500 font-label-caps">Presets:</span>
                {["implement_features", "write_tests", "code_review", "production_deployment"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => addResponsibility(preset)}
                    className="px-2 py-0.5 border border-border-tech hover:border-primary-container/50 bg-surface-layer text-neutral-300 font-mono text-[10px] rounded-sm cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              {/* Responsibilities List with Reordering */}
              <div className="space-y-1.5">
                {(!role.responsibilities || role.responsibilities.length === 0) ? (
                  <div className="p-4 bg-surface-layer border border-dashed border-border-tech text-center font-code-sm text-xs text-on-surface-variant rounded-sm">
                    No responsibilities defined yet. Use the presets above or input custom duties below.
                  </div>
                ) : (
                  role.responsibilities.map((resp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-surface-layer border border-border-tech rounded-sm font-code-sm text-xs text-on-surface group hover:border-border-tech/80 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 flex-1 pr-2">
                        <span className="font-mono text-[10px] text-primary-container bg-primary-container/10 px-1.5 py-0.5 rounded-sm">
                          #{idx + 1}
                        </span>
                        <span>{resp}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveResponsibility(idx, "up")}
                          className="p-1 text-on-surface-variant hover:text-primary-container disabled:opacity-30 cursor-pointer"
                          title="Move Up"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === (role.responsibilities?.length || 0) - 1}
                          onClick={() => moveResponsibility(idx, "down")}
                          className="p-1 text-on-surface-variant hover:text-primary-container disabled:opacity-30 cursor-pointer"
                          title="Move Down"
                        >
                          <ChevronDown size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeResponsibility(idx)}
                          className="p-1 text-on-surface-variant hover:text-red-400 cursor-pointer ml-1"
                          title="Remove Responsibility"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Custom Responsibility */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newRespInput}
                  onChange={(e) => setNewRespInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addResponsibility(newRespInput);
                    }
                  }}
                  placeholder="e.g. Conduct automated security audits..."
                  className="flex-1 bg-surface-layer border border-border-tech px-3 py-1.5 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => addResponsibility(newRespInput)}
                  className="px-3.5 py-1.5 border border-primary-container/50 bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* ── SECTION: ROLE SKILLS ─────────────────────────────── */}
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border-tech/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-primary-container" />
                  <h3 className="font-code-sm text-sm font-bold text-on-surface">
                    Required Domain &amp; Technical Skills
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  {role.required_skills?.length || 0} Skills
                </span>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-neutral-500 font-label-caps">Quick Add:</span>
                {["Python", "FastAPI", "TypeScript", "GitHub", "Docker", "Testing", "PostgreSQL", "Cloud"].map((sk) => (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => addSkill(sk)}
                    className="px-2 py-0.5 border border-border-tech hover:border-primary-container/50 bg-surface-layer text-neutral-300 font-code-sm text-[10px] rounded-sm cursor-pointer"
                  >
                    + {sk}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 bg-surface-layer border border-border-tech p-2.5 rounded-sm min-h-[44px]">
                {(!role.required_skills || role.required_skills.length === 0) ? (
                  <span className="font-code-sm text-xs text-on-surface-variant italic">
                    No technical skills mapped yet.
                  </span>
                ) : (
                  role.required_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-container-low border border-border-tech font-code-sm text-xs text-on-surface rounded-sm"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-on-surface-variant hover:text-red-400 cursor-pointer ml-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill(newSkillInput);
                    }
                  }}
                  placeholder="Add skill tag (e.g. Next.js, Kubernetes)..."
                  className="flex-1 bg-surface-layer border border-border-tech px-3 py-1.5 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => addSkill(newSkillInput)}
                  className="px-3.5 py-1.5 border border-primary-container/50 bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold cursor-pointer"
                >
                  Add Skill
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Tools, Permissions, Risk & Approval Rules */}
          <div className="space-y-6">
            {/* ── SECTION: RECOGNIZED TOOLS (ToolRegistry Validated) ── */}
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border-tech/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <Wrench size={16} className="text-primary-container" />
                  <h3 className="font-code-sm text-sm font-bold text-on-surface">
                    Recognized Tool Registry Assignments
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-primary-container bg-primary-container/10 px-2 py-0.5 border border-primary-container/30 rounded-sm">
                  ToolRegistry Validated
                </span>
              </div>

              <p className="font-code-sm text-xs text-on-surface-variant">
                Select tools recognized by the backend ToolRegistry. Agents only receive access to tools assigned here, enforced at runtime by PolicyEngine.
              </p>

              <div className="space-y-2">
                {availableTools.map((tool) => {
                  const isAssigned = (role.tools || [])
                    .map((t) => t.toLowerCase())
                    .includes(tool.tool_id.toLowerCase());

                  return (
                    <div
                      key={tool.tool_id}
                      onClick={() => toggleTool(tool.tool_id)}
                      className={`p-3 border rounded-sm cursor-pointer transition-all flex items-start gap-3 ${
                        isAssigned
                          ? "border-primary-container bg-primary-container/10 text-on-surface"
                          : "border-border-tech bg-surface-layer text-on-surface-variant hover:border-border-tech/80"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 mt-0.5 border flex items-center justify-center rounded-sm shrink-0 ${
                          isAssigned
                            ? "border-primary-container bg-primary-container text-black"
                            : "border-border-tech bg-surface-container-low"
                        }`}
                      >
                        {isAssigned && <Check size={11} className="stroke-[3]" />}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-code-sm text-xs font-bold ${
                                isAssigned ? "text-primary-container" : "text-on-surface"
                              }`}
                            >
                              {tool.name}
                            </span>
                            <span className="font-mono text-[9px] text-neutral-400 bg-surface-container-low px-1.5 py-0.2 border border-border-tech rounded-sm">
                              id: {tool.tool_id}
                            </span>
                          </div>

                          <span
                            className={`font-mono text-[9px] px-1.5 py-0.2 border rounded-sm uppercase ${
                              tool.risk_level === "CRITICAL"
                                ? "border-red-500/40 text-red-400"
                                : tool.risk_level === "HIGH"
                                ? "border-amber-500/40 text-amber-400"
                                : "border-emerald-500/40 text-emerald-400"
                            }`}
                          >
                            {tool.risk_level} Risk
                          </span>
                        </div>

                        <p className="font-code-sm text-[11px] text-on-surface-variant">
                          {tool.description}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap pt-2 mt-1.5 border-t border-border-tech/40 text-[10px] font-mono text-neutral-400">
                          <span>Capabilities: {tool.capabilities.join(", ")}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── SECTION: ROLE PERMISSIONS (PolicyEngine Consumed) ── */}
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border-tech/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <KeyRound size={16} className="text-primary-container" />
                  <h3 className="font-code-sm text-sm font-bold text-on-surface">
                    Policy Engine Permissions
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant">
                  {role.permissions?.length || 0} Configured
                </span>
              </div>

              <p className="font-code-sm text-xs text-on-surface-variant">
                Explicit permissions evaluated by PolicyEngine prior to executing agent actions.
              </p>

              {/* Standard Permission Badges Toggle */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  "code:read",
                  "code:write",
                  "github:read",
                  "github:write",
                  "jira:read",
                  "jira:write",
                  "system:execute",
                  "deploy:production",
                ].map((perm) => {
                  const isChecked = (role.permissions || []).includes(perm);
                  return (
                    <button
                      key={perm}
                      type="button"
                      onClick={() => togglePermission(perm)}
                      className={`px-2.5 py-1 border font-mono text-[11px] rounded-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                        isChecked
                          ? "border-primary-container bg-primary-container/20 text-primary-container font-semibold"
                          : "border-border-tech bg-surface-layer text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isChecked ? "bg-primary-container" : "bg-neutral-600"}`} />
                      <span>{perm}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Permission Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newPermInput}
                  onChange={(e) => setNewPermInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustomPermission(newPermInput);
                    }
                  }}
                  placeholder="Add custom permission (e.g. db:read, analytics:export)..."
                  className="flex-1 bg-surface-layer border border-border-tech px-3 py-1.5 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => addCustomPermission(newPermInput)}
                  className="px-3.5 py-1.5 border border-primary-container/50 bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* ── SECTION: RISK LEVEL & APPROVAL RULES ─────────────── */}
            <div className="border border-border-tech bg-surface-container-low p-5 rounded-sm space-y-4">
              <div className="flex items-center justify-between border-b border-border-tech/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-primary-container" />
                  <h3 className="font-code-sm text-sm font-bold text-on-surface">
                    Risk Classification &amp; Approval Safety Rules
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-primary-container bg-primary-container/10 px-2 py-0.5 border border-primary-container/30 rounded-sm">
                  PolicyEngine &amp; CriteriaEngine
                </span>
              </div>

              {/* Risk Level Selector */}
              <div>
                <span className="text-on-surface-variant block text-[11px] font-label-caps uppercase mb-1.5">
                  Role Risk Classification Level
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setRiskLevel(lvl)}
                      className={`p-2 border text-center font-code-sm text-xs font-semibold rounded-sm transition-all cursor-pointer ${
                        role.risk_level === lvl
                          ? lvl === "CRITICAL"
                            ? "border-red-500 bg-red-950/40 text-red-300"
                            : lvl === "HIGH"
                            ? "border-amber-500 bg-amber-950/40 text-amber-300"
                            : lvl === "MEDIUM"
                            ? "border-sky-500 bg-sky-950/40 text-sky-300"
                            : "border-emerald-500 bg-emerald-950/40 text-emerald-300"
                          : "border-border-tech bg-surface-layer text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Safety Approval Rules Toggles */}
              <div className="space-y-2.5 pt-2 border-t border-border-tech/40">
                <span className="text-on-surface-variant block text-[11px] font-label-caps uppercase">
                  Human-in-the-Loop Approval Triggers
                </span>

                <div
                  onClick={() => toggleApprovalRule("require_approval_for_prod_deploy", true)}
                  className="p-3 bg-surface-layer border border-border-tech rounded-sm flex items-center justify-between cursor-pointer hover:border-primary-container/40 transition-colors"
                >
                  <div>
                    <div className="font-code-sm text-xs font-bold text-on-surface">
                      Require Approval for Production Deployments
                    </div>
                    <div className="font-code-sm text-[11px] text-on-surface-variant">
                      Blocks autonomous releases until an authorized human signs off.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(role.approval_rules?.require_approval_for_prod_deploy)}
                    readOnly
                    className="accent-primary-container cursor-pointer"
                  />
                </div>

                <div
                  onClick={() => toggleApprovalRule("require_human_review_for_db_writes", false)}
                  className="p-3 bg-surface-layer border border-border-tech rounded-sm flex items-center justify-between cursor-pointer hover:border-primary-container/40 transition-colors"
                >
                  <div>
                    <div className="font-code-sm text-xs font-bold text-on-surface">
                      Require Human Review for Database Mutations
                    </div>
                    <div className="font-code-sm text-[11px] text-on-surface-variant">
                      Interprets SQL modifications and migrations with human approval requirement.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(role.approval_rules?.require_human_review_for_db_writes)}
                    readOnly
                    className="accent-primary-container cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-surface-layer border border-border-tech rounded-sm flex items-center justify-between">
                  <div>
                    <div className="font-code-sm text-xs font-bold text-on-surface">
                      Max Autonomous File Edits Per Action
                    </div>
                    <div className="font-code-sm text-[11px] text-on-surface-variant">
                      Limit consecutive unattended code changes before requiring checkpoint review.
                    </div>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={role.approval_rules?.max_autonomous_file_edits || 10}
                    onChange={(e) => setApprovalRuleValue("max_autonomous_file_edits", parseInt(e.target.value) || 10)}
                    className="w-16 bg-surface-container-low border border-border-tech px-2 py-1 font-mono text-xs text-center text-primary-container focus:border-primary-container focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: CRITERIA ENGINE & AGENT PLANNER PREVIEW ──────────── */}
      {activeTab === "planner_preview" && (
        <div className="border border-border-tech bg-surface-container-low p-6 rounded-sm space-y-5">
          <div className="border-b border-border-tech/60 pb-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-primary-container" />
                <h2 className="font-display-xl text-lg text-on-surface font-bold">
                  Criteria Engine &amp; Agent Planner Pipeline Spec
                </h2>
              </div>
              <p className="font-code-sm text-xs text-on-surface-variant mt-1">
                Live output generated by <span className="text-primary-container font-mono">CriteriaEngine.generate_role_criteria()</span> for this role configuration. This structure is directly consumed by <span className="text-primary-container font-mono">AgentPlanner</span> and <span className="text-primary-container font-mono">AgentFactory</span>.
              </p>
            </div>

            <span className="px-2.5 py-1 border border-primary-container/40 bg-primary-container/10 font-mono text-xs text-primary-container rounded-sm">
              Ready for Agent Factory
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-surface-layer border border-border-tech p-4 rounded-sm">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase block mb-1">
                Extracted Capabilities for AgentFactory:
              </span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {simulatedPlannerOutput?.capabilities_required.map((cap) => (
                  <span
                    key={cap}
                    className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 text-primary-container font-mono text-xs font-bold rounded-sm"
                  >
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-surface-layer border border-border-tech p-4 rounded-sm">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase block mb-1">
                Evaluated Risk Tier:
              </span>
              <div className="font-mono text-xl font-bold text-on-surface mt-1">
                {simulatedPlannerOutput?.risk_level}
              </div>
              <span className="text-[10px] font-code-sm text-on-surface-variant block mt-1">
                Enforced by PolicyEngine
              </span>
            </div>

            <div className="bg-surface-layer border border-border-tech p-4 rounded-sm">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase block mb-1">
                Instantiated Runtime Agents Preview:
              </span>
              <div className="font-mono text-xs text-neutral-300 mt-1">
                {simulatedPlannerOutput?.capabilities_required.length} Agents configured in Group
              </div>
              <span className="text-[10px] font-code-sm text-primary-container block mt-1">
                Ready for Employee Provisioning
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-label-caps text-[11px] text-on-surface-variant uppercase">
                Generated RoleCriteria JSON Output (Backend Schema)
              </span>
              <span className="font-mono text-[10px] text-neutral-500">CriteriaEngine Structure</span>
            </div>
            <pre className="p-4 bg-neutral-950 border border-border-tech rounded-sm font-mono text-xs text-neutral-300 overflow-x-auto max-h-96">
              {JSON.stringify(simulatedPlannerOutput, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIGURE / ADD CAPABILITIES ──────────────────────── */}
      {isAddCapabilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="border border-border-tech bg-surface-container-low w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-tech p-4 bg-surface-layer">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-primary-container" />
                <h3 className="font-code-sm text-sm font-bold text-on-surface">
                  Configure AI Capability Bundle // {role.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCapabilityModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="font-code-sm text-xs text-on-surface-variant">
                Select the reusable AI capabilities to include in this role blueprint. When employees are provisioned, their AgentGroup will be assembled automatically from this capability bundle.
              </p>

              {availableCapabilities.length === 0 ? (
                <div className="p-6 border border-dashed border-border-tech text-center font-code-sm text-xs text-on-surface-variant bg-surface-layer rounded-sm">
                  No active capabilities found in CapabilityRegistry.
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
                            setSelectedCapabilityNames(
                              selectedCapabilityNames.filter((n) => n !== cap.name)
                            );
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
                        <div
                          className={`w-4 h-4 mt-0.5 border flex items-center justify-center rounded-sm shrink-0 ${
                            isSelected
                              ? "border-primary-container bg-primary-container text-black"
                              : "border-border-tech bg-surface-container-low"
                          }`}
                        >
                          {isSelected && <Check size={11} className="stroke-[3]" />}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span
                              className={`font-code-sm text-xs font-bold ${
                                isSelected ? "text-primary-container" : "text-on-surface"
                              }`}
                            >
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
                  {selectedCapabilityNames.length} of {availableCapabilities.length} capabilities selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCapabilityModalOpen(false)}
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
                    <span>Save Capabilities Bundle</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT ROLE BLUEPRINT (Full Edit) ───────────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="border border-border-tech bg-surface-container-low w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-tech p-4 bg-surface-layer">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-primary-container" />
                <h3 className="font-code-sm text-sm font-bold text-on-surface">
                  Edit Role Blueprint // {role.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                    Role Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                  Description / Purpose
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                    Risk Classification
                  </label>
                  <select
                    value={formRisk}
                    onChange={(e) => setFormRisk(e.target.value as RoleRiskLevel)}
                    className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none cursor-pointer"
                  >
                    <option value="LOW">LOW (Standard tasks, non-destructive)</option>
                    <option value="MEDIUM">MEDIUM (Code generation, PR creation)</option>
                    <option value="HIGH">HIGH (Infrastructure, DB operations)</option>
                    <option value="CRITICAL">CRITICAL (Production deployment)</option>
                  </select>
                </div>

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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                    AI Persona Name
                  </label>
                  <input
                    type="text"
                    value={formPersonaName}
                    onChange={(e) => setFormPersonaName(e.target.value)}
                    placeholder="e.g. Developer Twin"
                    className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                    Communication Style
                  </label>
                  <select
                    value={formCommStyle}
                    onChange={(e) => setFormCommStyle(e.target.value)}
                    className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none cursor-pointer"
                  >
                    <option value="Professional">Professional</option>
                    <option value="Technical & Direct">Technical &amp; Direct</option>
                    <option value="Analytical & Detailed">Analytical &amp; Detailed</option>
                    <option value="Concise & Fast">Concise &amp; Fast</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant uppercase mb-1">
                  Additional Persona Guidance &amp; Constraints
                </label>
                <textarea
                  rows={2}
                  value={formAdditionalInstructions}
                  onChange={(e) => setFormAdditionalInstructions(e.target.value)}
                  placeholder="Specific rules for AI agents running under this role..."
                  className="w-full bg-surface-layer border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-tech">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
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
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM DELETE ROLE ───────────────────────────────── */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="border border-red-500/40 bg-surface-container-low w-full max-w-md p-5 rounded-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-code-sm text-sm font-bold">
              <AlertTriangle size={16} />
              <span>Delete Role Blueprint</span>
            </div>
            <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed">
              Are you sure you want to delete <span className="text-on-surface font-bold">&quot;{role.name}&quot;</span>? This will permanently remove the role blueprint and its capability mappings.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-tech">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 border border-border-tech hover:bg-surface-layer text-on-surface font-code-sm text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRole}
                disabled={isSaving}
                className="px-4 py-2 border border-red-500 bg-red-950/40 hover:bg-red-900/60 text-red-300 font-code-sm text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving && <RefreshCw size={12} className="animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
