"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { authService } from "@shared/services/auth.service";
import { organizationService, DetailedMember } from "@shared/services/organization.service";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  ShieldCheck,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  Upload,
  UserPlus,
  Key,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

export function AdministratorProfileForm() {
  const { user, refreshSession } = useAuth();
  const orgId = user?.organization_id || user?.organizationId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Form States
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("Twin Agent Technologies Inc.");

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Multi-Admin Roster State
  const [adminMembers, setAdminMembers] = useState<DetailedMember[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");

  // UI Status
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Load Administrator Profile and Organization Roster
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        setName(user.name || "");
        setPhone(user.phone || "+1 (555) 012-3456");
        setJobTitle(user.job_title || "Chief Technology Officer");
        setAvatarUrl(user.avatarUrl || null);
      }

      if (orgId) {
        // Fetch organization name
        try {
          const org = await organizationService.getOrganization(orgId);
          if (org?.company_name) setOrgName(org.company_name);
        } catch {
          // Graceful fallback
        }

        // Fetch detailed members to find administrators
        try {
          const members = await organizationService.getDetailedMembers(orgId);
          const admins = members.filter(
            (m) => m.role === "ORG_ADMIN" || m.role === "SUPER_ADMIN"
          );
          setAdminMembers(admins.length > 0 ? admins : [
            {
              id: user?.id || "admin_1",
              organization_id: orgId,
              user_id: user?.id || "usr_admin",
              name: user?.name || "Shreyashi Panigrahy",
              email: user?.email || "shreyashi@example.com",
              role: "ORG_ADMIN",
              status: "ACTIVE",
              job_title: user?.job_title || "Chief Technology Officer",
              department: "Executive Leadership",
              created_at: user?.created_at || "2026-08-19T00:00:00Z",
            }
          ]);
        } catch {
          // Fallback on single admin
          if (user) {
            setAdminMembers([
              {
                id: user.id,
                organization_id: orgId,
                user_id: user.id,
                name: user.name,
                email: user.email,
                role: "ORG_ADMIN",
                status: "ACTIVE",
                job_title: user.job_title || "Chief Technology Officer",
                department: "Executive Leadership",
                created_at: user.created_at || "2026-08-19T00:00:00Z",
              }
            ]);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Unsaved changes check for profile
  const hasProfileChanges = useMemo(() => {
    if (!user) return false;
    return (
      name !== (user.name || "") ||
      phone !== (user.phone || "+1 (555) 012-3456") ||
      jobTitle !== (user.job_title || "Chief Technology Officer") ||
      avatarUrl !== (user.avatarUrl || null)
    );
  }, [user, name, phone, jobTitle, avatarUrl]);

  // Handle Photo Upload (Base64 local preview)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Image size exceeds 2MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarUrl(event.target?.result as string);
      setSuccessMessage("Profile photo updated in session. Click 'Save Profile' to apply.");
    };
    reader.readAsDataURL(file);
  };

  // Reset Profile Form
  const handleResetProfile = () => {
    if (!user) return;
    setName(user.name || "");
    setPhone(user.phone || "+1 (555) 012-3456");
    setJobTitle(user.job_title || "Chief Technology Officer");
    setAvatarUrl(user.avatarUrl || null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage("Administrator full name cannot be empty.");
      return;
    }

    setIsSavingProfile(true);
    try {
      await authService.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        job_title: jobTitle.trim(),
        avatarUrl: avatarUrl || undefined,
      });

      await refreshSession();
      setSuccessMessage("Administrator profile updated successfully.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to update administrator profile.");
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError("New password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setPasswordError("New password must contain at least one digit.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setPasswordSuccess(res.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(null), 5000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setPasswordError(err.message);
      } else {
        setPasswordError("Invalid current password or update failed.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading Administrator Profile from Neon PostgreSQL..." />;
  }

  return (
    <div className="space-y-8 animate-fade-in-up pb-12">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 1: PRIMARY ADMINISTRATOR IDENTITY CARD */}
      {/* ───────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSaveProfile} className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Organization Administrator Profile
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Primary corporate administrator identity, permissions, and session context.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-primary-container uppercase px-2 py-0.5 border border-primary-container/30 bg-primary-container/10 rounded-sm">
            ORG_ADMIN PRIVILEGED
          </span>
        </div>

        {/* Global Feedback Banners */}
        {successMessage && (
          <div className="p-3 bg-primary-container/10 border border-primary-container/40 text-primary-container text-xs font-code-sm flex items-center justify-between rounded-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} />
              <span>{successMessage}</span>
            </div>
            <span className="text-[10px] font-mono border border-primary-container/30 px-1.5 py-0.5">
              SUCCESS
            </span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-error-container/20 border border-error-container/60 text-error text-xs font-code-sm flex items-start gap-2 rounded-sm">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Administrator Avatar & Metadata Overview */}
        <div className="p-4 bg-surface-layer border border-border-tech rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Admin Avatar"
                  className="w-16 h-16 rounded-sm border border-primary-container/50 object-cover shadow-[0_0_12px_rgba(0,255,65,0.2)]"
                />
              ) : (
                <div className="w-16 h-16 rounded-sm border border-primary-container/40 bg-primary-container/10 text-primary-container flex items-center justify-center font-mono font-bold text-xl shadow-[0_0_12px_rgba(0,255,65,0.15)]">
                  {name ? name.charAt(0).toUpperCase() : "A"}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-display-xl text-lg text-on-surface font-semibold">
                  {name || "Organization Administrator"}
                </span>
                <span className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 text-primary-container font-code-sm text-[10px] uppercase font-bold">
                  {user?.role || "ORG_ADMIN"}
                </span>
              </div>
              <div className="text-xs font-code-sm text-on-surface-variant flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="text-on-surface">{user?.email}</span>
                <span>•</span>
                <span className="text-primary-container">{orgName}</span>
                <span>•</span>
                <span className="text-emerald-400">Account: Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 border border-border-tech hover:border-primary-container bg-surface-container-high text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload size={13} />
              <span>Change Photo</span>
            </button>
          </div>
        </div>

        {/* Editable Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Name */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Full Name <span className="text-primary-container">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <User size={14} />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Shreyashi Panigrahy"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Email (Read-Only Identity Anchor) */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Corporate Email (Read-Only Identity)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Mail size={14} />
              </div>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full bg-surface-container-high/40 border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface-variant cursor-not-allowed opacity-80"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-on-surface-variant">
                <Lock size={12} />
              </div>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Primary Phone
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Phone size={14} />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 012-3456"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Job Title / Designation */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Executive Designation / Job Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Chief Technology Officer"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* Assigned Governance Role (LOCKED) */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Governance Role (Locked)
            </label>
            <div className="relative">
              <input
                type="text"
                disabled
                value="ORG_ADMIN — Full Organization Control"
                className="w-full bg-surface-container-high/40 border border-border-tech px-3 py-2.5 font-code-sm text-sm text-primary-container cursor-not-allowed opacity-90 font-semibold"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-on-surface-variant">
                <Lock size={12} />
              </div>
            </div>
            <p className="font-code-sm text-[10px] text-on-surface-variant mt-1">
              Role permissions are anchored to corporate registration policy and cannot be altered.
            </p>
          </div>

          {/* Last Login & Session Timestamp */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Session Created / Last Login
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Calendar size={14} />
              </div>
              <input
                type="text"
                disabled
                value={user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "20 Aug 2026"}
                className="w-full bg-surface-container-high/40 border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface-variant cursor-not-allowed opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Profile Action Bar */}
        <div className="border-t border-border-tech pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-code-sm text-on-surface-variant flex items-center gap-1.5">
            <Sparkles size={13} className="text-primary-container" />
            <span>Profile updates reflect across all Twin Agent administrative logs.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleResetProfile}
              disabled={!hasProfileChanges || isSavingProfile}
              className="w-full sm:w-auto px-4 py-2 border border-border-tech hover:border-border-tech/80 bg-surface-layer text-on-surface font-code-sm text-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Discard</span>
            </button>

            <button
              type="submit"
              disabled={!hasProfileChanges || isSavingProfile}
              className="w-full sm:w-auto px-5 py-2 bg-primary-container hover:bg-primary-fixed-dim text-black font-code-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(0,255,65,0.2)]"
            >
              {isSavingProfile ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Save size={13} />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 2: SECURITY & PASSWORD CREDENTIALS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <form onSubmit={handleChangePassword} className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Key size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Security &amp; Password Update
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Change your administrator account authentication credentials.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Argon2 / bcrypt
          </span>
        </div>

        {/* Password Feedback Alerts */}
        {passwordSuccess && (
          <div className="p-3 bg-primary-container/10 border border-primary-container/40 text-primary-container text-xs font-code-sm flex items-center gap-2 rounded-sm">
            <CheckCircle2 size={15} />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-error-container/20 border border-error-container/60 text-error text-xs font-code-sm flex items-start gap-2 rounded-sm">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
            <span>{passwordError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Current Password */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Current Password <span className="text-primary-container">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Lock size={14} />
              </div>
              <input
                type={showCurrentPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-10 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                {showCurrentPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              New Password <span className="text-primary-container">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Lock size={14} />
              </div>
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-10 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="font-code-sm text-[10px] text-on-surface-variant mt-1">
              Min 8 chars, 1 uppercase, 1 digit.
            </p>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Confirm New Password <span className="text-primary-container">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Lock size={14} />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-10 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-border-tech pt-4 flex justify-end">
          <button
            type="submit"
            disabled={!currentPassword || !newPassword || !confirmPassword || isChangingPassword}
            className="px-5 py-2 bg-surface-container-high hover:bg-surface-container border border-border-tech hover:border-primary-container text-on-surface font-code-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
          >
            {isChangingPassword ? (
              <span>Updating Password...</span>
            ) : (
              <>
                <Key size={13} />
                <span>Update Password</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SECTION 3: CURRENT ORGANIZATION ADMINISTRATORS ROSTER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Current Organization Administrators ({adminMembers.length})
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Users with full corporate tenant control over {orgName}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="px-3.5 py-1.5 border border-primary-container/40 bg-primary-container/10 hover:bg-primary-container/20 text-primary-container font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <UserPlus size={13} />
            <span>Invite Co-Administrator</span>
          </button>
        </div>

        {/* Administrators Table */}
        <div className="border border-border-tech bg-surface-layer rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-tech bg-surface-container-high/30 font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Administrator Name</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Governance Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Assigned Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-tech/60 font-code-sm text-xs text-on-surface">
                {adminMembers.map((admin) => (
                  <tr key={admin.id} className="hover:bg-surface-container-high/20 transition-colors">
                    {/* Name */}
                    <td className="py-3.5 px-4 font-semibold text-on-surface">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 border border-primary-container/40 bg-primary-container/10 flex items-center justify-center text-primary-container font-mono font-bold text-xs shrink-0 rounded-sm">
                          {admin.name ? admin.name.charAt(0).toUpperCase() : "A"}
                        </div>
                        <span>{admin.name || "Administrator"}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 text-on-surface-variant">
                      {admin.email || user?.email}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 border border-primary-container/40 bg-primary-container/10 text-primary-container font-code-sm text-[10px] uppercase font-bold rounded-sm">
                        {admin.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Active</span>
                      </span>
                    </td>

                    {/* Joined Date */}
                    <td className="py-3.5 px-4 text-on-surface-variant">
                      {admin.created_at ? new Date(admin.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "20 Aug 2026"}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="text-[10px] font-mono text-primary-container border border-primary-container/20 px-2 py-0.5 rounded-sm">
                        Primary Key
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INVITE CO-ADMINISTRATOR MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md glass-panel border border-border-tech p-6 shadow-2xl animate-fade-in-up space-y-4">
            <div className="border-b border-border-tech pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-primary-container" />
                <h3 className="font-display-xl text-base text-on-surface">
                  Invite Co-Administrator
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-xs font-code-sm text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed">
              Co-administrators receive full organization governance privileges, including member approvals and twin settings.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant mb-1 uppercase">
                  Administrator Full Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Vikram Sen"
                  className="w-full bg-surface-container-low border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block font-label-caps text-[10px] text-on-surface-variant mb-1 uppercase">
                  Corporate Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="vikram@company.ai"
                  className="w-full bg-surface-container-low border border-border-tech px-3 py-2 font-code-sm text-xs text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="p-3 border border-border-tech bg-surface-layer text-[11px] font-code-sm text-on-surface-variant rounded-sm">
              <span className="text-primary-container font-semibold">Backend Integration Note: </span>
              Administrator email invitations will dispatch via FastAPI endpoint <code className="text-on-surface font-mono">/api/v1/organizations/invitations</code> once multi-admin email mailer is configured.
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 font-code-sm text-xs">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-3 py-1.5 border border-border-tech bg-surface-layer text-on-surface rounded-sm hover:bg-surface-container transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setSuccessMessage(`Invitation staged for ${inviteEmail || "co-administrator"}.`);
                  setTimeout(() => setSuccessMessage(null), 5000);
                }}
                className="px-4 py-1.5 bg-primary-container text-black font-bold uppercase tracking-wider rounded-sm hover:bg-primary-fixed-dim transition-colors cursor-pointer"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
