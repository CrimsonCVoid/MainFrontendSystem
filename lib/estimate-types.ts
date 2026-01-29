/**
 * ESTIMATE TYPES
 *
 * TypeScript types and utilities for project estimates.
 */

import type { Tables } from "./database.types";

export type ProjectEstimate = Tables<"project_estimates">;

export interface EstimateFormData {
  name: string;
  materials_cost: number;
  labor_cost: number;
  permits_fees: number;
  contingency: number;
  notes: string;
}

export interface EstimateWithTotal extends EstimateFormData {
  id?: string;
  total_cost: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Calculate total cost from estimate form data
 */
export function calculateTotal(estimate: EstimateFormData): number {
  return (
    (estimate.materials_cost || 0) +
    (estimate.labor_cost || 0) +
    (estimate.permits_fees || 0) +
    (estimate.contingency || 0)
  );
}

/**
 * Calculate contingency amount from a percentage of subtotal
 */
export function calculateContingencyFromPercentage(
  subtotal: number,
  percentage: number
): number {
  return Math.round(subtotal * (percentage / 100) * 100) / 100;
}

/**
 * Get default estimate form data
 */
export function getDefaultEstimate(): EstimateFormData {
  return {
    name: "Default Estimate",
    materials_cost: 4500,
    labor_cost: 3200,
    permits_fees: 450,
    contingency: 315,
    notes: "",
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
