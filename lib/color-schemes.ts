/**
 * ROOF COLOR CONFIGURATION
 *
 * Defines all available metal roof colors organized by coating quality.
 * Used in 3D viewer, estimator, and project configurator.
 *
 * KY - COLOR SERIES:
 * - premium: PVDF 70% coating (highest quality, 30+ year warranty, 26 colors)
 * - reserve: Metallic/weathered special finishes (7 colors)
 * - standard: SMP coating (economical, 20-25 year warranty, 17 colors)
 *
 * KY - USAGE:
 * - Frontend selects color from dropdown
 * - Color hex value used in 3D viewer material system
 * - Coating type affects pricing/quotes (premium costs more)
 * - glitter: true flag enables high-density sparkle effect in 3D model
 */

export type ColorSeries = "premium" | "reserve" | "standard";

export interface RoofColor {
  name: string;
  hex: string;
  coating: string;
  glitter?: boolean;
}

export const ROOF_COLORS: Record<ColorSeries, RoofColor[]> = {
  premium: [
    { name: "Galvalume", hex: "#A8A8A8", coating: "PVDF 70%", glitter: true },
    { name: "Aged Copper", hex: "#D4B896", coating: "PVDF 70%", glitter: true },
    { name: "Almond", hex: "#E6D5B8", coating: "PVDF 70%", glitter: true },
    { name: "Buckskin", hex: "#C8B896", coating: "PVDF 70%", glitter: true },
    { name: "Burgundy", hex: "#6B1F3D", coating: "PVDF 70%", glitter: true },
    { name: "Charcoal Gray", hex: "#4A5568", coating: "PVDF 70%", glitter: true },
    { name: "Colonial Red", hex: "#8B2E2E", coating: "PVDF 70%", glitter: true },
    { name: "Dark Bronze", hex: "#4A3728", coating: "PVDF 70%", glitter: true },
    { name: "Dove Gray", hex: "#9E9E9E", coating: "PVDF 70%", glitter: true },
    { name: "Evergreen", hex: "#2D5016", coating: "PVDF 70%", glitter: true },
    { name: "Hartford Green", hex: "#3D5A3D", coating: "PVDF 70%", glitter: true },
    { name: "Hemlock Green", hex: "#2F4538", coating: "PVDF 70%", glitter: true },
    { name: "Mansard Brown", hex: "#5C4033", coating: "PVDF 70%", glitter: true },
    { name: "Matte Black", hex: "#2B2B2B", coating: "PVDF 70%", glitter: true },
    { name: "Medium Bronze", hex: "#6B4423", coating: "PVDF 70%", glitter: true },
    { name: "Patina Green", hex: "#4A6B5C", coating: "PVDF 70%", glitter: true },
    { name: "Regal Blue", hex: "#2C5F8D", coating: "PVDF 70%", glitter: true },
    { name: "Regal Red", hex: "#A23B3B", coating: "PVDF 70%", glitter: true },
    { name: "Regal White", hex: "#FCFCFC", coating: "PVDF 70%", glitter: true },
    { name: "Sandstone", hex: "#D4C5A9", coating: "PVDF 70%", glitter: true },
    { name: "Sierra Tan", hex: "#C8A882", coating: "PVDF 70%", glitter: true },
    { name: "Slate Blue", hex: "#546E7A", coating: "PVDF 70%", glitter: true },
    { name: "Slate Gray", hex: "#6B7C8C", coating: "PVDF 70%", glitter: true },
    { name: "Solar White", hex: "#F5F5F5", coating: "PVDF 70%", glitter: true },
    { name: "Terra Cotta", hex: "#B8704F", coating: "PVDF 70%", glitter: true },
    { name: "Tropical Patina", hex: "#5A7C6B", coating: "PVDF 70%", glitter: true },
  ],
  reserve: [
    { name: "Champagne Metallic", hex: "#D4AF6A", coating: "Metallic" },
    { name: "Copper Metallic", hex: "#B87333", coating: "Metallic" },
    { name: "Pre-Weathered Metallic", hex: "#6B675F", coating: "Metallic" },
    { name: "Silver Metallic", hex: "#C0C0C0", coating: "Metallic" },
    { name: "Vintage Copper", hex: "#9C6B4E", coating: "Weathered" },
    { name: "Vintage Galvalume", hex: "#A8A8A8", coating: "Weathered" },
    { name: "Vintage Steel", hex: "#5C5C5C", coating: "Weathered" },
  ],
  standard: [
    { name: "Berry", hex: "#6B2D5C", coating: "SMP" },
    { name: "Black", hex: "#2B2B2B", coating: "SMP" },
    { name: "Buckskin", hex: "#C8B896", coating: "SMP" },
    { name: "Charcoal", hex: "#4A5568", coating: "SMP" },
    { name: "Cocoa Brown", hex: "#5C4033", coating: "SMP" },
    { name: "Colony Green", hex: "#3D5A3D", coating: "SMP" },
    { name: "Copper Metallic", hex: "#B87333", coating: "SMP" },
    { name: "Crimson Red", hex: "#A23B3B", coating: "SMP" },
    { name: "Evergreen", hex: "#2D5016", coating: "SMP" },
    { name: "Gallery Blue", hex: "#4A6B8C", coating: "SMP" },
    { name: "Hawaiian Blue", hex: "#5A8BAF", coating: "SMP" },
    { name: "Ivory", hex: "#FFFFF0", coating: "SMP" },
    { name: "Light Stone", hex: "#D4C5A9", coating: "SMP" },
    { name: "Old Town Gray", hex: "#8B8680", coating: "SMP" },
    { name: "Polar White", hex: "#FAFAFA", coating: "SMP" },
    { name: "Rustic Red", hex: "#8B4545", coating: "SMP" },
    { name: "Saddle Tan", hex: "#B8956F", coating: "SMP" },
  ],
};

export const DEFAULT_COLOR = ROOF_COLORS.premium[0];
export const DEFAULT_SERIES: ColorSeries = "premium";

export function getAllColors(): RoofColor[] {
  return [
    ...ROOF_COLORS.premium,
    ...ROOF_COLORS.reserve,
    ...ROOF_COLORS.standard,
  ];
}

export function findColorByName(name: string): RoofColor | undefined {
  return getAllColors().find(color => color.name === name);
}

export function findColorByHex(hex: string): RoofColor | undefined {
  return getAllColors().find(color => color.hex.toLowerCase() === hex.toLowerCase());
}

export function getSeriesLabel(series: ColorSeries): string {
  const labels: Record<ColorSeries, string> = {
    premium: "Premium",
    reserve: "Reserve",
    standard: "Standard",
  };
  return labels[series];
}
