"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { exportRevenueToCSV, downloadCSV, generateCSVFilename } from "@/lib/csv-export";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  Download,
  Filter,
  Search,
  ChevronDown,
  Loader2,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
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
  created_at: string;
  project?: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    created_at: string;
  };
}

interface RevenueTabProps {
  organizationId: string;
}

type PaymentFilter = "all" | "unpaid" | "partial" | "paid";

/**
 * RevenueTab - Admin dashboard revenue tracking
 *
 * Features:
 * - Summary cards with totals
 * - Project profitability table
 * - Filter by payment status
 * - Date range filter
 * - CSV export
 */
export function RevenueTab({ organizationId }: RevenueTabProps) {
  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<ProjectRevenue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");

  // Load revenue data with project details
  useEffect(() => {
    async function loadRevenue() {
      const { data, error } = await supabase
        .from("project_revenue")
        .select(
          `
          *,
          project:projects (
            id,
            name,
            address,
            city,
            state,
            created_at
          )
        `
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setRevenueData(data as ProjectRevenue[]);
      }
      setLoading(false);
    }

    loadRevenue();
  }, [organizationId, supabase]);

  // Filter data
  const filteredData = useMemo(() => {
    return revenueData.filter((rev) => {
      // Payment status filter
      if (paymentFilter !== "all" && rev.payment_status !== paymentFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const projectName = rev.project?.name?.toLowerCase() || "";
        const address = rev.project?.address?.toLowerCase() || "";
        const invoice = rev.invoice_number?.toLowerCase() || "";
        if (
          !projectName.includes(query) &&
          !address.includes(query) &&
          !invoice.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [revenueData, paymentFilter, searchQuery]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, rev) => ({
        estimatedRevenue: acc.estimatedRevenue + (rev.estimated_revenue || 0),
        actualRevenue: acc.actualRevenue + (rev.actual_revenue || 0),
        estimatedCost: acc.estimatedCost + (rev.estimated_cost || 0),
        actualCost: acc.actualCost + (rev.actual_cost || 0),
        count: acc.count + 1,
      }),
      {
        estimatedRevenue: 0,
        actualRevenue: 0,
        estimatedCost: 0,
        actualCost: 0,
        count: 0,
      }
    );
  }, [filteredData]);

  const avgMargin = useMemo(() => {
    const withMargin = filteredData.filter((r) => r.margin_percent !== null);
    if (withMargin.length === 0) return 0;
    return (
      withMargin.reduce((sum, r) => sum + (r.margin_percent || 0), 0) / withMargin.length
    );
  }, [filteredData]);

  const totalProfit =
    totals.actualRevenue > 0
      ? totals.actualRevenue - totals.actualCost
      : totals.estimatedRevenue - totals.estimatedCost;

  // Export to CSV
  const handleExport = () => {
    const exportData = filteredData.map((rev) => ({
      project_id: rev.project_id,
      project_name: rev.project?.name || "",
      estimated_revenue: rev.estimated_revenue,
      actual_revenue: rev.actual_revenue,
      estimated_cost: rev.estimated_cost,
      actual_cost: rev.actual_cost,
      margin_percent: rev.margin_percent,
      payment_status: rev.payment_status,
      invoice_number: rev.invoice_number || undefined,
      created_at: rev.project?.created_at,
    }));

    const csv = exportRevenueToCSV(exportData);
    const filename = generateCSVFilename("Revenue_Report");
    downloadCSV(csv, filename);
  };

  // Payment status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Paid
          </span>
        );
      case "partial":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock className="h-3 w-3" />
            Partial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
            <AlertCircle className="h-3 w-3" />
            Unpaid
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 text-neutral-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">
            ${(totals.actualRevenue || totals.estimatedRevenue).toLocaleString()}
          </p>
          {totals.actualRevenue > 0 && totals.estimatedRevenue > 0 && (
            <p className="text-xs text-neutral-500 mt-1">
              Est: ${totals.estimatedRevenue.toLocaleString()}
            </p>
          )}
        </div>

        {/* Total Profit */}
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Total Profit</span>
          </div>
          <p
            className={`text-2xl font-bold ${
              totalProfit >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            ${totalProfit.toLocaleString()}
          </p>
        </div>

        {/* Average Margin */}
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm">Avg Margin</span>
          </div>
          <p
            className={`text-2xl font-bold ${
              avgMargin >= 20
                ? "text-emerald-600"
                : avgMargin >= 0
                  ? "text-amber-600"
                  : "text-red-600"
            }`}
          >
            {avgMargin.toFixed(1)}%
          </p>
        </div>

        {/* Projects Tracked */}
        <div className="bg-white border border-neutral-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-neutral-500 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Projects Tracked</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{totals.count}</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              className="pl-10 pr-4 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>

          {/* Payment Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
              className="pl-10 pr-8 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* Export */}
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {/* Revenue Table */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Est. Revenue
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Act. Revenue
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Margin
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                    No revenue data found
                  </td>
                </tr>
              ) : (
                filteredData.map((rev) => (
                  <motion.tr
                    key={rev.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-neutral-50"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-neutral-900">
                          {rev.project?.name || "Unknown Project"}
                        </p>
                        {rev.project?.city && (
                          <p className="text-sm text-neutral-500">
                            {rev.project.city}, {rev.project.state}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-600">
                      {rev.estimated_revenue
                        ? `$${rev.estimated_revenue.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-900">
                      {rev.actual_revenue
                        ? `$${rev.actual_revenue.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {rev.margin_percent !== null ? (
                        <span
                          className={`font-medium ${
                            rev.margin_percent >= 20
                              ? "text-emerald-600"
                              : rev.margin_percent >= 0
                                ? "text-amber-600"
                                : "text-red-600"
                          }`}
                        >
                          {rev.margin_percent.toFixed(1)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(rev.payment_status)}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {rev.invoice_number || "—"}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
