/**
 * CSV EXPORT UTILITIES
 *
 * Functions to export various data types to CSV format
 * for download in Excel, Google Sheets, etc.
 */

import type { BOMSummary, BOMItem } from "./bom-calculator";

// ============================================
// TYPES
// ============================================

export interface ProjectForExport {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  square_footage?: number | null;
  status?: string | null;
  payment_completed?: boolean | null;
  created_at: string;
  creator?: {
    email: string;
    full_name?: string | null;
  } | null;
}

export interface RevenueForExport {
  project_id: string;
  project_name: string;
  client_name?: string;
  estimated_revenue?: number | null;
  actual_revenue?: number | null;
  estimated_cost?: number | null;
  actual_cost?: number | null;
  margin_percent?: number | null;
  payment_status?: string;
  invoice_number?: string;
  created_at?: string;
}

export interface EstimateForExport {
  project_name: string;
  client_name?: string;
  materials_cost?: number | null;
  labor_cost?: number | null;
  permits_fees?: number | null;
  contingency?: number | null;
  total?: number;
  status?: string;
  created_at?: string;
}

// ============================================
// HELPERS
// ============================================

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  // Header row
  const headerRow = columns.map((col) => escapeCSV(col.header)).join(",");

  // Data rows
  const dataRows = data.map((row) =>
    columns.map((col) => escapeCSV(row[col.key])).join(",")
  );

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Format currency for CSV
 */
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toFixed(2);
}

/**
 * Format date for CSV
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export Bill of Materials to CSV
 */
export function exportBOMToCSV(bom: BOMSummary, projectName?: string): string {
  const columns: { key: keyof BOMItem; header: string }[] = [
    { key: "category", header: "Category" },
    { key: "item", header: "Item" },
    { key: "description", header: "Description" },
    { key: "quantity", header: "Quantity" },
    { key: "unit", header: "Unit" },
    { key: "unitCost", header: "Unit Cost ($)" },
    { key: "totalCost", header: "Total Cost ($)" },
    { key: "notes", header: "Notes" },
  ];

  // Transform items for export
  const exportData = bom.items.map((item) => ({
    ...item,
    unitCost: formatCurrency(item.unitCost),
    totalCost: formatCurrency(item.totalCost),
  }));

  let csv = "";

  // Add header info
  if (projectName) {
    csv += `Bill of Materials - ${escapeCSV(projectName)}\n`;
  }
  csv += `Generated: ${new Date().toLocaleDateString()}\n`;
  csv += `Square Footage: ${bom.projectSquareFeet}\n`;
  csv += `Panel Width: ${bom.panelWidth}"\n`;
  csv += `Total Cost: $${formatCurrency(bom.totalCost)}\n`;
  csv += "\n";

  // Add data
  csv += arrayToCSV(exportData as unknown as Record<string, unknown>[], columns);

  return csv;
}

/**
 * Export projects list to CSV
 */
export function exportProjectsToCSV(projects: ProjectForExport[]): string {
  const columns = [
    { key: "name" as const, header: "Project Name" },
    { key: "address" as const, header: "Address" },
    { key: "city" as const, header: "City" },
    { key: "state" as const, header: "State" },
    { key: "square_footage" as const, header: "Square Footage" },
    { key: "status" as const, header: "Status" },
    { key: "payment_completed" as const, header: "Verified" },
    { key: "creator_name" as const, header: "Created By" },
    { key: "creator_email" as const, header: "Creator Email" },
    { key: "created_at" as const, header: "Created Date" },
  ];

  // Transform data
  const exportData = projects.map((p) => ({
    name: p.name,
    address: p.address || "",
    city: p.city || "",
    state: p.state || "",
    square_footage: p.square_footage || "",
    status: p.status || "draft",
    payment_completed: p.payment_completed ? "Yes" : "No",
    creator_name: p.creator?.full_name || "",
    creator_email: p.creator?.email || "",
    created_at: formatDate(p.created_at),
  }));

  let csv = `Projects Export\n`;
  csv += `Generated: ${new Date().toLocaleDateString()}\n`;
  csv += `Total Projects: ${projects.length}\n`;
  csv += "\n";

  csv += arrayToCSV(exportData, columns);

  return csv;
}

/**
 * Export revenue data to CSV
 */
