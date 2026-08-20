"use client";

import { useState, Suspense, useMemo } from "react";
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
  AlertTriangle,
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

const SIZE_RANGES: Record<string, { min: number; max: number; label: string }> = {
  "1-10": { min: 1, max: 10, label: "1 to 10" },
  "11-50": { min: 11, max: 50, label: "11 to 50" },
  "51-200": { min: 51, max: 200, label: "51 to 200" },
  "201-500": { min: 201, max: 500, label: "201 to 500" },
  "501-1000": { min: 501, max: 1000, label: "501 to 1000" },
  "1000+": { min: 1000, max: 1000000, label: "at least 1000" },
};

function RegisterForm() {
  const router = useRouter();

  // Company Information state (All initialized empty as requested)
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [industry, setIndustry] = useState("Technology");
  const [companySize, setCompanySize] = useState("51-200");
  const [employeeCount, setEmployeeCount] = useState<number | "">("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [businessModel, setBusinessModel] = useState("");
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

  // Live Company Size & Employee Count mismatch check
  const sizeValidation = useMemo(() => {
    if (employeeCount === "") return { isValid: true, message: null };
    const range = SIZE_RANGES[companySize];
    if (!range) return { isValid: true, message: null };

    const count = Number(employeeCount);
    if (count < range.min || count > range.max) {
      return {
        isValid: false,
        message: `Employee count (${count}) does not match the selected company size (${companySize}). Expected ${range.label} employees.`,
      };
    }
    return { isValid: true, message: null };
  }, [companySize, employeeCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Strict validation for ALL mandatory fields
    if (!companyName.trim()) {
      setErrorMessage("Company Name is required.");
      return;
    }
    if (!companyEmail.trim()) {
      setErrorMessage("Company Email is required.");
      return;
    }
    if (employeeCount === "" || typeof employeeCount !== "number" || employeeCount <= 0) {
      setErrorMessage("Employee Count is required and must be a positive number.");
      return;
    }
    if (!sizeValidation.isValid && sizeValidation.message) {
      setErrorMessage(sizeValidation.message);
      return;
    }
    if (!companyPhone.trim()) {
      setErrorMessage("Company Phone is required.");
      return;
    }
    if (!website.trim()) {
      setErrorMessage("Company Website URL is required.");
      return;
    }
    if (!country.trim()) {
      setErrorMessage("Country is required.");
      return;
    }
    if (!city.trim()) {
      setErrorMessage("City / Location is required.");
      return;
    }
    if (!businessModel.trim()) {
      setErrorMessage("Business Model is required.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Company Description is required.");
      return;
    }
    if (!adminName.trim()) {
      setErrorMessage("Administrator Full Name is required.");
      return;
    }
    if (!adminEmail.trim()) {
      setErrorMessage("Administrator Work Email is required.");
      return;
    }
    if (!adminPhone.trim()) {
      setErrorMessage("Administrator Direct Phone is required.");
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
      company_phone: companyPhone.trim(),
      website: website.trim(),
      country: country.trim(),
      city: city.trim(),
      business_model: businessModel.trim(),
      description: description.trim(),
      admin_name: adminName.trim(),
      admin_email: adminEmail.trim(),
      admin_phone: adminPhone.trim(),
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
            Company Portal
          </span>
        </div>
        <p className="font-sans text-sm text-on-surface-variant leading-relaxed">
          Create your corporate tenant, onboard your primary administrator, and establish your digital twin command center.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-4 border border-error bg-error-container/20 text-on-error-container flex items-start gap-3 rounded-sm animate-fade-in">
          <ShieldAlert size={18} className="text-error shrink-0 mt-0.5" />
          <div className="flex-1 text-xs font-code-sm leading-relaxed">
            <span className="font-bold block mb-0.5">Registration Failed</span>
            {errorMessage}
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
                  placeholder="e.g. 120"
                  className={`w-full bg-surface-container-low border px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:outline-none transition-colors ${
                    !sizeValidation.isValid && employeeCount !== ""
                      ? "border-red-500 bg-red-950/20 text-red-200 focus:border-red-400"
                      : "border-border-tech focus:border-primary-container"
                  }`}
                />
              </div>
            </div>

            {/* Live Size Range Warning */}
            {!sizeValidation.isValid && sizeValidation.message && (
              <div className="sm:col-span-2 p-2.5 border border-red-500/50 bg-red-950/30 text-red-300 text-xs font-code-sm flex items-center gap-2 rounded-sm animate-fade-in">
                <AlertTriangle size={15} className="text-red-400 shrink-0" />
                <span>{sizeValidation.message}</span>
              </div>
            )}

            {/* Company Phone */}
            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Company Phone <span className="text-primary-container">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Phone size={15} />
                </div>
                <input
                  type="tel"
                  required
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
                Website <span className="text-primary-container">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Globe size={15} />
                </div>
                <input
                  type="url"
                  required
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
                Country <span className="text-primary-container">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <MapPin size={15} />
                </div>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="United States"
                  className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                City / Location <span className="text-primary-container">*</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="San Francisco, CA"
                className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>

            {/* Business Model */}
            <div className="sm:col-span-2">
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Business Model <span className="text-primary-container">*</span>
              </label>
              <input
                type="text"
                required
                value={businessModel}
                onChange={(e) => setBusinessModel(e.target.value)}
                placeholder="e.g. B2B Enterprise SaaS, AI Services, FinTech"
                className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
                Company Description <span className="text-primary-container">*</span>
              </label>
              <textarea
                rows={2}
                required
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
                Admin Direct Phone <span className="text-primary-container">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                  <Phone size={15} />
                </div>
                <input
                  type="tel"
                  required
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
                  placeholder="Min 8 chars (1 uppercase, 1 digit)"
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
                  placeholder="Repeat your password"
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
        </div>

        {/* Submit CTA */}
        <div className="pt-4 border-t border-border-tech">
          <button
            type="submit"
            disabled={isLoading || (!sizeValidation.isValid && employeeCount !== "")}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 font-label-caps text-xs tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                Registering Organization...
              </span>
            ) : (
              <>
                <span>Complete Company Registration</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>

        {/* Footer Switcher */}
        <div className="text-center pt-2">
          <p className="font-sans text-xs text-on-surface-variant">
            Already registered your company?{" "}
            <Link
              href="/login"
              className="text-primary-container hover:underline font-code-sm font-semibold transition-colors"
            >
              Sign In to Company Portal →
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default function CompanyRegisterPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute inset-0 bg-[radial-gradient(#00ff41_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-container/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <div className="relative z-10 w-full max-w-3xl mb-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-on-surface hover:text-primary-container transition-colors">
          <div className="w-7 h-7 bg-primary-container flex items-center justify-center text-surface font-bold text-sm">
            T
          </div>
          <span className="font-mono text-sm tracking-wider font-bold">TWIN AGENT // COMPANY</span>
        </Link>
        <Link
          href="/login"
          className="font-code-sm text-xs text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Existing Organization? <span className="text-primary-container">Login</span>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="w-full max-w-3xl glass-panel p-10 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
