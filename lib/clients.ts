import type { SupabaseClient } from "@supabase/supabase-js";

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  tags: string[];
  source: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ClientWithStats extends Client {
  project_count: number;
  total_revenue: number;
}

export async function getClients(
  supabase: SupabaseClient,
  orgId: string,
  opts?: { search?: string; source?: string; tag?: string; limit?: number; offset?: number }
) {
  let query = (supabase.from("clients") as any)
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (opts?.search) {
    query = query.or(`name.ilike.%${opts.search}%,email.ilike.%${opts.search}%,phone.ilike.%${opts.search}%,company.ilike.%${opts.search}%`);
  }
  if (opts?.source) query = query.eq("source", opts.source);
  if (opts?.tag) query = query.contains("tags", [opts.tag]);
  if (opts?.limit) query = query.limit(opts.limit);
  if (opts?.offset) query = query.range(opts.offset, opts.offset + (opts.limit || 50) - 1);

  return query;
}

export async function getClient(supabase: SupabaseClient, clientId: string) {
  return (supabase.from("clients") as any)
    .select("*")
    .eq("id", clientId)
    .single();
}

export async function getClientProjects(supabase: SupabaseClient, clientId: string) {
  return (supabase.from("projects") as any)
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
}

export async function createClient(supabase: SupabaseClient, input: Partial<Client>) {
  return (supabase.from("clients") as any)
    .insert(input)
    .select()
    .single();
}

export async function updateClient(supabase: SupabaseClient, clientId: string, input: Partial<Client>) {
  return (supabase.from("clients") as any)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", clientId)
    .select()
    .single();
}

export async function deleteClient(supabase: SupabaseClient, clientId: string) {
  return (supabase.from("clients") as any)
    .delete()
    .eq("id", clientId);
}

export function parseCSVClients(csvText: string): Partial<Client>[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

  const fieldMap: Record<string, keyof Client> = {
    name: "name", full_name: "name", client_name: "name", customer: "name",
    email: "email", email_address: "email",
    phone: "phone", phone_number: "phone", mobile: "phone",
    company: "company", business: "company", company_name: "company",
    address: "address", street: "address", street_address: "address",
    city: "city",
    state: "state",
    zip: "zip_code", zip_code: "zip_code", postal_code: "zip_code",
    source: "source", lead_source: "source",
    notes: "notes",
  };

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const client: Record<string, any> = {};
    headers.forEach((header, i) => {
      const field = fieldMap[header];
      if (field && values[i]) client[field] = values[i];
    });
    return client as Partial<Client>;
  }).filter((c) => c.name);
}

export const CLIENT_SOURCES = [
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "cold_call", label: "Cold Call" },
  { value: "repeat", label: "Repeat Customer" },
  { value: "social_media", label: "Social Media" },
  { value: "home_show", label: "Home Show" },
  { value: "yard_sign", label: "Yard Sign" },
  { value: "other", label: "Other" },
];
