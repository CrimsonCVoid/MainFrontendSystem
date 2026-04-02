"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  MapPin,
  Ruler,
  Layers,
  Sparkles,
  ShieldCheck,
  Building2,
  Loader2,
} from "lucide-react";
// Hero3DTeaser replaced by RoofSchematicDemo (SVG schematic) in hero section
import { ThemeToggle } from "./theme-toggle";

const RoofViewer3D = dynamic(
  () => import("./dashboard/RoofViewer3D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100 rounded-2xl">
        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
      </div>
    ),
  }
);

const RoofSchematicDemo = dynamic(
  () => import("./landing/RoofSchematicDemo"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading 3D Viewer...</p>
        </div>
      </div>
    ),
  }
);

const SIGNIN_PATH = "/signin";
const SIGNUP_PATH = "/signup";
const DASHBOARD_PATH = "/dashboard";

type LandingPageProps = {
  user?: { id: string; email?: string } | null;
};

/* -------------------------------------------------------------------------- */
/*                         Landing Page Root Component                        */
/* Renders: Nav, Hero, 3D Configurator, Features, Pricing, FAQ, Footer       */
/* -------------------------------------------------------------------------- */
export default function LandingPage({ user }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-white dark:bg-black text-neutral-900 dark:text-white antialiased">
      <Nav isLoggedIn={!!user} />
      <ScrollProgress />
      <Hero />
      <InteractiveRail />
      <Configurator3D />
      <TrustLogos />
      <FeaturesShowcase />
      <HowItWorks />
      {/* <Pricing /> */}
      <CTA />
      <FAQ />
      <Footer />
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*                     Navigation Bar with Scroll Detection                   */
/* Sticky header with backdrop blur effect, changes opacity on scroll        */
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
      className={`sticky top-0 z-40 transition-all ${
        scrolled
          ? "bg-white/70 dark:bg-black/80 backdrop-blur-md border-b border-neutral-200 dark:border-slate-500/20"
          : "bg-white/30 dark:bg-black/40 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto max-w-7xl h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 2, scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="h-8 w-8 rounded-xl bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white grid place-items-center shadow-lg shadow-slate-500/40 dark:shadow-slate-500/60 ring-2 ring-slate-400/30"
          >
            <span className="text-[10px] font-black tracking-widest drop-shadow-lg">MMR</span>
          </motion.div>
          <span className="sr-only">My Metal Roofer</span>
          <p className="hidden sm:block text-sm text-neutral-600 dark:text-neutral-400">
            Precision roof dimensions & estimating
          </p>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-700 dark:text-neutral-300">
          <a href="#features" className="hover:text-neutral-900 dark:hover:text-slate-400 transition-colors">Features</a>
          <a href="#how" className="hover:text-neutral-900 dark:hover:text-slate-400 transition-colors">How it works</a>
          <a href="#faq" className="hover:text-neutral-900 dark:hover:text-slate-400 transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLoggedIn ? (
            <Link
              href={DASHBOARD_PATH}
              className="mr-1 inline-flex items-center gap-1 rounded-xl bg-neutral-900 dark:bg-slate-500 px-4 py-2 text-sm font-semibold text-white dark:text-black shadow dark:shadow-slate-500/40 transition active:scale-[.98] hover:-translate-y-[1px] dark:hover:bg-slate-400"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link href={SIGNIN_PATH} className="px-3 py-2 text-sm rounded-xl hover:bg-neutral-100 dark:hover:bg-slate-500/10 dark:hover:text-slate-400 transition-colors">
                Sign in
              </Link>
              <Link
                href={SIGNUP_PATH}
                className="px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-slate-400 underline-offset-4 transition hover:underline"
              >
                Create account
              </Link>
              <Link
                href={SIGNUP_PATH}
                className="mr-1 inline-flex items-center gap-1 rounded-xl bg-neutral-900 dark:bg-slate-500 px-3 py-2 text-sm font-semibold text-white dark:text-black shadow dark:shadow-slate-500/40 transition active:scale-[.98] hover:-translate-y-[1px] dark:hover:bg-slate-400"
              >
                Enter Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* Top scroll progress bar */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.5 });
  return <motion.div style={{ scaleX }} className="fixed left-0 right-0 top-0 z-50 h-[2px] origin-left bg-neutral-900/80" />;
}

/* -------------------------------------------------------------------------- */
/*                                     HERO                                   */
/* -------------------------------------------------------------------------- */
function Hero() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.6]);
  const [heroView, setHeroView] = useState<{ rx: number; rz: number } | null>(null);

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* ambient glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 left-1/2 h-[52rem] w-[52rem] -translate-x-1/2 rounded-full bg-neutral-100 blur-3xl" />
        <div className="absolute -bottom-64 right-1/3 h-[44rem] w-[44rem] translate-x-1/2 rounded-full bg-neutral-50 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Copy */}
          <motion.div style={{ y, opacity }}>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight"
            >
              Metal roof dimensions in minutes, not days.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.08 }}
              className="mt-5 text-lg text-neutral-700 max-w-xl"
            >
              Extract precise plane geometry from roof data, validate visually, and auto-generate cut sheets, takeoffs, and branded estimates.
            </motion.p>

            <div id="start" className="mt-8 flex flex-wrap gap-3">
              <MagneticButton href={SIGNUP_PATH} style="primary">Enter Dashboard</MagneticButton>
              <MagneticButton href="#features" style="ghost">See how it works</MagneticButton>
            </div>

            <ul className="mt-8 flex flex-wrap items-center gap-4 text-neutral-600 text-xs">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-neutral-900" /> Precise dimensions
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-neutral-500" /> Visual validation
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-neutral-400" /> Export ready
              </li>
            </ul>
          </motion.div>

          {/* 3D Roof Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 16 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative"
          >
            <div className="rounded-2xl bg-white/90 shadow-2xl backdrop-blur overflow-hidden">
              <div className="h-[360px] md:h-[420px]">
                <RoofSchematicDemo className="h-full w-full" viewRx={heroView?.rx} viewRz={heroView?.rz} />
              </div>
            </div>

            {/* View buttons below frame */}
            <div className="flex justify-center gap-2 mt-4">
              {[
                { label: "Top", rx: 90, rz: 0 },
                { label: "Side", rx: 15, rz: -90 },
              ].map((view) => (
                <button
                  key={view.label}
                  type="button"
                  onClick={() => setHeroView({ rx: view.rx, rz: view.rz })}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors shadow-sm"
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
/*                   Tabbed Feature Showcase Component                        */
/* Displays 3 tabs: Panel Profiles, Measurements, Estimate                   */
/* Uses Framer Motion for smooth transitions between tabs                    */
/* -------------------------------------------------------------------------- */
type TabKey = "profile" | "measure" | "estimate";


function InteractiveRail() {
  const tabs: { id: TabKey; label: string; icon: React.ReactNode; blurb: string }[] = [
    { id: "profile", label: "Panel Profiles", icon: <Layers className="h-4 w-4" />, blurb: "Pick standing seam, R-panel, 5V, or corrugated; optimized cut sheets by slope." },
    { id: "measure", label: "Measurements", icon: <Ruler className="h-4 w-4" />, blurb: "Ridges, hips, valleys, eaves and pitch. Nudge tolerances, then lock." },
    { id: "estimate", label: "Estimate", icon: <BadgeCheck className="h-4 w-4" />, blurb: "Auto-generated takeoff with metal panels and trims; export a branded proposal." },
  ];

  const [active, setActive] = useState<TabKey>("profile");

  // refs for each panel
  const panelRefs = {
    profile: useRef<HTMLDivElement | null>(null),
    measure: useRef<HTMLDivElement | null>(null),
    estimate: useRef<HTMLDivElement | null>(null),
  };

  // prevent "fighting" between programmatic scroll and observer
  const isAutoScrollingRef = useRef(false);
  const autoScrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const clear = () => {
      if (autoScrollTimeoutRef.current) {
        window.clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = null;
      }
      isAutoScrollingRef.current = false;
    };
    window.addEventListener("wheel", clear, { passive: true });
    window.addEventListener("touchmove", clear, { passive: true });
    return () => {
      window.removeEventListener("wheel", clear);
      window.removeEventListener("touchmove", clear);
    };
  }, []);

  // IntersectionObserver to update active tab based on centered panel
  useEffect(() => {
    const options: IntersectionObserverInit = {
      // treat the middle 40% of the viewport as the "active" zone
      root: null,
      rootMargin: "-30% 0px -30% 0px",
      threshold: 0.1,
    };
    const io = new IntersectionObserver((entries) => {
      if (isAutoScrollingRef.current) return; // ignore while animating scroll
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      const id = (visible.target as HTMLElement).dataset.panelId as TabKey | undefined;
      if (id && id !== active) setActive(id);
    }, options);

    Object.values(panelRefs).forEach((r) => r.current && io.observe(r.current!));
    return () => io.disconnect();
  }, [active]);

  // Smooth scroll and center a panel on click
  const scrollToPanel = (id: TabKey) => {
    const el = panelRefs[id].current;
    if (!el) return;

    // account for sticky header height (≈ 64px) + a little spacing
    const headerOffset = 72;
    const rect = el.getBoundingClientRect();
    const targetY =
      window.scrollY + rect.top - (window.innerHeight / 2 - rect.height / 2) - headerOffset;

    isAutoScrollingRef.current = true;
    window.scrollTo({ top: targetY, behavior: "smooth" });

    // give the scroll time to finish before re-enabling observer updates
    if (autoScrollTimeoutRef.current) window.clearTimeout(autoScrollTimeoutRef.current);
    autoScrollTimeoutRef.current = window.setTimeout(() => {
      isAutoScrollingRef.current = false;
      setActive(id);
    }, 700);
  };

  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[280px_1fr] gap-10 items-start py-16">
        {/* Sticky rail */}
        <div className="hidden lg:block sticky top-24 self-start">
          <div className="rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur p-2 shadow-sm">
            {tabs.map((t) => (
              <RailTab
                key={t.id}
                active={active === t.id}
                onClick={() => scrollToPanel(t.id)}
                icon={t.icon}
              >
                {t.label}
              </RailTab>
            ))}
          </div>
        </div>

        {/* Panels (stacked) */}
        <div className="space-y-6">
          <RailPanel
            ref={panelRefs.profile}
            id="profile"
            active={active}
            title="Panel Profiles"
            blurb="Pick standing seam, R-panel, 5V, or corrugated; optimized cut sheets by slope."
          />
          <RailPanel
            ref={panelRefs.measure}
            id="measure"
            active={active}
            title="Measurements"
            blurb="Ridges, hips, valleys, eaves and pitch. Nudge tolerances, then lock."
          />
          <RailPanel
            ref={panelRefs.estimate}
            id="estimate"
            active={active}
            title="Estimate"
            blurb="Auto-generated takeoff with metal panels and trims; export a branded proposal."
          />
        </div>
      </div>
    </section>
  );
}

const RailPanel = React.forwardRef<HTMLDivElement, {
  id: TabKey;
  active: TabKey;
  title: string;
  blurb: string;
}>(({ id, active, title, blurb }, ref) => {
  const isActive = id === active;
  return (
    <motion.article
      ref={ref}
      data-panel-id={id}
      initial={false}
      animate={{ opacity: isActive ? 1 : 0.45, scale: isActive ? 1 : 0.985 }}
      className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm ${
        isActive ? "ring-1 ring-neutral-200" : ""
      }`}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center">
        <div className="md:w-[48%]">
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
          <p className="mt-2 text-sm text-neutral-700">{blurb}</p>

          {id === "profile" && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {["Standing Seam", "R-panel", "5V", "Corrugated"].map((p) => (
                <motion.button whileTap={{ scale: 0.98 }} key={p} className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50">
                  {p}
                </motion.button>
              ))}
            </div>
          )}

          {id === "measure" && (
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <li className="flex items-center gap-2"><Ruler className="h-4 w-4" /> Edge lengths</li>
              <li className="flex items-center gap-2"><Layers className="h-4 w-4" /> Planes & pitch</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Tolerances</li>
              <li className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Penetrations</li>
            </ul>
          )}

          {id === "estimate" && (
            <div className="mt-4 grid gap-2 text-sm">
              <Row label="Panels">142 total (26ga)</Row>
              <Row label="Trims">Ridge, Eave, Gable, Valley</Row>
              <Row label="Fasteners">2,480 screws</Row>
              <Row label="Underlayment">8 rolls</Row>
            </div>
          )}
        </div>

        <div className="md:flex-1">
          <div className="rounded-xl border bg-neutral-50 overflow-hidden">
            <div className="h-[260px]">
              <MVPPreview
                mode={id === "estimate" ? "bom" : id === "measure" ? "cut" : "diagram"}
                address={
                  id === "estimate" ? "Takeoff Preview" : id === "measure" ? "Cut Sheet Preview" : "Diagram Preview"
                }
              />
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
});
RailPanel.displayName = "RailPanel";

