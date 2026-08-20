"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  User,
  CreditCard,
  Briefcase,
  Share2,
  Bot,
  Terminal,
  Settings,
  Rocket,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Building2,
  Lock,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function CompanyLandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  return (
    <div className="min-h-screen bg-[#050806] text-[#e5e2e1] font-sans relative overflow-x-hidden selection:bg-[#00ff41] selection:text-[#050505]">
      {/* ── Cursor Glow ── */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(0,255,65,0.06), transparent 40%)`
        }}
      />

      {/* ── Fluid Dotted Moving Structure ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-70">
        {/* Layer 1: Slow counter-clockwise rotation */}
        <div className="absolute -inset-[100%] bg-[radial-gradient(circle,#00ff4188_2px,transparent_2px)] bg-[size:50px_50px] animate-[spin_90s_linear_infinite_reverse] origin-center" />
        {/* Layer 2: Slow clockwise rotation with larger dots */}
        <div className="absolute -inset-[100%] bg-[radial-gradient(circle,#00ff4166_2.5px,transparent_2.5px)] bg-[size:80px_80px] animate-[spin_120s_linear_infinite] origin-center" />
        {/* Layer 3: Vertical drift */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,#00ff4155_3px,transparent_3px)] bg-[size:100px_100px] animate-[grid-flow_30s_linear_infinite]" />
      </div>

      {/* ── Cybernetic Background Grid ── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00ff410d_1px,transparent_1px),linear-gradient(to_bottom,#00ff410d_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none animate-[grid-flow_20s_linear_infinite]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#00ff4115] via-transparent to-transparent blur-3xl pointer-events-none" />

      {/* ── Top Navigation Bar ── */}
      <header className="relative z-20 border-b border-[#00ff4122] bg-[#050806]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-[#00ff41] font-mono font-bold tracking-widest text-lg group-hover:text-emerald-300 transition-colors">
                ORGTWIN_SYS
              </span>
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-6 font-mono text-xs text-zinc-400">
              <span className="hover:text-[#00ff41] cursor-pointer transition-colors">Nodes</span>
              <span className="hover:text-[#00ff41] cursor-pointer transition-colors">Flows</span>
              <span className="hover:text-[#00ff41] cursor-pointer transition-colors">RAG</span>
              <span className="hover:text-[#00ff41] cursor-pointer transition-colors">Knowledge</span>
              <span className="hover:text-[#00ff41] cursor-pointer transition-colors">Orchestra</span>
            </nav>
          </div>

          {/* Right Action Icons & Buttons */}
          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              title="Terminal Console"
              className="p-2 border border-zinc-800 hover:border-[#00ff41] text-zinc-400 hover:text-[#00ff41] bg-zinc-950/60 transition-all"
            >
              <Terminal className="w-4 h-4" />
            </button>
            <button
              title="System Settings"
              className="p-2 border border-zinc-800 hover:border-[#00ff41] text-zinc-400 hover:text-[#00ff41] bg-zinc-950/60 transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>

            <Link
              href="/login"
              className="px-3.5 py-2 border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white bg-zinc-950/80 transition-all"
            >
              Login
            </Link>

            <Link
              href="/register"
              className="px-4 py-2 bg-[#00ff41] hover:bg-[#00e63a] text-[#050505] font-bold transition-all shadow-[0_0_15px_rgba(0,255,65,0.3)] hover:shadow-[0_0_20px_rgba(0,255,65,0.5)]"
            >
              Register Organization
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Hero Section (Screenshot 1) ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Hero Copy & Actions */}
          <div className="lg:col-span-7 space-y-8">
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[#00ff4144] bg-[#00ff410d] font-mono text-xs text-[#00ff41] tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
              <span>SYS.STATUS: ONLINE</span>
            </div>

            {/* Massive Heading */}
            <div className="space-y-1">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
                Your Organization.
              </h1>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#00ff41] leading-[1.1] drop-shadow-[0_0_25px_rgba(0,255,65,0.25)]">
                Digitally Twinned.
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-zinc-400 text-lg max-w-xl font-normal leading-relaxed">
              Turn people, roles, knowledge and workflows into an intelligent agentic execution system.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-sm">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#00ff41] hover:bg-[#00e63a] text-[#050505] font-bold tracking-wider transition-all shadow-[0_0_20px_rgba(0,255,65,0.4)] hover:scale-[1.02]"
              >
                <span>INITIALIZE SYSTEM</span>
                <Rocket className="w-4 h-4" />
              </Link>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 hover:border-[#00ff4166] text-zinc-200 hover:text-white tracking-wider transition-all"
              >
                <span>READ DOCS</span>
                <BookOpen className="w-4 h-4 text-zinc-400" />
              </Link>
            </div>

            {/* Option Cards: Register vs Login Choice */}
            <div className="pt-8 border-t border-zinc-900 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Option 1: Company Registration */}
              <Link
                href="/register"
                className="p-5 border border-zinc-800/90 hover:border-[#00ff41] bg-zinc-950/60 hover:bg-zinc-900/60 transition-all group block"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 border border-[#00ff4133] bg-[#00ff4110] text-[#00ff41]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] text-[#00ff41] tracking-widest uppercase">New Company</span>
                </div>
                <h3 className="text-white font-bold text-base group-hover:text-[#00ff41] transition-colors flex items-center gap-1">
                  Register Organization <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-normal">
                  Create your corporate tenant, onboard your administrator, and spawn digital agent twins.
                </p>
              </Link>

              {/* Option 2: Company Login */}
              <Link
                href="/login"
                className="p-5 border border-zinc-800/90 hover:border-zinc-600 bg-zinc-950/60 hover:bg-zinc-900/60 transition-all group block"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 border border-zinc-700 bg-zinc-900 text-zinc-300">
                    <Lock className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-[10px] text-zinc-400 tracking-widest uppercase">Existing Org</span>
                </div>
                <h3 className="text-white font-bold text-base group-hover:text-white transition-colors flex items-center gap-1">
                  Company Login <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-normal">
                  Sign in with your verified administrator credentials to access your control dashboard.
                </p>
              </Link>
            </div>

            {/* Link to Employee Portal */}
            <div className="pt-2">
              <a
                href="http://localhost:3001"
                className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-[#00ff41] transition-colors"
              >
                <span>Looking for the Employee Portal? Go to localhost:3001</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Column: NET_GRAPH_V1 Network Visualizer (Screenshot 1) */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-lg aspect-square border border-[#00ff4133] bg-[#050906]/90 p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(0,255,65,0.08)] relative overflow-hidden group">
              {/* Card Header Label */}
              <div className="flex items-center justify-between border-b border-[#00ff4122] pb-3">
                <span className="font-mono text-xs text-[#00ff41] tracking-widest">NET_GRAPH_V1</span>
                <span className="font-mono text-[10px] text-zinc-500">SYSTEM.EXEC // ACTIVE</span>
              </div>

              {/* Interactive Network Diagram */}
              <div className="flex-1 flex flex-col items-center justify-center py-6 relative">
                {/* Node Grid Row 1 (Identity & Role Layer) */}
                <div className="flex items-center justify-center gap-6 w-full relative z-10">
                  {/* Human User Node */}
                  <div className="flex flex-col items-center gap-2 group/node">
                    <div className="w-12 h-12 border border-zinc-700 bg-zinc-950 flex items-center justify-center text-zinc-300 group-hover/node:border-[#00ff41] group-hover/node:text-[#00ff41] group-hover/node:shadow-[0_0_12px_rgba(0,255,65,0.3)] transition-all">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400 group-hover/node:text-[#00ff41]">HUMAN</span>
                  </div>

                  {/* Laser Connector */}
                  <div className="h-[2px] w-12 bg-gradient-to-r from-zinc-700 via-[#00ff4166] to-zinc-700 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#00ff41] w-4 animate-[shimmer_2s_infinite]" />
                  </div>

                  {/* ID / Org Member Node */}
                  <div className="flex flex-col items-center gap-2 group/node">
                    <div className="w-12 h-12 border border-zinc-700 bg-zinc-950 flex items-center justify-center text-zinc-300 group-hover/node:border-[#00ff41] group-hover/node:text-[#00ff41] group-hover/node:shadow-[0_0_12px_rgba(0,255,65,0.3)] transition-all">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400 group-hover/node:text-[#00ff41]">MEMBER</span>
                  </div>

                  {/* Laser Connector */}
                  <div className="h-[2px] w-12 bg-gradient-to-r from-zinc-700 via-[#00ff4166] to-zinc-700 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#00ff41] w-4 animate-[shimmer_2s_infinite]" />
                  </div>

                  {/* Role Node */}
                  <div className="flex flex-col items-center gap-2 group/node">
                    <div className="w-12 h-12 border border-zinc-700 bg-zinc-950 flex items-center justify-center text-zinc-300 group-hover/node:border-[#00ff41] group-hover/node:text-[#00ff41] group-hover/node:shadow-[0_0_12px_rgba(0,255,65,0.3)] transition-all">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[10px] text-zinc-400 group-hover/node:text-[#00ff41]">ROLE</span>
                  </div>
                </div>

                {/* Vertical Trunk Line */}
                <div className="w-[2px] h-12 bg-gradient-to-b from-[#00ff41] via-[#00ff4188] to-[#00ff41] my-2 relative">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] absolute -left-[2px] top-1/2 -translate-y-1/2 animate-ping" />
                </div>

                {/* Node Grid Row 2 (Agentic Execution Layer) */}
                <div className="flex items-center justify-center gap-6 w-full relative z-10">
                  {/* RAG Knowledge Node */}
                  <div className="flex flex-col items-center gap-2 group/node">
                    <div className="w-12 h-12 border border-[#00ff4188] bg-zinc-950 flex items-center justify-center text-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.2)] group-hover/node:scale-105 transition-all">
                      <Share2 className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[10px] text-[#00ff41]">RAG_SYS</span>
                  </div>

                  {/* Laser Connector */}
                  <div className="h-[2px] w-12 bg-[#00ff4188] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#00ff41] w-4 animate-[shimmer_1.5s_infinite]" />
                  </div>

                  {/* AI Agent Twin Node */}
                  <div className="flex flex-col items-center gap-2 group/node">
                    <div className="w-12 h-12 border border-[#00ff41] bg-[#00ff4115] flex items-center justify-center text-[#00ff41] shadow-[0_0_20px_rgba(0,255,65,0.35)] group-hover/node:scale-110 transition-all">
                      <Bot className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-[10px] text-[#00ff41] font-bold">AI_TWIN</span>
                  </div>

                  {/* Laser Connector */}
                  <div className="h-[2px] w-12 bg-[#00ff4188] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#00ff41] w-4 animate-[shimmer_1.5s_infinite]" />
                  </div>

                  {/* Terminal Execution Node */}
                  <div className="flex flex-col items-center gap-2 group/node">
                    <div className="w-12 h-12 border border-[#00ff4188] bg-zinc-950 flex items-center justify-center text-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.2)] group-hover/node:scale-105 transition-all">
                      <Terminal className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[10px] text-[#00ff41]">RUNTIME</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Details */}
              <div className="border-t border-[#00ff4122] pt-3 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span>LATENCY: &lt;14ms</span>
                <span>AUTH_STORE: NEON_POSTGRES</span>
                <span>RUNTIME: SQLITE_AGENTS</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Secondary Feature Card (Screenshot 2) ── */}
        <div className="mt-24 border border-[#00ff4133] bg-[#050906]/80 p-10 md:p-14 text-center max-w-4xl mx-auto shadow-[0_0_40px_rgba(0,255,65,0.06)] relative overflow-hidden">
          {/* Glowing Top Geometric Icon */}
          <div className="inline-flex items-center justify-center p-3 border border-[#00ff4155] bg-[#00ff4110] text-[#00ff41] mb-6">
            <Bot className="w-7 h-7" />
          </div>

          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Build Your Organization&apos;s Digital Twin.
          </h2>

          <p className="text-zinc-400 text-sm md:text-base max-w-xl mx-auto mt-4 leading-relaxed">
            Deploy your first agent in minutes. Integrate with your existing stack. Let the system execute.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#00ff41] hover:bg-[#00e63a] text-[#050505] font-mono font-bold text-sm tracking-wider transition-all shadow-[0_0_20px_rgba(0,255,65,0.35)]"
            >
              <span>REQUEST ACCESS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white font-mono text-sm tracking-wider transition-all"
            >
              <span>SIGN IN TO PORTAL</span>
            </Link>
          </div>

          {/* Footer Specs */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 font-mono text-xs text-zinc-500 pt-6 border-t border-zinc-900">
            <span>&gt; SOC2 COMPLIANT</span>
            <span>&gt; ON-PREM AVAILABLE</span>
            <span>&gt; V 2.4.1</span>
          </div>
        </div>
      </main>
    </div>
  );
}
