"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authService } from "@/services/auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organization: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } =
    useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    setError(null);
    try {
      await authService.login(values);
      window.location.href = "/dashboard";
    } catch (e) {
      setError("Invalid credentials. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="w-full max-w-sm rounded-lg border border-border bg-background p-8">
        <h1 className="text-lg font-semibold mb-1">Twin Agent Platform</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to your organization</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm">Organization (optional)</label>
            <input {...register("organization")} className="w-full mt-1 rounded-md border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input {...register("email")} type="email" className="w-full mt-1 rounded-md border border-border px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm">Password</label>
            <input {...register("password")} type="password" className="w-full mt-1 rounded-md border border-border px-3 py-2 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("rememberMe")} /> Remember me
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button disabled={isSubmitting} className="w-full rounded-md bg-primary text-white py-2 text-sm">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <button type="button" onClick={() => authService.loginWithSSO()}
            className="w-full rounded-md border border-border py-2 text-sm">
            Continue with SSO
          </button>

          <div className="text-center text-sm">
            <a href="/login/forgot-password" className="text-primary">Forgot password?</a>
          </div>
        </form>
      </div>
    </div>
  );
}