function RailTab({
  children,
  icon,
  active,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
        active ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
      }`}
    >
      <span className={`grid h-6 w-6 place-items-center rounded-md ${active ? "bg-white/10" : "bg-neutral-900 text-white"}`}>
        {icon}
      </span>
      <span className="flex-1 text-left">{children}</span>
      <ChevronRight
        className={`h-4 w-4 transition ${active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"}`}
      />
    </button>
  );
}


function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              FEATURES SHOWCASE                             */
/* -------------------------------------------------------------------------- */
function FeaturesShowcase() {
  const feats = [
    { t: "Dimensions powered by Google", d: "We derive plane areas, ridges, hips, valleys, and eaves—fast.", k: "Data-driven" },
    { t: "Panel Profiles & Cut Sheets", d: "Standing seam, R-panel, 5V, corrugated—optimized per slope.", k: "Profiles" },
    { t: "Visual Validation", d: "Confirm planes, pitch, and penetrations in a lightweight preview.", k: "Preview" },
    { t: "Metal Panel Takeoff", d: "Panels and trims auto-calculated.", k: "Takeoff" },
    { t: "Branded Estimates", d: "One-click proposals with your logo and staged pricing.", k: "Proposals" },
    { t: "Integrations", d: "EagleView and cloud storage.", k: "Beta" },
  ];

  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold">Everything you need to quote metal roofs</h2>
          <p className="mt-4 text-neutral-700">A focused toolkit—without the spreadsheet sprawl.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feats.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <span className="inline-block text-[10px] uppercase tracking-widest rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-neutral-600 mb-3">
                {f.k}
              </span>
              <h3 className="text-lg font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-neutral-700">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 HOW IT WORKS                               */
/* -------------------------------------------------------------------------- */
function HowItWorks() {
  const steps = [
    { n: 1, t: "Locate the property", d: "Search an address; we fetch using a proprietary roof generation method." },
    { n: 2, t: "Confirm dimensions", d: "Review plane outlines, pitches, and edges; adjust tolerances." },
    { n: 3, t: "Generate estimate", d: "Pick profile, gauge, trims. Export proposal and takeoff in seconds." },
  ];

  return (
    <section id="how" className="py-20 border-t border-neutral-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold">Address | Confirm | Export CAD</h2>
        <ol className="mt-10 grid md:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <HowStep key={s.n} idx={i} step={s} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function HowStep({
  step,
  idx,
}: {
  step: { n: number; t: string; d: string };
  idx: number;
}) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.06 }}
      className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 grid place-items-center rounded-full bg-neutral-900 text-white text-sm font-bold">
          {step.n}
        </div>
        <h3 className="text-lg font-semibold">{step.t}</h3>
      </div>
      <p className="mt-3 text-sm text-neutral-700">{step.d}</p>

      {/* Mini “window” specific to each step */}
      <div className="mt-4 rounded-lg border overflow-hidden">
        {step.n === 1 && <MiniMapWindow />}
        {step.n === 2 && <MiniOutlineWindow />}
        {step.n === 3 && <MiniEstimateWindow />}
      </div>

      {/* Context chip under the window (optional) */}
      {step.n === 1 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
          <MapPin className="h-4 w-4" /> 123 Copper Ridge Ln
        </div>
      )}
    </motion.li>
  );
}

