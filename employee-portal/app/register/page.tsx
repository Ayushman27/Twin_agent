"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { organizationService } from "@shared/services/organization.service";
import { authService, EmployeeRegisterPayload } from "@shared/services/auth.service";
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

  // Submission / Error State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      await authService.registerEmployee(payload);
      // Automatically authenticated -> route to protected Employee Dashboard
      router.push("/dashboard");
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

      {/* Error Alert */}
      {errorMessage && (
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

      {/* ── STEP 1: ORGANIZATION DISCOVERY ── */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Search Input */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-2 uppercase">
              Search Organization
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search company or organization name..."
                className="w-full bg-surface-container-low border border-border-tech pl-10 pr-10 py-3 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-on-surface-variant hover:text-on-surface"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Results List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-caps text-[11px] text-on-surface-variant uppercase">
                Available Organizations
              </span>
              {isSearching && (
                <span className="font-code-sm text-[10px] text-primary-container flex items-center gap-1">
                  <span className="w-2.5 h-2.5 border border-primary-container border-t-transparent rounded-full animate-spin" />
                  Searching...
                </span>
              )}
            </div>

            {companies.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {companies.map((company) => {
                  const isSelected = selectedCompany?.id === company.id;
                  return (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => handleSelectCompany(company)}
                      className={`w-full text-left p-3.5 rounded-sm border transition-all flex items-center justify-between group ${
                        isSelected
                          ? "bg-primary-container/10 border-primary-container shadow-md"
                          : "bg-surface-container-low border-border-tech hover:border-primary-container/50 hover:bg-surface-container"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-sm border shrink-0 mt-0.5 ${
                            isSelected
                              ? "bg-primary-container text-black border-primary-container"
                              : "bg-surface-dim text-on-surface-variant border-border-tech group-hover:text-primary-container"
                          }`}
                        >
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div
                            className={`font-code-sm text-sm font-semibold transition-colors ${
                              isSelected
                                ? "text-primary-container font-bold"
                                : "text-on-surface group-hover:text-primary-container"
                            }`}
                          >
                            {company.company_name}
                          </div>
                          <div className="flex items-center gap-3 mt-1 font-code-sm text-[11px] text-on-surface-variant">
                            {company.industry && (
                              <span className="flex items-center gap-1">
                                <Briefcase size={11} className="text-on-surface-variant/70" />
                                {company.industry}
                              </span>
                            )}
                            {(company.city || company.country) && (
                              <span className="flex items-center gap-1">
                                <MapPin size={11} className="text-on-surface-variant/70" />
                                {[company.city, company.country].filter(Boolean).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="text-primary-container pr-2">
                          <CheckCircle2 size={18} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty State / Not Found Notice */}
            {!isSearching && hasSearched && companies.length === 0 && (
              <div className="p-5 bg-error-container/10 border border-error-container/50 rounded-sm text-on-surface animate-fade-in-up">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                  <div>
                    <div className="font-code-sm text-sm font-bold text-error mb-1">
                      Company not found
                    </div>
                    <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed">
                      The given company does not exist yet. The company should first register themselves, so please ask them to register first.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Link
                        href="/login"
                        className="px-3 py-1.5 bg-surface-container-high border border-border-tech text-on-surface hover:text-primary-container hover:border-primary-container text-xs font-code-sm transition-colors rounded-sm"
                      >
                        Back to Login
                      </Link>
                      <a
                        href="http://localhost:3000/register"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-code-sm text-primary-container hover:underline flex items-center gap-1 font-bold"
                      >
                        Company Portal Registration (3000) <ArrowRight size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected Organization Continue Button */}
          {selectedCompany && (
            <div className="p-4 bg-surface-container-high border border-border-tech rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in-up">
              <div>
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
      {currentStep === 2 && selectedCompany && (
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
              {confirmPassword && confirmPassword !== password && (
                <p className="font-code-sm text-[10px] text-error mt-1">
                  Passwords do not match
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-border-tech">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>CREATING EMPLOYEE ACCOUNT &amp; INITIALIZING TWIN...</span>
                </>
              ) : (
                <>
                  <span>CREATE EMPLOYEE ACCOUNT</span>
                  <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-border-tech text-center">
        <p className="font-code-sm text-xs text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="text-primary-container hover:underline font-bold">
            Log in to your workspace →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function EmployeeRegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-layer relative px-4 py-12 overflow-x-hidden">
      {/* Background grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none fixed" />

      {/* Top Header Badge */}
      <div className="z-10 mb-2 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
        <span className="font-label-caps text-xs text-primary-container tracking-widest uppercase">
          TWIN AGENT // EMPLOYEE ENROLLMENT (PORT 3001)
        </span>
        <span className="text-border-tech">|</span>
        <span className="font-code-sm text-[11px] text-on-surface-variant">
          TENANT ONBOARDING
        </span>
      </div>

      <Suspense fallback={<div className="font-code-sm text-xs text-on-surface-variant">Loading registration...</div>}>
        <EmployeeRegisterForm />
      </Suspense>
    </div>
  );
}
