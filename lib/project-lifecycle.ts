import type { SupabaseClient } from "@supabase/supabase-js";

export const PROJECT_STATUSES = [
  { value: "lead", label: "Lead", color: "bg-gray-100 text-gray-700", dot: "bg-gray-400", icon: "circle" },
  { value: "estimated", label: "Estimated", color: "bg-blue-100 text-blue-700", dot: "bg-blue-400", icon: "file-text" },
  { value: "approved", label: "Approved", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400", icon: "check" },
  { value: "scheduled", label: "Scheduled", color: "bg-purple-100 text-purple-700", dot: "bg-purple-400", icon: "calendar" },
  { value: "in_progress", label: "In Progress", color: "bg-amber-100 text-amber-700", dot: "bg-amber-400", icon: "hammer" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-700", dot: "bg-green-400", icon: "check-circle" },
  { value: "invoiced", label: "Invoiced", color: "bg-cyan-100 text-cyan-700", dot: "bg-cyan-400", icon: "dollar-sign" },
  { value: "warranty", label: "Warranty", color: "bg-orange-100 text-orange-700", dot: "bg-orange-400", icon: "shield" },
] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number]["value"];

export function getStatusConfig(status: string) {
  return PROJECT_STATUSES.find((s) => s.value === status) || PROJECT_STATUSES[0];
}

export async function updateProjectStatus(supabase: SupabaseClient, projectId: string, status: ProjectStatus) {
  return (supabase.from("projects") as any)
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select()
    .single();
}

export async function getProjectsByStatus(supabase: SupabaseClient, orgId: string) {
  const { data } = await (supabase.from("projects") as any)
    .select("id, name, status, address, city, state, square_footage, client_id, created_at")
    .eq("organization_id", orgId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const grouped: Record<string, any[]> = {};
  for (const s of PROJECT_STATUSES) grouped[s.value] = [];
  for (const p of data || []) {
    const status = p.status || "lead";
    if (!grouped[status]) grouped[status] = [];
    grouped[status].push(p);
  }
  return grouped;
}

// Schedule
export interface ProjectSchedule {
  id: string;
  project_id: string;
  organization_id: string;
  start_date: string;
  end_date: string | null;
  crew_notes: string | null;
  weather_holds: any[];
  created_by: string;
  created_at: string;
}

export async function getScheduleForRange(supabase: SupabaseClient, orgId: string, startDate: string, endDate: string) {
  return (supabase.from("project_schedule") as any)
    .select("*, projects(id, name, address, city, status, client_id)")
    .eq("organization_id", orgId)
    .gte("start_date", startDate)
    .lte("start_date", endDate)
    .order("start_date", { ascending: true });
}

export async function createSchedule(supabase: SupabaseClient, input: Partial<ProjectSchedule>) {
  return (supabase.from("project_schedule") as any).insert(input).select().single();
}

export async function updateSchedule(supabase: SupabaseClient, id: string, input: Partial<ProjectSchedule>) {
  return (supabase.from("project_schedule") as any).update({ ...input, updated_at: new Date().toISOString() }).eq("id", id).select().single();
}
