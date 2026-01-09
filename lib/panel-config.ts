/**
 * STANDING SEAM PANEL CONFIGURATION
 *
 * Width options for standing seam metal roof panels.
 * Standing seam panels come in various rib spacings from 10" to 24".
 *
 * KY - HOW IT WORKS:
 * - Each width option defines panel coverage area
 * - inches: Panel width in inches (e.g., 16" = 16 inches from rib to rib)
 * - meters: Same measurement in metric (for calculations)
 * - label: Display text for UI (e.g., '16"')
 *
 * KY - USAGE:
 * - User selects panel width in project configurator
 * - Affects panel count calculation: total_area / (width * length)
 * - Narrower widths = more panels needed, but easier to work with
 * - Most common: 16" and 18" widths
 */

export interface SeamWidth {
  inches: number;
  meters: number;
  label: string;
}

export const STANDING_SEAM_WIDTHS: SeamWidth[] = [
  { inches: 10, meters: 0.254, label: '10"' },
  { inches: 12, meters: 0.3048, label: '12"' },
  { inches: 14, meters: 0.3556, label: '14"' },
  { inches: 15, meters: 0.381, label: '15"' },
  { inches: 15.5, meters: 0.3937, label: '15.5"' },
  { inches: 16, meters: 0.4064, label: '16"' },
  { inches: 18, meters: 0.4572, label: '18"' },
  { inches: 20, meters: 0.508, label: '20"' },
  { inches: 22, meters: 0.5588, label: '22"' },
  { inches: 24, meters: 0.6096, label: '24"' },
];

export const DEFAULT_SEAM_WIDTH = STANDING_SEAM_WIDTHS.find(w => w.inches === 18);

export function findSeamWidthByInches(inches: number): SeamWidth | undefined {
  return STANDING_SEAM_WIDTHS.find(w => w.inches === inches);
}

export function findSeamWidthByMeters(meters: number, tolerance = 0.01): SeamWidth | undefined {
  return STANDING_SEAM_WIDTHS.find(w => Math.abs(w.meters - meters) < tolerance);
}

export function inchesToMeters(inches: number): number {
  return inches * 0.0254;
}

export function metersToInches(meters: number): number {
  return meters / 0.0254;
}
