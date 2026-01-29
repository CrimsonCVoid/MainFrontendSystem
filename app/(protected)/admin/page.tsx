"use client";

/**
 * Admin Dashboard
 *
 * Comprehensive activity logs and analytics for organization admins.
 * Shows project creation per user, SF usage, and detailed activity feed.
 */

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOrg, useSFPool } from "@/components/providers/org-provider";
import { GlobalHeader } from "@/components/layout/global-header";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getCurrentUser } from "@/lib/auth";
import { formatSF } from "@/lib/sf-pool";
import {
  type ActivityLogEntry,
  type ActivityCategory,
  getActivityLogs,
  getProjectSummaryByUser,
  getDailyActivitySummary,
  formatActionLabel,
  formatCategoryLabel,
  getActionColor,
} from "@/lib/activity-log";
import { listProjectsWithCreators, listArchivedProjects, archiveProject, unarchiveProject, type ProjectWithCreator } from "@/lib/projects";
import { canAccessPromoKeys } from "@/lib/promo-access";
import { CreatorAvatar } from "@/components/project/CreatorAvatar";
import { OwnershipBadge } from "@/components/project/OwnershipBadge";
import { AnalyticsCharts } from "@/components/admin/AnalyticsCharts";
import { ReassignProjectDialog } from "@/components/admin/ReassignProjectDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Loader2,
  Building2,
  Users,
  Package,
  BarChart3,
  TrendingUp,
  Calendar,
  Filter,
  RefreshCw,
  ChevronRight,
  Clock,
  User,
  FileText,
  CreditCard,
  Shield,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  UserCog,
  Key,
  Copy,
  Check,
  Archive,
  RotateCcw,
} from "lucide-react";

interface UserSummary {
  user_id: string;
  user_email: string;
  user_name: string | null;
  project_count: number;
  total_sf_used: number;
  first_project: string;
  last_project: string;
}

interface DailySummary {
  date: string;
  projects_created: number;
  sf_consumed: number;
  sf_purchased: number;
  unique_users: number;
}

type TabType = "activity" | "users" | "analytics" | "projects" | "promo-keys" | "archived";
type CategoryFilter = "all" | ActivityCategory;

interface PromoKey {
  id: string;
  key_code: string;
  is_used: boolean;
  used_by_user_id: string | null;
  used_for_project_id: string | null;
  used_at: string | null;
  created_at: string;
  created_by: string | null;
  metadata: any;
  notes: string | null;
  credits_total: number;
  credits_remaining: number;
  used_by_user: { email: string; full_name: string | null } | null;
}

interface PromoKeyStats {
  total: number;
  unused: number;
  partiallyUsed: number;
  fullyUsed: number;
  totalCredits: number;
  remainingCredits: number;
}

