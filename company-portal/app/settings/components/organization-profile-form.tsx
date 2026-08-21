"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { organizationService, OrganizationDetails, OrganizationUpdatePayload } from "@shared/services/organization.service";
import { LoadingState } from "@shared/components/status/loading-state";
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Briefcase,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  Upload,
  Trash2,
  Lock,
  Linkedin,
  FileText,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1-10 employees", min: 1, max: 10 },
  { value: "11-50", label: "11-50 employees", min: 11, max: 50 },
  { value: "51-200", label: "51-200 employees", min: 51, max: 200 },
  { value: "201-500", label: "201-500 employees", min: 201, max: 500 },
  { value: "501-1000", label: "501-1000 employees", min: 501, max: 1000 },
  { value: "1000+", label: "1000+ employees", min: 1001, max: 1000000 },
];

const INDUSTRY_OPTIONS = [
  "Artificial Intelligence & Machine Learning",
  "Software & Cloud Services (SaaS)",
  "FinTech & Banking",
  "HealthTech & Life Sciences",
  "CyberSecurity & Infrastructure",
  "E-Commerce & Retail",
  "Manufacturing & Robotics",
  "Consulting & Professional Services",
  "Telecommunications",
  "Energy & CleanTech",
  "Other",
];

const COMPANY_TYPE_OPTIONS = [
  "Corporation (Inc. / Corp.)",
  "Private Limited Company (Pvt. Ltd.)",
  "Limited Liability Company (LLC)",
  "Public Limited Company (PLC)",
  "Partnership / LLP",
  "Non-Profit Organization",
  "Sole Proprietorship",
];

const BUSINESS_MODEL_OPTIONS = [
  "B2B Enterprise SaaS",
  "B2B AI Agent Infrastructure",
  "B2B & B2C Marketplace",
  "Custom AI Solutions & Workflows",
  "Open Core & Enterprise Support",
  "Hybrid Direct Sales",
];

