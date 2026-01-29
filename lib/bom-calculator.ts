/**
 * BILL OF MATERIALS CALCULATOR
 *
 * Auto-calculates material quantities for metal roofing projects
 * based on square footage, panel configuration, and roof measurements.
 *
 * Uses panel-config.ts for accurate panel specifications.
 */

import {
  STANDING_SEAM_WIDTHS,
  DEFAULT_SEAM_WIDTH,
  findSeamWidthByInches,
  type SeamWidth,
} from "./panel-config";
import type { RoofData } from "./database.types";

// ============================================
// TYPES
// ============================================

export interface BOMItem {
  id: string;
  category: "panel" | "fastener" | "trim" | "accessory";
  item: string;
  description?: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  totalCost?: number;
  isAutoCalculated: boolean;
  notes?: string;
}

export interface BOMSummary {
  items: BOMItem[];
  totalItems: number;
  totalCost: number;
  calculatedAt: string;
  projectSquareFeet: number;
  panelWidth: number;
}

export interface MaterialCost {
  id: string;
  material_type: string;
  material_name: string;
  unit: string;
  cost_per_unit: number;
}

interface ProjectForBOM {
  id: string;
  square_footage: number | null;
  roof_data: RoofData | null;
}

// ============================================
// CONSTANTS
// ============================================

// Default panel length in feet (common standing seam panel length)
const DEFAULT_PANEL_LENGTH_FT = 10;

// Clips per panel (based on 24" spacing on 10ft panel)
const CLIPS_PER_PANEL = 5;

// Screws per clip
const SCREWS_PER_CLIP = 4;

// Ridge cap coverage (linear feet per piece)
const RIDGE_CAP_LENGTH_FT = 10;

// Drip edge coverage
const DRIP_EDGE_LENGTH_FT = 10;

// Waste factor (add this percentage for waste/cuts)
const WASTE_FACTOR = 1.10; // 10% waste

// ============================================
// MAIN CALCULATOR
// ============================================

/**
 * Calculate Bill of Materials for a project
 *
 * @param project - Project data with square footage and roof data
 * @param panelWidthInches - Panel width in inches (default: 18")
 * @param materialCosts - Optional material costs for pricing
 * @returns BOM summary with all calculated items
 */
