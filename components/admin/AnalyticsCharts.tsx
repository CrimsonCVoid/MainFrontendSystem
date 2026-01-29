"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Package,
  Users,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DailySummary {
  date: string;
  projects_created: number;
  sf_consumed: number;
  sf_purchased: number;
  unique_users: number;
}

interface UserSummary {
  user_id: string;
  user_email: string;
  user_name: string | null;
  project_count: number;
  total_sf_used: number;
  first_project: string;
  last_project: string;
}

interface AnalyticsChartsProps {
  dailySummaries: DailySummary[];
  userSummaries: UserSummary[];
  totalProjects: number;
  totalSFUsed: number;
}

/**
 * AnalyticsCharts - Visual analytics for admin dashboard
 *
 * Displays bar charts for daily activity and user breakdown
 */
export function AnalyticsCharts({
  dailySummaries,
  userSummaries,
  totalProjects,
  totalSFUsed,
}: AnalyticsChartsProps) {
  // Calculate trends
  const trends = useMemo(() => {
    if (dailySummaries.length < 2) return { projects: 0, sf: 0 };

    const recent = dailySummaries.slice(0, 7);
    const previous = dailySummaries.slice(7, 14);

    const recentProjects = recent.reduce((s, d) => s + d.projects_created, 0);
    const previousProjects = previous.reduce((s, d) => s + d.projects_created, 0);

    const recentSF = recent.reduce((s, d) => s + d.sf_consumed, 0);
    const previousSF = previous.reduce((s, d) => s + d.sf_consumed, 0);

    return {
      projects: previousProjects ? ((recentProjects - previousProjects) / previousProjects) * 100 : 0,
      sf: previousSF ? ((recentSF - previousSF) / previousSF) * 100 : 0,
    };
  }, [dailySummaries]);

  // Get max values for scaling
  const maxProjects = Math.max(...dailySummaries.map((d) => d.projects_created), 1);
  const maxSF = Math.max(...dailySummaries.map((d) => d.sf_consumed), 1);
  const maxUserProjects = Math.max(...userSummaries.map((u) => u.project_count), 1);

  return (
    <div className="space-y-6">
      {/* Trend Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TrendCard
          title="Projects This Week"
          value={dailySummaries.slice(0, 7).reduce((s, d) => s + d.projects_created, 0)}
          trend={trends.projects}
          icon={Building2}
          color="emerald"
        />
        <TrendCard
          title="SF Consumed This Week"
          value={dailySummaries.slice(0, 7).reduce((s, d) => s + d.sf_consumed, 0)}
          trend={trends.sf}
          icon={Package}
          color="blue"
          formatValue={(v) => `${(v / 1000).toFixed(1)}k`}
        />
      </div>

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-neutral-900">Daily Activity</h3>
            <p className="text-sm text-neutral-500">Projects created per day</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-neutral-600">Projects</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-neutral-600">SF (scaled)</span>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-1 h-40">
          {dailySummaries.slice(0, 14).reverse().map((day, index) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 justify-center items-end h-32">
                {/* Projects bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(day.projects_created / maxProjects) * 100}%` }}
                  transition={{ delay: index * 0.02 }}
                  className="w-2 bg-emerald-500 rounded-t min-h-[2px]"
                  title={`${day.projects_created} projects`}
                />
                {/* SF bar (scaled) */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(day.sf_consumed / maxSF) * 100}%` }}
                  transition={{ delay: index * 0.02 + 0.01 }}
                  className="w-2 bg-blue-500 rounded-t min-h-[2px]"
                  title={`${day.sf_consumed.toLocaleString()} SF`}
                />
              </div>
              <span className="text-[10px] text-neutral-400 transform -rotate-45 origin-left whitespace-nowrap">
                {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* User Leaderboard */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-neutral-900">Top Contributors</h3>
            <p className="text-sm text-neutral-500">Projects created by team member</p>
          </div>
        </div>

        <div className="space-y-3">
          {userSummaries.slice(0, 5).map((user, index) => (
            <div key={user.user_id} className="flex items-center gap-3">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  index === 0 ? "bg-amber-100 text-amber-700" :
                  index === 1 ? "bg-neutral-200 text-neutral-600" :
                  index === 2 ? "bg-orange-100 text-orange-700" :
                  "bg-neutral-100 text-neutral-500"
                )}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-neutral-900 text-sm truncate">
                    {user.user_name || user.user_email.split("@")[0]}
                  </span>
                  <span className="text-sm text-neutral-600">
                    {user.project_count} project{user.project_count !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(user.project_count / maxUserProjects) * 100}%` }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "h-full rounded-full",
                      index === 0 ? "bg-amber-500" :
                      index === 1 ? "bg-neutral-400" :
                      index === 2 ? "bg-orange-500" :
                      "bg-neutral-300"
                    )}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SF Usage Distribution */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-neutral-900">SF Usage Distribution</h3>
            <p className="text-sm text-neutral-500">Square footage by team member</p>
          </div>
        </div>

        <div className="space-y-2">
          {userSummaries.map((user) => {
            const percentage = totalSFUsed > 0 ? (user.total_sf_used / totalSFUsed) * 100 : 0;
            return (
              <div key={user.user_id} className="flex items-center gap-3">
                <div className="w-24 truncate text-sm text-neutral-600">
                  {user.user_name?.split(" ")[0] || user.user_email.split("@")[0]}
                </div>
                <div className="flex-1 h-6 bg-neutral-100 rounded overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-end pr-2"
                  >
                    {percentage > 15 && (
                      <span className="text-xs font-medium text-white">
                        {user.total_sf_used.toLocaleString()}
                      </span>
                    )}
                  </motion.div>
                </div>
                <div className="w-16 text-right text-sm text-neutral-500">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Trend Card Component
function TrendCard({
  title,
  value,
  trend,
  icon: Icon,
  color,
  formatValue,
}: {
  title: string;
  value: number;
  trend: number;
  icon: any;
  color: "emerald" | "blue" | "amber" | "purple";
  formatValue?: (v: number) => string;
}) {
  const colors = {
    emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
    blue: { bg: "bg-blue-100", text: "text-blue-600" },
    amber: { bg: "bg-amber-100", text: "text-amber-600" },
    purple: { bg: "bg-purple-100", text: "text-purple-600" },
  };

  const isPositive = trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className="flex items-start justify-between">
        <div className={cn("rounded-lg p-2", colors[color].bg)}>
          <Icon className={cn("h-5 w-5", colors[color].text)} />
        </div>
        {trend !== 0 && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs font-medium",
              isPositive ? "text-emerald-600" : "text-red-600"
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend).toFixed(0)}%
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-neutral-900">
          {formatValue ? formatValue(value) : value}
        </p>
        <p className="text-sm text-neutral-500">{title}</p>
      </div>
    </div>
  );
}
