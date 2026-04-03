import type { SupabaseClient } from "@supabase/supabase-js";

export interface CrewMember {
  id: string;
  organization_id: string;
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  skills: string[];
  hourly_rate: number | null;
  is_active: boolean;
  created_at: string;
}

export const CREW_ROLES = [
  { value: "foreman", label: "Foreman" },
  { value: "installer", label: "Installer" },
  { value: "laborer", label: "Laborer" },
  { value: "apprentice", label: "Apprentice" },
  { value: "sub_foreman", label: "Sub Foreman" },
  { value: "sub_crew", label: "Subcontractor" },
];

export async function getCrewMembers(supabase: SupabaseClient, orgId: string, activeOnly = true) {
  let query = (supabase.from("crew_members") as any)
    .select("*")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });
  if (activeOnly) query = query.eq("is_active", true);
  return query;
}

export async function createCrewMember(supabase: SupabaseClient, input: Partial<CrewMember>) {
  return (supabase.from("crew_members") as any).insert(input).select().single();
}

export async function updateCrewMember(supabase: SupabaseClient, id: string, input: Partial<CrewMember>) {
  return (supabase.from("crew_members") as any)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
}

export async function getProjectCrew(supabase: SupabaseClient, projectId: string) {
  return (supabase.from("project_crew_assignments") as any)
    .select("*, crew_members(id, name, role, phone)")
    .eq("project_id", projectId);
}

export async function assignCrew(supabase: SupabaseClient, projectId: string, crewMemberId: string, role?: string, hoursEstimated?: number) {
  return (supabase.from("project_crew_assignments") as any)
    .insert({ project_id: projectId, crew_member_id: crewMemberId, role, hours_estimated: hoursEstimated })
    .select().single();
}

export async function logLabor(supabase: SupabaseClient, projectId: string, crewMemberId: string, date: string, hours: number, notes: string | null, userId: string) {
  return (supabase.from("labor_entries") as any)
    .insert({ project_id: projectId, crew_member_id: crewMemberId, date, hours, notes, created_by: userId })
    .select().single();
}

export async function getProjectLabor(supabase: SupabaseClient, projectId: string) {
  return (supabase.from("labor_entries") as any)
    .select("*, crew_members(id, name, role, hourly_rate)")
    .eq("project_id", projectId)
    .order("date", { ascending: false });
}