export function calculateBOM(
  project: ProjectForBOM,
  panelWidthInches: number = 18,
  materialCosts?: MaterialCost[]
): BOMSummary {
  const items: BOMItem[] = [];
  const sqft = project.square_footage || 0;
  const roofData = project.roof_data;

  // Get panel configuration
  const seamWidth = findSeamWidthByInches(panelWidthInches) || DEFAULT_SEAM_WIDTH;
  if (!seamWidth) {
    throw new Error(`Invalid panel width: ${panelWidthInches}"`);
  }

  // Helper to find material cost
  const findCost = (type: string, name: string): number | undefined => {
    if (!materialCosts) return undefined;
    const cost = materialCosts.find(
      (c) =>
        c.material_type.toLowerCase() === type.toLowerCase() &&
        c.material_name.toLowerCase().includes(name.toLowerCase())
    );
    return cost?.cost_per_unit;
  };

  // ========================================
  // PANELS
  // ========================================
  const panelCoverageSqFt =
    (seamWidth.effectiveCoverage / 12) * DEFAULT_PANEL_LENGTH_FT;
  const rawPanelCount = sqft / panelCoverageSqFt;
  const panelCount = Math.ceil(rawPanelCount * WASTE_FACTOR);
  const panelGauge = seamWidth.panelThickness;

  const panelUnitCost = findCost("panel", `${panelGauge}ga`);
  items.push({
    id: `panel-${seamWidth.inches}`,
    category: "panel",
    item: `Standing Seam Panel (${panelGauge}ga, ${seamWidth.label})`,
    description: `${DEFAULT_PANEL_LENGTH_FT}ft panels with ${seamWidth.seamHeight}" seam height`,
    quantity: panelCount,
    unit: "panels",
    unitCost: panelUnitCost,
    totalCost: panelUnitCost ? panelCount * panelUnitCost : undefined,
    isAutoCalculated: true,
  });

  // ========================================
  // FASTENERS - CLIPS
  // ========================================
  const totalClips = panelCount * CLIPS_PER_PANEL;
  const clipUnitCost = findCost("fastener", "clip");

  items.push({
    id: "fastener-clips",
    category: "fastener",
    item: "Panel Clips",
    description: `Fixed/floating clips for panel attachment (${seamWidth.clipSpacing}" spacing)`,
    quantity: totalClips,
    unit: "clips",
    unitCost: clipUnitCost,
    totalCost: clipUnitCost ? totalClips * clipUnitCost : undefined,
    isAutoCalculated: true,
  });

  // ========================================
  // FASTENERS - SCREWS
  // ========================================
  const totalScrews = totalClips * SCREWS_PER_CLIP;
  const screwUnitCost = findCost("fastener", "screw");

  items.push({
    id: "fastener-screws",
    category: "fastener",
    item: "#14 Self-Drilling Screws",
    description: "Screws for clip attachment to deck",
    quantity: totalScrews,
    unit: "screws",
    unitCost: screwUnitCost,
    totalCost: screwUnitCost ? totalScrews * screwUnitCost : undefined,
    isAutoCalculated: true,
  });

  // ========================================
  // TRIM - RIDGE CAP
  // ========================================
  let ridgeLengthFt = 0;
  if (roofData?.measurements?.ridge_length_ft) {
    ridgeLengthFt = roofData.measurements.ridge_length_ft;
  } else {
    // Estimate: assume ridge is roughly sqrt(sqft) / 2 for typical rectangular roof
    ridgeLengthFt = Math.sqrt(sqft) / 2;
  }
  const ridgeCapCount = Math.ceil((ridgeLengthFt / RIDGE_CAP_LENGTH_FT) * WASTE_FACTOR);
  const ridgeCapUnitCost = findCost("trim", "ridge");

  items.push({
    id: "trim-ridge",
    category: "trim",
    item: "Ridge Cap (10ft)",
    description: "Two-piece ridge cap for roof peak",
    quantity: ridgeCapCount,
    unit: "pieces",
    unitCost: ridgeCapUnitCost,
    totalCost: ridgeCapUnitCost ? ridgeCapCount * ridgeCapUnitCost : undefined,
    isAutoCalculated: true,
  });

  // ========================================
  // TRIM - DRIP EDGE
  // ========================================
  let eaveLengthFt = 0;
  if (roofData?.measurements?.eave_length_ft) {
    eaveLengthFt = roofData.measurements.eave_length_ft;
  } else {
    // Estimate: assume eave is roughly 2 * sqrt(sqft) for typical rectangular roof
    eaveLengthFt = 2 * Math.sqrt(sqft);
  }
  const dripEdgeCount = Math.ceil((eaveLengthFt / DRIP_EDGE_LENGTH_FT) * WASTE_FACTOR);
  const dripEdgeUnitCost = findCost("trim", "drip");

  items.push({
    id: "trim-drip",
    category: "trim",
    item: "Drip Edge (10ft)",
    description: "Edge flashing for eaves",
    quantity: dripEdgeCount,
    unit: "pieces",
    unitCost: dripEdgeUnitCost,
    totalCost: dripEdgeUnitCost ? dripEdgeCount * dripEdgeUnitCost : undefined,
    isAutoCalculated: true,
  });

  // ========================================
  // TRIM - VALLEY FLASHING (if applicable)
  // ========================================
  if (roofData?.measurements?.valley_length_ft && roofData.measurements.valley_length_ft > 0) {
    const valleyLengthFt = roofData.measurements.valley_length_ft;
    const valleyCount = Math.ceil((valleyLengthFt / 10) * WASTE_FACTOR);
    const valleyUnitCost = findCost("trim", "valley");

    items.push({
      id: "trim-valley",
      category: "trim",
      item: "Valley Flashing (10ft)",
      description: "W-valley or open valley flashing",
      quantity: valleyCount,
      unit: "pieces",
      unitCost: valleyUnitCost,
      totalCost: valleyUnitCost ? valleyCount * valleyUnitCost : undefined,
      isAutoCalculated: true,
    });
  }

  // ========================================
  // TRIM - GABLE TRIM (if applicable)
  // ========================================
  // Estimate gable length from perimeter minus eaves
  const perimeterFt = roofData?.measurements?.total_perimeter_ft || Math.sqrt(sqft) * 4;
  const gableLengthFt = Math.max(0, perimeterFt - eaveLengthFt);
  if (gableLengthFt > 0) {
    const gableCount = Math.ceil((gableLengthFt / 10) * WASTE_FACTOR);
    const gableUnitCost = findCost("trim", "gable");

    items.push({
      id: "trim-gable",
      category: "trim",
      item: "Gable Trim (10ft)",
      description: "Rake edge trim for gable ends",
      quantity: gableCount,
      unit: "pieces",
      unitCost: gableUnitCost,
      totalCost: gableUnitCost ? gableCount * gableUnitCost : undefined,
      isAutoCalculated: true,
    });
  }

  // ========================================
  // ACCESSORIES - BUTYL TAPE
  // ========================================
  // Estimate: 1 roll per 500 sqft
  const butylRolls = Math.ceil(sqft / 500);
  const butylUnitCost = findCost("accessory", "butyl");

  items.push({
    id: "accessory-butyl",
    category: "accessory",
    item: "Butyl Tape Roll",
    description: "Sealant tape for trim and flashing",
    quantity: butylRolls,
    unit: "rolls",
    unitCost: butylUnitCost,
    totalCost: butylUnitCost ? butylRolls * butylUnitCost : undefined,
    isAutoCalculated: true,
  });

  // ========================================
  // SUMMARY
  // ========================================
  const totalCost = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);

  return {
    items,
    totalItems: items.length,
    totalCost,
    calculatedAt: new Date().toISOString(),
    projectSquareFeet: sqft,
    panelWidth: panelWidthInches,
  };
}

