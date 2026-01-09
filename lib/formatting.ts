/**
 * MEASUREMENT FORMATTING UTILITIES
 *
 * Converts numeric measurements to human-readable format.
 * Used throughout UI for displaying roof dimensions.
 *
 * KY - FORMAT:
 * - Input: Total inches as number (e.g., 270)
 * - Output: Feet and inches string (e.g., "22'6")
 * - Formula: feet = floor(inches / 12), remaining inches = inches % 12
 *
 * KY - USAGE:
 * Your roof algorithm should output measurements in standard units (feet, inches, or meters).
 * Use these functions to format for display in UI components.
 */

export function formatMeasurement(totalInches: number): string {
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}`;
}

export function formatMeasurementFromFeet(feet: number): string {
  const totalInches = Math.round(feet * 12);
  return formatMeasurement(totalInches);
}

export function formatMeasurementFromMeters(meters: number): string {
  const totalInches = Math.round(meters * 39.3701);
  return formatMeasurement(totalInches);
}

export function parseMeasurement(measurement: string): number | null {
  const match = measurement.match(/(\d+)'(\d+)/);
  if (!match) return null;
  const feet = parseInt(match[1], 10);
  const inches = parseInt(match[2], 10);
  return feet * 12 + inches;
}

export function formatSquareFootage(squareFootage: number): string {
  return squareFootage.toLocaleString('en-US');
}

export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(0)}`;
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
