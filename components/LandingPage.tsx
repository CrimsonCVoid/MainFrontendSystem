"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  MapPin,
  Ruler,
  Layers,
  Sparkles,
  ShieldCheck,
  Loader2,
  Satellite,
  FileSpreadsheet,
  Scissors,
  Eye,
  FileText,
  Plug,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

const RoofViewer3D = dynamic(() => import("./dashboard/RoofViewer3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted rounded-xl">
      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
    </div>
  ),
});

const RoofSchematicDemo = dynamic(() => import("./landing/RoofSchematicDemo"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-900 rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading 3D Viewer...</p>
      </div>
    </div>
  ),
});

const SIGNIN_PATH = "/signin";
const SIGNUP_PATH = "/signup";
const DASHBOARD_PATH = "/dashboard";

type LandingPageProps = {
  user?: { id: string; email?: string } | null;
};

export default function LandingPage({ user }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-background text-foreground antialiased">
      <Nav isLoggedIn={!!user} />
      <ScrollProgress />
      <Hero />
      <MetricsBar />
      <BentoFeatures />
      <HowItWorks />
      <Configurator3D />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 NAVIGATION                                 */
/* -------------------------------------------------------------------------- */
function Nav({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm"
          : "bg-background/40 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-cyan-500 text-white grid place-items-center shadow-lg shadow-cyan-500/30">
            <span className="text-[10px] font-black tracking-widest">MMR</span>
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-foreground">
            My Metal Roofer
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLoggedIn ? (
            <Link
              href={DASHBOARD_PATH}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/25 transition hover:bg-cyan-600 active:scale-[.98]"
            >
              Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href={SIGNIN_PATH}
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href={SIGNUP_PATH}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-cyan-500/25 transition hover:bg-cyan-600 active:scale-[.98]"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.5 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-50 h-[2px] origin-left bg-gradient-to-r from-cyan-500 to-emerald-500"
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                                    HERO                                    */
/* -------------------------------------------------------------------------- */
function Hero() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.6]);
  const [heroView, setHeroView] = useState<{ rx: number; rz: number } | null>(null);

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.06] bg-grid-pattern"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-16 lg:pt-28 lg:pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div style={{ y, opacity }} className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary text-xs font-mono font-medium text-cyan-600 dark:text-cyan-400"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              PRECISION EXTRACTION ENGINE
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08]"
            >
              Metal roof dimensions in{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-emerald-500">
                minutes, not days.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.08 }}
              className="text-lg text-muted-foreground max-w-xl leading-relaxed"
            >
              Extract precise plane geometry from our satellite data, validate
              visually in 3D, and auto-generate cut sheets, takeoffs, and
              branded estimates.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.16 }}
              className="flex flex-wrap gap-3 pt-2"
            >
              <Link
                href={SIGNUP_PATH}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:bg-cyan-600 hover:-translate-y-0.5 active:scale-[.98]"
              >
                Enter Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-bold text-foreground transition hover:bg-secondary active:scale-[.98]"
              >
                See how it works
              </a>
            </motion.div>

            <div className="flex items-center gap-5 text-xs font-mono text-muted-foreground pt-2">
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" /> No drone required
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Sub-inch accuracy
              </span>
              <span className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Export ready
              </span>
            </div>
          </motion.div>

          {/* 3D Roof Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 16 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative"
          >
            {/* Faux window chrome */}
            <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
              <div className="h-8 border-b border-border bg-secondary/50 flex items-center px-4 justify-between">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-border" />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground tracking-wider">
                  VIEWPORT // ISOMETRIC
                </span>
                <div className="w-16" />
              </div>
              <div className="h-[360px] md:h-[420px] bg-slate-900">
                <RoofSchematicDemo className="h-full w-full" viewRx={heroView?.rx} viewRz={heroView?.rz} />
              </div>
            </div>

            {/* HUD overlay */}
            <div className="absolute top-14 right-4 bg-slate-900/90 border border-slate-700 rounded-lg p-3 backdrop-blur shadow-xl hidden md:block">
              <ul className="font-mono text-[10px] space-y-1.5 text-slate-300">
                <li className="flex justify-between w-28">
                  <span className="text-slate-500">PITCH</span>
                  <span className="text-white">6/12</span>
                </li>
                <li className="flex justify-between w-28">
                  <span className="text-slate-500">SQ</span>
                  <span className="text-white">34.2</span>
                </li>
                <li className="flex justify-between w-28">
                  <span className="text-slate-500">WASTE</span>
                  <span className="text-emerald-400">12%</span>
                </li>
              </ul>
            </div>

            {/* View toggle */}
            <div className="flex justify-center gap-2 mt-4">
              {[
                { label: "Top", rx: 90, rz: 0 },
                { label: "Side", rx: 15, rz: -90 },
              ].map((view) => (
                <button
                  key={view.label}
                  type="button"
                  onClick={() => setHeroView({ rx: view.rx, rz: view.rz })}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shadow-sm"
                >
                  {view.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                METRICS BAR                                 */
/* -------------------------------------------------------------------------- */
function MetricsBar() {
  const metrics = [
    { value: "3 Steps", label: "Address to Estimate" },
    { value: "50+", label: "Premium Paint Colors" },
    { value: "4 Profiles", label: "Standing Seam, R-Panel, 5V, Corrugated" },
  ];

  return (
    <section className="border-y border-border bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:divide-x divide-border">
          {metrics.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="text-center md:px-8"
            >
              <span className="font-mono text-3xl font-bold text-foreground">
                <span className="text-cyan-500">{m.value.split(" ")[0]}</span>
                {m.value.includes(" ") ? ` ${m.value.split(" ").slice(1).join(" ")}` : ""}
              </span>
              <p className="mt-1 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                {m.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                              BENTO FEATURES                                */
/* -------------------------------------------------------------------------- */
function BentoFeatures() {
  return (
    <section id="features" className="py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Everything you need to quote metal roofs.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            A focused toolkit — without the spreadsheet sprawl.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Large card: Satellite Extraction */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="md:col-span-8 rounded-xl border border-border bg-card p-6 lg:p-8 relative group overflow-hidden"
          >
            <div className="mb-6 h-44 rounded-lg border border-border bg-secondary/50 overflow-hidden flex items-center justify-center relative">
              <div className="absolute inset-0 opacity-[0.04] bg-grid-pattern-sm" />
              <div className="w-32 h-24 bg-secondary border border-border rounded relative transform -rotate-12 group-hover:rotate-0 transition-all duration-500">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-16 border-2 border-dashed border-emerald-500 relative">
                    <div className="absolute -top-1 -left-1 w-2 h-2 bg-emerald-500 rounded-full" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                    <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-emerald-500 rounded-full" />
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
            <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center justify-center mb-4">
              <Satellite className="h-5 w-5 text-cyan-500" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Satellite-Powered Dimensions</h3>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Input any address and instantly derive plane areas, ridges, hips, valleys, and eaves
              from our proprietary satellite data — no drone, no ladder.
            </p>
          </motion.div>

          {/* BOM card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.06 }}
            className="md:col-span-4 rounded-xl border border-border bg-card p-6 lg:p-8 flex flex-col"
          >
            <div className="mb-6 h-44 rounded-lg border border-border bg-secondary/50 overflow-hidden flex flex-col items-center justify-center gap-2 p-4">
              {[1, 2, 3].map((r) => (
                <div
                  key={r}
                  className={`w-full h-7 rounded flex items-center px-3 gap-3 ${
                    r === 1 ? "bg-secondary border border-border" : ""
                  }`}
                >
                  <div className="w-14 h-1.5 bg-border rounded" />
                  <div className="w-8 h-1.5 bg-border rounded" />
                  <div className={`w-10 h-1.5 rounded ml-auto ${r === 1 ? "bg-cyan-500/50" : "bg-muted-foreground/20"}`} />
                </div>
              ))}
            </div>
            <div className="mt-auto">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
                <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Instant BOM Generation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Auto-calculate every panel, screw, clip, and trim piece. Export to your supplier directly.
              </p>
            </div>
          </motion.div>

          {/* Full-width: Cut Sheets */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.12 }}
            className="md:col-span-12 rounded-xl border border-border bg-card p-6 lg:p-8 flex flex-col md:flex-row gap-8 items-center relative overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-emerald-500 rounded-l-xl" />
            <div className="md:w-1/3">
              <h3 className="font-display text-2xl font-bold mb-4">Parametric Cut Sheets</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Stop drawing templates by hand. We calculate optimal panel lengths factoring in
                overlap, pitch, and eave details. Hand your crew a foolproof visual guide.
              </p>
              <ul className="space-y-2.5 font-mono text-xs text-foreground">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-500" /> Standing Seam profiles</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-500" /> R-Panel & 5V Crimp</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-cyan-500" /> Corrugated & custom trims</li>
              </ul>
            </div>
            <div className="md:w-2/3 w-full">
              <div className="w-full bg-slate-900 border border-slate-700 rounded-lg p-5 font-mono text-slate-400">
                <div className="flex justify-between border-b border-slate-800 pb-2 mb-4 text-[10px]">
                  <span>DOC: CUT_SHEET_04A</span>
                  <span>REV: 2.1</span>
                </div>
                <div className="flex gap-4">
                  <div className="w-1/2 h-28 border-2 border-slate-700 relative flex items-center justify-center bg-slate-800/30 rounded">
                    <div className="w-3 h-20 bg-slate-600 border border-slate-500 absolute left-6 rounded-sm" />
                    <div className="w-3 h-20 bg-slate-600 border border-slate-500 absolute left-12 rounded-sm" />
                    <div className="w-3 h-20 bg-slate-600 border border-slate-500 absolute left-[4.5rem] rounded-sm" />
                    <div className="absolute top-2 w-full px-3 flex items-center">
                      <div className="h-px bg-cyan-400 flex-1" />
                      <span className="px-2 text-cyan-400 text-[10px]">21&apos; 6&quot;</span>
                      <div className="h-px bg-cyan-400 flex-1" />
                    </div>
                  </div>
                  <div className="w-1/2 text-[10px] space-y-2">
                    <div className="flex justify-between border-b border-slate-800 pb-1 text-slate-500">
                      <span>ID</span><span>QTY</span><span>LEN</span>
                    </div>
                    <div className="flex justify-between text-white"><span>PNL_A</span><span>12</span><span>21&apos; 6&quot;</span></div>
                    <div className="flex justify-between text-white"><span>PNL_B</span><span>08</span><span>14&apos; 2&quot;</span></div>
                    <div className="flex justify-between text-white"><span>TRM_1</span><span>04</span><span>10&apos; 0&quot;</span></div>
                    <div className="flex justify-between text-slate-500"><span>SCR_W</span><span>450</span><span>2.0&quot;</span></div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bottom row: 3 smaller cards */}
          {[
            {
              icon: <Eye className="h-5 w-5 text-cyan-500" />,
              bg: "bg-cyan-500/10 border-cyan-500/20",
              title: "Visual Validation",
              desc: "Confirm planes, pitch, and penetrations in a lightweight 3D preview before generating any output.",
            },
            {
              icon: <FileText className="h-5 w-5 text-emerald-500" />,
              bg: "bg-emerald-500/10 border-emerald-500/20",
              title: "Branded Estimates",
              desc: "One-click proposals with your logo and staged pricing. Export as PDF and send directly to clients.",
            },
            {
              icon: <Plug className="h-5 w-5 text-blue-500" />,
              bg: "bg-blue-500/10 border-blue-500/20",
              title: "Integrations",
              desc: "EagleView and cloud storage connections. More integrations coming soon.",
              badge: "Beta",
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="md:col-span-4 rounded-xl border border-border bg-card p-6"
            >
              <div className={`w-10 h-10 ${f.bg} border rounded-lg flex items-center justify-center mb-4`}>
                {f.icon}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-display text-lg font-bold">{f.title}</h3>
                {f.badge && (
                  <span className="text-[10px] uppercase tracking-widest rounded-md border border-border bg-secondary px-2 py-0.5 text-muted-foreground font-mono">
                    {f.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                               HOW IT WORKS                                 */
/* -------------------------------------------------------------------------- */
function HowItWorks() {
  const steps = [
    {
      n: 1,
      title: "Locate the property",
      desc: "Search an address — we fetch the highest resolution imagery available within seconds using our proprietary roof generation method.",
      preview: <MiniMapWindow />,
    },
    {
      n: 2,
      title: "Confirm dimensions",
      desc: "Review plane outlines, pitches, and edges. Adjust tolerances and select your panel profile.",
      preview: <MiniOutlineWindow />,
    },
    {
      n: 3,
      title: "Generate estimate",
      desc: "Pick profile, gauge, and trims. Export proposal and takeoff in seconds — CSV, PDF, or branded proposal.",
      preview: <MiniEstimateWindow />,
    },
  ];

  return (
    <section id="how" className="py-20 lg:py-24 bg-secondary/30 border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="text-cyan-500 font-mono text-sm font-bold tracking-widest uppercase">
            Workflow
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mt-3 tracking-tight">
            Three steps to a complete estimate
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-8 left-[16.6%] right-[16.6%] h-px border-t-2 border-dashed border-border" />

          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm relative"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`h-8 w-8 grid place-items-center rounded-full text-sm font-bold ${
                    s.n === 2
                      ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/25"
                      : "bg-secondary text-foreground border border-border"
                  }`}
                >
                  {s.n}
                </div>
                <h3 className="font-display text-lg font-bold">{s.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.desc}</p>
              <div className="rounded-lg border border-border overflow-hidden">{s.preview}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* Step 1: Mini map */
function MiniMapWindow() {
  return (
    <div className="bg-secondary/50">
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2">
        <div className="h-4 w-4 rounded-full bg-border" />
        <input
          aria-label="Address search"
          className="flex-1 text-sm outline-none placeholder:text-muted-foreground bg-transparent"
          placeholder="Search address..."
          readOnly
        />
        <button type="button" className="text-xs px-2.5 py-1 rounded-md bg-cyan-500 text-white font-medium">Search</button>
      </div>
      <div className="relative h-36 overflow-hidden">
        <svg viewBox="0 0 400 150" className="w-full h-full">
          <g stroke="currentColor" strokeWidth="1" opacity="0.1">
            {[...Array(8)].map((_, i) => (
              <line key={`v${i}`} x1={50 * i} y1="0" x2={50 * i} y2="150" />
            ))}
            {[...Array(5)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={30 * i} x2="400" y2={30 * i} />
            ))}
          </g>
          <rect x="180" y="50" width="90" height="45" className="fill-cyan-500/10 stroke-cyan-500/40" />
        </svg>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 12, delay: 0.15 }}
          className="absolute left-[58%] top-[42%] -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        >
          <div className="relative">
            <div className="h-4 w-4 rounded-full bg-cyan-500 border-2 border-white shadow" />
            <div className="absolute left-1/2 top-1/2 -z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/20 animate-ping" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* Step 2: Roof outline */
function MiniOutlineWindow() {
  return (
    <div className="bg-card">
      <div className="h-36 grid grid-cols-[1fr_120px]">
        <div className="relative">
          <svg viewBox="0 0 400 150" className="w-full h-full">
            <defs>
              <linearGradient id="roofMiniNew" x1="0" x2="1">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>
            <polygon points="60,55 260,40 340,80 140,95" fill="url(#roofMiniNew)" stroke="#94a3b8" strokeWidth="2" />
            <polygon points="60,55 140,95 120,130 40,95" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
            <polyline points="100,50 280,37" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" />
            <polyline points="50,100 120,135" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" />
            <polyline points="60,55 40,95" stroke="#10b981" strokeWidth="5" strokeLinecap="round" />
            <polyline points="140,95 340,80" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="border-l border-border p-2 text-[11px]">
          <p className="font-medium text-foreground mb-1.5">Legend</p>
          <ul className="space-y-1">
            <LegendDot c="#ef4444" label="Ridge" />
            <LegendDot c="#3b82f6" label="Eave" />
            <LegendDot c="#10b981" label="Gable" />
            <LegendDot c="#8b5cf6" label="Valley" />
          </ul>
          <div className="mt-2 border-t border-border pt-2 text-muted-foreground">
            Pitch: 6/12<br />Tol: &#177;1.0&quot;
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ c, label }: { c: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="inline-block h-2 w-2 rounded-sm" style={{ background: c }} />
      <span className="text-muted-foreground">{label}</span>
    </li>
  );
}

/* Step 3: Estimate */
function MiniEstimateWindow() {
  return (
    <div className="bg-secondary/50 p-3">
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Profile</span>
          <span className="font-medium">Standing Seam &middot; 26ga</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Panels</span>
          <span className="font-medium">46 total</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Trims</span>
          <span className="font-medium">Ridge / Eave / Gable / Valley</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Est. Cost</span>
          <span className="font-semibold text-foreground">$18,500</span>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors">
          Export PDF
        </button>
        <button type="button" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors">
          Export CSV
        </button>
        <button type="button" className="ml-auto rounded-md bg-cyan-500 text-white px-3 py-1.5 text-xs font-semibold hover:bg-cyan-600 transition-colors">
          Generate Proposal
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            3D CONFIGURATOR                                 */
/* -------------------------------------------------------------------------- */
function Configurator3D() {
  return (
    <section id="configurator" className="py-20 lg:py-24 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr_2fr] gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-secondary text-xs font-mono font-medium text-cyan-600 dark:text-cyan-400 mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              INTERACTIVE 3D
            </div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mb-4">
              Configure your roof in{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-emerald-500">
                real-time 3D
              </span>
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Visualize different metal panel profiles and 50+ premium colors
              with our interactive configurator. Dormers, varying pitches, complex geometry — it handles it all.
            </p>
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary border border-border p-4">
                <div className="font-bold text-sm mb-0.5">Auto-Pitch Detection</div>
                <div className="text-xs text-muted-foreground font-mono">ACCURACY: 98.5%</div>
              </div>
              <div className="rounded-lg bg-secondary border border-border p-4 opacity-70">
                <div className="font-bold text-sm mb-0.5">Waste Optimization</div>
                <div className="text-xs text-muted-foreground font-mono">STATUS: ENABLED</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
          >
            <RoofViewer3D
              width={14}
              depth={10}
              pitch={0.55}
              overhang={0.25}
              thickness={0.035}
              seamSpacing={0.4572}
              color="#4B5563"
              spin={true}
              hideControls={false}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  PRICING                                   */
/* -------------------------------------------------------------------------- */
function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-secondary/30 border-y border-border relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-grid-pattern" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            One tool. One price.
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            No per-report fees. No complex tiers. Full access.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden hover:-translate-y-1 transition-transform duration-300"
        >
          <div className="grid md:grid-cols-2">
            {/* Price side */}
            <div className="p-10 lg:p-12 bg-slate-900 text-white flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500 rounded-full blur-[80px] opacity-15 -mr-32 -mt-32" />
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-700 bg-slate-800/50 text-xs font-bold text-white w-max mb-6">
                FULL ACCESS
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-display font-bold">$1,440</span>
              </div>
              <p className="text-slate-400 text-sm mb-8">
                One-time payment &middot; Up to 50,000 SF &middot; No recurring charges
              </p>
              <Link
                href={SIGNUP_PATH}
                className="w-full py-3.5 text-center bg-white text-slate-900 font-bold rounded-lg hover:bg-slate-200 transition-colors block"
              >
                Get Started Now
              </Link>
              <p className="text-xs text-slate-500 font-mono text-center mt-4">INSTANT ACCESS AFTER PAYMENT</p>
            </div>

            {/* Features side */}
            <div className="p-10 lg:p-12 flex flex-col justify-center">
              <ul className="space-y-5">
                {[
                  { title: "Up to 50,000 SF Coverage", desc: "Full dimensional extraction for any property." },
                  { title: "All Metal Profiles Included", desc: "Standing seam, R-panel, 5V, corrugated." },
                  { title: "50+ Premium Paint Colors", desc: "Visualize in the 3D configurator before ordering." },
                  { title: "CSV & PDF Exports", desc: "Cut sheets, BOMs, and branded proposals." },
                  { title: "Advanced 3D Visualization", desc: "Interactive roof viewer with real-time configuration." },
                  { title: "Priority Support", desc: "Direct access to our engineering team." },
                ].map((f) => (
                  <li key={f.title} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-cyan-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold text-foreground block">{f.title}</span>
                      <span className="text-sm text-muted-foreground">{f.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    FAQ                                     */
/* -------------------------------------------------------------------------- */
function FAQ() {
  const qs: { q: string; a: string }[] = [
    {
      q: "Where does the roof data come from?",
      a: "From reputable satellite datasets with consistent coverage. We surface availability and quality per address using our proprietary extraction method.",
    },
    {
      q: "How accurate are the dimensions?",
      a: "We expose dataset confidence and allow manual adjustments before export. Our digital extraction delivers sub-inch accuracy for standard roof pitches.",
    },
    {
      q: "Can I export my takeoff?",
      a: "Yes. Export as CSV or PDF with all measurements and material quantities — cut sheets, BOMs, and branded proposals are all included.",
    },
    {
      q: "Do you support non-metal roofs?",
      a: "We're metal-first today, with broader material support on the roadmap. The dimensional extraction works for any roof type, but BOM and cut sheet generation is optimized for metal panels.",
    },
    {
      q: "Does it account for panel overlap and setbacks?",
      a: "Yes. Our parametric engine virtually 'installs' the panels based on your selected profile. You define the eave overhang and ridge setbacks, and the software adjusts cut piece lengths accordingly.",
    },
  ];

  return (
    <section id="faq" className="py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-12 tracking-tight">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {qs.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-left font-display font-semibold text-foreground hover:bg-secondary/50 transition-colors"
      >
        <span>{q}</span>
        <ChevronDown className={`h-5 w-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                CTA BANNER                                  */
/* -------------------------------------------------------------------------- */
function CTA() {
  return (
    <section className="py-20 lg:py-28 relative overflow-hidden bg-gradient-to-br from-cyan-600 to-blue-600">
      <div className="absolute top-0 right-0 w-96 h-96 border-[10px] border-white/10 rounded-full transform translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-72 h-72 border border-white/10 rounded-full transform -translate-x-1/3 translate-y-1/3" />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative z-10 text-center flex flex-col items-center">
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
          Try it on your next roof
        </h2>
        <p className="text-cyan-100 text-lg mb-10 max-w-2xl">
          Stop leaving money on the table due to estimation errors and wasted
          hours. Start mapping your first roof in under 60 seconds.
        </p>

        <div className="bg-background p-8 rounded-xl shadow-2xl w-full max-w-md border border-border">
          <div className="space-y-4">
            <Link
              href={SIGNUP_PATH}
              className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              Continue to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground font-mono">OR SIGN IN WITH</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {["Google", "Microsoft", "Apple"].map((provider) => (
                <Link
                  key={provider}
                  href={SIGNIN_PATH}
                  className="flex items-center justify-center gap-1.5 border border-border hover:bg-secondary text-foreground py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {provider}
                </Link>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              By continuing you agree to our{" "}
              <Link className="underline hover:text-foreground" href="/legal/terms">Terms</Link> &{" "}
              <Link className="underline hover:text-foreground" href="/legal/privacy">Privacy</Link>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  FOOTER                                    */
/* -------------------------------------------------------------------------- */
function Footer() {
  return (
    <footer className="border-t border-border pt-16 pb-8 bg-card">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-7 w-7 rounded-lg bg-cyan-500 grid place-items-center text-[9px] font-bold text-white shadow-md shadow-cyan-500/20">
                MMR
              </div>
              <span className="font-display font-bold text-foreground">My Metal Roofer</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs mb-6">
              Precision roof dimensions and estimating for metal roofing contractors.
            </p>
          </div>
          <div>
            <p className="font-display font-bold text-foreground mb-4">Product</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a className="hover:text-foreground transition-colors" href="#features">Features</a></li>
              <li><a className="hover:text-foreground transition-colors" href="#configurator">3D Engine</a></li>
              <li><a className="hover:text-foreground transition-colors" href="/changelog">Changelog</a></li>
            </ul>
          </div>
          <div>
            <p className="font-display font-bold text-foreground mb-4">Company</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a className="hover:text-foreground transition-colors" href="/about">About</a></li>
              <li><a className="hover:text-foreground transition-colors" href="/contact">Contact</a></li>
              <li><a className="hover:text-foreground transition-colors" href="mailto:help@mymetalroofer.com">Support</a></li>
              <li><a className="hover:text-foreground transition-colors" href="/status">Status</a></li>
            </ul>
          </div>
          <div>
            <p className="font-display font-bold text-foreground mb-4">Legal</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a className="hover:text-foreground transition-colors" href="/legal/terms">Terms</a></li>
              <li><a className="hover:text-foreground transition-colors" href="/legal/privacy">Privacy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground font-mono">
            &copy; {new Date().getFullYear()} My Metal Roofer. All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
