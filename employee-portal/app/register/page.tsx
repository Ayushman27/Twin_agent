"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organizationService } from "@shared/services/organization.service";
import { authService, EmployeeRegisterPayload, EmployeeRegisterResult } from "@shared/services/auth.service";
import type { PublicCompany } from "@shared/types";
import {
  Search,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  MapPin,
  Briefcase,
  X,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Phone,
  BadgeCheck,
  ShieldAlert,
  Fingerprint,
} from "lucide-react";

function EmployeeRegisterForm() {
  const router = useRouter();

  // Multi-step state: 1 = Organization Discovery, 2 = Employee Account Info
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Step 1 State: Organization Selection
  const [searchQuery, setSearchQuery] = useState("");
  const [companies, setCompanies] = useState<PublicCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<PublicCompany | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Step 2 State: Employee Information
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Submission / Approval State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittedForApproval, setIsSubmittedForApproval] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<EmployeeRegisterResult | null>(null);

  const fetchCompanies = useCallback(async (query: string) => {
    setIsSearching(true);
    try {
      const results = await organizationService.searchPublicCompanies(query);
      setCompanies(results);
      setHasSearched(true);
    } catch {
      setCompanies([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Initial load of organizations
  useEffect(() => {
    fetchCompanies("");
  }, [fetchCompanies]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCompanies(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchCompanies]);

  const handleSelectCompany = (company: PublicCompany) => {
    setSelectedCompany(company);
    setErrorMessage(null);
  };

  const handleProceedToStep2 = () => {
    if (!selectedCompany) {
      setErrorMessage("Please select a registered organization to continue.");
      return;
    }
    setErrorMessage(null);
    setCurrentStep(2);
  };

  const handleBackToStep1 = () => {
    setErrorMessage(null);
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCompany) {
      setErrorMessage("Missing organization association. Please choose an organization first.");
      setCurrentStep(1);
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Full Name is required.");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setErrorMessage("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setErrorMessage("Password must contain at least one digit.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify your confirm password field.");
      return;
    }

    setIsLoading(true);

    const payload: EmployeeRegisterPayload = {
      organization_id: selectedCompany.id,
      name: fullName.trim(),
      email: email.trim(),
      password,
      confirm_password: confirmPassword,
      employee_id: employeeId.trim() || undefined,
      department: department.trim() || undefined,
      job_title: jobTitle.trim() || undefined,
      phone: phone.trim() || undefined,
    };

    try {
      const res = await authService.registerEmployee(payload);
      setSubmissionResult(res);
      setIsSubmittedForApproval(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected registration error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-2xl glass-panel p-6 sm:p-10 border border-border-tech shadow-2xl animate-fade-in-up my-8">
      {/* Header & Step Indicator */}
      {!isSubmittedForApproval && (
        <div className="mb-8 border-b border-border-tech pb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-display-xl text-2xl sm:text-3xl text-on-surface tracking-tight">
              {currentStep === 1 ? "Join Your Organization" : "Create Employee Account"}
            </h1>
            <span className="px-2.5 py-1 border border-primary-container/30 bg-primary-container/10 text-primary-container font-code-sm text-xs uppercase flex items-center gap-1.5 rounded-sm">
              <Fingerprint size={13} />
              Step {currentStep} of 2
            </span>
          </div>
          <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed">
            {currentStep === 1
              ? "Find your registered organization to continue employee enrollment."
              : "Complete your personal employee profile and initialize your AI Twin workspace."}
          </p>

          {/* Visual Progress Steps */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-border-tech/60">
            <div
              onClick={() => currentStep === 2 && handleBackToStep1()}
              className={`flex items-center gap-2 p-2 rounded-sm border font-code-sm text-xs transition-colors ${
                currentStep === 1
                  ? "border-primary-container bg-primary-container/10 text-primary-container"
                  : "border-border-tech bg-surface-container-low text-on-surface hover:border-primary-container/50 cursor-pointer"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep === 1
                    ? "bg-primary-container text-black"
                    : "bg-surface-container-high text-primary-container"
                }`}
              >
                1
              </span>
              <span className="truncate">
                {selectedCompany ? `✓ ${selectedCompany.company_name}` : "1. Organization"}
              </span>
            </div>

            <div
              className={`flex items-center gap-2 p-2 rounded-sm border font-code-sm text-xs ${
                currentStep === 2
                  ? "border-primary-container bg-primary-container/10 text-primary-container"
                  : "border-border-tech bg-surface-container-low text-on-surface-variant opacity-60"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep === 2
                    ? "bg-primary-container text-black"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                2
              </span>
              <span className="truncate">2. Employee Info</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && !isSubmittedForApproval && (
        <div className="mb-6 p-4 bg-error-container/20 border border-error-container/60 rounded-sm flex items-start gap-3 text-on-surface animate-fade-in-up">
          <ShieldAlert className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div className="text-xs font-code-sm text-error leading-relaxed">
            <div className="font-bold mb-0.5">Registration Alert</div>
            {errorMessage}
            {errorMessage.toLowerCase().includes("already exists") && (
              <div className="mt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-[11px] text-primary-container hover:underline font-bold"
                >
                  Log in to your existing account <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: PENDING APPROVAL CONFIRMATION ── */}
      {isSubmittedForApproval && (
        <div className="space-y-6 text-center animate-fade-in-up py-4">
          <div className="w-16 h-16 rounded-full border border-primary-container bg-primary-container/10 text-primary-container flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(0,255,65,0.2)]">
            <CheckCircle2 size={32} className="animate-pulse" />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 border border-primary-container/40 bg-primary-container/10 text-primary-container font-code-sm text-xs uppercase mb-3">
              <span className="w-2 h-2 rounded-full bg-primary-container animate-ping" />
              <span>Status: Request Sent // Pending Approval</span>
            </div>
            <h2 className="font-display-xl text-2xl text-on-surface">
              Request Sent to Organization for Approval
            </h2>
            <p className="font-code-sm text-xs text-on-surface-variant max-w-md mx-auto mt-2 leading-relaxed">
              Your employee registration request has been submitted to the administrator of{" "}
              <span className="text-primary-container font-semibold">{selectedCompany?.company_name}</span>.
            </p>
          </div>

          {/* Submission Details Summary Box */}
          <div className="p-4 bg-surface-container-high border border-border-tech text-left font-code-sm text-xs space-y-2 rounded-sm max-w-md mx-auto">
            <div className="flex justify-between border-b border-border-tech pb-2">
              <span className="text-on-surface-variant">Organization:</span>
              <span className="text-on-surface font-semibold">{selectedCompany?.company_name}</span>
            </div>
            <div className="flex justify-between border-b border-border-tech pb-2">
              <span className="text-on-surface-variant">Full Name:</span>
              <span className="text-on-surface">{fullName}</span>
            </div>
            <div className="flex justify-between border-b border-border-tech pb-2">
              <span className="text-on-surface-variant">Work Email:</span>
              <span className="text-on-surface">{email}</span>
            </div>
            {department && (
              <div className="flex justify-between border-b border-border-tech pb-2">
                <span className="text-on-surface-variant">Department:</span>
                <span className="text-on-surface">{department}</span>
              </div>
            )}
            <div className="flex justify-between pt-1">
              <span className="text-on-surface-variant">Access Status:</span>
              <span className="text-primary-container font-bold">Awaiting Org Admin Approval</span>
            </div>
          </div>

          {/* Help Note */}
          <div className="p-3 border border-border-tech bg-surface-container-low text-on-surface-variant text-xs font-code-sm max-w-md mx-auto rounded-sm">
            Once approved by your company administrator, you can log in with your email and password to access your Digital Twin workspace.
          </div>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/login"
              className="btn-primary px-6 py-3 font-code-sm text-xs tracking-wider uppercase font-bold flex items-center gap-2"
            >
              <span>Return to Employee Login</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/"
              className="px-6 py-3 border border-border-tech hover:border-border-tech/80 bg-surface-layer text-on-surface font-code-sm text-xs tracking-wider uppercase"
            >
              Home Page
            </Link>
          </div>
        </div>
      )}

      {/* ── STEP 1: ORGANIZATION DISCOVERY ── */}
      {!isSubmittedForApproval && currentStep === 1 && (
        <div className="space-y-6">
          {/* Instructions Box */}
          <div className="p-3.5 bg-surface-container-low border border-border-tech rounded-sm flex items-start gap-2.5">
            <Building2 size={16} className="text-primary-container shrink-0 mt-0.5" />
            <div className="text-xs font-code-sm text-on-surface-variant leading-relaxed">
              <span className="text-on-surface font-semibold">Identify your company:</span> Search by name or domain
              to link your employee account to an existing registered organization.
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name (e.g. Acme, Horizon, Tech)..."
              className="w-full bg-surface-container-low border border-border-tech pl-10 pr-10 py-3 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-on-surface-variant hover:text-on-surface"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Organization Directory List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-code-sm text-on-surface-variant px-1">
              <span>AVAILABLE ORGANIZATIONS</span>
              {isSearching && <span className="text-primary-container animate-pulse">Searching...</span>}
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scroll-hidden">
              {companies.map((company) => {
                const isSelected = selectedCompany?.id === company.id;
                return (
                  <div
                    key={company.id}
                    onClick={() => handleSelectCompany(company)}
                    className={`p-3.5 border rounded-sm cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-primary-container bg-primary-container/10 shadow-[0_0_12px_rgba(0,255,65,0.15)]"
                        : "border-border-tech bg-surface-container-low hover:border-border-tech/80 hover:bg-surface-container-high"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 border rounded-sm mt-0.5 ${
                          isSelected
                            ? "border-primary-container/40 bg-primary-container/20 text-primary-container"
                            : "border-border-tech bg-surface-layer text-on-surface-variant"
                        }`}
                      >
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div className="font-code-sm text-sm font-semibold text-on-surface">
                          {company.company_name}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] font-code-sm text-on-surface-variant mt-0.5">
                          {company.industry && (
                            <span className="flex items-center gap-1">
                              <Briefcase size={11} /> {company.industry}
                            </span>
                          )}
                          {(company.city || company.country) && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} /> {[company.city, company.country].filter(Boolean).join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-primary-container font-code-sm text-xs font-bold">
                          <CheckCircle2 size={16} />
                          <span>Selected</span>
                        </div>
                      ) : (
                        <span className="text-xs font-code-sm text-on-surface-variant hover:text-on-surface">
                          Select →
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Exact Missing Organization Block */}
              {companies.length === 0 && hasSearched && !isSearching && (
                <div className="p-5 border border-border-tech bg-surface-container-low text-center rounded-sm space-y-3">
                  <div className="w-10 h-10 border border-amber-500/40 bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto rounded-full">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <div className="font-code-sm text-sm text-on-surface font-bold">
                      The given company does not exist yet.
                    </div>
                    <p className="font-code-sm text-xs text-on-surface-variant mt-1 max-w-md mx-auto leading-relaxed">
                      The company should first register themselves, so please ask them to register first.
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href="http://localhost:3000/register"
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-primary-container/40 bg-primary-container/10 text-primary-container text-xs font-code-sm hover:bg-primary-container/20 transition-colors rounded-sm"
                    >
                      <span>Go to Company Registration (Port 3000)</span>
                      <ArrowRight size={13} />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Continue Action */}
          {selectedCompany && (
            <div className="pt-4 border-t border-border-tech flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-code-sm">
                <div className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                  Organization Selected:
                </div>
                <div className="font-code-sm text-sm font-bold text-primary-container">
                  {selectedCompany.company_name}
                </div>
              </div>
              <button
                type="button"
                onClick={handleProceedToStep2}
                className="w-full sm:w-auto px-5 py-2.5 btn-primary flex items-center justify-center gap-2 text-xs group"
              >
                <span>Continue to Account Details</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: EMPLOYEE ACCOUNT DETAILS ── */}
      {!isSubmittedForApproval && currentStep === 2 && selectedCompany && (
        <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up">
          {/* Read-Only Organization Badge */}
          <div className="p-3.5 bg-surface-container-high border border-border-tech rounded-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-primary-container/20 border border-primary-container/40 text-primary-container rounded-sm">
                <Building2 size={16} />
              </div>
              <div>
                <div className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                  Organization (Read-Only)
                </div>
                <div className="font-code-sm text-sm font-bold text-on-surface">
                  {selectedCompany.company_name}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBackToStep1}
              className="text-xs font-code-sm text-primary-container hover:underline flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Change
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Full Name <span className="text-primary-container">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <User size={15} />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rohan Mehta"
                  className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Work / Personal Email */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Work Email <span className="text-primary-container">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rohan@company.ai"
                  className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Employee ID */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Employee ID (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <BadgeCheck size={15} />
                </div>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="EMP-1042"
                  className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Department (Optional)
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Engineering / Product"
                className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>

            {/* Job Title */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Job Title (Optional)
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Software Engineer"
                className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Phone (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Phone size={15} />
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

            {/* Password */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Password <span className="text-primary-container">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Lock size={15} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-surface-container-low border border-border-tech pl-9 pr-10 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="font-code-sm text-[10px] text-on-surface-variant mt-1">
                Min 8 characters, with 1 uppercase letter and 1 digit.
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Confirm Password <span className="text-primary-container">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Lock size={15} />
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface"
                >
                  {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-border-tech flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBackToStep1}
              className="text-xs font-code-sm text-on-surface-variant hover:text-on-surface flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Back to organization selection
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto px-6 py-3 btn-primary flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-bold group cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  Transmitting Request...
                </span>
              ) : (
                <>
                  <span>Create Employee Account</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Footer Switcher */}
      {!isSubmittedForApproval && (
        <div className="text-center pt-6 border-t border-border-tech/40 mt-8">
          <p className="font-sans text-xs text-on-surface-variant">
            Already have an active account?{" "}
            <Link
              href="/login"
              className="text-primary-container hover:underline font-code-sm font-semibold transition-colors"
            >
              Sign In to Employee Portal →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

export default function EmployeeRegisterPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Cybernetic Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(#00ff41_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-container/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <div className="relative z-10 w-full max-w-2xl mb-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-on-surface hover:text-primary-container transition-colors">
          <div className="w-7 h-7 bg-primary-container flex items-center justify-center text-surface font-bold text-sm">
            T
          </div>
          <span className="font-mono text-sm tracking-wider font-bold">TWIN AGENT // EMPLOYEE</span>
        </Link>
        <Link
          href="/login"
          className="font-code-sm text-xs text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Existing Employee? <span className="text-primary-container">Login</span>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-2xl glass-panel p-10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <EmployeeRegisterForm />
      </Suspense>
    </div>
  );
}
