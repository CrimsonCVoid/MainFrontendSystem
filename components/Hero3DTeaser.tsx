"use client";

import RoofViewer3D from "./dashboard/RoofViewer3D";

/**
 * Hero 3D Teaser Component
 *
 * Landing page 3D roof preview using RoofViewer3D with hideControls enabled.
 * Renders a standing seam metal roof with auto-rotation animation.
 *
 * Technical Details:
 * - Uses BabylonJS via RoofViewer3D component
 * - Roof dimensions: 14m × 10m, 0.55 pitch (≈7:12 slope)
 * - Panel spacing: 0.4572m (18" standing seam)
 * - Color: #4B5563 (professional gray)
 * - Responsive: min-h-[360px] on mobile, [420px] on desktop
 */
export default function Hero3DTeaser() {
  // Roof configuration parameters (metric units)
  const roofConfig = {
    width: 14,
    depth: 10,
    pitch: 0.55,
    overhang: 0.25,
    thickness: 0.035,
    seamSpacing: 0.4572,
    color: "#4B5563", // Professional gray
  };

  return (
    <div className="relative h-full w-full min-h-[360px] md:min-h-[420px] rounded-xl overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100">
      {/* 3D Viewer - No controls, just pure rotating roof */}
      <RoofViewer3D
        className="h-full w-full"
        width={roofConfig.width}
        depth={roofConfig.depth}
        pitch={roofConfig.pitch}
        overhang={roofConfig.overhang}
        thickness={roofConfig.thickness}
        seamSpacing={roofConfig.seamSpacing}
        color={roofConfig.color}
        spin={true}
        hideControls={true}
      />

      {/* Overlay Badge */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-xs text-white backdrop-blur-sm">
        <span className="opacity-90">
          Interactive 3D Preview • {roofConfig.width}m × {roofConfig.depth}m
        </span>
      </div>

      {/* Subtle gradient overlay for polish */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-neutral-900/5 to-transparent" />
    </div>
  );
}
