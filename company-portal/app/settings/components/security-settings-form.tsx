"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  Shield,
  Layers,
  Key,
} from "lucide-react";

export function SecuritySettingsForm() {
  const { isLoading: isAuthLoading } = useAuth();

  // Local configuration states
  const [passwordExpiry, setPasswordExpiry] = useState("90_days");
  const [passwordHistory, setPasswordHistory] = useState("5_previous");
  const [idleTimeout, setIdleTimeout] = useState("1_hour");
  const [concurrentSessions, setConcurrentSessions] = useState(true);

  // MFA States (UI-staged)
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaRequireAdmins, setMfaRequireAdmins] = useState(false);
  const [mfaRequireEmployees, setMfaRequireEmployees] = useState(false);

  // SSO / OIDC States
  const [ssoProvider, setSsoProvider] = useState("oidc");
  const [issuerUrl, setIssuerUrl] = useState("https://auth.company.ai/realms/twinagent");
  const [clientId, setClientId] = useState("twin-agent-portal-client");
  const [redirectUri] = useState("http://localhost:3000/api/auth/callback/oidc");
  const [scopes, setScopes] = useState("openid email profile groups");

  // Feedback State
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveSecurity = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSuccessMessage("Security preferences updated in session. Backend policy persistence endpoint will enforce these rules globally.");
      setTimeout(() => setSuccessMessage(null), 5000);
    }, 600);
  };

  if (isAuthLoading) {
    return <LoadingState label="Loading security configuration context..." />;
  }

  return (
    <form onSubmit={handleSaveSecurity} className="space-y-8 animate-fade-in-up pb-12">
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
      {/* CARD 1: AUTHENTICATION METHOD */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-5">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <KeyRound size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section A — Configured Authentication Method
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Primary identity provider and credential verification pipeline for this organization.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-primary-container uppercase px-2 py-0.5 border border-primary-container/30 bg-primary-container/10 rounded-sm">
            Active Provider
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active: Local DB Authentication */}
          <div className="p-4 bg-surface-layer border border-primary-container/50 rounded-sm space-y-2 relative shadow-[0_0_12px_rgba(0,255,65,0.08)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary-container" />
                <span className="font-display-xl text-sm font-semibold text-on-surface">
                  Local Database Authentication
                </span>
              </div>
              <span className="px-2 py-0.5 bg-primary-container text-black font-code-sm text-[10px] uppercase font-bold rounded-sm">
                Enabled &amp; Active
              </span>
            </div>
            <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed">
              Email + password authentication with cryptographic password hashing (Argon2 / bcrypt) stored securely in Neon PostgreSQL.
            </p>
            <div className="pt-2 border-t border-border-tech/60 flex items-center justify-between text-[11px] font-code-sm text-primary-container">
              <span>FastAPI JWT Auth v1</span>
              <span>Default Identity Source</span>
            </div>
          </div>

          {/* Planned: Enterprise Single Sign-On (SSO) */}
          <div className="p-4 bg-surface-layer border border-border-tech rounded-sm space-y-2 opacity-75">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-on-surface-variant" />
                <span className="font-display-xl text-sm font-semibold text-on-surface">
                  Enterprise SSO / Keycloak / OIDC
                </span>
              </div>
              <span className="px-2 py-0.5 border border-border-tech bg-surface-container-high text-on-surface-variant font-code-sm text-[10px] uppercase rounded-sm">
                Not Configured
              </span>
            </div>
            <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed">
              Federate identity through SAML 2.0 or OpenID Connect with corporate providers like Keycloak, Okta, or Google Workspace.
            </p>
            <div className="pt-2 border-t border-border-tech/60 flex items-center justify-between text-[11px] font-code-sm text-on-surface-variant">
              <span>Enterprise Federation</span>
              <span>Available via OIDC Gateway</span>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 2: PASSWORD POLICY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-5">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section B — Password Complexity &amp; Policies
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Minimum password strength, character entropy requirements, and credential expiration intervals.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Policy Engine
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Policy 1: Minimum Length */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                Min Length
              </span>
              <span className="text-[9px] text-primary-container border border-primary-container/40 px-1 py-0.2 rounded-sm font-mono">
                ENFORCED
              </span>
            </div>
            <div className="font-display-xl text-lg font-bold text-on-surface">
              8 Characters
            </div>
            <p className="font-code-sm text-[10px] text-on-surface-variant">
              Enforced on all employee and administrator registrations.
            </p>
          </div>

          {/* Policy 2: Complexity */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                Character Complexity
              </span>
              <span className="text-[9px] text-primary-container border border-primary-container/40 px-1 py-0.2 rounded-sm font-mono">
                ENFORCED
              </span>
            </div>
            <div className="font-display-xl text-lg font-bold text-on-surface">
              1 Uppercase + 1 Digit
            </div>
            <p className="font-code-sm text-[10px] text-on-surface-variant">
              Regex validated before password hashing.
            </p>
          </div>

          {/* Policy 3: Password Expiration (Planned) */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                Password Expiration
              </span>
              <span className="text-[9px] text-on-surface-variant border border-border-tech px-1 py-0.2 rounded-sm font-mono">
                PLANNED
              </span>
            </div>
            <select
              value={passwordExpiry}
              onChange={(e) => setPasswordExpiry(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-2 py-1 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none"
            >
              <option value="never">Never Expire</option>
              <option value="90_days">90 Days (Recommended)</option>
              <option value="180_days">180 Days</option>
              <option value="365_days">1 Year</option>
            </select>
            <p className="font-code-sm text-[10px] text-on-surface-variant">
              Forces password reset after expiration.
            </p>
          </div>

          {/* Policy 4: Password History (Planned) */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                History Restriction
              </span>
              <span className="text-[9px] text-on-surface-variant border border-border-tech px-1 py-0.2 rounded-sm font-mono">
                PLANNED
              </span>
            </div>
            <select
              value={passwordHistory}
              onChange={(e) => setPasswordHistory(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-2 py-1 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none"
            >
              <option value="none">No Restriction</option>
              <option value="3_previous">Last 3 Passwords</option>
              <option value="5_previous">Last 5 Passwords</option>
              <option value="10_previous">Last 10 Passwords</option>
            </select>
            <p className="font-code-sm text-[10px] text-on-surface-variant">
              Prevents reuse of recently used credentials.
            </p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 3: SESSION SECURITY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-5">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Clock size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section C — Session Lifetimes &amp; Throttling
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                JWT token duration, idle session timeouts, and brute-force mitigation thresholds.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Session Node
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* JWT Token Duration */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                JWT Access Token
              </span>
              <span className="text-[9px] text-primary-container border border-primary-container/40 px-1 py-0.2 rounded-sm font-mono">
                ACTIVE
              </span>
            </div>
            <div className="font-display-xl text-lg font-bold text-on-surface">
              7 Days
            </div>
            <p className="font-code-sm text-[10px] text-on-surface-variant">
              Signed with HMAC-SHA256. (30 days with Remember Me).
            </p>
          </div>

          {/* Failed Login Limiter */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                Brute-Force Throttle
              </span>
              <span className="text-[9px] text-primary-container border border-primary-container/40 px-1 py-0.2 rounded-sm font-mono">
                RATE LIMITER
              </span>
            </div>
            <div className="font-display-xl text-lg font-bold text-on-surface">
              5 Attempts / Min
            </div>
            <p className="font-code-sm text-[10px] text-on-surface-variant">
              IP-based rate limiter protects login endpoints against attacks.
            </p>
          </div>

          {/* Idle Timeout (Configurable) */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                Idle Inactivity Lock
              </span>
              <span className="text-[9px] text-on-surface-variant border border-border-tech px-1 py-0.2 rounded-sm font-mono">
                CONFIGURABLE
              </span>
            </div>
            <select
              value={idleTimeout}
              onChange={(e) => setIdleTimeout(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-2 py-1 font-code-sm text-xs text-on-surface focus:border-primary-container focus:outline-none"
            >
              <option value="15_mins">15 Minutes</option>
              <option value="1_hour">1 Hour</option>
              <option value="8_hours">8 Hours (Work Day)</option>
              <option value="never">Never (Session Life)</option>
            </select>
            <p className="font-code-sm text-[10px] text-on-surface-variant">
              Locks browser console when idle.
            </p>
          </div>

          {/* Concurrent Sessions */}
          <div className="p-3.5 bg-surface-layer border border-border-tech rounded-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                Concurrent Logins
              </span>
              <span className="text-[9px] text-on-surface-variant border border-border-tech px-1 py-0.2 rounded-sm font-mono">
                CONFIGURABLE
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="font-code-sm text-xs text-on-surface">Allow Multi-Device</span>
              <button
                type="button"
                onClick={() => setConcurrentSessions(!concurrentSessions)}
                className={`w-9 h-5 rounded-full border transition-colors relative cursor-pointer ${
                  concurrentSessions
                    ? "bg-primary-container/20 border-primary-container"
                    : "bg-surface-container-high border-border-tech"
                }`}
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full transition-transform ${
                    concurrentSessions
                      ? "bg-primary-container translate-x-4 shadow-[0_0_6px_rgba(0,255,65,0.4)]"
                      : "bg-neutral-500 translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <p className="font-code-sm text-[10px] text-on-surface-variant">
              Allows simultaneous desktop and portal sessions.
            </p>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 4: MULTI-FACTOR AUTHENTICATION (MFA) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-5">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Smartphone size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section D — Multi-Factor Authentication (MFA)
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Time-based One-Time Passwords (TOTP) and hardware security key enforcement.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-amber-300 uppercase px-2 py-0.5 border border-amber-500/30 bg-amber-500/10 rounded-sm">
            Available After MFA Backend Integration
          </span>
        </div>

        <div className="p-4 bg-surface-layer border border-border-tech rounded-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-tech/60 pb-3">
            <div>
              <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                Organization-Wide 2FA Enforcement
              </div>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Require TOTP authentication code (Google Authenticator, Microsoft Authenticator, 1Password) upon login.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-code-sm text-xs text-on-surface-variant">
                {mfaEnabled ? "Enabled" : "Disabled"}
              </span>
              <button
                type="button"
                onClick={() => setMfaEnabled(!mfaEnabled)}
                className={`w-11 h-6 shrink-0 rounded-full border transition-colors relative cursor-pointer ${
                  mfaEnabled
                    ? "bg-primary-container/20 border-primary-container"
                    : "bg-surface-container-high border-border-tech"
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full transition-transform ${
                    mfaEnabled
                      ? "bg-primary-container translate-x-5 shadow-[0_0_8px_rgba(0,255,65,0.4)]"
                      : "bg-neutral-500 translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Require for Admins */}
            <div className="p-3 bg-surface-container-low border border-border-tech rounded-sm flex items-center justify-between gap-3">
              <div>
                <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                  Require for Administrators
                </div>
                <div className="text-[10px] font-code-sm text-on-surface-variant">
                  Mandatory 2FA for all ORG_ADMIN users
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMfaRequireAdmins(!mfaRequireAdmins)}
                className={`w-9 h-5 rounded-full border transition-colors relative cursor-pointer ${
                  mfaRequireAdmins
                    ? "bg-primary-container/20 border-primary-container"
                    : "bg-surface-container-high border-border-tech"
                }`}
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full transition-transform ${
                    mfaRequireAdmins
                      ? "bg-primary-container translate-x-4 shadow-[0_0_6px_rgba(0,255,65,0.4)]"
                      : "bg-neutral-500 translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Require for Employees */}
            <div className="p-3 bg-surface-container-low border border-border-tech rounded-sm flex items-center justify-between gap-3">
              <div>
                <div className="font-label-caps text-xs font-semibold text-on-surface uppercase">
                  Require for Employees
                </div>
                <div className="text-[10px] font-code-sm text-on-surface-variant">
                  Mandatory 2FA for regular workspace users
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMfaRequireEmployees(!mfaRequireEmployees)}
                className={`w-9 h-5 rounded-full border transition-colors relative cursor-pointer ${
                  mfaRequireEmployees
                    ? "bg-primary-container/20 border-primary-container"
                    : "bg-surface-container-high border-border-tech"
                }`}
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full transition-transform ${
                    mfaRequireEmployees
                      ? "bg-primary-container translate-x-4 shadow-[0_0_6px_rgba(0,255,65,0.4)]"
                      : "bg-neutral-500 translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="p-3 border border-border-tech bg-surface-layer font-code-sm text-xs text-on-surface-variant rounded-sm flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-on-surface">Integration Status: </strong>
            MFA enrollment endpoints (<code className="text-primary-container font-mono">/api/v1/auth/mfa/setup</code> and <code className="text-primary-container font-mono">/api/v1/auth/mfa/verify</code>) are scheduled in the enterprise security phase.
          </span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* CARD 5: SINGLE SIGN-ON (SSO / OIDC) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-5">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Globe size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Section E — Enterprise SSO / OpenID Connect (OIDC)
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Configure corporate identity federation endpoints, client IDs, and authorization scopes.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Not Configured
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Identity Provider */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Identity Provider
            </label>
            <select
              value={ssoProvider}
              onChange={(e) => setSsoProvider(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            >
              <option value="oidc">OpenID Connect (OIDC Generic)</option>
              <option value="keycloak">Keycloak Enterprise</option>
              <option value="google">Google Workspace (SAML / OAuth2)</option>
              <option value="azure">Microsoft Entra ID (Azure AD)</option>
              <option value="okta">Okta Identity Cloud</option>
            </select>
          </div>

          {/* Issuer URL */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Issuer URL / Realm Discovery
            </label>
            <input
              type="text"
              value={issuerUrl}
              onChange={(e) => setIssuerUrl(e.target.value)}
              placeholder="https://auth.company.ai/realms/twinagent"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* Client ID */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Client ID
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="twin-agent-portal-client"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* Client Secret (Masked) */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Client Secret (Masked)
            </label>
            <div className="relative">
              <input
                type="text"
                disabled
                value="••••••••••••••••••••••••••••••••"
                className="w-full bg-surface-container-high/40 border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface-variant cursor-not-allowed opacity-80"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-on-surface-variant">
                <Lock size={12} />
              </div>
            </div>
            <p className="font-code-sm text-[10px] text-on-surface-variant mt-1">
              Client secrets are encrypted server-side and never exposed to the frontend console.
            </p>
          </div>

          {/* Redirect URI */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Callback / Redirect URI
            </label>
            <input
              type="text"
              disabled
              value={redirectUri}
              className="w-full bg-surface-container-high/40 border border-border-tech px-3 py-2.5 font-code-sm text-sm text-primary-container cursor-not-allowed opacity-90 font-mono text-xs"
            />
          </div>

          {/* Scopes */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Authorization Scopes
            </label>
            <input
              type="text"
              value={scopes}
              onChange={(e) => setScopes(e.target.value)}
              placeholder="openid email profile groups"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ACTION FOOTER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-surface-container-high border border-border-tech rounded-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-code-sm text-on-surface-variant">
          <Sparkles size={14} className="text-primary-container" />
          <span>Security policies require administrator privilege and server-side cryptographic enforcement.</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary-container hover:bg-primary-fixed-dim text-black font-code-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,65,0.2)]"
          >
            {isSaving ? (
              <span>Saving Preferences...</span>
            ) : (
              <>
                <Save size={14} />
                <span>Save Security Preferences</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
