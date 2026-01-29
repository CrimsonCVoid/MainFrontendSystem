"use client";

/**
 * Comprehensive Audit Log Page
 *
 * Tracks all organization activity:
 * - Project creation, updates, deletions, name changes
 * - Member joins, invites, role changes, removals
 * - Organization settings changes
 * - SF pool changes (purchases, usage)
 */

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser, signOut } from "@/lib/auth";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { useOrg } from "@/components/providers/org-provider";
import { formatSF } from "@/lib/sf-pool";
import { getRoleLabel, type OrgRole } from "@/lib/org-types";
import { cn } from "@/lib/utils";
import {
  type ActivityLogEntry,
  type ActivityCategory,
  getActivityLogs,
  formatActionLabel,
  getActionColor,
} from "@/lib/activity-log";
import {
  Loader2,
  Building2,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  Package,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  BarChart3,
  RefreshCw,
  User,
  Calendar,
  Search,
  History,
  Activity,
  DollarSign,
  Edit3,
  Trash2,
  UserPlus,
  UserMinus,
  Eye,
  Shield,
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  full_name: string | null;
}

interface MemberActivity {
  id: string;
  user_id: string;
  org_id: string;
  role: OrgRole;
  created_at: string;
  user?: { email: string; full_name: string | null } | null;
}

type TabType = "all" | "projects" | "members" | "billing" | "org";
type TimeFilter = "all" | "today" | "week" | "month";

