"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Loader2,
  FileText,
  DollarSign,
  Package,
  Users,
  Building2,
  Edit,
  Trash2,
  Eye,
  Download,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  getProjectActivityLogs,
  type ActivityLogEntry,
  formatActionLabel,
  getActionColor,
} from "@/lib/activity-log";
import { CreatorAvatar } from "./CreatorAvatar";
import { cn } from "@/lib/utils";

interface ProjectActivityTimelineProps {
  projectId: string;
  className?: string;
}

/**
 * ProjectActivityTimeline - Shows detailed history of project changes
 *
 * Displays a chronological timeline of all actions taken on a project,
 * including who made changes and when.
 */
export function ProjectActivityTimeline({
  projectId,
  className,
}: ProjectActivityTimelineProps) {
  const supabase = getSupabaseBrowserClient();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      try {
        const data = await getProjectActivityLogs(supabase, projectId, 20);
        setLogs(data);
      } catch (err) {
        console.error("Failed to load project activity:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, [projectId, supabase]);

  const getIcon = (action: string) => {
    if (action.includes("created")) return Building2;
    if (action.includes("updated")) return Edit;
    if (action.includes("deleted")) return Trash2;
    if (action.includes("viewed")) return Eye;
    if (action.includes("exported")) return Download;
    if (action.includes("estimate")) return BarChart3;
    if (action.includes("sf.")) return Package;
    if (action.includes("payment")) return DollarSign;
    if (action.includes("member")) return Users;
    return FileText;
  };

  const getColorClasses = (action: string) => {
    const color = getActionColor(action as any);
    return {
      emerald: { bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
      blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
      amber: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
      red: { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" },
      purple: { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200" },
      neutral: { bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" },
    }[color] || { bg: "bg-neutral-100", text: "text-neutral-600", border: "border-neutral-200" };
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white", className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <Clock className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-neutral-900">Activity Timeline</h3>
            <p className="text-xs text-neutral-500">{logs.length} events</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-neutral-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-neutral-400" />
        )}
      </button>

      {/* Timeline Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-sm">
                  No activity recorded yet
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-2 bottom-2 w-px bg-neutral-200" />

                  {/* Timeline items */}
                  <div className="space-y-4">
                    {logs.map((log, index) => {
                      const Icon = getIcon(log.action);
                      const colors = getColorClasses(log.action);

                      return (
                        <div key={log.id} className="relative flex gap-4 pl-2">
                          {/* Icon */}
                          <div
                            className={cn(
                              "relative z-10 w-5 h-5 rounded-full flex items-center justify-center",
                              colors.bg
                            )}
                          >
                            <Icon className={cn("w-3 h-3", colors.text)} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pb-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-neutral-900 text-sm">
                                  {formatActionLabel(log.action as any)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  {log.user_name || log.user_email ? (
                                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                      <CreatorAvatar
                                        creator={{
                                          id: log.user_id || "",
                                          email: log.user_email || "",
                                          full_name: log.user_name,
                                          avatar_url: null,
                                        }}
                                        size="sm"
                                      />
                                      <span>{log.user_name || log.user_email?.split("@")[0]}</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-neutral-400">System</span>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-neutral-400 whitespace-nowrap">
                                {formatRelativeTime(log.created_at)}
                              </span>
                            </div>

                            {/* Additional details */}
                            {log.sf_amount && (
                              <div className="mt-2 text-xs">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full",
                                    colors.bg,
                                    colors.text
                                  )}
                                >
                                  <Package className="w-3 h-3" />
                                  {log.action.includes("purchased") ? "+" : "-"}
                                  {log.sf_amount.toLocaleString()} SF
                                </span>
                              </div>
                            )}

                            {log.details && Object.keys(log.details).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-neutral-400 cursor-pointer hover:text-neutral-600">
                                  View details
                                </summary>
                                <pre className="mt-1 p-2 bg-neutral-50 rounded text-xs text-neutral-600 overflow-x-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