/**
 * Recalculate BOM with manual overrides
 *
 * @param baseBOM - Original calculated BOM
 * @param overrides - Map of item ID to override quantity
 * @returns Updated BOM with overrides applied
 */
export function applyBOMOverrides(
  baseBOM: BOMSummary,
  overrides: Record<string, number>
): BOMSummary {
  const items = baseBOM.items.map((item) => {
    if (overrides[item.id] !== undefined) {
      const newQuantity = overrides[item.id];
      return {
        ...item,
        quantity: newQuantity,
        totalCost: item.unitCost ? newQuantity * item.unitCost : undefined,
        isAutoCalculated: false,
      };
    }
    return item;
  });

  const totalCost = items.reduce((sum, item) => sum + (item.totalCost || 0), 0);

  return {
    ...baseBOM,
    items,
    totalCost,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Get BOM items grouped by category
 */
export function groupBOMByCategory(bom: BOMSummary): Record<string, BOMItem[]> {
  return bom.items.reduce(
    (groups, item) => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
      return groups;
    },
    {} as Record<string, BOMItem[]>
  );
}

/**
 * Calculate category totals
 */
export function getBOMCategoryTotals(
  bom: BOMSummary
): Record<string, { count: number; cost: number }> {
  const grouped = groupBOMByCategory(bom);
  const totals: Record<string, { count: number; cost: number }> = {};

  for (const [category, items] of Object.entries(grouped)) {
    totals[category] = {
      count: items.length,
      cost: items.reduce((sum, item) => sum + (item.totalCost || 0), 0),
    };
  }

  return totals;
}