export default function AdminPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const { org, role, isAdmin, loading: orgLoading } = useOrg();
  const { pool, format: formatPoolSF } = useSFPool();

  const [user, setUser] = useState<{ email?: string; full_name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectWithCreator[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectCreatorFilter, setProjectCreatorFilter] = useState<string>("all");
  const [reassignProject, setReassignProject] = useState<ProjectWithCreator | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  // Promo keys state
  const [promoKeys, setPromoKeys] = useState<PromoKey[]>([]);
  const [promoKeyStats, setPromoKeyStats] = useState<PromoKeyStats | null>(null);
  const [promoKeysLoading, setPromoKeysLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [promoKeyFilter, setPromoKeyFilter] = useState<"all" | "unused" | "partial" | "used">("all");

  // Archived projects state
  const [archivedProjects, setArchivedProjects] = useState<ProjectWithCreator[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [restoringProjectId, setRestoringProjectId] = useState<string | null>(null);

  // UI states
  const [activeTab, setActiveTab] = useState<TabType>("activity");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Load user securely
  useEffect(() => {
    async function loadUser() {
      const authUser = await getCurrentUser();
      if (!authUser) {
        router.replace("/signin");
        return;
      }
      setCurrentUserId(authUser.id);
      setUser({
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name as string | undefined,
      });
    }
    loadUser();
  }, [router]);

  // Check admin access
  useEffect(() => {
    if (!orgLoading && !isAdmin()) {
      router.replace("/dashboard");
    }
  }, [orgLoading, isAdmin, router]);

  // Load data
  useEffect(() => {
    async function loadData() {
      if (!org?.id) return;

      setLoading(true);
      try {
        const [logs, users, daily, projects] = await Promise.all([
          getActivityLogs(supabase, org.id, {
            limit: 100,
            category: categoryFilter !== "all" ? categoryFilter : undefined,
            userId: selectedUser || undefined,
          }),
          getProjectSummaryByUser(supabase, org.id),
          getDailyActivitySummary(supabase, org.id, 30),
          listProjectsWithCreators(org.id, supabase),
        ]);

        setActivityLogs(logs);
        setUserSummaries(users);
        setDailySummaries(daily);
        setAllProjects(projects);
      } catch (err) {
        console.error("Failed to load admin data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [org?.id, supabase, categoryFilter, selectedUser]);

  async function handleRefresh() {
    if (!org?.id) return;
    setRefreshing(true);
    try {
      const logs = await getActivityLogs(supabase, org.id, {
        limit: 100,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
      });
      setActivityLogs(logs);
    } finally {
      setRefreshing(false);
    }
  }

  // Load promo keys when tab is selected
  async function loadPromoKeys() {
    setPromoKeysLoading(true);
    try {
      const res = await fetch("/api/admin/promo-keys");
      const data = await res.json();
      if (data.success) {
        setPromoKeys(data.keys);
        setPromoKeyStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load promo keys:", err);
    } finally {
      setPromoKeysLoading(false);
    }
  }

  // Load promo keys when tab changes
  useEffect(() => {
    if (activeTab === "promo-keys" && promoKeys.length === 0) {
      loadPromoKeys();
    }
  }, [activeTab]);

  // Load archived projects
  async function loadArchivedProjects() {
    if (!org?.id) return;
    setArchivedLoading(true);
    try {
      const archived = await listArchivedProjects(org.id, supabase);
      setArchivedProjects(archived);
    } catch (err) {
      console.error("Failed to load archived projects:", err);
    } finally {
      setArchivedLoading(false);
    }
  }

  // Load archived projects when tab changes
  useEffect(() => {
    if (activeTab === "archived" && archivedProjects.length === 0) {
      loadArchivedProjects();
    }
  }, [activeTab, org?.id]);

  // Handle restore project
  async function handleRestoreProject(projectId: string, newOwnerId?: string) {
    setRestoringProjectId(projectId);
    try {
      const result = await unarchiveProject(projectId, newOwnerId, supabase);
      if (result.success) {
        // Refresh both lists
        await Promise.all([
          loadArchivedProjects(),
          (async () => {
            const projects = await listProjectsWithCreators(org!.id, supabase);
            setAllProjects(projects);
          })(),
        ]);
      } else {
        console.error("Failed to restore project:", result.error);
        alert(result.error || "Failed to restore project");
      }
    } catch (err) {
      console.error("Failed to restore project:", err);
    } finally {
      setRestoringProjectId(null);
    }
  }

  // Copy key to clipboard
  function copyToClipboard(keyCode: string) {
    navigator.clipboard.writeText(keyCode);
    setCopiedKey(keyCode);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Filter promo keys
  const filteredPromoKeys = useMemo(() => {
    if (promoKeyFilter === "all") return promoKeys;
    return promoKeys.filter((key) => {
      if (promoKeyFilter === "unused") return key.credits_remaining === key.credits_total;
      if (promoKeyFilter === "partial") return key.credits_remaining > 0 && key.credits_remaining < key.credits_total;
      if (promoKeyFilter === "used") return key.credits_remaining === 0;
      return true;
    });
  }, [promoKeys, promoKeyFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalProjects = userSummaries.reduce((sum, u) => sum + u.project_count, 0);
    const totalSFUsed = userSummaries.reduce((sum, u) => sum + u.total_sf_used, 0);
    const activeUsers = userSummaries.length;
    const todayLogs = activityLogs.filter(
      (log) => new Date(log.created_at).toDateString() === new Date().toDateString()
    ).length;

    return { totalProjects, totalSFUsed, activeUsers, todayLogs };
  }, [userSummaries, activityLogs]);

  if (orgLoading || !isAdmin()) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-neutral-400 animate-spin" />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "activity" as const, label: "Activity Feed", icon: Clock },
    { id: "projects" as const, label: "All Projects", icon: Building2 },
    { id: "users" as const, label: "User Analytics", icon: Users },
    { id: "analytics" as const, label: "Daily Stats", icon: BarChart3 },
    // Only show promo-keys tab for allowed users
    ...(canAccessPromoKeys(currentUserId) ? [{ id: "promo-keys" as const, label: "Promo Keys", icon: Key }] : []),
    { id: "archived" as const, label: "Archived", icon: Archive },
  ];

  const categories: { id: CategoryFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "project", label: "Projects" },
    { id: "billing", label: "Billing" },
    { id: "member", label: "Members" },
    { id: "auth", label: "Auth" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      <GlobalHeader user={user} />

      {/* Page Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-5 w-5 text-purple-600" />
                <h1 className="text-2xl font-bold text-neutral-900">Admin Dashboard</h1>
              </div>
              <p className="text-neutral-500">
                Activity logs and analytics for {org?.name}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-100 p-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.totalProjects}</p>
                <p className="text-sm text-neutral-500">Total Projects</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{formatSF(stats.totalSFUsed)}</p>
                <p className="text-sm text-neutral-500">SF Consumed</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-100 p-2">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.activeUsers}</p>
                <p className="text-sm text-neutral-500">Active Users</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-2">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">{stats.todayLogs}</p>
                <p className="text-sm text-neutral-500">Actions Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-neutral-500" />
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    categoryFilter === cat.id
                      ? "bg-slate-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Activity List */}
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-neutral-400 animate-spin" />
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No activity logs yet</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {activityLogs.map((log) => (
                    <ActivityLogRow key={log.id} log={log} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
              <h3 className="font-semibold text-neutral-900">Project Creation by User</h3>
              <p className="text-sm text-neutral-500">Itemized breakdown of SF usage per team member</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-neutral-400 animate-spin" />
              </div>
            ) : userSummaries.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500">No project activity yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3 text-center">Projects</th>
                      <th className="px-4 py-3 text-right">SF Used</th>
                      <th className="px-4 py-3 text-right">Avg SF/Project</th>
                      <th className="px-4 py-3">First Project</th>
                      <th className="px-4 py-3">Last Project</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {userSummaries.map((summary) => (
                      <tr key={summary.user_id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-slate-600">
                                {summary.user_name?.[0] || summary.user_email[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900">
                                {summary.user_name || "Unknown"}
                              </p>
                              <p className="text-xs text-neutral-500">{summary.user_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{summary.project_count}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-neutral-900">
                          {formatSF(summary.total_sf_used)}
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-600">
                          {formatSF(Math.round(summary.total_sf_used / summary.project_count))}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-500">
                          {new Date(summary.first_project).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-500">
                          {new Date(summary.last_project).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-neutral-50 font-semibold">
                      <td className="px-4 py-3 text-neutral-900">Total</td>
                      <td className="px-4 py-3 text-center text-neutral-900">
                        {stats.totalProjects}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-900">
                        {formatSF(stats.totalSFUsed)}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-600">
                        {stats.totalProjects > 0
                          ? formatSF(Math.round(stats.totalSFUsed / stats.totalProjects))
                          : "—"}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-neutral-400 animate-spin" />
              </div>
            ) : dailySummaries.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500">No activity in the last 30 days</p>
              </div>
            ) : (
              <>
                {/* Visual Analytics Charts */}
                <AnalyticsCharts
                  dailySummaries={dailySummaries}
                  userSummaries={userSummaries}
                  totalProjects={stats.totalProjects}
                  totalSFUsed={stats.totalSFUsed}
                />

                {/* Detailed Daily Table */}
                <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
                    <h3 className="font-semibold text-neutral-900">Daily Breakdown (Last 30 Days)</h3>
                    <p className="text-sm text-neutral-500">Detailed activity data by date</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3 text-center">Projects</th>
                          <th className="px-4 py-3 text-right">SF Consumed</th>
                          <th className="px-4 py-3 text-right">SF Purchased</th>
                          <th className="px-4 py-3 text-center">Active Users</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {dailySummaries.map((day) => (
                          <tr key={day.date} className="hover:bg-neutral-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-neutral-400" />
                                <span className="font-medium text-neutral-900">
                                  {new Date(day.date).toLocaleDateString("en-US", {
                                    weekday: "short",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {day.projects_created > 0 ? (
                                <Badge className="bg-emerald-100 text-emerald-700">
                                  +{day.projects_created}
                                </Badge>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {day.sf_consumed > 0 ? (
                                <span className="flex items-center justify-end gap-1 text-amber-600 font-medium">
                                  <ArrowDownRight className="h-3 w-3" />
                                  {formatSF(day.sf_consumed)}
                                </span>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {day.sf_purchased > 0 ? (
                                <span className="flex items-center justify-end gap-1 text-emerald-600 font-medium">
                                  <ArrowUpRight className="h-3 w-3" />
                                  {formatSF(day.sf_purchased)}
                                </span>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-neutral-600">{day.unique_users}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "projects" && (
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search projects or creators..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="w-full h-9 rounded-md border border-neutral-200 bg-white pl-9 pr-3 text-sm"
                />
              </div>
              <select
                value={projectCreatorFilter}
                onChange={(e) => setProjectCreatorFilter(e.target.value)}
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm"
              >
                <option value="all">All Creators</option>
                {userSummaries.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.user_name || u.user_email}
                  </option>
                ))}
              </select>
            </div>

            {/* Projects Table */}
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
                <h3 className="font-semibold text-neutral-900">All Organization Projects</h3>
                <p className="text-sm text-neutral-500">
                  Full project list with creator attribution ({allProjects.length} total)
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-neutral-400 animate-spin" />
                </div>
              ) : allProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No projects yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Creator</th>
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3 text-right">SF</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {allProjects
                        .filter((p) => {
                          // Creator filter
                          if (projectCreatorFilter !== "all" && p.user_id !== projectCreatorFilter) {
                            return false;
                          }
                          // Search filter
                          if (projectSearch.trim()) {
                            const search = projectSearch.toLowerCase();
                            return (
                              p.name.toLowerCase().includes(search) ||
                              p.address?.toLowerCase().includes(search) ||
                              p.city?.toLowerCase().includes(search) ||
                              p.creator?.full_name?.toLowerCase().includes(search) ||
                              p.creator?.email?.toLowerCase().includes(search)
                            );
                          }
                          return true;
                        })
                        .map((project) => (
                          <tr key={project.id} className="hover:bg-neutral-50">
                            <td className="px-4 py-3">
                              {project.creator ? (
                                <div className="flex items-center gap-2">
                                  <CreatorAvatar creator={project.creator} size="sm" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-neutral-900 truncate max-w-[120px]">
                                      {project.creator.full_name || project.creator.email.split("@")[0]}
                                    </p>
                                    <p className="text-xs text-neutral-500 truncate max-w-[120px]">
                                      {project.creator.email}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-neutral-400">Unknown</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-neutral-900">{project.name}</p>
                              {project.description && (
                                <p className="text-xs text-neutral-500 truncate max-w-[200px]">
                                  {project.description}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {project.address ? (
                                <div className="text-sm">
                                  <p className="text-neutral-900">{project.city}, {project.state}</p>
                                  <p className="text-xs text-neutral-500 truncate max-w-[150px]">
                                    {project.address}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-neutral-400 text-sm">No address</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {project.square_footage ? (
                                <span className="font-medium text-blue-600">
                                  {project.square_footage.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-neutral-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge
                                variant={project.payment_completed ? "default" : "secondary"}
                              >
                                {project.payment_completed ? "Paid" : "Pending"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-neutral-500">
                              {new Date(project.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setReassignProject(project)}
                                  className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                                  title="Reassign project owner"
                                >
                                  <UserCog className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (confirm(`Archive "${project.name}"? It will be hidden from the dashboard.`)) {
                                      const result = await archiveProject(project.id, supabase);
                                      if (result.success) {
                                        const projects = await listProjectsWithCreators(org!.id, supabase);
                                        setAllProjects(projects);
                                      } else {
                                        alert(result.error || "Failed to archive project");
                                      }
                                    }
                                  }}
                                  className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700"
                                  title="Archive project"
                                >
                                  <Archive className="h-4 w-4" />
                                </button>
                                <Link
                                  href={`/projects/${project.id}`}
                                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                >
                                  View
                                  <ChevronRight className="h-4 w-4" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "promo-keys" && canAccessPromoKeys(currentUserId) && (
          <div className="space-y-4">
            {/* Stats Cards */}
            {promoKeyStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-100 p-2">
                      <Key className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-neutral-900">{promoKeyStats.total}</p>
                      <p className="text-sm text-neutral-500">Total Keys</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-neutral-900">{promoKeyStats.unused}</p>
                      <p className="text-sm text-neutral-500">Unused</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-amber-100 p-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-neutral-900">{promoKeyStats.partiallyUsed}</p>
                      <p className="text-sm text-neutral-500">Partial Use</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-100 p-2">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-neutral-900">
                        {promoKeyStats.remainingCredits}/{promoKeyStats.totalCredits}
                      </p>
                      <p className="text-sm text-neutral-500">Credits Left</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-neutral-500" />
              {[
                { id: "all" as const, label: "All Keys" },
                { id: "unused" as const, label: "Unused" },
                { id: "partial" as const, label: "Partial Use" },
                { id: "used" as const, label: "Fully Used" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setPromoKeyFilter(filter.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                    promoKeyFilter === filter.id
                      ? "bg-slate-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  )}
                >
                  {filter.label}
                </button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={loadPromoKeys}
                disabled={promoKeysLoading}
                className="ml-auto"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", promoKeysLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {/* Keys Table */}
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
                <h3 className="font-semibold text-neutral-900">Promotional Keys</h3>
                <p className="text-sm text-neutral-500">
                  Each key provides 3 free project unlocks • Showing {filteredPromoKeys.length} of {promoKeys.length} keys
                </p>
              </div>

              {promoKeysLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-neutral-400 animate-spin" />
                </div>
              ) : filteredPromoKeys.length === 0 ? (
                <div className="text-center py-12">
                  <Key className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No promo keys found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Key Code</th>
                        <th className="px-4 py-3 text-center">Credits</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3">Used By</th>
                        <th className="px-4 py-3">Last Used</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {filteredPromoKeys.map((key) => (
                        <tr key={key.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3">
                            <code className="font-mono text-sm bg-neutral-100 px-2 py-1 rounded">
                              {key.key_code}
                            </code>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn(
                              "font-medium",
                              key.credits_remaining === 0 ? "text-neutral-400" :
                              key.credits_remaining === key.credits_total ? "text-emerald-600" :
                              "text-amber-600"
                            )}>
                              {key.credits_remaining}/{key.credits_total}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {key.credits_remaining === key.credits_total ? (
                              <Badge className="bg-emerald-100 text-emerald-700">Unused</Badge>
                            ) : key.credits_remaining === 0 ? (
                              <Badge className="bg-neutral-100 text-neutral-600">Depleted</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700">Partial</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {key.used_by_user ? (
                              <div className="text-sm">
                                <p className="font-medium text-neutral-900">
                                  {key.used_by_user.full_name || key.used_by_user.email.split("@")[0]}
                                </p>
                                <p className="text-xs text-neutral-500">{key.used_by_user.email}</p>
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-500">
                            {key.used_at ? new Date(key.used_at).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => copyToClipboard(key.key_code)}
                              className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
                              title="Copy key"
                            >
                              {copiedKey === key.key_code ? (
                                <Check className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <Copy className="h-4 w-4 text-neutral-500" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">How Promo Keys Work</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Each key has 3 credits for unlocking projects</li>
                    <li>Users enter keys on locked project pages</li>
                    <li>Keys can be shared - multiple users can use the same key</li>
                    <li>Once all 3 credits are used, the key is depleted</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "archived" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-900">Archived Projects</h3>
                <p className="text-sm text-neutral-500">
                  Projects that have been archived. You can restore them or reassign to a different owner.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadArchivedProjects}
                disabled={archivedLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", archivedLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {/* Archived Projects Table */}
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              {archivedLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-neutral-400 animate-spin" />
                </div>
              ) : archivedProjects.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
                  <p className="text-neutral-500">No archived projects</p>
                  <p className="text-sm text-neutral-400 mt-1">
                    Archived projects will appear here
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-neutral-50 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        <th className="px-4 py-3">Project</th>
                        <th className="px-4 py-3">Original Owner</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3 text-right">SF</th>
                        <th className="px-4 py-3">Archived</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {archivedProjects.map((project) => (
                        <tr key={project.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-neutral-900">{project.name}</p>
                            {project.description && (
                              <p className="text-xs text-neutral-500 truncate max-w-[200px]">
                                {project.description}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {project.creator ? (
                              <div className="flex items-center gap-2">
                                <CreatorAvatar creator={project.creator} size="sm" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-neutral-900 truncate max-w-[120px]">
                                    {project.creator.full_name || project.creator.email.split("@")[0]}
                                  </p>
                                  <p className="text-xs text-neutral-500 truncate max-w-[120px]">
                                    {project.creator.email}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-neutral-400">Unknown</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {project.address ? (
                              <div className="text-sm">
                                <p className="text-neutral-900">{project.city}, {project.state}</p>
                                <p className="text-xs text-neutral-500 truncate max-w-[150px]">
                                  {project.address}
                                </p>
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-sm">No address</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {project.square_footage ? (
                              <span className="font-medium text-blue-600">
                                {project.square_footage.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-500">
                            {project.archived_at
                              ? new Date(project.archived_at).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreProject(project.id)}
                                disabled={restoringProjectId === project.id}
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                              >
                                {restoringProjectId === project.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Restore
                                  </>
                                )}
                              </Button>
                              <button
                                onClick={() => setReassignProject(project)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded border border-purple-200"
                                title="Restore and reassign to different owner"
                              >
                                <UserCog className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Help Text */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">About Archived Projects</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-700">
                    <li>Archived projects are hidden from the regular dashboard</li>
                    <li>Restoring a project makes it visible again to its owner</li>
                    <li>You can reassign ownership when restoring a project</li>
                    <li>All project data is preserved when archived</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reassign Project Dialog */}
      {reassignProject && org && (
        <ReassignProjectDialog
          project={reassignProject}
          orgId={org.id}
          currentUserId={currentUserId}
          onClose={() => setReassignProject(null)}
          onReassigned={async () => {
            // Check if this was an archived project being reassigned
            if (reassignProject.archived_at) {
              // Unarchive the project (it was already reassigned, now unarchive it)
              await unarchiveProject(reassignProject.id, undefined, supabase);
              // Refresh archived projects list
              await loadArchivedProjects();
            }
            // Refresh active projects list
            const projects = await listProjectsWithCreators(org.id, supabase);
            setAllProjects(projects);
          }}
        />
      )}
    </div>
  );
}

// Activity Log Row Component
function ActivityLogRow({ log }: { log: ActivityLogEntry }) {
  const color = getActionColor(log.action);

  const colorClasses = {
    emerald: "bg-emerald-100 text-emerald-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    purple: "bg-purple-100 text-purple-700",
    neutral: "bg-neutral-100 text-neutral-700",
  }[color];

  const iconMap: Record<string, typeof Building2> = {
    emerald: Building2,
    blue: CreditCard,
    amber: Package,
    red: XCircle,
    purple: Users,
    neutral: FileText,
  };
  const IconComponent = iconMap[color] || FileText;

  return (
    <div className="flex items-start gap-4 px-4 py-3 hover:bg-neutral-50 transition-colors">
      <div className={cn("rounded-full p-2", colorClasses)}>
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
            <span className="text-sm text-neutral-500">
              — {log.project_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 text-sm text-neutral-500">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {log.user_name || log.user_email || "System"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(log.created_at).toLocaleString()}
          </span>
        </div>

        {/* Details */}
        {log.sf_amount && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              {log.action.includes("purchased") || log.action.includes("refund") ? "+" : "-"}
              {formatSF(Math.abs(log.sf_amount))}
            </Badge>
          </div>
        )}

        {log.details && Object.keys(log.details).length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-600">
              View details
            </summary>
            <pre className="mt-1 p-2 bg-neutral-100 rounded text-xs overflow-x-auto">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