/* -------------------------- Step 1: Mini map window ------------------------ */
/* A faux “map” with a search bar and a drop pin animation                    */
function MiniMapWindow() {
  return (
    <div className="bg-neutral-50">
      {/* Top bar with faux search */}
      <div className="flex items-center gap-2 border-b bg-white px-3 py-2">
        <div className="h-4 w-4 rounded-full bg-neutral-300" />
        <input
          aria-label="Address search"
          className="flex-1 text-sm outline-none placeholder:text-neutral-400"
          placeholder="Search address (e.g., 123 Copper Ridge Ln)"
          readOnly
        />
        <button className="text-xs px-2 py-1 rounded-md bg-neutral-900 text-white">Search</button>
      </div>

      {/* “map” canvas */}
      <div className="relative h-44 overflow-hidden">
        <svg viewBox="0 0 400 180" className="w-full h-full">
          {/* light road grid */}
          <g stroke="#e5e7eb" strokeWidth="1">
            {[...Array(8)].map((_, i) => (
              <line key={`v${i}`} x1={50 * i} y1="0" x2={50 * i} y2="180" />
            ))}
            {[...Array(5)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={36 * i} x2="400" y2={36 * i} />
            ))}
          </g>
          {/* “parcel” highlight */}
          <rect x="180" y="60" width="90" height="50" fill="#dbeafe" stroke="#93c5fd" />
        </svg>

        {/* animated drop pin */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 12, delay: 0.15 }}
          className="absolute left-[58%] top-[42%] -translate-x-1/2 -translate-y-1/2"
          aria-hidden
        >
          <div className="relative">
            <div className="h-4 w-4 rounded-full bg-red-500 border-2 border-white shadow" />
            <div className="absolute left-1/2 top-1/2 -z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/20 animate-ping" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/* ---------------------- Step 2: Roof outline + trims ----------------------- */
