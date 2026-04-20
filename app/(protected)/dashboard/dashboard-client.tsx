"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  MapPin,
  Loader2,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  Settings,
  History,
  FileText,
  TrendingUp,
  LayoutGrid,
  List,
  ChevronRight,
  Upload,
  Box,
  Users,
  Ticket,
  Home,
  Gift,
  CreditCard,
  Sparkles,
  Check,
  HelpCircle,
  Activity,
  Shield,
  Calendar,
  RefreshCw,
  User,
  DollarSign,
  Edit3,
  Trash2,
  UserPlus,
  UserMinus,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from "lucide-react";
import {
  deleteProject,
  type ProjectWithCreator,
} from "@/lib/projects";
import { OwnershipBadge } from "@/components/project/OwnershipBadge";
import { CreatorAvatar, CreatorCompact } from "@/components/project/CreatorAvatar";
import { onAuthStateChange, signOut } from "@/lib/auth";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClient, checkClientHealth } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useTutorial } from "@/hooks/use-tutorial";
import { OrgSwitcher } from "@/components/org/org-switcher";
import { useOrg, useSFPool } from "@/components/providers/org-provider";
import { SFPoolDisplay, SFPoolBadge } from "@/components/org/sf-pool-display";
import { type EstimateShare } from "@/lib/estimate-sharing";
import AddressInput, { type AddressData } from "@/components/project/AddressInput";
import dynamic from "next/dynamic";
import { CalendarDays, Wrench, Contact } from "lucide-react";

const ClientsTab = dynamic(() => import("@/components/dashboard/ClientsTab"), { ssr: false });
const PipelineTab = dynamic(() => import("@/components/dashboard/PipelineTab"), { ssr: false });
const CalendarTab = dynamic(() => import("@/components/dashboard/CalendarTab"), { ssr: false });
const CrewTab = dynamic(() => import("@/components/dashboard/CrewTab"), { ssr: false });

import {
  type ActivityLogEntry,
  type ActivityCategory,
  formatActionLabel,
  getActionColor,
} from "@/lib/activity-log";
import { formatSF } from "@/lib/sf-pool";
import { getRoleLabel, type OrgRole } from "@/lib/org-types";

type FormState = {
  name: string;
  description: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
};

type DashboardTab = "overview" | "projects" | "estimates" | "team" | "audit" | "settings" | "clients" | "pipeline" | "calendar" | "crew";

const VALID_TABS: DashboardTab[] = ["overview", "projects", "estimates", "clients", "pipeline", "calendar", "crew", "team", "audit", "settings"];

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  company_name: string | null;
  company_logo_url: string | null;
  company_phone: string | null;
  company_address: string | null;
  company_email: string | null;
  company_website: string | null;
};

