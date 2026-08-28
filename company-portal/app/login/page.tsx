"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authService } from "@shared/services/auth.service";
import { Lock, Mail, Eye, EyeOff, ShieldAlert, ArrowRight, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "employee_forbidden") {
      setErrorMessage(
        "Access Restricted: Employee credentials cannot access the Company Portal. Please use the Employee Portal at http://localhost:3001."
      );
    } else if (err === "unauthorized") {
      setErrorMessage("Please sign in with your administrator credentials to access the Company console.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("Please enter both administrator email and password.");
      return;
    }
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const session = await authService.login({
        email: email.trim(),
        password,
        rememberMe,
      });

      // Role check: Only ORG_ADMIN and SUPER_ADMIN are permitted
      const role = session.user.role;
      if (role !== "ORG_ADMIN" && role !== "SUPER_ADMIN") {
        // Clear invalid session
        authService.logout();
        setErrorMessage(
          `Access Denied: User role "${role}" is not authorized for the Company Portal. Company Portal requires ORG_ADMIN or SUPER_ADMIN.`
        );
        setIsLoading(false);
        return;
      }

      // Successful ORG_ADMIN login -> navigate to /dashboard
      const from = searchParams.get("from");
      router.push(from || "/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected authentication error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-md glass-panel p-6 sm:p-8 border border-border-tech shadow-2xl animate-fade-in-up">
      {/* Card Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-display-xl text-2xl sm:text-3xl text-on-surface tracking-tight">
            Company Login
          </h1>
          <span className="px-2 py-0.5 border border-primary-container/30 bg-primary-container/10 text-primary-container font-code-sm text-[10px] uppercase">
            Admin Access
          </span>
        </div>
        <p className="font-code-sm text-xs text-on-surface-variant">
          Authenticate with your credentials to manage organizations, twin deployments, teams, and corporate governance.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-3.5 bg-error-container/20 border border-error-container/60 rounded-sm flex items-start gap-3 text-on-surface animate-fade-in-up">
          <ShieldAlert className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <div className="text-xs font-code-sm text-error leading-relaxed">
            {errorMessage}
            {errorMessage.includes("http://localhost:3001") && (
              <div className="mt-2">
                <a
                  href="http://localhost:3001"
                  className="inline-flex items-center gap-1 text-[11px] text-primary-container hover:underline font-bold"
                >
                  Open Employee Portal (3001) <ArrowRight size={12} />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <label className="block font-label-caps text-xs text-on-surface-variant mb-1.5 uppercase">
            Company Administrator Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
              <Mail size={16} />
            </div>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter administrator email"
              className="w-full bg-surface-container-low border border-border-tech pl-9 pr-3 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-label-caps text-xs text-on-surface-variant uppercase">
              Password
            </label>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-on-surface-variant">
              <Lock size={16} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-surface-container-low border border-border-tech pl-9 pr-10 py-2.5 font-code-sm text-sm text-on-surface placeholder:text-neutral-600 focus:border-primary-container focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#00ff41] bg-surface-container border-border-tech"
            />
            <span className="font-code-sm text-xs text-on-surface-variant">
              Remember session (30 days)
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !email.trim() || !password}
          className="w-full py-3 mt-2 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>AUTHENTICATING...</span>
            </>
          ) : (
            <>
              <span>SIGN IN TO COMPANY CONSOLE</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Registration CTA */}
      <div className="mt-6 pt-4 border-t border-border-tech text-center">
        <p className="font-code-sm text-xs text-on-surface-variant">
          New to this platform?{" "}
          <Link
            href="/register"
            className="text-primary-container hover:underline font-bold"
          >
            Register your company →
          </Link>
        </p>
      </div>

      {/* Portal Switcher Footer */}
      <div className="mt-3 text-center">
        <p className="font-code-sm text-xs text-on-surface-variant">
          Are you an employee?{" "}
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-container hover:underline font-bold"
          >
            Go to Employee Portal (3001) →
          </a>
        </p>
      </div>
    </div>
  );
}

export default function CompanyLoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-base-layer relative px-4 py-8 overflow-hidden">
      {/* Background grid overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      {/* Top Header Badge */}
      <div className="z-10 mb-6 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-primary-container pulse-green" />
        <span className="font-label-caps text-xs text-primary-container tracking-widest uppercase">
          TWIN AGENT // COMPANY PORTAL (3000)
        </span>
        <span className="text-border-tech">|</span>
        <span className="font-code-sm text-[11px] text-on-surface-variant">
          API: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
        </span>
      </div>

      <Suspense fallback={<div className="font-code-sm text-xs text-on-surface-variant">Loading login interface...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
