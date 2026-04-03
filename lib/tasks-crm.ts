import type { SupabaseClient } from "@supabase/supabase-js";

export interface Task {
  id: string;
  organization_id: string;
  project_id: string | null;
  client_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_at: string | null;
  task_type: string;
  priority: "low" | "normal" | "high" | "urgent";
  created_by: string;
  created_at: string;
}

export const TASK_PRIORITIES = [
  { value: "low", label: "Low", color: "bg-gray-100 text-gray-600" },
  { value: "normal", label: "Normal", color: "bg-blue-100 text-blue-600" },
  { value: "high", label: "High", color: "bg-amber-100 text-amber-700" },
  { value: "urgent", label: "Urgent", color: "bg-red-100 text-red-700" },
];

export const TASK_TYPES = [
  { value: "general", label: "General" },
  { value: "follow_up", label: "Follow Up" },
  { value: "warranty_check", label: "Warranty Check" },
  { value: "callback", label: "Callback" },
  { value: "site_visit", label: "Site Visit" },
  { value: "material_order", label: "Material Order" },
];

export async function getTasks(supabase: SupabaseClient, orgId: string, opts?: {
  dueSoon?: number; completed?: boolean; assignedTo?: string; projectId?: string;
}) {
  let query = (supabase.from("tasks") as any)
    .select("*, projects(id, name), clients(id, name)")
    .eq("organization_id", orgId)
    .order("due_date", { ascending: true });

  if (opts?.completed === false) query = query.is("completed_at", null);
  if (opts?.completed === true) query = query.not("completed_at", "is", null);
  if (opts?.assignedTo) query = query.eq("assigned_to", opts.assignedTo);
  if (opts?.projectId) query = query.eq("project_id", opts.projectId);
  if (opts?.dueSoon) {
    const future = new Date(Date.now() + opts.dueSoon * 86400000).toISOString().split("T")[0];
    query = query.lte("due_date", future).is("completed_at", null);
  }

  return query;
}

export async function createTask(supabase: SupabaseClient, input: Partial<Task>) {
  return (supabase.from("tasks") as any).insert(input).select().single();
}

export async function updateTask(supabase: SupabaseClient, id: string, input: Partial<Task>) {
  return (supabase.from("tasks") as any).update(input).eq("id", id).select().single();
}

export async function completeTask(supabase: SupabaseClient, id: string) {
  return (supabase.from("tasks") as any)
    .update({ completed_at: new Date().toISOString() })
    .eq("id", id).select().single();
}

export async function deleteTask(supabase: SupabaseClient, id: string) {
  return (supabase.from("tasks") as any).delete().eq("id", id);
}
