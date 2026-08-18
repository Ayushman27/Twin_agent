"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

function ShaderCanvas({ id }: { id: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncSize = () => {
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    syncSize();

    const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl") as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = `attribute vec2 a_position;varying vec2 v_texCoord;void main(){v_texCoord=a_position*0.5+0.5;gl_Position=vec4(a_position,0.0,1.0);}`;
    const fs = `precision highp float;uniform float u_time;uniform vec2 u_resolution;uniform vec2 u_mouse;varying vec2 v_texCoord;
float grid(vec2 uv,float spacing){vec2 lines=mod(uv,spacing);return step(lines.x,0.002)+step(lines.y,0.002);}
void main(){vec2 uv=v_texCoord;vec2 mouse=u_mouse/u_resolution;vec3 color=vec3(0.02,0.02,0.02);
vec2 gridUv=uv+vec2(u_time*0.01,u_time*0.01);float g1=grid(gridUv,0.05);color+=g1*vec3(0.0,0.1,0.02);
float dist=distance(uv,mouse);float glow=smoothstep(0.4,0.0,dist);color+=glow*vec3(0.0,0.2,0.05);
float pulse=(sin(u_time*0.5)*0.5+0.5)*0.02;color+=vec3(0.0,pulse,0.0);gl_FragColor=vec4(color,1.0);}`;

    const cs = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, cs(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, cs(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime  = gl.getUniformLocation(prog, "u_time");
    const uRes   = gl.getUniformLocation(prog, "u_resolution");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        mouse = {
          x: ((e.clientX - rect.left) / rect.width) * canvas.width,
          y: (1 - (e.clientY - rect.top) / rect.height) * canvas.height,
        };
      }
    };
    window.addEventListener("mousemove", onMouseMove);

    let rafId: number;
    const render = (t: number) => {
      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime)  gl.uniform1f(uTime, t * 0.001);
      if (uRes)   gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id={id}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}

export default function LoginPage() {
  return (
    <div
      className="min-h-screen font-body-md text-body-md"
      style={{
        backgroundColor: "#050505",
        backgroundImage:
          "linear-gradient(to right,rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(to bottom,rgba(255,255,255,0.02) 1px,transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    >
      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-margin_md h-[60px] border-b border-border-tech bg-surface-container-lowest/80 backdrop-blur-md">
        <div className="flex items-center gap-margin_sm">
          <span className="font-display-xl text-[24px] font-bold tracking-tighter text-primary-container">
            ORGTWIN_SYS
          </span>
          <div className="hidden md:flex gap-margin_sm border-l border-border-tech pl-margin_sm ml-4 h-8 items-center">
            {["Nodes", "Flows", "RAG", "Knowledge", "Orchestra"].map((item) => (
              <a
                key={item}
                href="#"
                className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary-fixed-dim transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="font-label-caps text-label-caps px-4 py-2 bg-surface-variant text-on-surface border border-border-tech hover:border-primary-container hover:text-primary-container transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">terminal</span>
          </button>
          <button className="font-label-caps text-label-caps px-4 py-2 bg-surface-variant text-on-surface border border-border-tech hover:border-primary-container hover:text-primary-container transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">settings</span>
          </button>
          <Link href="/dashboard">
            <button className="btn-primary px-4 py-2">Register Organization</button>
          </Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-screen flex flex-col justify-center items-center px-margin_md py-margin_lg overflow-hidden border-b border-border-tech pt-[60px]">
        {/* WebGL Shader BG */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen">
          <ShaderCanvas id="shader-hero" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-margin_lg">
          {/* Left text */}
          <div className="flex-1 text-left">
            <div className="inline-block px-3 py-1 border border-primary-container bg-primary-container/10 text-primary-container font-code-sm text-code-sm mb-margin_sm animate-fade-in-up">
              SYS.STATUS: ONLINE
            </div>
            <h1 className="font-display-xl text-display-xl lg:text-[72px] mb-margin_sm animate-fade-in-up delay-100">
              Your Organization.<br />
              <span className="text-primary-container">Digitally Twinned.</span>
            </h1>
            <p className="font-body-md text-headline-lg-mobile text-on-surface-variant max-w-2xl mb-margin_md animate-fade-in-up delay-200">
              Turn people, roles, knowledge and workflows into an intelligent agentic execution system.
            </p>
            <div className="flex gap-4 animate-fade-in-up delay-300">
              <Link href="/dashboard">
                <button className="btn-primary px-6 py-3 flex items-center gap-2">
                  INITIALIZE SYSTEM
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                </button>
              </Link>
              <button className="btn-secondary px-6 py-3 flex items-center gap-2">
                READ DOCS
                <span className="material-symbols-outlined text-[16px]">menu_book</span>
              </button>
            </div>
          </div>

          {/* Right: network diagram */}
          <div className="flex-1 w-full animate-fade-in-up delay-300">
            <div className="glass-panel p-margin_sm aspect-square relative w-full max-w-[500px] mx-auto animate-pulse-border flex items-center justify-center">
              <div className="absolute top-0 left-0 p-2 font-code-sm text-[10px] text-outline-variant">
                NET_GRAPH_V1
              </div>
              <div className="flex flex-col items-center justify-center gap-4 w-full h-full relative">
                <div className="flex items-center gap-4 text-outline">
                  <span className="material-symbols-outlined text-[32px]">person</span>
                  <div className="h-[1px] w-8 bg-outline" />
                  <span className="material-symbols-outlined text-[32px]">badge</span>
                  <div className="h-[1px] w-8 bg-outline" />
                  <span className="material-symbols-outlined text-[32px]">work</span>
                </div>
                <div className="h-8 w-[1px] bg-primary-container/50" />
                <div className="flex items-center gap-4 text-primary-container">
                  <span className="material-symbols-outlined text-[32px]">hub</span>
                  <div className="h-[1px] w-8 bg-primary-container" />
                  <span className="material-symbols-outlined text-[32px]">smart_toy</span>
                  <div className="h-[1px] w-8 bg-primary-container" />
                  <span className="material-symbols-outlined text-[32px]">terminal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Execution Verification Log ── */}
      <section className="py-margin_lg px-margin_md border-b border-border-tech">
        <div className="max-w-7xl mx-auto">
          <div className="mb-margin_md border-b border-border-tech pb-4 flex justify-between items-end">
            <div>
              <h2 className="font-headline-lg text-headline-lg mb-2">Execution Verification</h2>
              <p className="font-code-sm text-code-sm text-on-surface-variant">
                Real-time audit log of agentic actions.
              </p>
            </div>
            <span className="material-symbols-outlined text-primary-container animate-pulse">
              radio_button_checked
            </span>
          </div>

          <div className="glass-panel p-grid_unit font-code-sm text-code-sm max-h-[400px] overflow-y-auto scroll-hidden">
            <div className="flex flex-col gap-2">
              {/* Header row */}
              <div className="flex gap-4 text-on-surface-variant mb-4 border-b border-border-tech pb-2">
                <span className="w-32">TIMESTAMP</span>
                <span className="w-32">AGENT_ID</span>
                <span className="flex-1">ACTION</span>
                <span className="w-24 text-right">STATUS</span>
              </div>

              {[
                { time: "14:22:01.450", agent: "DEV_0x4A", action: "Task: Implement login API",                    status: "INIT",    highlight: false },
                { time: "14:22:05.120", agent: "DEV_0x4A", action: "Analyzing spec docs from knowledge base...",   status: "OK",      highlight: false },
                { time: "14:22:15.890", agent: "DEV_0x4A", action: "Generating auth middleware...",                status: "OK",      highlight: false },
                { time: "14:22:22.010", agent: "DEV_0x4A", action: "✓ Code committed (PR #42) → 91% confidence.", status: "SUCCESS", highlight: true  },
                { time: "14:22:25.330", agent: "QA_0x8B",  action: "Running test suite on PR #42...",             status: "PENDING", highlight: false },
              ].map((row, i) => (
                <div
                  key={i}
                  className={`flex gap-4 ${row.highlight ? "glass-panel-active p-2 mt-2 mb-2" : ""}`}
                >
                  <span className="w-32 text-on-surface-variant">{row.time}</span>
                  <span className={`w-32 ${row.highlight ? "text-primary-container font-bold" : "text-primary-container"}`}>
                    {row.agent}
                  </span>
                  <span className={`flex-1 log-entry ${row.highlight ? "text-primary-container" : "text-on-surface"}`}>
                    {row.action}
                  </span>
                  <span className={`w-24 text-right ${row.highlight ? "text-primary-container font-bold" : "text-surface-tint"}`}>
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="relative min-h-[600px] flex flex-col justify-center items-center px-margin_md py-margin_lg overflow-hidden text-center">
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-screen">
          <ShaderCanvas id="shader-cta" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto glass-panel p-margin_md animate-pulse-border">
          <span className="material-symbols-outlined text-[48px] text-primary-container mb-margin_sm block">
            account_tree
          </span>
          <h2 className="font-display-xl text-[48px] mb-margin_sm">
            Build Your Organization&apos;s Digital Twin.
          </h2>
          <p className="font-code-sm text-code-sm text-on-surface-variant mb-margin_md">
            Deploy your first agent in minutes. Integrate with your existing stack. Let the system execute.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/dashboard">
              <button className="btn-primary px-8 py-4 flex items-center gap-2">
                REQUEST ACCESS
                <span className="material-symbols-outlined text-[16px]">login</span>
              </button>
            </Link>
          </div>
          <div className="mt-8 font-code-sm text-[10px] text-outline flex gap-4 justify-center">
            <span>&gt; SOC2 COMPLIANT</span>
            <span>&gt; ON-PREM AVAILABLE</span>
            <span>&gt; V 2.4.1</span>
          </div>
        </div>
      </section>
    </div>
  );
}
