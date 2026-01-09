/**
 * PANEL PROFILE CONFIGURATION
 *
 * Defines available metal roof panel types/styles.
 * Each profile has different installation, appearance, and structural properties.
 *
 * KY - PANEL TYPES:
 * - standing-seam: Premium concealed fastener system (vertical ribs, hidden screws)
 * - agricultural-panel: Exposed fastener corrugated panels (low-cost, barns/sheds)
 * - pbr-panel: Purlin bearing rib (R-panel style, commercial buildings)
 *
 * KY - USAGE:
 * - User selects panel type in project configurator
 * - Affects material calculations (different widths/coverage)
 * - Standing seam has configurable widths (see panel-config.ts)
 * - Panel type stored in project data for quote generation
 */

export type PanelProfileId = "standing-seam" | "agricultural-panel" | "pbr-panel";

export interface PanelProfile {
  id: PanelProfileId;
  name: string;
  description: string;
  icon: string;
}

export const PANEL_PROFILES: PanelProfile[] = [
  {
    id: "standing-seam",
    name: "Standing Seam",
    description: "Concealed fasteners",
    icon: "|||"
  },
  {
    id: "agricultural-panel",
    name: "Agricultural Panel",
    description: "Agricultural panel",
    icon: "VVV"
  },
  {
    id: "pbr-panel",
    name: "PBR Panel",
    description: "Purlin bearing rib",
    icon: "∪∪∪"
  },
];

export const DEFAULT_PANEL_PROFILE: PanelProfileId = "standing-seam";

export function findPanelProfileById(id: PanelProfileId): PanelProfile | undefined {
  return PANEL_PROFILES.find(profile => profile.id === id);
}

export function getPanelProfileNames(): string[] {
  return PANEL_PROFILES.map(profile => profile.name);
}