/* Shows detected planes with colored edges (ridge/eave/valley/gable)          */
function MiniOutlineWindow() {
  return (
    <div className="bg-white">
      <div className="h-44 grid grid-cols-[1fr_140px]">
        <div className="relative">
          <svg viewBox="0 0 400 180" className="w-full h-full">
            <defs>
              <linearGradient id="roofMini" x1="0" x2="1">
                <stop offset="0%" stopColor="#EFF3F7" />
                <stop offset="100%" stopColor="#E5ECF2" />
              </linearGradient>
            </defs>
            {/* Planes */}
            <polygon points="60,70 260,50 340,100 140,120" fill="url(#roofMini)" stroke="#C9D4DE" strokeWidth="2" />
            <polygon points="60,70 140,120 120,160 40,120" fill="#F6F8FA" stroke="#C9D4DE" strokeWidth="2" />
            {/* Trims */}
            <polyline points="100,62 280,46" stroke="#E5484D" strokeWidth="6" strokeLinecap="round" />   {/* Ridge */}
            <polyline points="50,125 120,165" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" />   {/* Eave */}
            <polyline points="60,70 40,120" stroke="#10B981" strokeWidth="6" strokeLinecap="round" />     {/* Gable */}
            <polyline points="140,120 340,100" stroke="#7C3AED" strokeWidth="6" strokeLinecap="round" />  {/* Valley */}
          </svg>
        </div>

        {/* legend */}
        <div className="border-l p-2 text-[11px]">
          <p className="font-medium text-neutral-800 mb-1">Legend</p>
          <ul className="space-y-1">
            <LegendDot c="#E5484D" label="Ridge" />
            <LegendDot c="#3B82F6" label="Eave" />
            <LegendDot c="#10B981" label="Gable" />
            <LegendDot c="#7C3AED" label="Valley" />
          </ul>
          <div className="mt-2 border-t pt-2 text-neutral-600">
            Pitch: 6/12<br /> Tolerance: ±1.0″
          </div>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ c, label }: { c: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c }} />
      <span>{label}</span>
    </li>
  );
}

