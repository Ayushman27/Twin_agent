"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authService, CompanyRegisterPayload } from "@shared/services/auth.service";
import {
  Building2,
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Globe,
  Phone,
  MapPin,
  FileText,
} from "lucide-react";

const INDUSTRY_OPTIONS = [
  "Technology",
  "Finance & Banking",
  "Healthcare & Life Sciences",
  "Manufacturing",
  "Retail & E-commerce",
  "Education",
  "Consulting & Professional Services",
  "Telecommunications",
  "Energy & Utilities",
  "Other",
];

const SIZE_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

function RegisterForm() {
  const router = useRouter();

  // Company Information state
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [companySize, setCompanySize] = useState("51-200");
  const [employeeCount, setEmployeeCount] = useState<number | "">(50);
  const [companyPhone, setCompanyPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [businessModel, setBusinessModel] = useState("B2B SaaS");
  const [description, setDescription] = useState("");

  // Administrator Information state
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client validation checks
    if (!companyName.trim()) {
      setErrorMessage("Company Name is required.");
      return;
    }
    if (!companyEmail.trim()) {
      setErrorMessage("Company Email is required.");
      return;
    }
    if (typeof employeeCount !== "number" || employeeCount <= 0) {
      setErrorMessage("Employee Count must be a positive integer.");
      return;
    }
    if (!adminName.trim()) {
      setErrorMessage("Administrator Full Name is required.");
      return;
    }
    if (!adminEmail.trim()) {
      setErrorMessage("Administrator Email is required.");
      return;
    }
    if (adminPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(adminPassword)) {
      setErrorMessage("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(adminPassword)) {
      setErrorMessage("Password must contain at least one digit.");
      return;
    }
    if (adminPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please verify your confirm password field.");
      return;
    }

    setIsLoading(true);

    const payload: CompanyRegisterPayload = {
      company_name: companyName.trim(),
      company_email: companyEmail.trim(),
      industry,
      company_size: companySize,
      employee_count: Number(employeeCount),
      company_phone: companyPhone.trim() || undefined,
      website: website.trim() || undefined,
      country: country.trim() || undefined,
      city: city.trim() || undefined,
      business_model: businessModel.trim() || undefined,
      description: description.trim() || undefined,
      admin_name: adminName.trim(),
      admin_email: adminEmail.trim(),
      admin_phone: adminPhone.trim() || undefined,
      admin_password: adminPassword,
      confirm_password: confirmPassword,
    };

    try {
      await authService.registerCompany(payload);
      // Successful registration sets session & cookie -> route directly to Company Dashboard
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
    <div className="relative z-10 w-full max-w-3xl glass-panel p-6 sm:p-10 border border-border-tech shadow-2xl animate-fade-in-up my-8">
      {/* Header */}
      <div className="mb-8 border-b border-border-tech pb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display-xl text-2xl sm:text-3xl text-on-surface tracking-tight">
            Register Your Organization
          </h1>
          <span className="px-2.5 py-1 border border-primary-container/30 bg-primary-container/10 text-primary-container font-code-sm text-xs uppercase flex items-center gap-1.5 rounded-sm">
            <Building2 size={13} />
            New Tenant
          </span>
        </div>
        <p className="font-code-sm text-xs text-on-surface-variant leading-relaxed">
          Create your organization&apos;s AI Twin platform account. This will provision your company workspace and configure your primary Organization Administrator profile.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-error-container/20 border border-error-container/60 rounded-sm flex items-start gap-3 text-on-surface animate-fade-in-up">
          <ShieldAlert className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div className="text-xs font-code-sm text-error leading-relaxed">
            <div className="font-bold mb-1">Registration Error</div>
            {errorMessage}
            {errorMessage.toLowerCase().includes("already registered") && (
              <div className="mt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-[11px] text-primary-container hover:underline font-bold"
                >
                  Log in with existing administrator account <ArrowRight size={12} />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── SECTION A: COMPANY INFORMATION ── */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border-tech">
            <Building2 size={16} className="text-primary-container" />
            <h2 className="font-label-caps text-xs text-on-surface uppercase tracking-wider font-bold">
              Section A — Company Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Company Name <span className="text-primary-container">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Artificial Intelligence Inc."
                className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>

            {/* Company Email */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Company Email <span className="text-primary-container">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  required
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="contact@acme.ai"
                  className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Industry */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Industry <span className="text-primary-container">*</span>
              </label>
              <select
                required
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
              >
                {INDUSTRY_OPTIONS.map((ind) => (
                  <option key={ind} value={ind} className="bg-surface-dim text-on-surface">
                    {ind}
                  </option>
                ))}
              </select>
            </div>

            {/* Company Size & Employee Count */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                  Company Size <span className="text-primary-container">*</span>
                </label>
                <select
                  required
                  value={companySize}
                  onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
                >
                  {SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size} className="bg-surface-dim text-on-surface">
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                  Employees <span className="text-primary-container">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value === "" ? "" : parseInt(e.target.value))}
                  placeholder="50"
                  className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Company Phone */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Company Phone (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Phone size={15} />
                </div>
                <input
                  type="tel"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Website (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Globe size={15} />
                </div>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://acme.ai"
                  className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Country & City */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Country (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <MapPin size={15} />
                </div>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                  className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                City / Location (Optional)
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>

            {/* Business Model */}
            <div className="sm:col-span-2">
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Business Model (Optional)
              </label>
              <input
                type="text"
                value={businessModel}
                onChange={(e) => setBusinessModel(e.target.value)}
                placeholder="e.g. B2B Enterprise SaaS, AI Services"
                className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Company Description (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe your company's core mission and workflow domains..."
                className="w-full bg-surface-container-low border border-border-tech p-3 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── SECTION B: ORGANIZATION ADMINISTRATOR ── */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border-tech">
            <Shield size={16} className="text-primary-container" />
            <h2 className="font-label-caps text-xs text-on-surface uppercase tracking-wider font-bold">
              Section B — Organization Administrator
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Admin Name */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Administrator Full Name <span className="text-primary-container">*</span>
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Asha Verma"
                className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>

            {/* Admin Email */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Admin Work Email <span className="text-primary-container">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@acme.ai"
                  className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Admin Phone */}
            <div className="sm:col-span-2">
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Admin Direct Phone (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Phone size={15} />
                </div>
                <input
                  type="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
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
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
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
              {confirmPassword && confirmPassword !== adminPassword && (
                <p className="font-code-sm text-[10px] text-error mt-1">
                  Passwords do not match
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── SUBMIT BUTTON & FOOTER ── */}
        <div className="pt-4 border-t border-border-tech">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>PROVISIONING ORGANIZATION &amp; ADMIN ACCOUNT...</span>
              </>
            ) : (
              <>
                <span>REGISTER &amp; INITIALIZE ORGANIZATION</span>
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>

          <div className="mt-4 text-center">
            <p className="font-code-sm text-xs text-on-surface-variant">
              Already registered?{" "}
              <Link href="/login" className="text-primary-container hover:underline font-bold">
                Log in to existing company account →
              </Link>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-layer relative px-4 py-12 overflow-x-hidden">
      {/* Background grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none fixed" />

      {/* Top Header Badge */}
      <div className="z-10 mb-2 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
        <span className="font-label-caps text-xs text-primary-container tracking-widest uppercase">
          TWIN AGENT // COMPANY ONBOARDING (PORT 3000)
        </span>
        <span className="text-border-tech">|</span>
        <span className="font-code-sm text-[11px] text-on-surface-variant">
          TENANT PROVISIONING
        </span>
      </div>

      <Suspense fallback={<div className="font-code-sm text-xs text-on-surface-variant">Loading registration form...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