export default function DashboardClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const { toast } = useToast();
  const { org, loading: orgLoading, canManageBilling, orgSwitchCount } = useOrg();
  const { pool, statusColor, format: formatPoolSF } = useSFPool();
  const { restartTutorial, registerPrerequisite, unregisterPrerequisite } = useTutorial();

  // Core state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<ProjectWithCreator[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [createBusy, setCreateBusy] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLabel, setUserLabel] = useState<string>("there");
  const [userId, setUserId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending">("all");
  const [filterOwnership, setFilterOwnership] = useState<"all" | "mine" | "team">("all");
  const VALID_TABS: DashboardTab[] = ["overview", "projects", "estimates", "clients", "pipeline", "calendar", "crew", "team", "audit", "settings"];
  const tabParam = searchParams.get("tab");
  const initialTab = tabParam && VALID_TABS.includes(tabParam as DashboardTab) ? (tabParam as DashboardTab) : "overview";
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [recentApprovals, setRecentApprovals] = useState<(EstimateShare & { project_name?: string })[]>([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);

  // Settings state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Promo code state
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoCredits, setPromoCredits] = useState<number>(0);

  // Roof verification state (shown after project creation)
  const [verifyStep, setVerifyStep] = useState<"idle" | "generating" | "verify">("idle");
  const [verifyRoofData, setVerifyRoofData] = useState<any>(null);
  const [verifyProjectId, setVerifyProjectId] = useState<string | null>(null);
  const [verifyAddress, setVerifyAddress] = useState<AddressData | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketReason, setTicketReason] = useState("");

  // Project creation modal state
  const [selectedAddress, setSelectedAddress] = useState<AddressData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"sf_pool" | "promo_credit" | null>(null);

  // Audit log state
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditTab, setAuditTab] = useState<"all" | "projects" | "members" | "billing" | "org">("all");
  const [auditTimeFilter, setAuditTimeFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [auditMembers, setAuditMembers] = useState<Array<{
    id: string;
    user_id: string;
    org_id: string;
    role: OrgRole;
    created_at: string;
    user?: { email: string; full_name: string | null } | null;
  }>>([]);

  // Refs for tracking data hydration
  const hasLoadedInitialData = useRef(false);
  const prevOrgId = useRef<string | null>(null);

  // === MOUNT DIAGNOSTICS === (one-time on mount)
  useEffect(() => {
    console.log("[Dashboard] ========== MOUNT DIAGNOSTICS ==========");
    console.log("[Dashboard] Timestamp:", new Date().toISOString());
    console.log("[Dashboard] document.visibilityState:", document.visibilityState);
    console.log("[Dashboard] navigator.onLine:", navigator.onLine);
    console.log("[Dashboard] window.location:", window.location.href);

    // Check cookies
    const cookies = document.cookie.split(";").map((c) => c.trim().split("=")[0]).filter(Boolean);
    const sbCookies = cookies.filter((c) => c.startsWith("sb-"));
    console.log("[Dashboard] Cookies total:", cookies.length, "| Supabase cookies:", sbCookies);

    // Check localStorage for auth keys
    try {
      const lsKeys = Object.keys(localStorage).filter(
        (k) => k.includes("supabase") || k.includes("sb-") || k.includes("auth")
      );
      console.log("[Dashboard] LocalStorage auth keys:", lsKeys);
      // Log token existence (not value) for each key
      lsKeys.forEach((k) => {
        const val = localStorage.getItem(k);
        console.log(`[Dashboard]   ${k}: ${val ? `${val.length} chars` : "null"}`);
      });
    } catch (e) {
      console.warn("[Dashboard] Could not read localStorage:", e);
    }

    // Health check the browser Supabase client (with 3s timeout warning)
    console.log("[Dashboard] Starting browser client health check...");
    let healthResolved = false;

    const healthTimeout = setTimeout(() => {
      if (!healthResolved) {
        console.error("[Dashboard] ⚠️ BROWSER CLIENT HEALTH CHECK DID NOT RESPOND AFTER 3s — CLIENT IS HUNG");
      }
    }, 3000);

    checkClientHealth().then((result) => {
      healthResolved = true;
      clearTimeout(healthTimeout);
      console.log("[Dashboard] Browser client health check:", result);
    });

    console.log("[Dashboard] ========== END MOUNT DIAGNOSTICS ==========");
  }, []);

  // Sync active tab with URL ?tab= param (handles tutorial navigation)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl as DashboardTab)) {
      setActiveTab(tabFromUrl as DashboardTab);
    }
  }, [searchParams]);

  // Register has-projects prerequisite with tutorial system
  useEffect(() => {
    if (projects.length > 0) {
      registerPrerequisite("has-projects");
    } else {
      unregisterPrerequisite("has-projects");
    }
    return () => {
      unregisterPrerequisite("has-projects");
    };
  }, [projects.length, registerPrerequisite, unregisterPrerequisite]);

  // Check if user can create a project (has payment available)
  const hasSFPoolAvailable = pool.remaining > 0;
  const hasPromoCreditsAvailable = promoCredits > 0;
  const hasPaymentMethodAvailable = hasSFPoolAvailable || hasPromoCreditsAvailable;

  const canSubmitCreate = useMemo(
    () =>
      createForm.name.trim().length > 0 &&
      selectedAddress !== null &&
      paymentMethod !== null &&
      ((paymentMethod === "sf_pool" && hasSFPoolAvailable) ||
        (paymentMethod === "promo_credit" && hasPromoCreditsAvailable)),
    [createForm.name, selectedAddress, paymentMethod, hasSFPoolAvailable, hasPromoCreditsAvailable]
  );

  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Ownership filter
    if (filterOwnership !== "all") {
      filtered = filtered.filter((p) =>
        filterOwnership === "mine" ? p.isOwn : !p.isOwn
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((p) =>
        filterStatus === "paid" ? p.payment_completed : !p.payment_completed
      );
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.address?.toLowerCase().includes(query) ||
          p.city?.toLowerCase().includes(query) ||
          p.creator?.full_name?.toLowerCase().includes(query) ||
          p.creator?.email?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return (b.square_footage || 0) - (a.square_footage || 0);
        case "date":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [projects, searchQuery, sortBy, filterStatus, filterOwnership]);

  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((p) => p.payment_completed).length;
    const pending = total - completed;
    const totalSqFt = projects.reduce((sum, p) => sum + (p.square_footage || 0), 0);
    const mine = projects.filter((p) => p.isOwn).length;
    const team = projects.filter((p) => !p.isOwn).length;
    return { total, completed, pending, totalSqFt, mine, team };
  }, [projects]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [projects]);

  // Load user and profile via API route to avoid browser Supabase client session lock hangs.
  // Accepts an optional user from onAuthStateChange for display name extraction.
  const hydrateUser = useCallback(async (existingUser?: SupabaseUser): Promise<boolean> => {
    console.log("[hydrateUser] Starting", existingUser ? `with session user: ${existingUser.email}` : "without user");

    try {
      // Fetch profile via API route (server-side Supabase client, no session lock issues)
      const res = await fetch("/api/profile");
      if (!res.ok) {
        console.warn("[hydrateUser] /api/profile returned", res.status);
        return false;
      }
      const json = await res.json();
      const apiUser = json.user;
      const profileData = json.profile;

      if (!apiUser) {
        console.log("[hydrateUser] No user from API");
        return false;
      }

      console.log("[hydrateUser] User found:", apiUser.email);
      setUserId(apiUser.id);

      // Try to get name from user metadata first
      let displayName =
        (apiUser.user_metadata?.full_name as string | undefined) ||
        (apiUser.user_metadata?.name as string | undefined) ||
        (apiUser.user_metadata?.given_name as string | undefined);

      // If no name in metadata, try from profile
      if (!displayName && profileData?.full_name) {
        displayName = profileData.full_name;
      }

      // Fall back to email or placeholder
      setUserLabel(displayName || apiUser.email || "User");

      if (profileData) {
        const p = profileData as UserProfile;
        setProfile(p);
        setFullName(p.full_name || "");
        setCompanyName(p.company_name || "");
        setCompanyPhone(p.company_phone || "");
        setCompanyAddress(p.company_address || "");
        setCompanyEmail(p.company_email || "");
        setCompanyWebsite(p.company_website || "");
        setLogoUrl(p.company_logo_url || "");
      }

      return true;
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
        console.warn("hydrateUser aborted");
        return false;
      }
      console.error("hydrateUser error:", err);
      return false;
    }
  }, []);

  const refreshProjects = useCallback(
    async (opts: { background?: boolean } = {}) => {
      const t0 = performance.now();
      console.log("[Dashboard] refreshProjects START for org:", org?.id);
      if (opts.background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        // Use API route instead of browser Supabase client to avoid session lock hangs
        const url = org?.id ? `/api/projects?orgId=${org.id}` : `/api/projects`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load projects (${res.status})`);
        const json = await res.json();
        setProjects(json.projects || []);
        setError(null);
        console.log(`[Dashboard] refreshProjects DONE in ${(performance.now() - t0).toFixed(0)}ms — ${json.projects?.length ?? 0} projects`);
      } catch (err: any) {
        console.error(`[Dashboard] refreshProjects FAILED in ${(performance.now() - t0).toFixed(0)}ms:`, err?.message);
        setError(err?.message || "Unable to load projects.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [org?.id]
  );

  // Extracted loading functions for org data refresh
  const loadApprovals = useCallback(async () => {
    if (!org?.id) return;
    const t0 = performance.now();
    console.log("[Dashboard] loadApprovals START for org:", org.id);
    setApprovalsLoading(true);
    try {
      // Use API route instead of browser Supabase client to avoid session lock hangs
      const res = await fetch(`/api/approvals?orgId=${org.id}&limit=5`);
      if (!res.ok) throw new Error(`Failed to load approvals (${res.status})`);
      const json = await res.json();
      setRecentApprovals(json.approvals || []);
      console.log(`[Dashboard] loadApprovals DONE in ${(performance.now() - t0).toFixed(0)}ms — ${json.approvals?.length ?? 0} approvals`);
    } catch (err: any) {
      console.error(`[Dashboard] loadApprovals FAILED in ${(performance.now() - t0).toFixed(0)}ms:`, err?.message || err);
    } finally {
      setApprovalsLoading(false);
    }
  }, [org?.id]);

  const loadPromoCredits = useCallback(async () => {
    const t0 = performance.now();
    console.log("[Dashboard] loadPromoCredits START");
    try {
      const response = await fetch(`/api/promo-keys/credits`);
      const data = await response.json();
      if (data.success) {
        setPromoCredits(data.credits || 0);
      }
      console.log(`[Dashboard] loadPromoCredits DONE in ${(performance.now() - t0).toFixed(0)}ms — credits: ${data.credits ?? 0}`);
    } catch (err: any) {
      console.error(`[Dashboard] loadPromoCredits FAILED in ${(performance.now() - t0).toFixed(0)}ms:`, err?.message || err);
    }
  }, []);

  const loadAuditData = useCallback(async (forceLoad: boolean = false) => {
    // Only load if on audit tab OR if forceLoad is true (for org switch preload)
    if (!org?.id || (!forceLoad && activeTab !== "audit")) return;
    const t0 = performance.now();
    console.log("[Dashboard] loadAuditData START for org:", org.id, "forceLoad:", forceLoad);
    setAuditLoading(true);

    try {
      // Calculate date filter
      let startDate: string | undefined;
      if (auditTimeFilter !== "all") {
        const now = new Date();
        if (auditTimeFilter === "today") {
          startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        } else if (auditTimeFilter === "week") {
          now.setDate(now.getDate() - 7);
          startDate = now.toISOString();
        } else if (auditTimeFilter === "month") {
          now.setDate(now.getDate() - 30);
          startDate = now.toISOString();
        }
      }

      // Map tab to category
      const categoryMap: Record<string, ActivityCategory | undefined> = {
        all: undefined,
        projects: "project",
        members: "member",
        billing: "billing",
        org: "org",
      };

      // Use API route instead of browser Supabase client to avoid session lock hangs
      const params = new URLSearchParams({ orgId: org.id, limit: "200" });
      const category = categoryMap[auditTab];
      if (category) params.set("category", category);
      if (startDate) params.set("startDate", startDate);

      const res = await fetch(`/api/audit?${params}`);
      if (!res.ok) throw new Error(`Failed to load audit data (${res.status})`);
      const json = await res.json();

      setActivityLogs(json.logs || []);
      if (json.members) setAuditMembers(json.members as typeof auditMembers);
      console.log(`[Dashboard] loadAuditData DONE in ${(performance.now() - t0).toFixed(0)}ms — ${json.logs?.length ?? 0} logs, ${json.members?.length ?? 0} members`);
    } catch (err: any) {
      console.error(`[Dashboard] loadAuditData FAILED in ${(performance.now() - t0).toFixed(0)}ms:`, err?.message || err);
    } finally {
      setAuditLoading(false);
    }
  }, [org?.id, activeTab, auditTab, auditTimeFilter]);

  // Centralized function to refresh all org-scoped data.
  // All sub-loads now use fetch() to API routes (server-side Supabase client),
  // avoiding the browser Supabase client session lock issue entirely.
  const refreshAllOrgData = useCallback(async () => {
    if (!org?.id) return;

    console.log("[Dashboard] Refreshing all org data for:", org.id);
    setRefreshing(true);

    try {
      const results = await Promise.allSettled([
        refreshProjects({ background: true }),
        loadApprovals(),
        loadPromoCredits(),
        loadAuditData(true),
      ]);

      // Log any failures for debugging
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          const labels = ["refreshProjects", "loadApprovals", "loadPromoCredits", "loadAuditData"];
          console.warn(`[Dashboard] ${labels[i]} failed:`, r.reason?.message || r.reason);
        }
      });
    } catch (err) {
      console.error("Failed to refresh org data:", err);
    } finally {
      setRefreshing(false);
      setLoading(false); // Always clear loading regardless of outcome
    }
  }, [org?.id, refreshProjects, loadApprovals, loadPromoCredits, loadAuditData]);

  // Reset initial data flag when org changes
  useEffect(() => {
    if (org?.id !== prevOrgId.current) {
      console.log("[Dashboard] Org ID changed from", prevOrgId.current, "to", org?.id);
      prevOrgId.current = org?.id ?? null;
      // Reset the flag so data reloads for the new org
      if (org?.id) {
        hasLoadedInitialData.current = false;
      }
    }
  }, [org?.id]);

  // Initial data load - runs once when org becomes available
  // Note: Don't depend on orgLoading - it creates race conditions
  useEffect(() => {
    if (org?.id && !hasLoadedInitialData.current) {
      console.log("[Dashboard] Initial data load for org:", org.id);
      hasLoadedInitialData.current = true;
      refreshAllOrgData().then(() => {
        console.log("[Dashboard] Initial data load COMPLETE for org:", org.id);
      });
    }
  }, [org?.id, refreshAllOrgData]);

  // Watch for org switches and refresh all data
  useEffect(() => {
    // Skip initial mount (orgSwitchCount starts at 0)
    if (orgSwitchCount > 0 && org?.id) {
      console.log("[Dashboard] Org switched, refreshing all data. Switch count:", orgSwitchCount);
      hasLoadedInitialData.current = true; // Mark as loaded
      refreshAllOrgData();
    }
  }, [orgSwitchCount, org?.id, refreshAllOrgData]);

  // Safety net: if OrgProvider finishes but has no active org,
  // clear loading state so the UI doesn't spin forever
  useEffect(() => {
    if (!orgLoading && !org?.id) {
      console.log("[Dashboard] Safety net: orgLoading=false, org?.id=null → clearing loading");
      setLoading(false);
    }
  }, [orgLoading, org?.id]);

  // Loading timeout recovery — if loading stays true for 3s but org data is available,
  // force loading to false. The data may still arrive via individual sub-loads.
  useEffect(() => {
    if (!loading) return;

    const timeout = setTimeout(() => {
      if (loading) {
        console.log("[Dashboard] Loading timeout — forcing loading=false. org:", org?.id || "none");
        setLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [loading, org?.id]);

  // Stable refs so the auth listener doesn't re-subscribe on every org change
  const hydrateUserRef = useRef(hydrateUser);
  const refreshProjectsRef = useRef(refreshProjects);
  useEffect(() => {
    hydrateUserRef.current = hydrateUser;
    refreshProjectsRef.current = refreshProjects;
  }, [hydrateUser, refreshProjects]);

  // Auth state listener — sole driver of initial session hydration.
  // Using onAuthStateChange(INITIAL_SESSION) avoids racing getUser() against
  // the Supabase SSR client restoring session cookies on soft navigation.
  useEffect(() => {
    let active = true;

    const unsubscribe = onAuthStateChange(async ({ event, session }) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        setProjects([]);
        router.replace("/signin");
        return;
      }

      if (event === "INITIAL_SESSION") {
        if (session?.user) {
          console.log("[Dashboard] INITIAL_SESSION — hydrating user:", session.user.email);
          const result = await hydrateUserRef.current(session.user);
          console.log("[Dashboard] INITIAL_SESSION — hydrateUser result:", result);
        } else {
          // No session in INITIAL_SESSION — the server-side layout already verified
          // auth via getUser(), so if we're here the user IS authenticated.
          // Don't redirect. The data will load via OrgProvider (API route) and
          // the loading timeout will handle showing the UI.
          console.log("[Dashboard] INITIAL_SESSION — no session, skipping (server verified auth)");
        }
        return;
      }

      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        await hydrateUserRef.current(session.user);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [router]);

  // Re-hydrate user when page is restored from bfcache, tab becomes visible, or window gains focus
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // persisted = true means page was restored from bfcache
      if (event.persisted) {
        console.log("[Dashboard] hydrateUser triggered by: pageshow (bfcache restore)");
        hydrateUser();
      }
    };

    const handleVisibilityChange = () => {
      // Re-hydrate when tab becomes visible again
      if (document.visibilityState === "visible") {
        console.log("[Dashboard] hydrateUser triggered by: visibilitychange → visible");
        hydrateUser();
      }
    };

    const handleFocus = () => {
      // Re-hydrate when window gains focus (user returns from another app/window)
      console.log("[Dashboard] hydrateUser triggered by: window focus");
      hydrateUser();
    };

    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [hydrateUser]);

  // Load recent approvals on initial mount and org change
  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  // Load promo credits on initial mount and org change
  useEffect(() => {
    loadPromoCredits();
  }, [loadPromoCredits]);

  // Load audit data when audit tab is active or filters change
  useEffect(() => {
    // Only load when on audit tab (forceLoad=false uses tab check)
    if (activeTab === "audit") {
      loadAuditData(false);
    }
  }, [activeTab, auditTab, auditTimeFilter, loadAuditData]);

  // Toggle expanded log entry
  const toggleLogExpanded = useCallback((id: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Filter logs by search query
  const filteredAuditLogs = useMemo(() => {
    if (!auditSearchQuery.trim()) return activityLogs;
    const query = auditSearchQuery.toLowerCase();
    return activityLogs.filter(
      (log) =>
        log.action.toLowerCase().includes(query) ||
        log.user_email?.toLowerCase().includes(query) ||
        log.user_name?.toLowerCase().includes(query) ||
        log.project_name?.toLowerCase().includes(query) ||
        JSON.stringify(log.details).toLowerCase().includes(query)
    );
  }, [activityLogs, auditSearchQuery]);

  // Calculate audit stats
  const auditStats = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const todayLogs = activityLogs.filter(
      (log) => new Date(log.created_at) >= todayStart
    ).length;

    const weekLogs = activityLogs.filter(
      (log) => new Date(log.created_at) >= weekStart
    ).length;

    return { todayLogs, weekLogs };
  }, [activityLogs]);

  // Handle promo code redemption (personal credits)
  const handleRedeemPromo = async () => {
    if (!promoCode.trim() || !userId || promoLoading) return;

    setPromoLoading(true);
    try {
      const response = await fetch("/api/promo-keys/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyCode: promoCode.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPromoCredits(data.totalCredits);
        setPromoCode("");
        setShowPromoModal(false);
        toast({
          title: "Promo Code Redeemed!",
          description: `${data.creditsAdded} credit${data.creditsAdded !== 1 ? "s" : ""} added to your account. Total: ${data.totalCredits}.`,
        });
      } else {
        toast({
          title: "Invalid Promo Code",
          description: data.error || "Please check your code and try again.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to redeem promo code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPromoLoading(false);
    }
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitCreate || createBusy || !selectedAddress || !paymentMethod) return;

    setCreateBusy(true);
    setError(null);

    try {
      // Consume promo credit if applicable
      if (paymentMethod === "promo_credit") {
        const consumeRes = await fetch("/api/promo-keys/consume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const consumeData = await consumeRes.json();
        if (!consumeData.success) throw new Error(consumeData.error || "Failed to use promo credit");
        setPromoCredits(consumeData.remaining);
      }

      // Create project
      const createRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
          orgId: org?.id || null,
          address: selectedAddress.address,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postal_code: selectedAddress.postal_code,
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
          payment_completed: paymentMethod === "promo_credit",
          payment_id: paymentMethod === "promo_credit" ? `promo_credit_${Date.now()}` : null,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Failed to create project");

      const project = createData.project;

      // Add to local list
      const projectWithCreator: ProjectWithCreator = {
        ...project,
        creator: profile ? { id: profile.id, email: profile.email || "", full_name: profile.full_name, avatar_url: profile.avatar_url } : null,
        isOwn: true,
      };
      setProjects((current) => [projectWithCreator, ...current]);

      // Legacy auto-roof-generation removed. We skip straight to the
      // verification/continue step — the user opens the project and uses
      // the Labeler tab to draw roof geometry by hand.
      setVerifyProjectId(project.id);
      setVerifyAddress(selectedAddress);
      setVerifyStep("verify");
      setVerifyError(null);
      setVerifyRoofData(null);
      setShowCreateModal(false);

      // Reset create form (but keep verification open)
      setCreateForm(emptyForm);
      setSelectedAddress(null);
      setPaymentMethod(null);
    } catch (err: any) {
      setError(err?.message || "Unable to create project.");
      toast({ title: "Error", description: err?.message || "Failed to create project.", variant: "destructive" });
    } finally {
      setCreateBusy(false);
    }
  };

  // Handle roof verification confirmation
  const handleVerifyConfirm = () => {
    if (verifyProjectId) {
      toast({ title: "Roof Verified!", description: "Your project is ready. Opening now..." });
      router.push(`/projects/${verifyProjectId}`);
    }
    setVerifyStep("idle");
    setVerifyRoofData(null);
    setVerifyProjectId(null);
    setVerifyAddress(null);
    setVerifyError(null);
  };

  // Handle support ticket submission
  const handleSubmitTicket = async () => {
    if (!verifyProjectId || !ticketReason.trim()) return;
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: verifyProjectId,
          orgId: org?.id,
          type: "roof_verification_rejected",
          reason: ticketReason.trim(),
          address: verifyAddress?.formatted_address || verifyAddress?.address,
          metadata: {
            squareFootage: verifyRoofData?.total_area_sf,
            planeCount: verifyRoofData?.planes?.length,
            latitude: verifyAddress?.latitude,
            longitude: verifyAddress?.longitude,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Ticket Submitted", description: "We'll review your roof data and get back to you within 24 hours." });
      setShowTicketForm(false);
      setTicketReason("");
      handleVerifyConfirm();
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to submit ticket. Please try again.", variant: "destructive" });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      if (typeof window !== "undefined") {
        // Clear only app-specific storage, NOT Supabase auth state
        // Supabase handles its own session cleanup via signOut()
        const appSpecificKeys = [
          "tutorial_state",
          "tutorial_completed_topics",
          "active_tab",
          "selected_project",
        ];
        appSpecificKeys.forEach((key) => {
          try {
            window.localStorage?.removeItem(key);
            window.sessionStorage?.removeItem(key);
          } catch {
            // Ignore storage access errors
          }
        });
      }
      router.replace("/signin");
    }
  };

  // Settings handlers
  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const { error } = await (supabase.from("users") as any)
        .update({ full_name: fullName || null })
        .eq("id", profile.id);
      if (error) throw error;
      setProfile((prev) => (prev ? { ...prev, full_name: fullName } : prev));
      toast({ title: "Saved", description: "Profile updated successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save.", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!profile) return;
    setSavingCompany(true);
    try {
      const { error } = await (supabase.from("users") as any)
        .update({
          company_name: companyName || null,
          company_phone: companyPhone || null,
          company_address: companyAddress || null,
          company_email: companyEmail || null,
          company_website: companyWebsite || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      toast({ title: "Saved", description: "Company information updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to save.", variant: "destructive" });
    } finally {
      setSavingCompany(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");

      setLogoUrl(data.url);
      toast({ title: "Logo uploaded", description: "Your company logo has been updated." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Failed to upload logo", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo and Org Switcher */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-semibold text-neutral-900">MyMetalRoofer</span>
              </div>
              <div className="h-6 w-px bg-neutral-200" />
              <OrgSwitcher
                showSettingsButton={true}
                onSettingsClick={() => setActiveTab("settings")}
              />
            </div>

            {/* Center: Large SF Display */}
            <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center px-6 py-3 bg-neutral-50 border border-neutral-200 rounded-xl">
              <div className="text-3xl font-bold text-neutral-900 tracking-tight tabular-nums">
                {formatSF(pool.total)}
              </div>
              <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
                Square Feet Available
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900">
                  <Home className="w-4 h-4 mr-1" />
                  Home
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => restartTutorial()}
                className="text-neutral-600 hover:text-neutral-900"
                title="Restart tutorial"
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                Help
              </Button>
              <div className="h-6 w-px bg-neutral-200" />
              <Button
                onClick={() => setShowCreateModal(true)}
                size="sm"
                className="bg-slate-900 hover:bg-slate-800"
                data-tutorial="new-project-btn"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Project
              </Button>

              <div className="relative ml-2" data-tutorial="user-menu">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium"
                >
                  {userLabel.charAt(0).toUpperCase()}
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 top-12 w-48 bg-white rounded-lg border border-neutral-200 shadow-lg py-1"
                    >
                      <div className="px-3 py-2 border-b border-neutral-100">
                        <p className="text-sm font-medium text-neutral-900 truncate">{userLabel}</p>
                      </div>
                      <Link
                        href="/"
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                      >
                        <Home className="w-4 h-4" />
                        Back to Home
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 -mb-px" data-tutorial="dashboard-tabs">
            {[
              { id: "overview", label: "Overview", icon: TrendingUp },
              { id: "projects", label: "Projects", icon: Building2 },
              { id: "clients", label: "Clients", icon: Contact },
              { id: "pipeline", label: "Pipeline", icon: LayoutGrid },
              { id: "calendar", label: "Calendar", icon: CalendarDays },
              { id: "estimates", label: "Estimates", icon: FileText },
              { id: "crew", label: "Crew", icon: Wrench },
              { id: "team", label: "Team", icon: Users },
              { id: "audit", label: "Audit Log", icon: History },
              { id: "settings", label: "Settings", icon: Settings, adminOnly: true },
            ].filter(tab => !tab.adminOnly || canManageBilling()).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900">Welcome back, {userLabel.split(" ")[0]}</h1>
                <p className="text-neutral-500 mt-1">Here's what's happening with your projects</p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" data-tutorial="quick-stats">
              <StatCard label="Total Projects" value={stats.total} icon={Building2} color="blue" />
              <StatCard label="In Progress" value={stats.pending} icon={Clock} color="amber" />
              <StatCard label="Total Sq Ft" value={stats.totalSqFt.toLocaleString()} icon={LayoutGrid} color="purple" />
            </div>

            {/* SF Pool Card */}
            {pool.total > 0 && (
              <div className="bg-white rounded-xl border border-neutral-200 p-5" data-tutorial="sf-pool">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Box className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-neutral-900">Organization SF Pool</h3>
                  </div>
                  {canManageBilling() && org && (
                    <Link
                      href={`/org/${org.id}/settings?tab=billing`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Manage Pool
                    </Link>
                  )}
                </div>
                <SFPoolDisplay />
              </div>
            )}

            {/* Promo Credits Card */}
            {promoCredits > 0 && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Gift className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-900">Free Project Credits</h3>
                      <p className="text-sm text-emerald-700">
                        You have <span className="font-bold">{promoCredits}</span> free project{promoCredits !== 1 ? "s" : ""} available
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Use Credit
                  </Button>
                </div>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-4">
                <div>
                  <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">Quick Actions</h2>
                  <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                    <QuickAction icon={Plus} label="Create New Project" onClick={() => setShowCreateModal(true)} />
                    <QuickAction icon={FileText} label="View All Estimates" onClick={() => setActiveTab("estimates")} />
                    <QuickAction icon={Building2} label="View All Projects" onClick={() => setActiveTab("projects")} />
                  </div>
                </div>

                {/* Promo Code Entry */}
                <div>
                  <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">Promo Code</h2>
                  <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Ticket className="w-5 h-5 text-violet-600" />
                      <span className="text-sm font-medium text-violet-900">Have a promo code?</span>
                    </div>
                    <p className="text-xs text-violet-700 mb-3">
                      Enter your code to get free project credits
                    </p>
                    <Button
                      onClick={() => setShowPromoModal(true)}
                      variant="outline"
                      size="sm"
                      className="w-full border-violet-300 text-violet-700 hover:bg-violet-100"
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Enter Promo Code
                    </Button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2" data-tutorial="projects-area">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">Recent Projects</h2>
                  <button onClick={() => setActiveTab("projects")} className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
                </div>

                {loading ? (
                  <div className="bg-white rounded-xl border border-neutral-200 p-8">
                    <Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" />
                  </div>
                ) : recentProjects.length === 0 ? (
                  <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
                    <Building2 className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                    <p className="text-neutral-600 mb-4">No projects yet</p>
                    <Button onClick={() => setShowCreateModal(true)} size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Create First Project
                    </Button>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                    {recentProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className={`flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors ${project.isOwn ? "border-l-4 border-l-blue-400" : ""
                          }`}
                      >
                        {project.creator ? (
                          <CreatorAvatar creator={project.creator} size="md" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-slate-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-neutral-900 truncate">{project.name}</p>
                            <OwnershipBadge isOwn={project.isOwn} size="sm" />
                          </div>
                          <p className="text-sm text-neutral-500 truncate">{project.city ? `${project.city}, ${project.state}` : "No address"}</p>
                        </div>
                        <Badge variant={project.payment_completed ? "default" : "secondary"}>{project.payment_completed ? "Paid" : "Pending"}</Badge>
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Projects Tab */}
        {activeTab === "projects" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-semibold text-neutral-900">Projects</h1>
              <Button onClick={() => setShowCreateModal(true)} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
            </div>

            {/* Ownership Quick Filters */}
            <div className="flex gap-2 p-1 bg-neutral-100 rounded-lg w-fit">
              <button
                onClick={() => setFilterOwnership("all")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterOwnership === "all"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                  }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilterOwnership("mine")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterOwnership === "mine"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                  }`}
              >
                My Projects ({stats.mine})
              </button>
              <button
                onClick={() => setFilterOwnership("team")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterOwnership === "team"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                  }`}
              >
                Team ({stats.team})
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input placeholder="Search projects or creators..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <div className="flex gap-2">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm">
                  <option value="date">Latest</option>
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm">
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
                <div className="flex border border-neutral-200 rounded-md overflow-hidden">
                  <button onClick={() => setViewMode("grid")} className={`p-2 ${viewMode === "grid" ? "bg-neutral-100" : "bg-white hover:bg-neutral-50"}`}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode("list")} className={`p-2 ${viewMode === "list" ? "bg-neutral-100" : "bg-white hover:bg-neutral-50"}`}>
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (<div key={i} className="h-48 animate-pulse rounded-xl bg-neutral-200" />))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">No projects found</h3>
                <p className="text-neutral-500 mb-6">{searchQuery ? "Try adjusting your search" : "Create your first project to get started"}</p>
                {!searchQuery && (<Button onClick={() => setShowCreateModal(true)}><Plus className="w-4 h-4 mr-2" />Create Project</Button>)}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project) => (<ProjectCard key={project.id} project={project} />))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                {filteredProjects.map((project) => (<ProjectRow key={project.id} project={project} />))}
              </div>
            )}
          </motion.div>
        )}

        {/* Estimates Tab */}
        {activeTab === "estimates" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h1 className="text-2xl font-semibold text-neutral-900">Estimates</h1>
            {loading ? (
              <div className="bg-white rounded-xl border border-neutral-200 p-8"><Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" /></div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">No estimates yet</h3>
                <p className="text-neutral-500 mb-6">Create a project first, then generate estimates from the project page</p>
                <Button onClick={() => setShowCreateModal(true)}><Plus className="w-4 h-4 mr-2" />Create Project</Button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                {projects.map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}?tab=estimation`} className="flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-blue-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-neutral-900 truncate">{project.name}</p>
                      <p className="text-sm text-neutral-500">{project.square_footage ? `${project.square_footage.toLocaleString()} sq ft` : "No measurements"}</p>
                    </div>
                    <span className="text-sm text-neutral-500">{new Date(project.created_at).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Team Tab - Redesigned */}
        {activeTab === "team" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Simple header with summary stats */}
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Team Overview</h1>
              <p className="text-neutral-500 mt-1">
                {new Set(projects.map((p) => p.user_id)).size} team member{new Set(projects.map((p) => p.user_id)).size !== 1 ? "s" : ""} · {projects.length} total project{projects.length !== 1 ? "s" : ""} · {stats.totalSqFt.toLocaleString()} SF
              </p>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-neutral-200 p-12">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" />
              </div>
            ) : projects.length === 0 ? (
              <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
                <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">No team activity yet</h3>
                <p className="text-neutral-500">Create projects to see team statistics</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  // Group projects by creator
                  const byCreator = projects.reduce((acc, project) => {
                    const creatorId = project.user_id || "unknown";
                    if (!acc[creatorId]) {
                      acc[creatorId] = {
                        creator: project.creator,
                        projects: [],
                        totalSF: 0,
                        isOwn: project.isOwn,
                      };
                    }
                    acc[creatorId].projects.push(project);
                    acc[creatorId].totalSF += project.square_footage || 0;
                    return acc;
                  }, {} as Record<string, { creator: typeof projects[0]["creator"]; projects: typeof projects; totalSF: number; isOwn: boolean }>);

                  return Object.entries(byCreator)
                    .sort((a, b) => b[1].projects.length - a[1].projects.length)
                    .map(([creatorId, data]) => (
                      <div key={creatorId} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                        {/* Member Header */}
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {data.creator ? (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                                {data.creator.avatar_url ? (
                                  <img
                                    src={data.creator.avatar_url}
                                    alt={data.creator.full_name || data.creator.email}
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  (data.creator.full_name?.[0] || data.creator.email[0]).toUpperCase()
                                )}
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 text-neutral-500" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-neutral-900">
                                  {data.creator?.full_name || data.creator?.email?.split("@")[0] || "Unknown"}
                                </span>
                                {data.isOwn && (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-neutral-500">{data.creator?.email}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-neutral-900">
                              {data.projects.length}
                              <span className="text-sm font-normal text-neutral-500 ml-1">
                                project{data.projects.length !== 1 ? "s" : ""}
                              </span>
                            </p>
                            <p className="text-sm text-neutral-500">
                              {data.totalSF.toLocaleString()} SF
                            </p>
                          </div>
                        </div>

                        {/* Horizontal Project Cards */}
                        <div className="px-4 pb-4">
                          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent">
                            {data.projects.slice(0, 6).map((project) => (
                              <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className="flex-shrink-0 w-40 p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 hover:border-neutral-300 transition-all hover:shadow-sm group"
                              >
                                <p className="font-medium text-neutral-800 text-sm truncate group-hover:text-neutral-900">
                                  {project.name}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-neutral-500">
                                    {(project.square_footage || 0).toLocaleString()} SF
                                  </span>
                                  <ChevronRight className="w-3 h-3 text-neutral-400 group-hover:text-neutral-600" />
                                </div>
                              </Link>
                            ))}
                            {data.projects.length > 6 && (
                              <button
                                onClick={() => {
                                  setFilterOwnership(data.isOwn ? "mine" : "team");
                                  setActiveTab("projects");
                                }}
                                className="flex-shrink-0 w-28 p-3 rounded-lg border-2 border-dashed border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 flex flex-col items-center justify-center text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
                              >
                                <span className="font-semibold">+{data.projects.length - 6}</span>
                                <span className="text-xs">more</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ));
                })()}
              </div>
            )}
          </motion.div>
        )}

        {/* Audit Tab */}
        {activeTab === "audit" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Page Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="h-6 w-6 text-slate-600" />
                  <h1 className="text-2xl font-semibold text-neutral-900">Audit Log</h1>
                </div>
                <p className="text-neutral-500 mt-1">
                  Complete activity history for {org?.name}
                </p>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" data-tutorial="audit-stats">
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-neutral-600">Today</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{auditStats.todayLogs}</p>
                <p className="text-xs text-neutral-500">actions</p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-neutral-600">This Week</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{auditStats.weekLogs}</p>
                <p className="text-xs text-neutral-500">actions</p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium text-neutral-600">Projects</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{stats.total}</p>
                <p className="text-xs text-neutral-500">total</p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-neutral-600">Members</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{auditMembers.length}</p>
                <p className="text-xs text-neutral-500">active</p>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-neutral-600">Total Logged</span>
                </div>
                <p className="text-2xl font-bold text-neutral-900">{activityLogs.length}</p>
                <p className="text-xs text-neutral-500">entries</p>
              </div>
            </div>

            {/* Activity Type Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2" data-tutorial="audit-category-tabs">
              {[
                { id: "all", label: "All Activity", icon: Activity },
                { id: "projects", label: "Projects", icon: Building2 },
                { id: "members", label: "Members", icon: Users },
                { id: "billing", label: "SF & Payments", icon: DollarSign },
                { id: "org", label: "Organization", icon: Settings },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAuditTab(tab.id as typeof auditTab)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${auditTab === tab.id
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                    }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-4 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-md" data-tutorial="audit-search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search by user, project, or action..."
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
              </div>

              {/* Time Filter */}
              <div className="flex items-center gap-2" data-tutorial="audit-time-filters">
                <Calendar className="h-4 w-4 text-neutral-400" />
                {[
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "week", label: "Past Week" },
                  { id: "month", label: "Past Month" },
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setAuditTimeFilter(filter.id as typeof auditTimeFilter)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${auditTimeFilter === filter.id
                        ? "bg-slate-900 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Log */}
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden" data-tutorial="audit-log-entries">
              <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-neutral-600" />
                  <h3 className="font-semibold text-neutral-900">Activity Timeline</h3>
                  <Badge variant="secondary" className="ml-2">
                    {filteredAuditLogs.length} entries
                  </Badge>
                </div>
              </div>

              {auditLoading ? (
                <div className="p-12">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-400 mx-auto" />
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500 font-medium">No activity found</p>
                  <p className="text-sm text-neutral-400 mt-1">
                    {auditSearchQuery ? "Try adjusting your search" : "Activity will appear here as actions are taken"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {filteredAuditLogs.map((log) => (
                    <AuditLogItem
                      key={log.id}
                      log={log}
                      expanded={expandedLogs.has(log.id)}
                      onToggle={() => toggleLogExpanded(log.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Current Members Section */}
            {(auditTab === "all" || auditTab === "members") && auditMembers.length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <h3 className="font-semibold text-neutral-900">Current Team Members</h3>
                    <Badge variant="secondary">{auditMembers.length}</Badge>
                  </div>
                </div>

                <div className="divide-y divide-neutral-100">
                  {auditMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-600">
                            {member.user?.full_name?.[0] || member.user?.email?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900">
                            {member.user?.full_name || "Unknown User"}
                          </p>
                          <p className="text-sm text-neutral-500">{member.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            member.role === "owner" ? "bg-purple-100 text-purple-700" :
                              member.role === "admin" ? "bg-blue-100 text-blue-700" :
                                member.role === "member" ? "bg-neutral-100 text-neutral-700" :
                                  "bg-neutral-100 text-neutral-500"
                          }
                        >
                          {getRoleLabel(member.role)}
                        </Badge>
                        <span className="text-xs text-neutral-400">
                          Joined {new Date(member.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* CRM Tabs */}
        {activeTab === "clients" && <ClientsTab />}
        {activeTab === "pipeline" && <PipelineTab />}
        {activeTab === "calendar" && <CalendarTab />}
        {activeTab === "crew" && <CrewTab />}

        {/* Settings Tab */}
        {activeTab === "settings" && canManageBilling() && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Page Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Settings className="h-6 w-6 text-slate-600" />
                  <h1 className="text-2xl font-semibold text-neutral-900">Organization Settings</h1>
                </div>
                <p className="text-neutral-500 mt-1">
                  Manage {org?.name} settings and configuration
                </p>
              </div>
            </div>

            {/* Settings content will be embedded from the org settings page */}
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-neutral-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">Organization Details</h3>
                  <p className="text-sm text-neutral-500">Basic organization information and settings</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-neutral-50 border border-neutral-200">
                <div>
                  <p className="font-medium text-neutral-900">{org?.name}</p>
                  <p className="text-sm text-neutral-500">
                    {org?.plan === "paid" ? "Pro Plan" : org?.plan === "trial" ? "Trial Plan" : org?.plan === "enterprise" ? "Enterprise" : "Free Plan"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => org && window.open(`/org/${org.id}/settings`, "_blank")}
                  className="border-neutral-300"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Full Settings
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-600">Team Members</span>
                </div>
                <p className="text-3xl font-bold text-neutral-900">{auditMembers.length}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Box className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-600">SF Available</span>
                </div>
                <p className="text-3xl font-bold text-neutral-900">{formatSF(pool.total)}</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="h-4 w-4 text-neutral-500" />
                  <span className="text-sm font-medium text-neutral-600">Total Projects</span>
                </div>
                <p className="text-3xl font-bold text-neutral-900">{stats.total}</p>
              </div>
            </div>

            {/* Links to Full Settings */}
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
                <h3 className="font-semibold text-neutral-900">Quick Access</h3>
              </div>
              <div className="divide-y divide-neutral-100">
                <button
                  onClick={() => org && window.open(`/org/${org.id}/settings?tab=general`, "_blank")}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <Settings className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">General Settings</p>
                      <p className="text-sm text-neutral-500">Organization name, visibility, and invite links</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </button>
                <button
                  onClick={() => org && window.open(`/org/${org.id}/settings?tab=members`, "_blank")}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">Team Members</p>
                      <p className="text-sm text-neutral-500">Manage team roles and pending invitations</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </button>
                <button
                  onClick={() => org && window.open(`/org/${org.id}/settings?tab=billing`, "_blank")}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-neutral-600" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">Billing & SF Pool</p>
                      <p className="text-sm text-neutral-500">Subscription, payments, and square footage management</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </main>

      {/* Create Project Modal - Overhauled */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setShowCreateModal(false);
              setCreateForm(emptyForm);
              setSelectedAddress(null);
              setPaymentMethod(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-neutral-100 bg-gradient-to-r from-slate-50 to-neutral-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">Create New Project</h2>
                    <p className="text-sm text-neutral-500">Enter project details and select payment method</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-6">
                {/* No Payment Available Warning */}
                {!hasPaymentMethodAvailable && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-amber-900">Payment Required</h3>
                        <p className="text-sm text-amber-700 mt-1">
                          You need either SF pool credits or a promo code to create projects.
                          {canManageBilling() && org && (
                            <Link href={`/org/${org.id}/settings?tab=billing`} className="ml-1 underline font-medium hover:text-amber-900">
                              Purchase SF credits
                            </Link>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: Project Name */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <label className="text-sm font-semibold text-neutral-800">Project Name</label>
                    <span className="text-red-500">*</span>
                  </div>
                  <Input
                    value={createForm.name}
                    onChange={(e) => setCreateForm((form) => ({ ...form, name: e.target.value }))}
                    placeholder="e.g., Smith Residence, 123 Oak Street"
                    className="h-12 text-base"
                    autoFocus
                  />
                </div>

                {/* Step 2: Property Address */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${createForm.name.trim() ? "bg-slate-900 text-white" : "bg-neutral-200 text-neutral-500"}`}>2</div>
                    <label className="text-sm font-semibold text-neutral-800">Property Address</label>
                    <span className="text-red-500">*</span>
                    <span className="text-xs text-neutral-400 ml-auto">US addresses only</span>
                  </div>
                  <AddressInput
                    value={selectedAddress}
                    onChange={setSelectedAddress}
                    disabled={!createForm.name.trim()}
                    placeholder="Search for property address..."
                    hideLabel
                  />
                </div>

                {/* Step 3: Payment Method */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${selectedAddress ? "bg-slate-900 text-white" : "bg-neutral-200 text-neutral-500"}`}>3</div>
                    <label className="text-sm font-semibold text-neutral-800">Payment Method</label>
                    <span className="text-red-500">*</span>
                  </div>

                  <div className={`grid gap-3 ${!selectedAddress ? "opacity-50 pointer-events-none" : ""}`}>
                    {/* Promo Credit Option */}
                    <button
                      type="button"
                      onClick={() => hasPromoCreditsAvailable && setPaymentMethod("promo_credit")}
                      disabled={!hasPromoCreditsAvailable || !selectedAddress}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === "promo_credit"
                          ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20"
                          : hasPromoCreditsAvailable
                            ? "border-neutral-200 hover:border-emerald-300 hover:bg-emerald-50/50"
                            : "border-neutral-100 bg-neutral-50 cursor-not-allowed"
                        }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasPromoCreditsAvailable ? "bg-emerald-100" : "bg-neutral-200"
                          }`}>
                          <Gift className={`w-5 h-5 ${hasPromoCreditsAvailable ? "text-emerald-600" : "text-neutral-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${hasPromoCreditsAvailable ? "text-neutral-900" : "text-neutral-400"}`}>
                              Free Project Credit
                            </span>
                            {hasPromoCreditsAvailable && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className={`text-sm mt-0.5 ${hasPromoCreditsAvailable ? "text-neutral-600" : "text-neutral-400"}`}>
                            {hasPromoCreditsAvailable
                              ? `Use 1 of your ${promoCredits} available credit${promoCredits !== 1 ? "s" : ""}`
                              : "No promo credits available"}
                          </p>
                        </div>
                        {paymentMethod === "promo_credit" && (
                          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      {hasPromoCreditsAvailable && (
                        <div className="mt-3 pt-3 border-t border-emerald-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-emerald-700">Cost: Free</span>
                            <span className="text-emerald-600 font-medium">{promoCredits} credit{promoCredits !== 1 ? "s" : ""} remaining</span>
                          </div>
                        </div>
                      )}
                    </button>

                    {/* SF Pool Option */}
                    <button
                      type="button"
                      onClick={() => hasSFPoolAvailable && setPaymentMethod("sf_pool")}
                      disabled={!hasSFPoolAvailable || !selectedAddress}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${paymentMethod === "sf_pool"
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20"
                          : hasSFPoolAvailable
                            ? "border-neutral-200 hover:border-blue-300 hover:bg-blue-50/50"
                            : "border-neutral-100 bg-neutral-50 cursor-not-allowed"
                        }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasSFPoolAvailable ? "bg-blue-100" : "bg-neutral-200"
                          }`}>
                          <Box className={`w-5 h-5 ${hasSFPoolAvailable ? "text-blue-600" : "text-neutral-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`font-semibold ${hasSFPoolAvailable ? "text-neutral-900" : "text-neutral-400"}`}>
                            SF Pool Credits
                          </span>
                          <p className={`text-sm mt-0.5 ${hasSFPoolAvailable ? "text-neutral-600" : "text-neutral-400"}`}>
                            {hasSFPoolAvailable
                              ? "Pay with square footage after roof measurement"
                              : "No SF credits available"}
                          </p>
                        </div>
                        {paymentMethod === "sf_pool" && (
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      {hasSFPoolAvailable && (
                        <div className="mt-3 pt-3 border-t border-blue-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-700">Pay per roof SF</span>
                            <span className="text-blue-600 font-medium">{formatPoolSF(pool.remaining)} available</span>
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* Optional Description */}
                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <label className="text-sm font-medium text-neutral-600">
                    Notes <span className="text-neutral-400">(optional)</span>
                  </label>
                  <Textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm((form) => ({ ...form, description: e.target.value }))}
                    placeholder="Any additional notes about this project..."
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Summary */}
                {canSubmitCreate && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-slate-50 border border-slate-200 p-4"
                  >
                    <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-slate-600" />
                      Ready to Create
                    </h4>
                    <div className="text-sm text-slate-600 space-y-1">
                      <p><span className="font-medium">Project:</span> {createForm.name}</p>
                      <p><span className="font-medium">Address:</span> {selectedAddress?.formatted_address}</p>
                      <p>
                        <span className="font-medium">Payment:</span>{" "}
                        {paymentMethod === "promo_credit" ? "Free project credit" : "SF Pool (pay after measurement)"}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateForm(emptyForm);
                      setSelectedAddress(null);
                      setPaymentMethod(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-12 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 shadow-lg"
                    disabled={!canSubmitCreate || createBusy}
                  >
                    {createBusy ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Create Project
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* Promo Code Modal */}
        {showPromoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowPromoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-neutral-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-neutral-900">Enter Promo Code</h2>
                    <p className="text-sm text-neutral-500">Redeem your code for free project credits</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Promo Code
                  </label>
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
                    className="font-mono text-center tracking-wider"
                    autoFocus
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    Each promo code grants 3 free project credits
                  </p>
                </div>

                {/* Credit Destination Selection */}
                {promoCredits > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-50 border border-violet-200">
                    <Gift className="w-4 h-4 text-violet-600" />
                    <span className="text-sm text-violet-900">
                      You have <span className="font-bold">{promoCredits}</span> credit{promoCredits !== 1 ? "s" : ""} remaining
                    </span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowPromoModal(false);
                      setPromoCode("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleRedeemPromo}
                    className="flex-1 bg-violet-600 hover:bg-violet-700"
                    disabled={!promoCode.trim() || promoLoading}
                  >
                    {promoLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Gift className="w-4 h-4 mr-1" />
                        Redeem Code
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        {/* Roof Verification Modal */}
        {verifyStep !== "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
                <h2 className="text-xl font-bold text-white">
                  {verifyStep === "generating" ? "Generating Roof Model..." : "Verify Your Roof"}
                </h2>
                <p className="text-sm text-orange-100 mt-1">
                  {verifyStep === "generating"
                    ? "Analyzing satellite imagery — this takes a few seconds"
                    : "Please confirm this matches the property"}
                </p>
              </div>

              {/* Generating spinner */}
              {verifyStep === "generating" && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
                  <p className="text-neutral-500 text-sm">Fetching roof data from Google Solar API...</p>
                </div>
              )}

              {/* Verification view */}
              {verifyStep === "verify" && (
                <div className="p-6 space-y-4">
                  {verifyError ? (
                    /* Error state */
                    <div className="text-center py-8 space-y-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center">
                        <X className="w-8 h-8 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900">Roof Generation Failed</h3>
                        <p className="text-sm text-neutral-500 mt-2 max-w-md mx-auto">{verifyError}</p>
                      </div>
                      <div className="flex gap-3 justify-center pt-4">
                        <Button variant="outline" onClick={handleVerifyConfirm}>
                          Continue Anyway
                        </Button>
                        <Button
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={() => setShowTicketForm(true)}
                        >
                          Submit Support Ticket
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Success — high-res aerial view + obstruction checklist */
                    <>
                      {/* High-res Google Maps aerial */}
                      {verifyAddress?.latitude && verifyAddress?.longitude ? (
                        <div className="rounded-xl overflow-hidden border border-neutral-200 shadow-sm">
                          <iframe
                            src={`https://www.google.com/maps/embed/v1/view?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ""}&center=${verifyAddress.latitude},${verifyAddress.longitude}&zoom=21&maptype=satellite`}
                            className="w-full border-0"
                            style={{ height: "440px" }}
                            allowFullScreen
                            loading="lazy"
                            title="High-resolution aerial view"
                          />
                          <div className="bg-neutral-50 px-4 py-2.5 text-xs text-neutral-600 border-t border-neutral-200">
                            <span className="font-medium text-neutral-900">
                              {verifyAddress.formatted_address ||
                                `${verifyAddress.address}, ${verifyAddress.city}, ${verifyAddress.state}`}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-8 text-center text-sm text-neutral-500">
                          Aerial view not available — address has no
                          coordinates yet.
                        </div>
                      )}

                      {/* Obstruction-verification checklist */}
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            !
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold text-neutral-900">
                              Verify the entire roof is visible
                            </h3>
                            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                              Before continuing, zoom and pan the aerial view
                              above and confirm that{" "}
                              <span className="font-medium text-neutral-900">
                                no part of the roof — not even the smallest
                                corner — is covered by trees, power lines,
                                adjacent structures, or other obstructions.
                              </span>{" "}
                              Obstructed areas reduce measurement accuracy.
                            </p>
                            <ul className="text-xs text-neutral-600 mt-3 space-y-1.5">
                              <li className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                All roof edges visible (no tree canopy)
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                Ridges, hips, and valleys clearly defined
                              </li>
                              <li className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                No shadows or glare hiding large sections
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1 h-12 border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setShowTicketForm(true)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Roof is obstructed
                        </Button>
                        <Button
                          className="flex-1 h-12 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-sm"
                          onClick={handleVerifyConfirm}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Roof is fully visible — Continue
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Support ticket form */}
                  {showTicketForm && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50 space-y-3"
                    >
                      <h4 className="font-semibold text-neutral-900">What&apos;s wrong with the roof?</h4>
                      <p className="text-xs text-neutral-500">
                        Common issues: trees covering the roof, wrong building detected, new construction not in satellite imagery, garage/shed included.
                      </p>
                      <textarea
                        value={ticketReason}
                        onChange={(e) => setTicketReason(e.target.value)}
                        placeholder="Describe what looks incorrect..."
                        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm resize-none h-20 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setShowTicketForm(false); setTicketReason(""); }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600"
                          disabled={!ticketReason.trim()}
                          onClick={handleSubmitTicket}
                        >
                          Submit Ticket
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-Components
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: "blue" | "green" | "amber" | "purple" }) {
  const colors = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", amber: "bg-amber-50 text-amber-600", purple: "bg-purple-50 text-purple-600" };
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}><Icon className="w-4 h-4" /></div>
        <span className="text-sm text-neutral-500">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, href }: { icon: any; label: string; onClick?: () => void; href?: string }) {
  const content = (<><Icon className="w-4 h-4 text-neutral-500" /><span className="flex-1 text-sm text-neutral-700">{label}</span><ChevronRight className="w-4 h-4 text-neutral-400" /></>);
  if (href) return (<Link href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors">{content}</Link>);
  return (<button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors">{content}</button>);
}

function ProjectCard({ project }: { project: ProjectWithCreator }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow ${project.isOwn ? "border-l-4 border-l-blue-400 border-neutral-200" : "border-neutral-200"
          }`}
      >
        <div className="flex items-start justify-between mb-3 gap-2">
          <h3 className="font-medium text-neutral-900 truncate">{project.name}</h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <OwnershipBadge
              isOwn={project.isOwn}
              creatorName={project.creator?.full_name || project.creator?.email}
              size="sm"
            />
            <Badge variant={project.payment_completed ? "default" : "secondary"}>
              {project.payment_completed ? "Paid" : "Pending"}
            </Badge>
          </div>
        </div>
        {project.address && (
          <div className="flex items-start gap-2 text-sm text-neutral-500 mb-3">
            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="truncate">{project.city}, {project.state}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm border-t border-neutral-100 pt-3 mt-2">
          {project.creator ? (
            <CreatorCompact creator={project.creator} />
          ) : (
            <span className="text-neutral-500">{new Date(project.created_at).toLocaleDateString()}</span>
          )}
          <div className="flex items-center gap-3">
            <span className="text-neutral-400 text-xs">{new Date(project.created_at).toLocaleDateString()}</span>
            {project.square_footage && (
              <span className="font-medium text-blue-600">{project.square_footage.toLocaleString()} SF</span>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function ProjectRow({ project }: { project: ProjectWithCreator }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className={`flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors ${project.isOwn ? "border-l-4 border-l-blue-400" : ""
        }`}
    >
      {/* Creator Avatar or Building Icon */}
      {project.creator ? (
        <CreatorAvatar creator={project.creator} size="md" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-slate-600" />
        </div>
      )}

      {/* Project Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-neutral-900 truncate">{project.name}</p>
          <OwnershipBadge
            isOwn={project.isOwn}
            creatorName={project.creator?.full_name || project.creator?.email}
            size="sm"
          />
        </div>
        <p className="text-sm text-neutral-500 truncate">
          {project.address ? `${project.city}, ${project.state}` : "No address"}
          {project.creator && !project.isOwn && (
            <span className="ml-2 text-neutral-400">
              by {project.creator.full_name?.split(" ")[0] || project.creator.email.split("@")[0]}
            </span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-sm font-medium text-neutral-900">
          {project.square_footage ? `${project.square_footage.toLocaleString()} SF` : "—"}
        </p>
        <p className="text-xs text-neutral-500">{new Date(project.created_at).toLocaleDateString()}</p>
      </div>

      {/* Status Badge */}
      <Badge variant={project.payment_completed ? "default" : "secondary"}>
        {project.payment_completed ? "Paid" : "Pending"}
      </Badge>
      <ChevronRight className="w-4 h-4 text-neutral-400" />
    </Link>
  );
}

// Activity Log Item Component
function AuditLogItem({
  log,
  expanded,
  onToggle,
}: {
  log: ActivityLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const color = getActionColor(log.action);

  const colorClasses: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    purple: "bg-purple-100 text-purple-700",
    neutral: "bg-neutral-100 text-neutral-700",
  };

  // Get icon based on action type
  const getActionIcon = () => {
    if (log.action.includes("created")) return Building2;
    if (log.action.includes("deleted")) return Trash2;
    if (log.action.includes("updated") || log.action.includes("changed")) return Edit3;
    if (log.action.includes("viewed")) return Eye;
    if (log.action.includes("invited")) return UserPlus;
    if (log.action.includes("joined")) return UserPlus;
    if (log.action.includes("removed")) return UserMinus;
    if (log.action.includes("purchased")) return ArrowUpRight;
    if (log.action.includes("consumed")) return ArrowDownRight;
    if (log.action.includes("member")) return Users;
    if (log.action.includes("sf.")) return Box;
    return Activity;
  };

  const IconComponent = getActionIcon();

  return (
    <div
      className="px-4 py-3 hover:bg-neutral-50 transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-full p-2 flex-shrink-0 ${colorClasses[color]}`}>
          <IconComponent className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-neutral-900">
              {formatActionLabel(log.action)}
            </span>
            {log.status === "failed" && (
              <Badge variant="destructive" className="text-xs">Failed</Badge>
            )}
            {log.project_name && (
              <Badge variant="outline" className="text-xs">
                {log.project_name}
              </Badge>
            )}
            {log.sf_amount && (
              <Badge
                className={`text-xs ${log.action.includes("purchased") || log.action.includes("refund") || log.action.includes("promo")
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                  }`}
              >
                {log.action.includes("purchased") || log.action.includes("refund") || log.action.includes("promo") ? "+" : "-"}
                {formatSF(Math.abs(log.sf_amount))}
              </Badge>
            )}
            {log.amount_cents && log.amount_cents > 0 && (
              <Badge className="text-xs bg-green-100 text-green-700">
                ${(log.amount_cents / 100).toFixed(2)}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1 text-sm text-neutral-500">
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {log.user_name || log.user_email || "System"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(log.created_at).toLocaleString()}
            </span>
          </div>

          {/* Expanded Details */}
          {expanded && log.details && Object.keys(log.details).length > 0 && (
            <div className="mt-3 p-3 bg-neutral-100 rounded-lg">
              <p className="text-xs font-medium text-neutral-600 mb-2">Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(log.details).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-neutral-500 capitalize">{key.replace(/_/g, " ")}:</span>
                    <span className="text-neutral-700 font-medium truncate">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ChevronRight
          className={`h-4 w-4 text-neutral-400 transition-transform flex-shrink-0 ${expanded ? "rotate-90" : ""
            }`}
        />
      </div>
    </div>
  );
}
