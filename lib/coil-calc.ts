/**
 * Coil stock calculator — TS port of roof_pipeline/coil_calc.py
 *
 * Formulas (annulus):
 *   linear_ft = (buildup / thickness) * pi * (ID + buildup) / 12
 *   sqft      = linear_ft * width / 12
 *   weight_lb = sqft * lb_per_sqft
 *
 * Inverse (solve OD for required linear_ft):
 *   pi*b^2 + pi*ID*b - 12*linear_ft*t = 0
 */

export interface CoilSpec {
  thickness_in: number;
  lb_per_sqft: number;
}

// Source: ASTM A653 (steel), Aluminum Association nominals, supplier avg
// for copper. TODO: reconcile with internal supplier sheets.
export const COIL_SPECS: Record<string, Record<string, CoilSpec>> = {
  steel: {
    "22ga": { thickness_in: 0.0299, lb_per_sqft: 1.406 },
    "24ga": { thickness_in: 0.0239, lb_per_sqft: 1.156 },
    "26ga": { thickness_in: 0.0179, lb_per_sqft: 0.906 },
  },
  aluminum: {
    "0.032": { thickness_in: 0.032, lb_per_sqft: 0.451 },
    "0.040": { thickness_in: 0.04, lb_per_sqft: 0.564 },
    "0.050": { thickness_in: 0.05, lb_per_sqft: 0.705 },
  },
  copper: {
    "16oz": { thickness_in: 0.0216, lb_per_sqft: 1.0 },
    "20oz": { thickness_in: 0.027, lb_per_sqft: 1.25 },
  },
};

export const DEFAULT_ID_IN = 20;
export const DEFAULT_WASTE_PCT = 10;

export interface CoilInputs {
  linearFtRaw: number;
  widthIn: number;
  material: string;
  gauge: string;
  idIn: number;
  wastePct: number;
}

export interface CoilResult {
  linearFtNeeded: number;
  odIn: number;
  wraps: number;
  sqft: number;
  weightLb: number;
  thicknessIn: number;
  lbPerSqft: number;
  error?: string;
}

export function lookupSpec(material: string, gauge: string): CoilSpec | null {
  return COIL_SPECS[material.toLowerCase()]?.[gauge] ?? null;
}

export function coilFromRequired(inputs: CoilInputs): CoilResult {
  const { linearFtRaw, widthIn, material, gauge, idIn, wastePct } = inputs;
  const spec = lookupSpec(material, gauge);
  if (!spec) {
    return {
      linearFtNeeded: linearFtRaw * (1 + wastePct / 100),
      odIn: 0,
      wraps: 0,
      sqft: 0,
      weightLb: 0,
      thicknessIn: 0,
      lbPerSqft: 0,
      error: `No spec for ${material} ${gauge}`,
    };
  }
  if (linearFtRaw <= 0 || idIn <= 0 || widthIn <= 0) {
    return {
      linearFtNeeded: 0,
      odIn: idIn,
      wraps: 0,
      sqft: 0,
      weightLb: 0,
      thicknessIn: spec.thickness_in,
      lbPerSqft: spec.lb_per_sqft,
    };
  }
  const linearFtNeeded = linearFtRaw * (1 + wastePct / 100);
  // pi*b^2 + pi*ID*b - 12*linear*t = 0
  const a = Math.PI;
  const b = Math.PI * idIn;
  const c = -12 * linearFtNeeded * spec.thickness_in;
  const disc = b * b - 4 * a * c;
  const buildup = (-b + Math.sqrt(disc)) / (2 * a);
  const odIn = idIn + 2 * buildup;
  const wraps = buildup / spec.thickness_in;
  const sqft = linearFtNeeded * (widthIn / 12);
  const weightLb = sqft * spec.lb_per_sqft;
  return {
    linearFtNeeded,
    odIn,
    wraps,
    sqft,
    weightLb,
    thicknessIn: spec.thickness_in,
    lbPerSqft: spec.lb_per_sqft,
  };
}

export function materialGaugeOptions(): { material: string; gauge: string }[] {
  const out: { material: string; gauge: string }[] = [];
  for (const [m, gauges] of Object.entries(COIL_SPECS))
    for (const g of Object.keys(gauges)) out.push({ material: m, gauge: g });
  return out;
}