export function exportRevenueToCSV(revenue: RevenueForExport[]): string {
  const columns = [
    { key: "project_name" as const, header: "Project" },
    { key: "client_name" as const, header: "Client" },
    { key: "estimated_revenue" as const, header: "Est. Revenue ($)" },
    { key: "actual_revenue" as const, header: "Act. Revenue ($)" },
    { key: "estimated_cost" as const, header: "Est. Cost ($)" },
    { key: "actual_cost" as const, header: "Act. Cost ($)" },
    { key: "margin_percent" as const, header: "Margin (%)" },
    { key: "payment_status" as const, header: "Payment Status" },
    { key: "invoice_number" as const, header: "Invoice #" },
    { key: "created_at" as const, header: "Date" },
  ];

  // Calculate totals
  const totals = revenue.reduce(
    (acc, r) => ({
      estimated_revenue: acc.estimated_revenue + (r.estimated_revenue || 0),
      actual_revenue: acc.actual_revenue + (r.actual_revenue || 0),
      estimated_cost: acc.estimated_cost + (r.estimated_cost || 0),
      actual_cost: acc.actual_cost + (r.actual_cost || 0),
    }),
    { estimated_revenue: 0, actual_revenue: 0, estimated_cost: 0, actual_cost: 0 }
  );

  const avgMargin =
    revenue.length > 0
      ? revenue.reduce((sum, r) => sum + (r.margin_percent || 0), 0) / revenue.length
      : 0;

  // Transform data
  const exportData = revenue.map((r) => ({
    project_name: r.project_name,
    client_name: r.client_name || "",
    estimated_revenue: formatCurrency(r.estimated_revenue),
    actual_revenue: formatCurrency(r.actual_revenue),
    estimated_cost: formatCurrency(r.estimated_cost),
    actual_cost: formatCurrency(r.actual_cost),
    margin_percent: r.margin_percent ? r.margin_percent.toFixed(1) + "%" : "",
    payment_status: r.payment_status || "",
    invoice_number: r.invoice_number || "",
    created_at: formatDate(r.created_at),
  }));

  let csv = `Revenue Report\n`;
  csv += `Generated: ${new Date().toLocaleDateString()}\n`;
  csv += `Total Projects: ${revenue.length}\n`;
  csv += `Total Est. Revenue: $${formatCurrency(totals.estimated_revenue)}\n`;
  csv += `Total Act. Revenue: $${formatCurrency(totals.actual_revenue)}\n`;
  csv += `Total Est. Cost: $${formatCurrency(totals.estimated_cost)}\n`;
  csv += `Total Act. Cost: $${formatCurrency(totals.actual_cost)}\n`;
  csv += `Average Margin: ${avgMargin.toFixed(1)}%\n`;
  csv += "\n";

  csv += arrayToCSV(exportData, columns);

  return csv;
}

/**
 * Export estimates to CSV
 */
export function exportEstimatesToCSV(estimates: EstimateForExport[]): string {
  const columns = [
    { key: "project_name" as const, header: "Project" },
    { key: "client_name" as const, header: "Client" },
    { key: "materials_cost" as const, header: "Materials ($)" },
    { key: "labor_cost" as const, header: "Labor ($)" },
    { key: "permits_fees" as const, header: "Permits/Fees ($)" },
    { key: "contingency" as const, header: "Contingency ($)" },
    { key: "total" as const, header: "Total ($)" },
    { key: "status" as const, header: "Status" },
    { key: "created_at" as const, header: "Date" },
  ];

  // Transform data
  const exportData = estimates.map((e) => ({
    project_name: e.project_name,
    client_name: e.client_name || "",
    materials_cost: formatCurrency(e.materials_cost),
    labor_cost: formatCurrency(e.labor_cost),
    permits_fees: formatCurrency(e.permits_fees),
    contingency: formatCurrency(e.contingency),
    total: formatCurrency(e.total),
    status: e.status || "",
    created_at: formatDate(e.created_at),
  }));

  let csv = `Estimates Export\n`;
  csv += `Generated: ${new Date().toLocaleDateString()}\n`;
  csv += `Total Estimates: ${estimates.length}\n`;
  csv += "\n";

  csv += arrayToCSV(exportData, columns);

  return csv;
}

// ============================================
// DOWNLOAD HELPERS
// ============================================

/**
 * Trigger CSV download in browser
 */
export function downloadCSV(content: string, filename: string): void {
  // Add BOM for Excel UTF-8 compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with date
 */
export function generateCSVFilename(prefix: string): string {
  const date = new Date().toISOString().split("T")[0];
  return `${prefix}_${date}.csv`;
}
