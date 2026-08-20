"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { organizationService, OrganizationStats, DetailedMember } from "@shared/services/organization.service";
import { Card, CardHeader, CardTitle, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  Building2,
  ShieldCheck,
  Users,
  Briefcase,
  Activity,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  UserX,
  Clock,
  Mail,
  BadgeCheck,
  ChevronRight,
  X,
} from "lucide-react";

export default function CompanyDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isOrgAdmin } = useAuth();

  const [stats, setStats] = useState<OrganizationStats>({
    total_members: 1,
    active_members: 1,
    pending_invitations: 0,
    teams_count: 6,
    roles_count: 14,
  });
  const [pendingMembers, setPendingMembers] = useState<DetailedMember[]>([]);
  const [orgName, setOrgName] = useState("Twin Agent Technologies Inc.");
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);

  const orgId = user?.organization_id || user?.organizationId;

  const loadData = useCallback(async () => {
    if (!orgId) return;
    try {
      // 1. Fetch stats
      const statsRes = await organizationService.getStats(orgId);
      setStats(statsRes);

      // 2. Fetch pending employee requests
      const pendingRes = await organizationService.getDetailedMembers(orgId, "INVITED");
      setPendingMembers(pendingRes);

      // 3. Fetch org details
      const orgRes = await organizationService.getOrganization(orgId) as { company_name?: string };
      if (orgRes?.company_name) {
        setOrgName(orgRes.company_name);
      }
    } catch {
      // Fallback gracefully on local mock or load errors
    }
  }, [orgId]);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login?error=unauthorized");
      } else if (!isOrgAdmin) {
        router.push("/login?error=employee_forbidden");
      } else if (orgId) {
        loadData();
      }
    }
  }, [isLoading, isAuthenticated, isOrgAdmin, orgId, router, loadData]);

  const handleApprove = async (memberId: string) => {
    if (!orgId) return;
    setIsProcessingId(memberId);
    try {
      await organizationService.approveMember(orgId, memberId);
      await loadData();
    } catch (err: unknown) {
      console.error("Failed to approve member", err);
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleReject = async (memberId: string) => {
    if (!orgId) return;
    setIsProcessingId(memberId);
    try {
      await organizationService.rejectMember(orgId, memberId);
      await loadData();
    } catch (err: unknown) {
      console.error("Failed to reject member", err);
    } finally {
      setIsProcessingId(null);
    }
  };

  if (isLoading) {
    return <LoadingState label="Authenticating administrator session..." />;
  }

  if (!isAuthenticated || !isOrgAdmin) {
    return <LoadingState label="Redirecting to Company Login..." />;
  }

  return (
    <div className="flex flex-col gap-grid_unit animate-fade-in-up relative">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-border-tech pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 font-code-sm text-[10px] text-primary-container uppercase">
              Authenticated: {user?.role}
            </span>
            <span className="font-code-sm text-xs text-on-surface-variant">
              ({user?.email})
            </span>
          </div>
          <h1 className="font-display-xl text-[26px] sm:text-[30px] text-on-surface">
            Company Administration Console
          </h1>
          <p className="font-code-sm text-xs text-on-surface-variant mt-1">
            Managing corporate hierarchy, digital twin deployments, teams, and role definitions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/organization/people">
            <Button variant="primary">Invite Member</Button>
          </Link>
        </div>
      </div>

      {/* Organization Meta Card */}
      <div className="p-4 bg-surface-container-low border border-border-tech rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-border-tech bg-surface-layer flex items-center justify-center text-primary-container">
            <Building2 size={20} />
          </div>
          <div>
            <div className="font-display-xl text-base text-on-surface">
              {orgName}
            </div>
            <div className="font-code-sm text-xs text-on-surface-variant">
              Administrator: <span className="text-on-surface font-semibold">{user?.name}</span> • {user?.job_title || "Chief Technology Officer"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-code-sm">
          <div className="flex items-center gap-1.5 text-primary-container">
            <ShieldCheck size={16} />
            <span>Corporate Governance Active</span>
          </div>
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <CheckCircle2 size={16} className="text-primary-container" />
            <span>Multi-Tenant Node: 01</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Members Card with Clickable Pending Invitations */}
        <Card className="hover:border-primary-container/40 transition-colors">
          <CardHeader>
            <div className="flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Total Members</span>
              <Users size={14} className="text-on-surface-variant" />
            </div>
          </CardHeader>
          <CardTitle>{stats.total_members}</CardTitle>
          <CardContent className="mt-1">
            <button
              type="button"
              onClick={() => setIsPendingModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs text-primary-container hover:text-emerald-300 transition-colors group/btn cursor-pointer font-code-sm text-left"
              title="Click to view and approve pending employee requests"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  stats.pending_invitations > 0 ? "bg-primary-container animate-ping" : "bg-zinc-600"
                }`}
              />
              <span className="underline decoration-primary-container/40 underline-offset-2 group-hover/btn:decoration-primary-container">
                {stats.pending_invitations} Pending {stats.pending_invitations === 1 ? "Invitation" : "Invitations"}
              </span>
              <ChevronRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Active Teams</span>
              <Briefcase size={14} className="text-on-surface-variant" />
            </div>
          </CardHeader>
          <CardTitle>{stats.teams_count}</CardTitle>
          <CardContent className="text-xs text-on-surface-variant mt-1">Engineering, QA, Product, DevOps</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Job Roles Configured</span>
              <Activity size={14} className="text-on-surface-variant" />
            </div>
          </CardHeader>
          <CardTitle>{stats.roles_count}</CardTitle>
          <CardContent className="text-xs text-primary-container mt-1">100% Role Twin Aligned</CardContent>
        </Card>
      </div>

      {/* Action Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-grid_unit mt-2">
        {/* Quick Management Links */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Quick Administration Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link
              href="/organization/people"
              className="p-3 bg-surface-container border border-border-tech hover:border-primary-container transition-colors flex justify-between items-center group"
            >
              <div>
                <div className="font-medium text-sm text-on-surface group-hover:text-primary-container transition-colors">
                  Manage People &amp; Employees
                </div>
                <div className="text-xs text-on-surface-variant">
                  View directory, assign roles, inspect digital twin enrollment
                </div>
              </div>
              <ArrowRight size={16} className="text-primary-container group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/organization/teams"
              className="p-3 bg-surface-container border border-border-tech hover:border-primary-container transition-colors flex justify-between items-center group"
            >
              <div>
                <div className="font-medium text-sm text-on-surface group-hover:text-primary-container transition-colors">
                  Department &amp; Team Structure
                </div>
                <div className="text-xs text-on-surface-variant">
                  Organize squads, set managers, and configure team objectives
                </div>
              </div>
              <ArrowRight size={16} className="text-primary-container group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/organization/roles"
              className="p-3 bg-surface-container border border-border-tech hover:border-primary-container transition-colors flex justify-between items-center group"
            >
              <div>
                <div className="font-medium text-sm text-on-surface group-hover:text-primary-container transition-colors">
                  Role Twin Definitions
                </div>
                <div className="text-xs text-on-surface-variant">
                  Configure skills, standards, and autonomous action policies
                </div>
              </div>
              <ArrowRight size={16} className="text-primary-container group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/organization/projects"
              className="p-3 bg-surface-container border border-border-tech hover:border-primary-container transition-colors flex justify-between items-center group"
            >
              <div>
                <div className="font-medium text-sm text-on-surface group-hover:text-primary-container transition-colors">
                  Projects &amp; Work Streams
                </div>
                <div className="text-xs text-on-surface-variant">
                  Track project assignments and agent workflow pipelines
                </div>
              </div>
              <ArrowRight size={16} className="text-primary-container group-hover:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>

        {/* System & Architecture Status */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle>Architecture Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b border-border-tech pb-2">
              <span className="text-sm text-on-surface-variant">FastAPI Backend</span>
              <span className="font-code-sm text-xs text-primary-container">
                {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} (ONLINE)
              </span>
            </div>
            <div className="flex justify-between items-center border-b border-border-tech pb-2">
              <span className="text-sm text-on-surface-variant">PostgreSQL Database</span>
              <span className="font-code-sm text-xs text-primary-container">Neon PostgreSQL (CONNECTED)</span>
            </div>
            <div className="flex justify-between items-center border-b border-border-tech pb-2">
              <span className="text-sm text-on-surface-variant">Company Portal</span>
              <span className="font-code-sm text-xs text-primary-container">Port 3000 (THIS CONSOLE)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-on-surface-variant">Employee Portal</span>
              <a
                href="http://localhost:3001"
                target="_blank"
                rel="noopener noreferrer"
                className="font-code-sm text-xs text-primary-fixed-dim hover:underline flex items-center gap-1"
              >
                Port 3001 <ArrowRight size={12} />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── INTERACTIVE PENDING APPROVALS MODAL ── */}
      {isPendingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-2xl glass-panel border border-border-tech p-6 shadow-2xl animate-fade-in-up space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-tech pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="font-display-xl text-lg sm:text-xl text-on-surface">
                    Pending Employee Approval Requests ({pendingMembers.length})
                  </h2>
                  <p className="font-code-sm text-xs text-on-surface-variant mt-0.5">
                    Review and verify employee accounts requesting to join {orgName}.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPendingModalOpen(false)}
                className="p-1.5 border border-zinc-800 hover:border-zinc-600 bg-zinc-950 text-zinc-400 hover:text-white rounded-sm transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* List of Pending Requests */}
            {pendingMembers.length === 0 ? (
              <div className="py-10 text-center space-y-2 border border-dashed border-border-tech/80 rounded-sm bg-surface-layer/40">
                <div className="w-10 h-10 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={20} />
                </div>
                <div className="font-code-sm text-sm font-semibold text-on-surface">
                  No Pending Approval Requests
                </div>
                <p className="font-code-sm text-xs text-on-surface-variant max-w-sm mx-auto">
                  All employee registration requests have been reviewed. New requests from localhost:3001/register will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {pendingMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 bg-surface-layer border border-border-tech hover:border-primary-container/40 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 border border-primary-container/40 bg-primary-container/10 flex items-center justify-center text-primary-container font-mono font-bold text-sm shrink-0 rounded-sm">
                        {member.name ? member.name.charAt(0).toUpperCase() : "E"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-code-sm text-sm font-semibold text-on-surface">
                            {member.name || "Unnamed Employee"}
                          </span>
                          <span className="px-2 py-0.5 border border-amber-500/40 bg-amber-500/10 text-amber-300 font-code-sm text-[10px] uppercase">
                            Pending Approval
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-code-sm text-on-surface-variant mt-1.5">
                          {member.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={12} /> {member.email}
                            </span>
                          )}
                          {member.department && (
                            <span>Dept: {member.department}</span>
                          )}
                          {member.job_title && (
                            <span>Role: {member.job_title}</span>
                          )}
                          {member.employee_id && (
                            <span className="flex items-center gap-1">
                              <BadgeCheck size={12} /> ID: {member.employee_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        disabled={isProcessingId === member.id}
                        onClick={() => handleApprove(member.id)}
                        className="px-3.5 py-1.5 bg-[#00ff41] hover:bg-[#00e63a] text-[#050505] font-code-sm text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,255,65,0.2)] disabled:opacity-50 cursor-pointer"
                      >
                        <UserCheck size={14} />
                        <span>Approve</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingId === member.id}
                        onClick={() => handleReject(member.id)}
                        className="px-3 py-1.5 border border-border-tech hover:border-red-500/60 bg-surface-container-high text-on-surface hover:text-red-400 font-code-sm text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <UserX size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-border-tech flex items-center justify-between font-code-sm text-xs text-on-surface-variant">
              <span>Approved users can immediately sign in at Port 3001.</span>
              <button
                type="button"
                onClick={() => setIsPendingModalOpen(false)}
                className="px-4 py-2 border border-border-tech bg-surface-container-high hover:bg-surface-container text-on-surface rounded-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
