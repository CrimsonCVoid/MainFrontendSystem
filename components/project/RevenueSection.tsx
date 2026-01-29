"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ProjectRevenue {
  id: string;
  project_id: string;
  organization_id: string | null;
  estimated_revenue: number | null;
  actual_revenue: number | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  margin_percent: number | null;
  payment_status: "unpaid" | "partial" | "paid";
  invoice_number: string | null;
  notes: string | null;
}

interface RevenueSectionProps {
  projectId: string;
  organizationId: string;
  canEdit?: boolean;
}

/**
 * RevenueSection - Compact revenue tracking for project overview
 *
 * Features:
 * - Estimated vs actual revenue/cost inputs
 * - Auto-calculated margin
 * - Payment status tracking
 * - Invoice number field
 */
export function RevenueSection({
  projectId,
  organizationId,
  canEdit = true,
}: RevenueSectionProps) {
  const supabase = getSupabaseBrowserClient();

  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revenue, setRevenue] = useState<ProjectRevenue | null>(null);

  // Form state
  const [estimatedRevenue, setEstimatedRevenue] = useState<string>("");
  const [actualRevenue, setActualRevenue] = useState<string>("");
  const [estimatedCost, setEstimatedCost] = useState<string>("");
  const [actualCost, setActualCost] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "partial" | "paid">("unpaid");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Calculated margin
  const margin = (() => {
    const rev = parseFloat(actualRevenue) || parseFloat(estimatedRevenue) || 0;
    const cost = parseFloat(actualCost) || parseFloat(estimatedCost) || 0;
    if (rev === 0) return null;
    return ((rev - cost) / rev) * 100;
  })();

  // Load existing data
  useEffect(() => {
    async function loadRevenue() {
      const { data } = await supabase
        .from("project_revenue")
        .select("*")
        .eq("project_id", projectId)
        .single();

      if (data) {
        setRevenue(data as ProjectRevenue);
        setEstimatedRevenue(data.estimated_revenue?.toString() || "");
        setActualRevenue(data.actual_revenue?.toString() || "");
        setEstimatedCost(data.estimated_cost?.toString() || "");
        setActualCost(data.actual_cost?.toString() || "");
        setPaymentStatus(data.payment_status || "unpaid");
        setInvoiceNumber(data.invoice_number || "");
        setNotes(data.notes || "");
      }
      setLoading(false);
    }

    loadRevenue();
  }, [projectId, supabase]);

  // Save revenue data
  const handleSave = async () => {
    setSaving(true);

    const data = {
      project_id: projectId,
      organization_id: organizationId,
      estimated_revenue: estimatedRevenue ? parseFloat(estimatedRevenue) : null,
      actual_revenue: actualRevenue ? parseFloat(actualRevenue) : null,
      estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
      actual_cost: actualCost ? parseFloat(actualCost) : null,
      payment_status: paymentStatus,
      invoice_number: invoiceNumber || null,
      notes: notes || null,
    };

    if (revenue?.id) {
      await supabase.from("project_revenue").update(data).eq("id", revenue.id);
    } else {
      const { data: newRevenue } = await supabase
        .from("project_revenue")
        .insert(data)
        .select()
        .single();
      if (newRevenue) setRevenue(newRevenue as ProjectRevenue);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading revenue data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-left">
            <h4 className="font-medium text-neutral-900">Revenue Tracking</h4>
            {(estimatedRevenue || actualRevenue) && !expanded && (
              <p className="text-sm text-neutral-500">
                {actualRevenue
                  ? `$${parseFloat(actualRevenue).toLocaleString()} actual`
                  : `$${parseFloat(estimatedRevenue).toLocaleString()} estimated`}
                {margin !== null && (
                  <span
                    className={`ml-2 ${
                      margin >= 20
                        ? "text-emerald-600"
                        : margin >= 0
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    ({margin.toFixed(1)}% margin)
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-neutral-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-neutral-400" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-neutral-100"
        >
          <div className="p-4 space-y-4">
            {/* Revenue Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Estimated Revenue
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={estimatedRevenue}
                    onChange={(e) => setEstimatedRevenue(e.target.value)}
                    disabled={!canEdit}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-neutral-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Actual Revenue
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={actualRevenue}
                    onChange={(e) => setActualRevenue(e.target.value)}
                    disabled={!canEdit}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-neutral-50"
                  />
                </div>
              </div>
            </div>

            {/* Cost Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Estimated Cost
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    disabled={!canEdit}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-neutral-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Actual Cost
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                    $
                  </span>
                  <input
                    type="number"
                    value={actualCost}
                    onChange={(e) => setActualCost(e.target.value)}
                    disabled={!canEdit}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-neutral-50"
                  />
                </div>
              </div>
            </div>

            {/* Margin Display */}
            {margin !== null && (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  margin >= 20
                    ? "bg-emerald-50 text-emerald-700"
                    : margin >= 0
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                }`}
              >
                {margin >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">
                  {margin.toFixed(1)}% profit margin
                </span>
              </div>
            )}

            {/* Payment Status & Invoice */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) =>
                    setPaymentStatus(e.target.value as "unpaid" | "partial" | "paid")
                  }
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-neutral-50 bg-white"
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Invoice #
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    disabled={!canEdit}
                    placeholder="INV-001"
                    className="w-full pl-10 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-neutral-50"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canEdit}
                placeholder="Add any notes about this project's financials..."
                rows={2}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-neutral-50 resize-none"
              />
            </div>

            {/* Save Button */}
            {canEdit && (
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving} size="sm">
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-1.5" />
                  )}
                  Save
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