export default function AuditLogPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

  // Data states
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [members, setMembers] = useState<MemberActivity[]>([]);
  const [projectCount, setProjectCount] = useState(0);

  // Filters
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  // Org context
  const { org, role, isAdmin, loading: orgLoading } = useOrg();

  // Load user securely
  useEffect(() => {
    async function loadUser() {
      try {
        const authUser = await getCurrentUser();
        if (!authUser) {
          router.replace("/signin");
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("id, email, full_name")
          .eq("id", authUser.id)
          .single();

        if (userData) setUser(userData as UserData);
      } catch (err) {
        console.error("Failed to load user data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router, supabase]);

  // Load all audit data
  useEffect(() => {
    async function loadAuditData() {
      if (!org?.id) return;

      try {
        // Calculate date filter
        let startDate: string | undefined;
        if (timeFilter !== "all") {
          const now = new Date();
          if (timeFilter === "today") {
            startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
          } else if (timeFilter === "week") {
            now.setDate(now.getDate() - 7);
            startDate = now.toISOString();
          } else if (timeFilter === "month") {
            now.setDate(now.getDate() - 30);
            startDate = now.toISOString();
          }
        }

        // Map tab to category
        const categoryMap: Record<TabType, ActivityCategory | undefined> = {
          all: undefined,
          projects: "project",
          members: "member",
          billing: "billing",
          org: "org",
        };

        // Load activity logs
        const logs = await getActivityLogs(supabase, org.id, {
          limit: 200,
          category: categoryMap[activeTab],
          startDate,
        });
        setActivityLogs(logs);

        // Load members
        const { data: memberData } = await supabase
          .from("organization_members")
          .select(`
            id,
            user_id,
            org_id,
            role,
            created_at,
            user:users(email, full_name)
          `)
          .eq("org_id", org.id)
          .order("created_at", { ascending: false });

        if (memberData) setMembers(memberData as MemberActivity[]);

        // Load project count
        const { count } = await supabase
          .from("projects")
          .select("*", { count: "exact", head: true })
          .eq("org_id", org.id);

        setProjectCount(count || 0);
      } catch (err) {
        console.error("Failed to load audit data:", err);
      }
    }

    loadAuditData();
  }, [org?.id, supabase, activeTab, timeFilter]);

  async function handleRefresh() {
    if (!org?.id) return;
    setRefreshing(true);
    try {
      const logs = await getActivityLogs(supabase, org.id, { limit: 200 });
      setActivityLogs(logs);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/signin");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  }

  function toggleLogExpanded(id: string) {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLogs(newExpanded);
  }

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return activityLogs;
    const query = searchQuery.toLowerCase();
    return activityLogs.filter(
      (log) =>
        log.action.toLowerCase().includes(query) ||
        log.user_email?.toLowerCase().includes(query) ||
        log.user_name?.toLowerCase().includes(query) ||
        log.project_name?.toLowerCase().includes(query) ||
        JSON.stringify(log.details).toLowerCase().includes(query)
    );
  }, [activityLogs, searchQuery]);

  // Calculate stats from activity logs
  const stats = useMemo(() => {
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

    const projectActions = activityLogs.filter(
      (log) => log.action.startsWith("project.")
    ).length;

    const memberActions = activityLogs.filter(
      (log) => log.action.startsWith("member.")
    ).length;

    const billingActions = activityLogs.filter(
      (log) => log.action.startsWith("sf.") || log.action.startsWith("payment.")
    ).length;

    return { todayLogs, weekLogs, projectActions, memberActions, billingActions };
  }, [activityLogs]);

  const tabs = [
    { id: "overview", label: "Overview", icon: TrendingUp, href: "/dashboard" },
    { id: "projects", label: "Projects", icon: Building2, href: "/dashboard" },
    { id: "estimates", label: "Estimates", icon: FileText, href: "/dashboard" },
    { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
    { id: "audit", label: "Audit Log", icon: History, href: "/audit", active: true },
  ];

  const filterTabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "all", label: "All Activity", icon: Activity },
    { id: "projects", label: "Projects", icon: Building2 },
    { id: "members", label: "Members", icon: Users },
    { id: "billing", label: "SF & Payments", icon: DollarSign },
    { id: "org", label: "Organization", icon: Settings },
  ];

  const timeFilters: { id: TimeFilter; label: string }[] = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "week", label: "Past Week" },
    { id: "month", label: "Past Month" },
  ];

  const isPageLoading = loading || orgLoading;

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-semibold text-neutral-900">MyMetalRoofer</span>
              </div>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-neutral-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-3">
              {org?.logo_url ? (
                <Image
                  src={org.logo_url}
                  alt={org.name}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-neutral-900 leading-tight">
                  {org?.name || "MyMetalRoofer"}
                </span>
                {role && (
                  <span className="text-xs text-neutral-500">{getRoleLabel(role)}</span>
                )}
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {isAdmin() && (
                <Link href="/admin">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              )}
              <span className="text-sm text-neutral-600 hidden sm:block">{user?.email}</span>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab.active
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="space-y-6">
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-neutral-600">Today</span>
              </div>
              <p className="text-2xl font-bold text-neutral-900">{stats.todayLogs}</p>
              <p className="text-xs text-neutral-500">actions</p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-neutral-600">This Week</span>
              </div>
              <p className="text-2xl font-bold text-neutral-900">{stats.weekLogs}</p>
              <p className="text-xs text-neutral-500">actions</p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-neutral-600">Projects</span>
              </div>
              <p className="text-2xl font-bold text-neutral-900">{projectCount}</p>
              <p className="text-xs text-neutral-500">total</p>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-neutral-600">Members</span>
              </div>
              <p className="text-2xl font-bold text-neutral-900">{members.length}</p>
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
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {filterTabs.map((tab) => (
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

          {/* Filters Row */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by user, project, or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              />
            </div>

            {/* Time Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neutral-400" />
              {timeFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setTimeFilter(filter.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                    timeFilter === filter.id
                      ? "bg-slate-900 text-white"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-neutral-600" />
                <h3 className="font-semibold text-neutral-900">Activity Timeline</h3>
                <Badge variant="secondary" className="ml-2">
                  {filteredLogs.length} entries
                </Badge>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
                <p className="text-neutral-500 font-medium">No activity found</p>
                <p className="text-sm text-neutral-400 mt-1">
                  {searchQuery ? "Try adjusting your search" : "Activity will appear here as actions are taken"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {filteredLogs.map((log) => (
                  <ActivityLogItem
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
          {(activeTab === "all" || activeTab === "members") && members.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-neutral-900">Current Team Members</h3>
                  <Badge variant="secondary">{members.length}</Badge>
                </div>
              </div>

              <div className="divide-y divide-neutral-100">
                {members.map((member) => (
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
                        className={cn(
                          member.role === "owner" && "bg-purple-100 text-purple-700",
                          member.role === "admin" && "bg-blue-100 text-blue-700",
                          member.role === "member" && "bg-neutral-100 text-neutral-700",
                          member.role === "viewer" && "bg-neutral-100 text-neutral-500"
                        )}
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
        </div>
      </main>
    </div>
  );
}

// Activity Log Item Component
function ActivityLogItem({
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
    if (log.action.includes("sf.")) return Package;
    return Activity;
  };

  const IconComponent = getActionIcon();

  return (
    <div
      className="px-4 py-3 hover:bg-neutral-50 transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-start gap-4">
        <div className={cn("rounded-full p-2 flex-shrink-0", colorClasses[color])}>
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
                className={cn(
                  "text-xs",
                  log.action.includes("purchased") || log.action.includes("refund") || log.action.includes("promo")
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                )}
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

        <ChevronDown
          className={cn(
            "h-4 w-4 text-neutral-400 transition-transform flex-shrink-0",
            expanded && "rotate-180"
          )}
        />
      </div>
    </div>
  );
}
