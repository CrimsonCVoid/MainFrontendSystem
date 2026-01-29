"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import {
  createProject,
  deleteProject,
  listProjectsWithCreators,
  type ProjectInput,
  type ProjectWithCreator,
} from "@/lib/projects";
import { OwnershipBadge } from "@/components/project/OwnershipBadge";
import { CreatorAvatar, CreatorCompact } from "@/components/project/CreatorAvatar";
import { getCurrentSession, getCurrentUser, onAuthStateChange, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { OrgSwitcher } from "@/components/org/org-switcher";
import { useOrg, useSFPool } from "@/components/providers/org-provider";
import { SFPoolDisplay, SFPoolBadge } from "@/components/org/sf-pool-display";
import { getRecentApprovals, type EstimateShare } from "@/lib/estimate-sharing";

type FormState = {
  name: string;
  description: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
};

type DashboardTab = "overview" | "projects" | "estimates" | "team";

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
  const supabase = getSupabaseBrowserClient();
  const { toast } = useToast();
  const { org, loading: orgLoading, canManageBilling } = useOrg();
  const { pool, statusColor, format: formatPoolSF } = useSFPool();

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
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
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

  const canSubmitCreate = useMemo(
    () => createForm.name.trim().length > 0,
    [createForm.name]
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

  // Load user and profile
  const hydrateUser = useCallback(async () => {
    // Use getUser() for secure authentication (validates with Supabase server)
    let user = await getCurrentUser();

    if (!user) {
      // Fall back to session only if getUser() fails
      try {
        const session = await getCurrentSession();
        user = session?.user ?? null;
      } catch (err) {
        console.warn("Unable to resolve current user:", err);
      }
    }

    if (!user) {
      return false;
    }

    setUserId(user.id);

    // Try to get name from user metadata first
    let displayName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      (user.user_metadata?.given_name as string | undefined);

    // If no name in metadata, try to get from profile in database
    if (!displayName) {
      const { data: profileCheck } = await supabase
        .from("users")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      const profile = profileCheck as { full_name: string | null; email: string | null } | null;
      if (profile?.full_name) {
        displayName = profile.full_name;
      }
    }

    // Fall back to email or placeholder
    setUserLabel(displayName || user.email || "User");

    // Load profile data
    const { data: profileData } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

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
  }, [supabase]);

  const refreshProjects = useCallback(
    async (opts: { background?: boolean } = {}) => {
      if (opts.background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        // Load projects with creator info scoped to current organization
        const data = await listProjectsWithCreators(org?.id);
        setProjects(data);
        setError(null);
      } catch (err: any) {
        setError(err?.message || "Unable to load projects.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [org?.id]
  );

  useEffect(() => {
    let active = true;

    const boot = async () => {
      const ready = await hydrateUser();
      if (!active || !ready) return;
      // Wait for org context before loading projects
      if (!orgLoading) {
        await refreshProjects();
      }
    };

    boot();

    const unsubscribe = onAuthStateChange(async ({ event, session }) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        setProjects([]);
        router.replace("/signin");
        return;
      }

      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        await hydrateUser();
        if (!orgLoading) {
          await refreshProjects({ background: event !== "INITIAL_SESSION" });
        }
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [hydrateUser, refreshProjects, router, orgLoading]);

  // Refresh projects when organization changes
  useEffect(() => {
    if (!orgLoading && org?.id) {
      refreshProjects({ background: true });
    }
  }, [org?.id, orgLoading, refreshProjects]);

  // Load recent approvals
  useEffect(() => {
    async function loadApprovals() {
      if (!org?.id) return;
      setApprovalsLoading(true);
      try {
        const approvals = await getRecentApprovals(org.id, 5, supabase);
        setRecentApprovals(approvals);
      } catch (err) {
        console.error("Failed to load recent approvals:", err);
      } finally {
        setApprovalsLoading(false);
      }
    }
    loadApprovals();
  }, [org?.id, supabase]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitCreate || createBusy) return;

    setCreateBusy(true);
    setError(null);

    try {
      const input: ProjectInput = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
      };
      const project = await createProject(input);

      // Add to projects with creator info (current user)
      const projectWithCreator: ProjectWithCreator = {
        ...project,
        creator: profile ? {
          id: profile.id,
          email: profile.email || "",
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        } : null,
        isOwn: true,
      };
      setProjects((current) => [projectWithCreator, ...current]);
      setCreateForm(emptyForm);
      setShowCreateModal(false);
      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err?.message || "Unable to create project.");
    } finally {
      setCreateBusy(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage?.clear?.();
        window.sessionStorage?.clear?.();
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-semibold text-neutral-900">MyMetalRoofer</span>
              </div>
              <div className="h-6 w-px bg-neutral-200" />
              <OrgSwitcher />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={() => setShowCreateModal(true)} size="sm" className="bg-slate-900 hover:bg-slate-800">
                <Plus className="w-4 h-4 mr-1" />
                New Project
              </Button>

              <div className="relative ml-2">
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
          <nav className="flex gap-1 -mb-px">
            {[
              { id: "overview", label: "Overview", icon: TrendingUp },
              { id: "projects", label: "Projects", icon: Building2 },
              { id: "team", label: "Team", icon: Users },
              { id: "estimates", label: "Estimates", icon: FileText },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <Link
              href="/audit"
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 transition-colors"
            >
              <History className="w-4 h-4" />
              Audit Log
            </Link>
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

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Projects" value={stats.total} icon={Building2} color="blue" />
              <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} color="green" />
              <StatCard label="In Progress" value={stats.pending} icon={Clock} color="amber" />
              <StatCard label="Total Sq Ft" value={stats.totalSqFt.toLocaleString()} icon={LayoutGrid} color="purple" />
            </div>

            {/* SF Pool Card */}
            {pool.total > 0 && (
              <div className="bg-white rounded-xl border border-neutral-200 p-5">
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

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-3">Quick Actions</h2>
                <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-100">
                  <QuickAction icon={Plus} label="Create New Project" onClick={() => setShowCreateModal(true)} />
                  <QuickAction icon={FileText} label="View All Estimates" onClick={() => setActiveTab("estimates")} />
                  <QuickAction icon={Building2} label="View All Projects" onClick={() => setActiveTab("projects")} />
                </div>
              </div>

              <div className="lg:col-span-2">
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
                        className={`flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors ${
                          project.isOwn ? "border-l-4 border-l-blue-400" : ""
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
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filterOwnership === "all"
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilterOwnership("mine")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filterOwnership === "mine"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                My Projects ({stats.mine})
              </button>
              <button
                onClick={() => setFilterOwnership("team")}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filterOwnership === "team"
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

      </main>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-neutral-200">
                <h2 className="text-xl font-semibold text-neutral-900">New Project</h2>
                <p className="text-sm text-neutral-500 mt-1">Create a new roofing project</p>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Project Name <span className="text-red-500">*</span></label>
                  <Input value={createForm.name} onChange={(e) => setCreateForm((form) => ({ ...form, name: e.target.value }))} placeholder="e.g., Smith Residence" autoFocus />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">Description <span className="text-neutral-400">(optional)</span></label>
                  <Textarea value={createForm.description} onChange={(e) => setCreateForm((form) => ({ ...form, description: e.target.value }))} placeholder="Notes about the project..." rows={3} />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowCreateModal(false); setCreateForm(emptyForm); }}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800" disabled={!canSubmitCreate || createBusy}>
                    {createBusy ? (<Loader2 className="w-4 h-4 animate-spin" />) : (<><Plus className="w-4 h-4 mr-1" />Create</>)}
                  </Button>
                </div>
              </form>
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
        className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow ${
          project.isOwn ? "border-l-4 border-l-blue-400 border-neutral-200" : "border-neutral-200"
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
      className={`flex items-center gap-4 p-4 hover:bg-neutral-50 transition-colors ${
        project.isOwn ? "border-l-4 border-l-blue-400" : ""
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
