import type { SupabaseClient } from "@supabase/supabase-js";

export interface Warranty {
  id: string;
  project_id: string;
  organization_id: string;
  client_id: string | null;
  warranty_type: string;
  manufacturer: string | null;
  start_date: string;
  duration_years: number;
  expiration_date: string | null;
  certificate_url: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export const WARRANTY_TYPES = [
  { value: "manufacturer", label: "Manufacturer Panel Warranty" },
  { value: "workmanship", label: "Workmanship Warranty" },
  { value: "paint", label: "Paint/Finish Warranty" },
  { value: "leak_free", label: "Leak-Free Guarantee" },
  { value: "structural", label: "Structural Warranty" },
];

export async function getWarranties(supabase: SupabaseClient, orgId: string, opts?: { expiringSoonDays?: number }) {
  let query = (supabase.from("warranties") as any)
    .select("*, projects(id, name, address, city)")
    .eq("organization_id", orgId)
    .order("expiration_date", { ascending: true });

  if (opts?.expiringSoonDays) {
    const futureDate = new Date(Date.now() + opts.expiringSoonDays * 86400000).toISOString().split("T")[0];
    query = query.lte("expiration_date", futureDate).gte("expiration_date", new Date().toISOString().split("T")[0]);
  }

  return query;
}

export async function getProjectWarranties(supabase: SupabaseClient, projectId: string) {
  return (supabase.from("warranties") as any)
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

export async function createWarranty(supabase: SupabaseClient, input: Partial<Warranty>) {
  // Compute expiration date
  if (input.start_date && input.duration_years) {
    const start = new Date(input.start_date);
    start.setFullYear(start.getFullYear() + input.duration_years);
    (input as any).expiration_date = start.toISOString().split("T")[0];
  }
  return (supabase.from("warranties") as any).insert(input).select().single();
}

export async function updateWarranty(supabase: SupabaseClient, id: string, input: Partial<Warranty>) {
  if (input.start_date && input.duration_years) {
    const start = new Date(input.start_date);
    start.setFullYear(start.getFullYear() + input.duration_years);
    (input as any).expiration_date = start.toISOString().split("T")[0];
  }
  return (supabase.from("warranties") as any).update(input).eq("id", id).select().single();
}
