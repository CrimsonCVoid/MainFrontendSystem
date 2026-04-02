import type { SupabaseClient } from "@supabase/supabase-js";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ProjectInvoice {
  id: string;
  project_id: string;
  organization_id: string;
  client_id: string | null;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  notes: string | null;
  line_items: InvoiceLineItem[];
  created_by: string;
  created_at: string;
}

export async function generateInvoiceNumber(supabase: SupabaseClient, orgId: string): Promise<string> {
  const { count } = await (supabase.from("project_invoices") as any)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId);
  return `INV-${String((count || 0) + 1).padStart(4, "0")}`;
}

export async function getProjectInvoices(supabase: SupabaseClient, projectId: string) {
  return (supabase.from("project_invoices") as any)
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
}

export async function createInvoice(supabase: SupabaseClient, input: Partial<ProjectInvoice>) {
  return (supabase.from("project_invoices") as any).insert(input).select().single();
}

export async function updateInvoice(supabase: SupabaseClient, id: string, input: Partial<ProjectInvoice>) {
  return (supabase.from("project_invoices") as any)
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id).select().single();
}

export async function createInvoiceFromEstimate(
  supabase: SupabaseClient,
  projectId: string,
  orgId: string,
  userId: string,
  clientId?: string
) {
  const { data: estimates } = await (supabase.from("project_estimates") as any)
    .select("*")
    .eq("project_id", projectId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1);

  const est = estimates?.[0];
  const invoiceNumber = await generateInvoiceNumber(supabase, orgId);

  const lineItems: InvoiceLineItem[] = [];
  if (est) {
    if (est.materials_cost) lineItems.push({ description: "Metal Roofing Materials", quantity: 1, unit_price: Number(est.materials_cost), total: Number(est.materials_cost) });
    if (est.labor_cost) lineItems.push({ description: "Installation Labor", quantity: 1, unit_price: Number(est.labor_cost), total: Number(est.labor_cost) });
    if (est.permits_fees) lineItems.push({ description: "Permits & Inspections", quantity: 1, unit_price: Number(est.permits_fees), total: Number(est.permits_fees) });
    if (est.contingency) lineItems.push({ description: "Contingency", quantity: 1, unit_price: Number(est.contingency), total: Number(est.contingency) });
  }

  const subtotal = lineItems.reduce((s, i) => s + i.total, 0);

  return createInvoice(supabase, {
    project_id: projectId,
    organization_id: orgId,
    client_id: clientId || null,
    invoice_number: invoiceNumber,
    status: "draft",
    subtotal,
    tax_rate: 0,
    tax_amount: 0,
    total: subtotal,
    amount_paid: 0,
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    line_items: lineItems,
    created_by: userId,
  } as any);
}

export function getInvoiceStatusColor(status: string) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-neutral-100 text-neutral-500",
  };
  return map[status] || map.draft;
}
