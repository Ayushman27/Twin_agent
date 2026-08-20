"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardHeader, CardTitle, CardContent } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { LoadingState } from "@shared/components/status/loading-state";
import { Building2, ShieldCheck, Users, Briefcase, Activity, CheckCircle2, ArrowRight } from "lucide-react";

export default function CompanyDashboardPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated, isOrgAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login?error=unauthorized");
      } else if (!isOrgAdmin) {
        router.push("/login?error=employee_forbidden");
      }
    }
  }, [isLoading, isAuthenticated, isOrgAdmin, router]);

  if (isLoading) {
    return <LoadingState label="Authenticating administrator session..." />;
  }

  if (!isAuthenticated || !isOrgAdmin) {
    return <LoadingState label="Redirecting to Company Login..." />;
  }

  return (
    <div className="flex flex-col gap-grid_unit animate-fade-in-up">
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
              Twin Agent Technologies Inc.
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
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Total Members</span>
              <Users size={14} className="text-on-surface-variant" />
            </div>
          </CardHeader>
          <CardTitle>48</CardTitle>
          <CardContent className="text-xs text-primary-container mt-1">12 Pending Invitations</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Active Teams</span>
              <Briefcase size={14} className="text-on-surface-variant" />
            </div>
          </CardHeader>
          <CardTitle>6</CardTitle>
          <CardContent className="text-xs text-on-surface-variant mt-1">Engineering, QA, Product, DevOps</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-on-surface-variant">Job Roles Configured</span>
              <Activity size={14} className="text-on-surface-variant" />
            </div>
          </CardHeader>
          <CardTitle>14</CardTitle>
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
              <span className="font-code-sm text-xs text-primary-container">localhost:5432 (CONNECTED)</span>
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
    </div>
  );
}
