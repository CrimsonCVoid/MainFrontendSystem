"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign, Plus, FileText, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getInvoiceStatusColor } from "@/lib/invoicing";

interface Invoice {
  id: string; invoice_number: string; status: string; subtotal: number;
  total: number; amount_paid: number; due_date: string | null;
  created_at: string; line_items: any[];
}

interface ChangeOrder {
  id: string; title: string; description: string | null; amount: number;
  status: string; created_at: string;
}

interface Props {
  projectId: string;
  organizationId: string;
  userId: string;
  clientId?: string;
}

export default function FinancialsTab({ projectId, organizationId, userId, clientId }: Props) {
  const supabase = getSupabaseBrowserClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCO, setShowAddCO] = useState(false);
  const [coForm, setCoForm] = useState({ title: "", description: "", amount: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const [invRes, coRes] = await Promise.all([
      (supabase.from("project_invoices") as any).select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
      (supabase.from("change_orders") as any).select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    ]);
    setInvoices(invRes.data || []);
    setChangeOrders(coRes.data || []);
    setLoading(false);
  }, [projectId, supabase]);

  useEffect(() => { load(); }, [load]);

  const createInvoiceFromEstimate = async () => {
    // Get active estimate
    const { data: estimates } = await (supabase.from("project_estimates") as any)
      .select("*").eq("project_id", projectId).eq("is_active", true).limit(1);
    const est = estimates?.[0];

    const lineItems = [];
    if (est?.materials_cost) lineItems.push({ description: "Metal Roofing Materials", quantity: 1, unit_price: Number(est.materials_cost), total: Number(est.materials_cost) });
    if (est?.labor_cost) lineItems.push({ description: "Installation Labor", quantity: 1, unit_price: Number(est.labor_cost), total: Number(est.labor_cost) });
    if (est?.permits_fees) lineItems.push({ description: "Permits & Inspections", quantity: 1, unit_price: Number(est.permits_fees), total: Number(est.permits_fees) });

    const subtotal = lineItems.reduce((s, i) => s + i.total, 0);

    // Get next invoice number
    const { count } = await (supabase.from("project_invoices") as any).select("id", { count: "exact", head: true }).eq("organization_id", organizationId);
    const invoiceNumber = `INV-${String((count || 0) + 1).padStart(4, "0")}`;

    await (supabase.from("project_invoices") as any).insert({
      project_id: projectId,
      organization_id: organizationId,
      client_id: clientId || null,
      invoice_number: invoiceNumber,
      status: "draft",
      subtotal, total: subtotal,
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      line_items: lineItems,
      created_by: userId,
    });
    load();
  };

  const addChangeOrder = async () => {
    if (!coForm.title.trim()) return;
    await (supabase.from("change_orders") as any).insert({
      project_id: projectId,
      organization_id: organizationId,
      title: coForm.title.trim(),
      description: coForm.description || null,
      amount: parseFloat(coForm.amount) || 0,
      created_by: userId,
    });
    setShowAddCO(false);
    setCoForm({ title: "", description: "", amount: "" });
    load();
  };

  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.amount_paid), 0);
  const totalCOs = changeOrders.filter((c) => c.status === "approved").reduce((s, c) => s + Number(c.amount), 0);

  const money = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  if (loading) return <div className="text-center py-12 text-neutral-400">Loading financials...</div>;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-blue-500" /><span className="text-xs text-neutral-500">Total Invoiced</span></div>
          <p className="text-xl font-bold text-neutral-900">{money(totalInvoiced)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-green-500" /><span className="text-xs text-neutral-500">Total Paid</span></div>
          <p className="text-xl font-bold text-green-600">{money(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4 text-red-500" /><span className="text-xs text-neutral-500">Outstanding</span></div>
          <p className="text-xl font-bold text-red-600">{money(totalInvoiced - totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-amber-500" /><span className="text-xs text-neutral-500">Change Orders</span></div>
          <p className="text-xl font-bold text-amber-600">{money(totalCOs)}</p>
        </div>
      </div>

      {/* Invoices */}
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-semibold text-neutral-900">Invoices</h3>
          <Button size="sm" onClick={createInvoiceFromEstimate} className="gap-1 bg-blue-500 hover:bg-blue-600 text-xs">
            <Plus className="w-3 h-3" /> Create from Estimate
          </Button>
        </div>
        {invoices.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-sm">No invoices yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-neutral-200 bg-neutral-50">
              <th className="text-left py-2 px-4 font-semibold text-neutral-600">Invoice #</th>
              <th className="text-left py-2 px-4 font-semibold text-neutral-600">Status</th>
              <th className="text-right py-2 px-4 font-semibold text-neutral-600">Total</th>
              <th className="text-right py-2 px-4 font-semibold text-neutral-600">Paid</th>
              <th className="text-left py-2 px-4 font-semibold text-neutral-600">Due Date</th>
            </tr></thead>
            <tbody>{invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="py-2 px-4 font-medium">{inv.invoice_number}</td>
                <td className="py-2 px-4"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getInvoiceStatusColor(inv.status)}`}>{inv.status}</span></td>
                <td className="py-2 px-4 text-right font-semibold">{money(Number(inv.total))}</td>
                <td className="py-2 px-4 text-right text-green-600">{money(Number(inv.amount_paid))}</td>
                <td className="py-2 px-4 text-neutral-500">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Change Orders */}
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-semibold text-neutral-900">Change Orders</h3>
          <Button size="sm" variant="outline" onClick={() => setShowAddCO(true)} className="gap-1 text-xs">
            <Plus className="w-3 h-3" /> Add Change Order
          </Button>
        </div>
        {showAddCO && (
          <div className="p-4 border-b border-neutral-100 bg-amber-50 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Title *</Label><Input value={coForm.title} onChange={(e) => setCoForm({ ...coForm, title: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Description</Label><Input value={coForm.description} onChange={(e) => setCoForm({ ...coForm, description: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs">Amount</Label><Input inputMode="decimal" value={coForm.amount} onChange={(e) => setCoForm({ ...coForm, amount: e.target.value })} className="mt-1" placeholder="$0.00" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={addChangeOrder} disabled={!coForm.title.trim()}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddCO(false)}>Cancel</Button>
            </div>
          </div>
        )}
        {changeOrders.length === 0 && !showAddCO ? (
          <div className="text-center py-8 text-neutral-400 text-sm">No change orders</div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {changeOrders.map((co) => (
              <div key={co.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900">{co.title}</p>
                  {co.description && <p className="text-xs text-neutral-500">{co.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    co.status === "approved" ? "bg-green-100 text-green-700" :
                    co.status === "rejected" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>{co.status}</span>
                  <span className="font-bold text-neutral-900">{money(Number(co.amount))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
