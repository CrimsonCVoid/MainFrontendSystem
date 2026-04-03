/**
 * Activity Logging System
 *
 * Comprehensive logging for admin visibility.
 * Tracks project creation, SF usage, payments, member actions, etc.
 */

import { SupabaseClient } from "@supabase/supabase-js";

// ============================================
// TYPES
// ============================================

export type ActivityCategory =
  | "project"
  | "billing"
  | "member"
  | "auth"
  | "org"
  | "system";

export type ActivityAction =
  // Project actions
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "project.viewed"
  | "project.exported"
  | "project.estimate_generated"
  | "project.reassigned"
  | "project.archived"
  | "project.restored"
  | "project.collaborator_added"
  | "project.collaborator_removed"
  | "project.collaborator_role_changed"
  // Billing actions
  | "sf.purchased"
  | "sf.consumed"
  | "sf.refunded"
  | "payment.completed"
  | "payment.failed"
  | "promo.redeemed"
  // Member actions
  | "member.invited"
  | "member.joined"
  | "member.removed"
  | "member.role_changed"
  // Auth actions
  | "auth.login"
  | "auth.logout"
  | "auth.password_reset"
  // Org actions
  | "org.created"
  | "org.updated"
  | "org.settings_changed"
  | "org.logo_updated";

export interface ActivityLogEntry {
  id: string;
  org_id: string;
  user_id: string | null;
  project_id: string | null;
  action: ActivityAction;
  action_category: ActivityCategory;
  details: Record<string, unknown>;
  user_email: string | null;
  user_name: string | null;
  org_name: string | null;
  project_name: string | null;
  sf_amount: number | null;
  amount_cents: number | null;
  status: "success" | "failed" | "pending";
  error_message: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface LogActivityInput {
  orgId: string;
  userId: string;
  action: ActivityAction;
  category: ActivityCategory;
  details?: Record<string, unknown>;
  projectId?: string;
  sfAmount?: number;
  amountCents?: number;
  status?: "success" | "failed" | "pending";
  errorMessage?: string;
}

// ============================================
// LOGGING FUNCTIONS
// ============================================

/**
 * Log an activity event
 */
export async function logActivity(
  supabase: SupabaseClient,
  input: LogActivityInput
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("log_activity", {
      p_org_id: input.orgId,
      p_user_id: input.userId,
      p_action: input.action,
      p_category: input.category,
      p_details: input.details || {},
      p_project_id: input.projectId || null,
      p_sf_amount: input.sfAmount || null,
      p_amount_cents: input.amountCents || null,
      p_status: input.status || "success",
      p_error_message: input.errorMessage || null,
    });

    if (error) {
      console.error("Failed to log activity:", error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error("Activity logging error:", err);
    return null;
  }
}

/**
 * Log project creation with detailed metrics
 */
export async function logProjectCreated(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    userId: string;
    projectId: string;
    projectName: string;
    address?: string;
    city?: string;
    state?: string;
    squareFootage?: number;
    roofData?: Record<string, unknown>;
  }
): Promise<void> {
  await logActivity(supabase, {
    orgId: params.orgId,
    userId: params.userId,
    action: "project.created",
    category: "project",
    projectId: params.projectId,
    sfAmount: params.squareFootage,
    details: {
      project_name: params.projectName,
      address: params.address,
      city: params.city,
      state: params.state,
      square_footage: params.squareFootage,
      has_roof_data: !!params.roofData,
      roof_planes: (params.roofData as { planes?: unknown[] } | undefined)?.planes?.length || 0,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log SF purchase
 */
export async function logSFPurchased(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    userId: string;
    sfAmount: number;
    amountCents: number;
    packageId: string;
    stripeSessionId?: string;
  }
): Promise<void> {
  await logActivity(supabase, {
    orgId: params.orgId,
    userId: params.userId,
    action: "sf.purchased",
    category: "billing",
    sfAmount: params.sfAmount,
    amountCents: params.amountCents,
    details: {
      package_id: params.packageId,
      stripe_session_id: params.stripeSessionId,
      price_per_sf: params.amountCents / params.sfAmount,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log SF consumed (project creation deduction)
 */
export async function logSFConsumed(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    userId: string;
    projectId: string;
    sfAmount: number;
    poolBefore: number;
    poolAfter: number;
  }
): Promise<void> {
  await logActivity(supabase, {
    orgId: params.orgId,
    userId: params.userId,
    action: "sf.consumed",
    category: "billing",
    projectId: params.projectId,
    sfAmount: params.sfAmount,
    details: {
      pool_before: params.poolBefore,
      pool_after: params.poolAfter,
      deduction: params.sfAmount,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log member invited
 */
export async function logMemberInvited(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    invitedBy: string;
    inviteeEmail: string;
    role: string;
  }
): Promise<void> {
  await logActivity(supabase, {
    orgId: params.orgId,
    userId: params.invitedBy,
    action: "member.invited",
    category: "member",
    details: {
      invitee_email: params.inviteeEmail,
      assigned_role: params.role,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log project reassignment
 */
export async function logProjectReassigned(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    reassignedBy: string;
    projectId: string;
    projectName: string;
    previousOwnerId: string;
    previousOwnerEmail: string;
    newOwnerId: string;
    newOwnerEmail: string;
  }
): Promise<void> {
  await logActivity(supabase, {
    orgId: params.orgId,
    userId: params.reassignedBy,
    action: "project.reassigned",
    category: "project",
    projectId: params.projectId,
    details: {
      project_name: params.projectName,
      previous_owner_id: params.previousOwnerId,
      previous_owner_email: params.previousOwnerEmail,
      new_owner_id: params.newOwnerId,
      new_owner_email: params.newOwnerEmail,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log project archived
 */
export async function logProjectArchived(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    archivedBy: string;
    projectId: string;
    projectName: string;
    originalOwnerId: string;
    originalOwnerEmail: string;
  }
): Promise<void> {
  await logActivity(supabase, {
    orgId: params.orgId,
    userId: params.archivedBy,
    action: "project.archived",
    category: "project",
    projectId: params.projectId,
    details: {
      project_name: params.projectName,
      original_owner_id: params.originalOwnerId,
      original_owner_email: params.originalOwnerEmail,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log project restored from archive
 */
export async function logProjectRestored(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    restoredBy: string;
    projectId: string;
    projectName: string;
    newOwnerId?: string;
    newOwnerEmail?: string;
    reassigned: boolean;
  }
): Promise<void> {
  await logActivity(supabase, {
    orgId: params.orgId,
    userId: params.restoredBy,
    action: "project.restored",
    category: "project",
    projectId: params.projectId,
    details: {
      project_name: params.projectName,
      reassigned: params.reassigned,
      new_owner_id: params.newOwnerId,
      new_owner_email: params.newOwnerEmail,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log collaborator added to project
 */
export async function logCollaboratorAdded(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    userId: string;
    projectId: string;
    collaboratorUserId: string;
    collaboratorEmail: string;
    collaboratorName: string | null;
    role: string;
  }
): Promise<void> {
  await logActivity(supabase, {
    orgId: params.orgId,
    userId: params.userId,
    action: "project.collaborator_added",
    category: "project",
    projectId: params.projectId,
    details: {
      collaborator_user_id: params.collaboratorUserId,
      collaborator_email: params.collaboratorEmail,
      collaborator_name: params.collaboratorName,
      role: params.role,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log collaborator removed from project
 */
export async function logCollaboratorRemoved(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    userId: string;
    projectId: string;
    collaboratorUserId: string;
    collaboratorEmail: string;
    collaboratorName: string | null;
    removedBy: "owner" | "self";
  }
): Promise<void> {
  await logActivity(supabase, {
    orgId: params.orgId,
    userId: params.userId,
    action: "project.collaborator_removed",
    category: "project",
    projectId: params.projectId,
    details: {
      collaborator_user_id: params.collaboratorUserId,
      collaborator_email: params.collaboratorEmail,
      collaborator_name: params.collaboratorName,
      removed_by: params.removedBy,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log collaborator role changed
 */
export async function logCollaboratorRoleChanged(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    userId: string;
    projectId: string;
    collaboratorUserId: string;
    collaboratorEmail: string;
    previousRole: string;
    newRole: string;
  }
): Promise<void> {
  await logActivity(supabase, {
    orgId: params.orgId,
    userId: params.userId,
    action: "project.collaborator_role_changed",
    category: "project",
    projectId: params.projectId,
    details: {
      collaborator_user_id: params.collaboratorUserId,
      collaborator_email: params.collaboratorEmail,
      previous_role: params.previousRole,
      new_role: params.newRole,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log estimate generated
 */
export async function logEstimateGenerated(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    userId: string;
    projectId: string;
    estimateTotal?: number;
    panelCount?: number;
    laborCost?: number;
    materialCost?: number;
  }
): Promise<void> {
  await logActivity(supabase, {
    orgId: params.orgId,
    userId: params.userId,
    action: "project.estimate_generated",
    category: "project",
    projectId: params.projectId,
    amountCents: params.estimateTotal ? Math.round(params.estimateTotal * 100) : undefined,
    details: {
      estimate_total: params.estimateTotal,
      panel_count: params.panelCount,
      labor_cost: params.laborCost,
      material_cost: params.materialCost,
      timestamp: new Date().toISOString(),
    },
  });
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Fetch activity logs for an organization
 */
export async function getActivityLogs(
  supabase: SupabaseClient,
  orgId: string,
  options?: {
    limit?: number;
    offset?: number;
    category?: ActivityCategory;
    userId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<ActivityLogEntry[]> {
  let query = supabase
    .from("activity_logs")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
  }
  if (options?.category) {
    query = query.eq("action_category", options.category);
  }
  if (options?.userId) {
    query = query.eq("user_id", options.userId);
  }
  if (options?.projectId) {
    query = query.eq("project_id", options.projectId);
  }
  if (options?.startDate) {
    query = query.gte("created_at", options.startDate);
  }
  if (options?.endDate) {
    query = query.lte("created_at", options.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch activity logs:", error);
    return [];
  }

  return data as ActivityLogEntry[];
}

/**
 * Get activity logs for a specific project
 */
export async function getProjectActivityLogs(
  supabase: SupabaseClient,
  projectId: string,
  limit: number = 50
): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch project activity logs:", error);
    return [];
  }

  return (data || []) as ActivityLogEntry[];
}

/**
 * Get project creation summary by user
 */
export async function getProjectSummaryByUser(
  supabase: SupabaseClient,
  orgId: string
): Promise<
  Array<{
    user_id: string;
    user_email: string;
    user_name: string | null;
    project_count: number;
    total_sf_used: number;
    first_project: string;
    last_project: string;
  }>
> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("user_id, user_email, user_name, sf_amount, created_at")
    .eq("org_id", orgId)
    .eq("action", "project.created")
    .eq("status", "success");

  if (error || !data) {
    console.error("Failed to fetch project summary:", error);
    return [];
  }

  // Group by user
  const userMap = new Map<
    string,
    {
      user_id: string;
      user_email: string;
      user_name: string | null;
      project_count: number;
      total_sf_used: number;
      first_project: string;
      last_project: string;
    }
  >();

  for (const row of data) {
    const existing = userMap.get(row.user_id);
    if (existing) {
      existing.project_count++;
      existing.total_sf_used += row.sf_amount || 0;
      if (row.created_at < existing.first_project) {
        existing.first_project = row.created_at;
      }
      if (row.created_at > existing.last_project) {
        existing.last_project = row.created_at;
      }
    } else {
      userMap.set(row.user_id, {
        user_id: row.user_id,
        user_email: row.user_email,
        user_name: row.user_name,
        project_count: 1,
        total_sf_used: row.sf_amount || 0,
        first_project: row.created_at,
        last_project: row.created_at,
      });
    }
  }

  return Array.from(userMap.values()).sort((a, b) => b.project_count - a.project_count);
}

/**
 * Get daily activity summary
 */
export async function getDailyActivitySummary(
  supabase: SupabaseClient,
  orgId: string,
  days: number = 30
): Promise<
  Array<{
    date: string;
    projects_created: number;
    sf_consumed: number;
    sf_purchased: number;
    unique_users: number;
  }>
> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("activity_logs")
    .select("action, sf_amount, user_id, created_at")
    .eq("org_id", orgId)
    .gte("created_at", startDate.toISOString())
    .in("action", ["project.created", "sf.consumed", "sf.purchased"]);

  if (error || !data) {
    console.error("Failed to fetch daily summary:", error);
    return [];
  }

  // Group by date
  const dateMap = new Map<
    string,
    {
      date: string;
      projects_created: number;
      sf_consumed: number;
      sf_purchased: number;
      users: Set<string>;
    }
  >();

  for (const row of data) {
    const date = row.created_at.split("T")[0];
    const existing = dateMap.get(date) || {
      date,
      projects_created: 0,
      sf_consumed: 0,
      sf_purchased: 0,
      users: new Set<string>(),
    };

    if (row.action === "project.created") {
      existing.projects_created++;
    } else if (row.action === "sf.consumed") {
      existing.sf_consumed += row.sf_amount || 0;
    } else if (row.action === "sf.purchased") {
      existing.sf_purchased += row.sf_amount || 0;
    }

    if (row.user_id) {
      existing.users.add(row.user_id);
    }

    dateMap.set(date, existing);
  }

  return Array.from(dateMap.values())
    .map((d) => ({
      date: d.date,
      projects_created: d.projects_created,
      sf_consumed: d.sf_consumed,
      sf_purchased: d.sf_purchased,
      unique_users: d.users.size,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// ============================================
// FORMATTING HELPERS
// ============================================

export function formatActionLabel(action: ActivityAction): string {
  const labels: Record<ActivityAction, string> = {
    "project.created": "Project Created",
    "project.updated": "Project Updated",
    "project.deleted": "Project Deleted",
    "project.viewed": "Project Viewed",
    "project.exported": "Project Exported",
    "project.estimate_generated": "Estimate Generated",
    "project.reassigned": "Project Reassigned",
    "project.archived": "Project Archived",
    "project.restored": "Project Restored",
    "project.collaborator_added": "Collaborator Added",
    "project.collaborator_removed": "Collaborator Removed",
    "project.collaborator_role_changed": "Collaborator Role Changed",
    "sf.purchased": "SF Purchased",
    "sf.consumed": "SF Consumed",
    "sf.refunded": "SF Refunded",
    "payment.completed": "Payment Completed",
    "payment.failed": "Payment Failed",
    "promo.redeemed": "Promo Code Redeemed",
    "member.invited": "Member Invited",
    "member.joined": "Member Joined",
    "member.removed": "Member Removed",
    "member.role_changed": "Role Changed",
    "auth.login": "User Login",
    "auth.logout": "User Logout",
    "auth.password_reset": "Password Reset",
    "org.created": "Organization Created",
    "org.updated": "Organization Updated",
    "org.settings_changed": "Settings Changed",
    "org.logo_updated": "Logo Updated",
  };
  return labels[action] || action;
}

export function formatCategoryLabel(category: ActivityCategory): string {
  const labels: Record<ActivityCategory, string> = {
    project: "Projects",
    billing: "Billing",
    member: "Members",
    auth: "Authentication",
    org: "Organization",
    system: "System",
  };
  return labels[category] || category;
}

export function getActionIcon(action: ActivityAction): string {
  if (action.startsWith("project.")) return "building";
  if (action.startsWith("sf.") || action.startsWith("payment.")) return "credit-card";
  if (action.startsWith("member.")) return "users";
  if (action.startsWith("auth.")) return "shield";
  if (action.startsWith("org.")) return "building-2";
  return "activity";
}

export function getActionColor(action: ActivityAction): string {
  if (action === "project.created") return "emerald";
  if (action === "sf.purchased" || action === "payment.completed") return "blue";
  if (action === "sf.consumed") return "amber";
  if (action === "payment.failed") return "red";
  if (action.startsWith("member.")) return "purple";
  return "neutral";
}