export function OrganizationProfileForm() {
  const { user } = useAuth();
  const orgId = user?.organization_id || user?.organizationId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial & Form State
  const [initialData, setInitialData] = useState<OrganizationDetails | null>(null);
  const [registeredCount, setRegisteredCount] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Status Banners
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subsection 1: Company Identity
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [companyType, setCompanyType] = useState("Corporation (Inc. / Corp.)");
  const [industry, setIndustry] = useState("Artificial Intelligence & Machine Learning");
  const [description, setDescription] = useState("");
  const [foundedYear, setFoundedYear] = useState<string>("2024");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Subsection 2: Company Contact
  const [companyEmail, setCompanyEmail] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [website, setWebsite] = useState("");

  // Subsection 3: Location
  const [country, setCountry] = useState("");
  const [stateProvince, setStateProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Subsection 4: Business Information
  const [businessModel, setBusinessModel] = useState("B2B Enterprise SaaS");
  const [primaryProducts, setPrimaryProducts] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  // Subsection 5: Organization Size
  const [companySize, setCompanySize] = useState("11-50");
  const [employeeCount, setEmployeeCount] = useState<string>("25");

  // Load Organization Data
  const loadOrganization = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch organization details
      const org = await organizationService.getOrganization(orgId);
      setInitialData(org);

      // Populate form fields
      setCompanyName(org.company_name || "");
      setLegalName(org.legal_name || org.company_name || "");
      setRegistrationNumber(org.registration_number || "REG-" + (org.id?.slice(0, 8) || "1042").toUpperCase());
      setCompanyType(org.company_type || "Corporation (Inc. / Corp.)");
      setIndustry(org.industry || "Artificial Intelligence & Machine Learning");
      setDescription(org.description || "");
      setFoundedYear(org.founded_year ? String(org.founded_year) : "2024");
      setLogoUrl(org.logo_url || null);

      setCompanyEmail(org.company_email || "");
      setSupportEmail(org.support_email || (org.company_email ? `support@${org.company_email.split("@")[1] || "company.ai"}` : ""));
      setCompanyPhone(org.company_phone || "");
      setAlternatePhone(org.alternate_phone || "");
      setWebsite(org.website || "");

      setCountry(org.country || "United States");
      setStateProvince(org.state || "California");
      setCity(org.city || "San Francisco");
      setAddress(org.address || "548 Market St, Suite 2901");
      setPostalCode(org.postal_code || "94104");

      setBusinessModel(org.business_model || "B2B Enterprise SaaS");
      setPrimaryProducts(org.primary_products || "AI Digital Twin & Autonomous Agent Workflows");
      setCompanyDomain(org.company_domain || (org.website ? org.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "company.ai"));
      setLinkedinUrl(org.linkedin_url || "https://linkedin.com/company/twinagent");

      setCompanySize(org.company_size || "11-50");
      setEmployeeCount(org.employee_count ? String(org.employee_count) : "25");

      // 2. Fetch live registered count from database stats
      const stats = await organizationService.getStats(orgId);
      setRegisteredCount(stats.total_members || 1);
    } catch (err: unknown) {
      console.error("Failed to load organization profile:", err);
      setErrorMessage("Failed to load organization settings from the server. Please try refreshing.");
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  // Check if form has unsaved modifications
  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    return (
      companyName !== (initialData.company_name || "") ||
      companyEmail !== (initialData.company_email || "") ||
      companyPhone !== (initialData.company_phone || "") ||
      industry !== (initialData.industry || "") ||
      website !== (initialData.website || "") ||
      country !== (initialData.country || "") ||
      city !== (initialData.city || "") ||
      description !== (initialData.description || "") ||
      businessModel !== (initialData.business_model || "") ||
      companySize !== (initialData.company_size || "") ||
      employeeCount !== (initialData.employee_count ? String(initialData.employee_count) : "") ||
      legalName !== (initialData.legal_name || initialData.company_name || "") ||
      logoUrl !== (initialData.logo_url || null)
    );
  }, [
    initialData,
    companyName,
    companyEmail,
    companyPhone,
    industry,
    website,
    country,
    city,
    description,
    businessModel,
    companySize,
    employeeCount,
    legalName,
    logoUrl,
  ]);

  // Size vs Count validation check
  const sizeValidationWarning = useMemo(() => {
    const count = parseInt(employeeCount, 10);
    if (isNaN(count)) return null;
    const tier = COMPANY_SIZE_OPTIONS.find((opt) => opt.value === companySize);
    if (!tier) return null;
    if (count < tier.min || count > tier.max) {
      return `Declared employee count (${count}) is outside selected range "${tier.label}" (${tier.min} - ${tier.max === 1000000 ? "1000+" : tier.max}).`;
    }
    return null;
  }, [companySize, employeeCount]);

  // Handle Logo Upload via Local FileReader
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file (PNG, JPG, SVG, WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMessage("Logo file size exceeds 2MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoUrl(event.target?.result as string);
      setSuccessMessage("Company logo updated in session. Click 'Save Changes' to persist.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Reset form to initial data
  const handleCancel = () => {
    if (!initialData) return;
    setCompanyName(initialData.company_name || "");
    setCompanyEmail(initialData.company_email || "");
    setCompanyPhone(initialData.company_phone || "");
    setIndustry(initialData.industry || "Artificial Intelligence & Machine Learning");
    setWebsite(initialData.website || "");
    setCountry(initialData.country || "");
    setCity(initialData.city || "");
    setDescription(initialData.description || "");
    setBusinessModel(initialData.business_model || "");
    setCompanySize(initialData.company_size || "11-50");
    setEmployeeCount(initialData.employee_count ? String(initialData.employee_count) : "");
    setLogoUrl(initialData.logo_url || null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Submit Changes to FastAPI Backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!orgId) {
      setErrorMessage("Missing organization identifier. Please re-authenticate.");
      return;
    }

    if (!companyName.trim()) {
      setErrorMessage("Company Name is a required field.");
      return;
    }

    if (!companyEmail.trim()) {
      setErrorMessage("Official Company Email is a required field.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyEmail.trim())) {
      setErrorMessage("Please provide a valid official company email address.");
      return;
    }

    if (supportEmail && !emailRegex.test(supportEmail.trim())) {
      setErrorMessage("Support Email format is invalid.");
      return;
    }

    if (website && !/^https?:\/\//i.test(website.trim())) {
      setErrorMessage("Website URL must start with http:// or https://");
      return;
    }

    const parsedCount = parseInt(employeeCount, 10);
    if (isNaN(parsedCount) || parsedCount < 1) {
      setErrorMessage("Declared employee count must be a positive integer.");
      return;
    }

    if (sizeValidationWarning) {
      setErrorMessage(sizeValidationWarning);
      return;
    }

    setIsSaving(true);

    const payload: OrganizationUpdatePayload = {
      company_name: companyName.trim(),
      company_email: companyEmail.trim().toLowerCase(),
      company_phone: companyPhone.trim() || undefined,
      industry: industry,
      company_size: companySize,
      employee_count: parsedCount,
      website: website.trim() || undefined,
      country: country.trim() || undefined,
      city: city.trim() || undefined,
      description: description.trim() || undefined,
      business_model: businessModel,
      primary_contact: user?.name || undefined,
    };

    try {
      const updated = await organizationService.updateOrganization(orgId, payload);
      setInitialData(updated);
      setSuccessMessage("Organization Profile updated successfully in Neon PostgreSQL.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to update organization profile. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingState label="Loading Organization Settings from Neon PostgreSQL..." />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in-up pb-12">
      {/* Alert Messages */}
      {successMessage && (
        <div className="p-4 bg-primary-container/10 border border-primary-container/40 rounded-sm flex items-center justify-between text-primary-container animate-fade-in">
          <div className="flex items-center gap-2.5 text-xs font-code-sm">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 border border-primary-container/30">
            HTTP 200 OK
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-error-container/20 border border-error-container/60 rounded-sm flex items-start gap-2.5 text-error animate-fade-in">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div className="text-xs font-code-sm leading-relaxed">
            <span className="font-bold">Validation Error: </span>
            {errorMessage}
          </div>
        </div>
      )}

      {/* Unsaved Changes Banner */}
      {hasChanges && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/40 rounded-sm flex items-center justify-between text-amber-300 font-code-sm text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>You have unsaved changes to this organization profile.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-2.5 py-1 border border-border-tech bg-surface-layer hover:bg-surface-container text-on-surface text-[11px] rounded-sm transition-colors"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-3 py-1 bg-primary-container text-black font-bold text-[11px] rounded-sm hover:bg-primary-fixed-dim transition-colors flex items-center gap-1"
            >
              <Save size={12} />
              Save Now
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUBSECTION 1 — COMPANY IDENTITY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Building2 size={16} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Subsection 1 — Company Identity
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Core corporate brand, registration credentials, and organizational persona.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Identity Node
          </span>
        </div>

        {/* Company Logo Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 bg-surface-layer border border-border-tech rounded-sm">
          <div className="relative">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Company Logo Preview"
                className="w-16 h-16 rounded-sm border border-primary-container/40 object-cover shadow-[0_0_10px_rgba(0,255,65,0.15)]"
              />
            ) : (
              <div className="w-16 h-16 rounded-sm border border-primary-container/40 bg-primary-container/10 text-primary-container flex items-center justify-center font-mono font-bold text-xl shadow-[0_0_10px_rgba(0,255,65,0.15)]">
                {companyName ? companyName.charAt(0).toUpperCase() : "T"}
              </div>
            )}
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="font-code-sm text-xs font-semibold text-on-surface">
              Company Logo &amp; Avatar
            </div>
            <p className="font-code-sm text-[11px] text-on-surface-variant max-w-md">
              PNG, JPG, SVG or WebP format up to 2MB. Displayed across Company &amp; Employee portals.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 border border-border-tech hover:border-primary-container bg-surface-container-high text-on-surface font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload size={13} />
                <span>Change Logo</span>
              </button>
              {logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-3 py-1.5 border border-border-tech hover:border-red-500/50 bg-surface-container-high text-on-surface hover:text-red-400 font-code-sm text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Identity Inputs Grid */}
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
              placeholder="e.g. Twin Agent Technologies Inc."
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* Legal Company Name */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Legal Company Name
            </label>
            <input
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="e.g. Twin Agent Technologies Incorporated"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* Company Registration Number */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Registration / CIN Number
            </label>
            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              placeholder="e.g. US-EIN-94302914"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* Company Type */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Company Entity Type
            </label>
            <select
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            >
              {COMPANY_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type} className="bg-surface text-on-surface">
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Industry */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Industry Domain <span className="text-primary-container">*</span>
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            >
              {INDUSTRY_OPTIONS.map((ind) => (
                <option key={ind} value={ind} className="bg-surface text-on-surface">
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Founded Year */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Founded Year
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Calendar size={14} />
              </div>
              <input
                type="number"
                min="1800"
                max="2100"
                value={foundedYear}
                onChange={(e) => setFoundedYear(e.target.value)}
                placeholder="2024"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Company Description */}
        <div>
          <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
            Company Bio &amp; Autonomous Mission
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your corporate mission, digital twin deployment scope, and engineering objectives..."
            className="w-full bg-surface-container-low border border-border-tech p-3 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors resize-y"
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUBSECTION 2 — COMPANY CONTACT */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Mail size={16} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Subsection 2 — Company Contact
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Official communication channels, support routing, and web endpoints.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Channels
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Official Email */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Official Company Email <span className="text-primary-container">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Mail size={14} />
              </div>
              <input
                type="email"
                required
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                placeholder="admin@company.ai"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Support Email */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Support / IT Helpdesk Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Mail size={14} />
              </div>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@company.ai"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Primary Phone */}
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
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Alternate Phone */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Alternate / Emergency Line
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Phone size={14} />
              </div>
              <input
                type="tel"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                placeholder="+1 (555) 019-9999"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Website */}
          <div className="sm:col-span-2">
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Official Website
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Globe size={14} />
              </div>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://company.ai"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUBSECTION 3 — LOCATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <MapPin size={16} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Subsection 3 — Location
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Corporate headquarters and geographic governance region.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Headquarters
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Country */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. United States"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* State / Province */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              State / Province
            </label>
            <input
              type="text"
              value={stateProvince}
              onChange={(e) => setStateProvince(e.target.value)}
              placeholder="e.g. California"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* City */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. San Francisco"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* Street Address */}
          <div className="sm:col-span-2">
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 548 Market St, Suite 2901"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* Postal / ZIP */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Postal / ZIP Code
            </label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="e.g. 94104"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUBSECTION 4 — BUSINESS INFORMATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Briefcase size={16} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Subsection 4 — Business Information
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Operational model, commercial offerings, and social footprint.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Operations
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Business Model */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Business Model
            </label>
            <select
              value={businessModel}
              onChange={(e) => setBusinessModel(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            >
              {BUSINESS_MODEL_OPTIONS.map((model) => (
                <option key={model} value={model} className="bg-surface text-on-surface">
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* Primary Products / Services */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Primary Products / Services
            </label>
            <input
              type="text"
              value={primaryProducts}
              onChange={(e) => setPrimaryProducts(e.target.value)}
              placeholder="e.g. Autonomous AI Agents, Digital Twins"
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>

          {/* Company Domain */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Company Domain
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Globe size={14} />
              </div>
              <input
                type="text"
                value={companyDomain}
                onChange={(e) => setCompanyDomain(e.target.value)}
                placeholder="company.ai"
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* LinkedIn URL */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              LinkedIn Company URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
                <Linkedin size={14} />
              </div>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/company/..."
                className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SUBSECTION 5 — ORGANIZATION SIZE */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-6 bg-surface-container-low border border-border-tech rounded-sm space-y-6">
        <div className="border-b border-border-tech pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 border border-primary-container/40 bg-primary-container/10 text-primary-container rounded-sm">
              <Users size={16} />
            </div>
            <div>
              <h2 className="font-label-caps text-xs font-bold text-on-surface uppercase tracking-wider">
                Subsection 5 — Organization Size
              </h2>
              <p className="font-code-sm text-[11px] text-on-surface-variant">
                Declared enterprise capacity vs. live enrolled member database synchronization.
              </p>
            </div>
          </div>
          <span className="font-code-sm text-[10px] text-on-surface-variant uppercase px-2 py-0.5 border border-border-tech">
            Capacity Node
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Company Size Tier */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Company Size Tier <span className="text-primary-container">*</span>
            </label>
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="w-full bg-surface-container-low border border-border-tech px-3 py-2.5 font-code-sm text-sm text-on-surface focus:border-primary-container focus:outline-none transition-colors"
            >
              {COMPANY_SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface text-on-surface">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Declared Employee Count (Editable) */}
          <div>
            <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
              Declared Employee Count <span className="text-primary-container">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={employeeCount}
              onChange={(e) => setEmployeeCount(e.target.value)}
              placeholder="e.g. 25"
              className={`w-full bg-surface-container-low border px-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:outline-none transition-colors ${
                sizeValidationWarning
                  ? "border-red-500/80 focus:border-red-500"
                  : "border-border-tech focus:border-primary-container"
              }`}
            />
            {sizeValidationWarning ? (
              <p className="font-code-sm text-[10px] text-red-400 mt-1">
                {sizeValidationWarning}
              </p>
            ) : (
              <p className="font-code-sm text-[10px] text-on-surface-variant mt-1">
                Capacity declared during organization onboarding.
              </p>
            )}
          </div>

          {/* Registered Employee Count (READ-ONLY) */}
          <div className="p-3 bg-surface-layer border border-border-tech rounded-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-label-caps text-[10px] text-on-surface-variant uppercase">
                  Registered Employee Count
                </span>
                <span className="text-primary-container">
                  <Lock size={12} />
                </span>
              </div>
              <div className="font-display-xl text-xl text-on-surface flex items-baseline gap-1.5">
                <span>{registeredCount}</span>
                <span className="font-code-sm text-[10px] text-primary-container">Active Nodes</span>
              </div>
            </div>
            <div className="font-code-sm text-[10px] text-on-surface-variant mt-2 border-t border-border-tech/40 pt-1.5 flex items-center gap-1">
              <ShieldCheck size={11} className="text-primary-container shrink-0" />
              <span>Calculated from Neon database (Read-Only).</span>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ACTION FOOTER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-surface-container-high border border-border-tech rounded-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-code-sm text-on-surface-variant">
          <Sparkles size={14} className="text-primary-container" />
          <span>Organization updates persist directly to Neon PostgreSQL database.</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleCancel}
            disabled={!hasChanges || isSaving}
            className="w-full sm:w-auto px-4 py-2.5 border border-border-tech hover:border-border-tech/80 bg-surface-layer text-on-surface font-code-sm text-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={13} />
            <span>Cancel</span>
          </button>

          <button
            type="submit"
            disabled={!hasChanges || isSaving || !!sizeValidationWarning}
            className="w-full sm:w-auto px-6 py-2.5 bg-primary-container hover:bg-primary-fixed-dim text-black font-code-sm text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,65,0.2)]"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Saving to Neon...</span>
              </span>
            ) : (
              <>
                <Save size={14} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