/* -------------------------- Step 3: Estimate window ------------------------ */
function MiniEstimateWindow() {
  return (
    <div className="bg-neutral-50">
      <div className="h-50 grid grid-cols-1">
        <div className="p-3">
          <div className="rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Profile</span>
              <span className="font-medium">Standing Seam · 26ga</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-neutral-500">Panels</span>
              <span className="font-medium">46 total</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-neutral-500">Trims</span>
              <span className="font-medium">Ridge/Eave/Gable/Valley</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-neutral-500">Est. Cost</span>
              <span className="font-semibold">$18,500</span>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50">Export PDF</button>
            <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50">Export CSV</button>
            <button className="ml-auto rounded-md bg-neutral-900 text-white px-3 py-1.5 text-sm hover:bg-neutral-800">
              Generate Proposal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/*                                   PRICING                                  */
/* -------------------------------------------------------------------------- */
function Pricing() {
  // Single flat rate pricing
  const PRICE = 1440;
  const MAX_SF = 50000;

  return (
    <section id="pricing" className="py-24 bg-gradient-to-br from-white via-slate-50/20 to-white dark:from-black dark:via-slate-950/10 dark:to-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Simple, Transparent Pricing</h2>
          <p className="mt-3 text-neutral-700 dark:text-neutral-300 text-lg">
            No subscriptions. No monthly fees. One price for full access.
          </p>
        </header>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 max-w-2xl mx-auto rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-card p-8 shadow-xl"
        >
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Full Access Package</p>
            <div className="text-5xl font-black text-slate-600 dark:text-slate-400">
              ${PRICE.toLocaleString()}
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
              Up to {MAX_SF.toLocaleString()} SF
            </p>
          </div>

          <div className="mt-8 grid sm:grid-cols-2 gap-3">
            {[
              "Up to 50,000 SF coverage",
              "Advanced 3D roof visualization",
              "50+ premium paint colors",
              "Material cost calculator",
              "Bill of materials (BOM)",
              "Professional quote generator",
              "CSV/PDF exports",
              "Priority support",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href={SIGNIN_PATH}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-500 to-slate-600 px-6 py-3 text-base font-semibold text-white shadow-lg hover:from-slate-600 hover:to-slate-700 active:scale-[.98] transition-all"
            >
              Get Started <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <p className="mt-4 text-center text-xs text-neutral-500">
            One-time payment • No recurring charges • Instant access
          </p>
        </motion.div>

        {/* FAQ-ish reminders */}
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
          <Badge>No subscription required</Badge>
          <Badge>No setup fees</Badge>
          <Badge>One-time payment</Badge>
          <Badge>CSV/PDF exports included</Badge>
        </div>
      </div>
    </section>
  );
}

/* tiny badge chip */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs">
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  CTA BANNER                                */
/* -------------------------------------------------------------------------- */
function CTA() {
  return (
    <section id="auth" className="py-20 border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-neutral-200 bg-white/80 backdrop-blur p-8 md:p-10 shadow-sm">
          <div className="grid md:grid-cols-[1.3fr_.7fr] gap-8 items-center">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight">Try it on your next roof</h3>
              <p className="mt-2 text-neutral-600">
                Use your work account—passwords stay with your identity provider.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <SSOChip label="Continue with Google" />
                <SSOChip label="Continue with Microsoft" />
                <SSOChip label="Continue with Apple" />
              </div>
              <p className="mt-4 text-xs text-neutral-500">
                By continuing you agree to our <Link className="underline" href="/legal/terms">Terms</Link> &{" "}
                <Link className="underline" href="/legal/privacy">Privacy</Link>.
              </p>
            </div>
            <div>
              <div className="rounded-2xl border bg-neutral-50 p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-600 mb-3">
                  <Building2 className="h-4 w-4" /> Example Project
                </div>
                <div className="rounded-xl border bg-white p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Address</span>
                    <span className="font-medium">123 Copper Ridge Ln</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Profile</span>
                    <span className="font-medium">Standing Seam · 26ga</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Est. Cost</span>
                    <span className="font-semibold">$18,500</span>
                  </div>
                </div>
                <a
                  href={SIGNIN_PATH}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 active:scale-[.99]"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SSOChip({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="group inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm hover:bg-neutral-50 active:scale-[.99]"
    >
      <span className="grid h-6 w-6 place-items-center rounded-md bg-neutral-900 text-white text-[10px] font-black transition group-hover:shadow">
        •
      </span>
      {label}
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="h-3 w-3" />
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                      FAQ                                   */
/* -------------------------------------------------------------------------- */
function FAQ() {
  const qs: [string, string][] = [
    ["Where does the data come from?", "From reputable datasets with consistent coverage; we surface availability and quality per address."],
    ["How accurate are the dimensions?", "We expose dataset confidence and allow manual adjustments before you export."],
    ["Can I export my takeoff?", "Yes. Export as CSV or PDF with all measurements and material quantities."],
    ["Do you support non-metal roofs?", "We're metal-first today, with broader support on the roadmap."],
  ];
  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-bold">Frequently asked questions</h2>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {qs.map(([q, a], i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <p className="font-medium">{q}</p>
              <p className="mt-2 text-sm text-neutral-700">{a}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    FOOTER                                  */
/* -------------------------------------------------------------------------- */
function Footer() {
  return (
    <footer className="border-t border-neutral-200 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm text-neutral-700">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 grid place-items-center text-[10px] font-bold text-white shadow-md shadow-slate-500/30">MMR</div>
              <span className="font-semibold text-neutral-900">My Metal Roofer</span>
            </div>
            <p className="mt-3 max-w-xs">Metal roof dimensions and estimating for metal roofing contractors.</p>
          </div>
          <div>
            <p className="font-semibold text-neutral-900">Product</p>
            <ul className="mt-2 space-y-1">
              <li><a className="hover:text-neutral-900" href="#features">Features</a></li>
              <li><a className="hover:text-neutral-900" href="/changelog">Changelog</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-neutral-900">Company</p>
            <ul className="mt-2 space-y-1">
              <li><a className="hover:text-neutral-900" href="/about">About</a></li>
              <li><a className="hover:text-neutral-900" href="/contact">Contact</a></li>
              <li><a className="hover:text-neutral-900" href="mailto:help@mymetalroofer.com">Support</a></li>
              <li><a className="hover:text-neutral-900" href="/status">Status</a></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-neutral-900">Legal</p>
            <ul className="mt-2 space-y-1">
              <li><a className="hover:text-neutral-900" href="/legal/terms">Terms</a></li>
              <li><a className="hover:text-neutral-900" href="/legal/privacy">Privacy</a></li>
            </ul>
          </div>
        </div>
        <p className="mt-10 text-xs text-neutral-500">
          © {new Date().getFullYear()} My Metal Roofer. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*                            MVP PREVIEW (inline)                             */
/* -------------------------------------------------------------------------- */

type PreviewMode = "diagram" | "cut" | "bom";

function MVPPreview({ mode = "diagram", address = "123 Copper Ridge Ln" }: { mode?: PreviewMode; address?: string }) {
  return (
    <div className="h-full w-full grid place-items-center bg-neutral-50">
      <div className="w-[92%] h-[86%] rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <p className="text-xs text-neutral-600 truncate">{address}</p>
          <div className="text-[11px] text-neutral-500">
            {mode === "diagram" ? "Roof Diagram" : mode === "cut" ? "Cut Sheet" : "Takeoff"}
          </div>
        </div>
        {mode === "diagram" && <Diagram />}
        {mode === "cut" && <CutSheet />}
        {mode === "bom" && <BOM />}
      </div>
    </div>
  );
}

/* --- Diagram --- */
function Diagram() {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / r.width;
      const y = (e.clientY - (r.top + r.height / 2)) / r.height;
      setTilt({ rx: y * -6, ry: x * 10 });
    };
    const reset = () => setTilt({ rx: 0, ry: 0 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", reset);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", reset);
    };
  }, []);

  return (
    <div ref={cardRef} className="p-3 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 h-[calc(100%-40px)]">
      <div className="relative rounded-lg border bg-white flex items-center justify-center" style={{ perspective: 1000 }}>
        <motion.svg
          style={{ rotateX: tilt.rx, rotateY: tilt.ry }}
          viewBox="0 0 640 380"
          className="w-full h-full max-h-[360px]"
          role="img"
          aria-label="Metal roof diagram with colored trims"
        >
          <defs>
            <linearGradient id="roof" x1="0" x2="1">
              <stop offset="0%" stopColor="#EFF3F7" />
              <stop offset="100%" stopColor="#E5ECF2" />
            </linearGradient>
          </defs>
          {/* Planes */}
          <polygon points="80,120 360,80 560,170 280,210" fill="url(#roof)" stroke="#C9D4DE" strokeWidth="2" />
          <polygon points="80,120 280,210 260,300 60,210" fill="#F6F8FA" stroke="#C9D4DE" strokeWidth="2" />
          {/* Trims */}
          <polyline points="150,110 430,90" stroke="#E5484D" strokeWidth="6" strokeLinecap="round" />   {/* Ridge */}
          <polyline points="70,220 270,310" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" />   {/* Eave */}
          <polyline points="80,120 60,210" stroke="#10B981" strokeWidth="6" strokeLinecap="round" />     {/* Gable */}
          <polyline points="280,210 560,170" stroke="#7C3AED" strokeWidth="6" strokeLinecap="round" />   {/* Valley */}
          <polyline points="260,300 560,170" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />   {/* Side/Endwall */}
        </motion.svg>
      </div>

      {/* Legend */}
      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium text-neutral-800 mb-2">Legend</p>
        <ul className="space-y-2 text-[12px]">
          <LegendItem color="#E5484D" label="Ridge cap" />
          <LegendItem color="#3B82F6" label="Eave trim" />
          <LegendItem color="#10B981" label="Gable (rake) trim" />
          <LegendItem color="#7C3AED" label="Valley metal" />
          <LegendItem color="#F59E0B" label="Sidewall / Endwall flashing" />
        </ul>
        <div className="mt-3 border-t pt-3 text-[11px] text-neutral-600">
          <p>Pitch: 6/12 · Primary</p>
          <p>Panels: 46 @ 22.5 ft (example)</p>
          <p>Waste: 10% (adjustable)</p>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-neutral-700">{label}</span>
    </li>
  );
}

/* --- Cut Sheet --- */
function CutSheet() {
  const rows = [
    { length: "22.5 ft", qty: 23 },
    { length: "22.0 ft", qty: 12 },
    { length: "21.5 ft", qty: 8 },
    { length: "Misc. (spares)", qty: 2 },
  ];
  return (
    <div className="p-3 h-[calc(100%-40px)]">
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 border-b">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-neutral-700">Panel Length</th>
              <th className="text-left px-3 py-2 font-medium text-neutral-700">Quantity</th>
              <th className="text-left px-3 py-2 font-medium text-neutral-700">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="px-3 py-2">{r.length}</td>
                <td className="px-3 py-2">{r.qty}</td>
                <td className="px-3 py-2">16″ Standing Seam</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">Export CSV/PDF for fabricator.</p>
    </div>
  );
}

function BOM() {
  const items = [
    { label: "Panels (26ga)", value: "46 total" },
    { label: "Ridge cap", value: "30'0" },
    { label: "Eave trim", value: "60'0" },
    { label: "Valley metal", value: "40'0" },
    { label: "Gable trim", value: "60'0" },
  ];
  return (
    <div className="p-3 h-[calc(100%-40px)] grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium text-neutral-800 mb-2">Takeoff</p>
        <ul className="text-sm space-y-[6px]">
          {items.map((i) => (
            <li key={i.label} className="flex items-center justify-between">
              <span className="text-neutral-600">{i.label}</span>
              <span className="font-medium">{i.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium text-neutral-800 mb-2">Notes</p>
        <ul className="text-[12px] text-neutral-700 space-y-2 list-disc pl-5">
          <li>Waste factor adjustable (default 10%).</li>
          <li>Trim breakdown auto-populates by detected edges.</li>
          <li>Export CSV/PDF from this summary.</li>
        </ul>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  UTIL / UI                                 */
/* -------------------------------------------------------------------------- */
function MagneticButton({
  href,
  style = "primary",
  children,
}: {
  href: string;
  style?: "primary" | "ghost";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.setProperty("--x", `${x * 0.06}px`);
      el.style.setProperty("--y", `${y * 0.06}px`);
    };
    const reset = () => {
      el.style.setProperty("--x", "0px");
      el.style.setProperty("--y", "0px");
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", reset);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", reset);
    };
  }, []);

  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm will-change-transform transition active:scale-[.99]";
  const cls =
    style === "primary"
      ? `${base} bg-neutral-900 text-white hover:shadow-xl hover:-translate-y-[1px]`
      : `${base} border border-neutral-300 text-neutral-900 hover:bg-neutral-50`;

  return (
    <a ref={ref} href={href} className={cls} style={{ transform: "translate(var(--x,0), var(--y,0))" }}>
      {children}
    </a>
  );
}

function TrustLogos() {
  return (
    <section className="py-12 border-y border-neutral-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs uppercase tracking-widest text-neutral-500">
          Trusted by contractors and estimators
        </p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 opacity-80">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-neutral-100 border border-neutral-200" />
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                         3D ROOF CONFIGURATOR SECTION                        */
/* -------------------------------------------------------------------------- */
function Configurator3D() {
  return (
    <section id="configurator" className="relative py-24 overflow-hidden bg-gradient-to-br from-white via-slate-50/30 to-white dark:from-black dark:via-slate-950/20 dark:to-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            Interactive 3D Visualization
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Configure Your Roof in{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-500 to-slate-700">
              Real-Time 3D
            </span>
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Visualize different metal panel profiles and 50+ premium colors with our interactive configurator
          </p>
        </motion.div>

        {/* 3D Roof Configurator with Babylon.js — full color + panel controls */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
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
    </section>
  );
}
