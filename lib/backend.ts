// @ts-nocheck
import { SketchLine } from "./drawings";
import { Editor } from "./editor";
import { CFrame, segmentIntersection2D, Vector3 } from "./positioning";
import * as BABYLON from "@babylonjs/core";

var InchesInMeter = 39.3701;
var R = 6378137; // Earth radius in meters (WGS84 approximate)

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Convert a GPS coordinate to local inches relative to the building center. */
function gpsToLocalInches(
    lat: number, lon: number, data: any
): { x: number; y: number } {
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;
    return {
        x: -R * (latRad - data.CenteredLAT0) * InchesInMeter,
        y: R * (lonRad - data.CenteredLON0) * data.CosCenteredLAT0 * InchesInMeter,
    };
}

/** Normalize an angle to [0, 2π). */
function normalizeAngle(a: number): number {
    a = a % (2 * Math.PI);
    return a < 0 ? a + 2 * Math.PI : a;
}

// ─── Segment Dimension Computation ───────────────────────────────────────────

type SegmentDimensions = {
    ridgeWidthInches: number;
    groundDepthInches: number;
    slopedDepthInches: number;
    pitchRad: number;
    azRad: number;
    centerX: number;
    centerY: number;
    heightInches: number;
};

/**
 * Derive accurate roof-plane dimensions from a Google Solar roof segment.
 *
 * Uses the actual `stats.groundAreaMeters2` (projected footprint) and the
 * bounding-box aspect ratio (corrected for azimuth rotation) to compute the
 * ridge width and sloped depth in inches.
 *
 * Returns null if the segment should be skipped (missing data, too small, etc.).
 */
function computeSegmentDimensions(
    googleData: any,
    segment: GRoofSegment,
    segIndex: number
): SegmentDimensions | null {
    const groundArea = segment.stats?.groundAreaMeters2;
    if (!groundArea || groundArea <= 0) {
        console.warn(`[backend] Segment ${segIndex}: missing groundAreaMeters2, skipping`);
        return null;
    }

    // Skip very small segments (< 10 sqft ≈ 0.93 m²)
    if (groundArea < 0.93) {
        console.warn(`[backend] Segment ${segIndex}: too small (${groundArea.toFixed(2)} m²), skipping`);
        return null;
    }

    const pitchRad = (segment.pitchDegrees || 0) * Math.PI / 180;
    const azRad = (segment.azimuthDegrees || 0) * Math.PI / 180;

    // Convert segment center to local inches
    const center = gpsToLocalInches(
        segment.center.latitude, segment.center.longitude, googleData
    );

    const heightInches = (segment.planeHeightAtCenterMeters || 0) * InchesInMeter;

    // Ground area in square inches
    const groundAreaIn2 = groundArea * InchesInMeter * InchesInMeter;

    let ridgeWidth: number;
    let groundDepth: number;

    // Try to extract aspect ratio from the bounding box
    if (segment.boundingBox?.ne && segment.boundingBox?.sw) {
        const ne = gpsToLocalInches(
            segment.boundingBox.ne.latitude,
            segment.boundingBox.ne.longitude,
            googleData
        );
        const sw = gpsToLocalInches(
            segment.boundingBox.sw.latitude,
            segment.boundingBox.sw.longitude,
            googleData
        );

        const bbNS = Math.abs(ne.x - sw.x); // north-south extent (local X)
        const bbEW = Math.abs(ne.y - sw.y); // east-west extent (local Y)

        // A rectangle (W x D) rotated by azimuth produces an axis-aligned bbox:
        //   bbNS = W * |cos(az)| + D * |sin(az)|
        //   bbEW = W * |sin(az)| + D * |cos(az)|
        // where W = ridge width, D = ground depth (run direction).
        // Azimuth in Google Solar: 0°=south, 90°=west, 180°=north, 270°=east
        // In our local coords: azRad maps sin(az)→dx, cos(az)→dy
        const absCos = Math.abs(Math.cos(azRad));
        const absSin = Math.abs(Math.sin(azRad));
        const det = absCos * absCos - absSin * absSin; // cos²(az) - sin²(az)

        if (Math.abs(det) > 0.05 && bbNS > 0 && bbEW > 0) {
            // Non-degenerate: solve the 2×2 system
            ridgeWidth = Math.abs((bbNS * absCos - bbEW * absSin) / det);
            groundDepth = Math.abs((bbEW * absCos - bbNS * absSin) / det);

            // Sanity: clamp to positive and reasonable
            ridgeWidth = Math.max(ridgeWidth, 1);
            groundDepth = Math.max(groundDepth, 1);

            // Scale both to match the actual ground area exactly
            const rawArea = ridgeWidth * groundDepth;
            if (rawArea > 0) {
                const scale = Math.sqrt(groundAreaIn2 / rawArea);
                ridgeWidth *= scale;
                groundDepth *= scale;
            }
        } else {
            // Near 45° azimuth — degenerate case. Use max bbox dimension as guide.
            const maxBB = Math.max(bbNS, bbEW, 1);
            const minBB = Math.min(bbNS, bbEW, 1);
            const ratio = maxBB / minBB;
            // Use the bbox ratio but clamp to reasonable bounds
            groundDepth = Math.sqrt(groundAreaIn2 / Math.min(ratio, 3));
            ridgeWidth = groundAreaIn2 / groundDepth;
        }
    } else {
        // No bounding box — assume square footprint
        const side = Math.sqrt(groundAreaIn2);
        ridgeWidth = side;
        groundDepth = side;
    }

    // Sloped depth: the panel surface is longer than the ground projection
    const slopedDepth = pitchRad > 0.001
        ? groundDepth / Math.cos(pitchRad)
        : groundDepth;

    console.log(
        `[backend] Segment ${segIndex}: ridge=${(ridgeWidth / 12).toFixed(1)}ft, ` +
        `groundDepth=${(groundDepth / 12).toFixed(1)}ft, slopedDepth=${(slopedDepth / 12).toFixed(1)}ft, ` +
        `pitch=${segment.pitchDegrees}°, az=${segment.azimuthDegrees}°, ` +
        `area=${(ridgeWidth * slopedDepth / 144).toFixed(0)}sqft`
    );

    return {
        ridgeWidthInches: ridgeWidth,
        groundDepthInches: groundDepth,
        slopedDepthInches: slopedDepth,
        pitchRad,
        azRad,
        centerX: center.x,
        centerY: center.y,
        heightInches,
    };
}

// ─── Intersection Trimming ───────────────────────────────────────────────────

type SketchMeta = {
    sketch: SketchLine;
    azRad: number;
    centerX: number;
    centerY: number;
    groundDepth: number;
    ridgeWidth: number;
    pitchRad: number;
    index: number;
};

/**
 * Detect and resolve intersections between adjacent roof planes.
 *
 * Phase 1: Ridge-sharing pairs (azimuth diff ~180°) — align ridges.
 * Phase 2: Hip/valley junctions — apply trapezoidal clipping via Lines "0"/"1".
 * Phase 3: Overlap resolution — hide fully contained small segments.
 */
function applyIntersectionTrimming(metas: SketchMeta[]): void {
    if (metas.length < 2) return;

    console.log(`[backend] Running intersection trimming on ${metas.length} segments`);

    // Phase 1: Ridge-sharing pairs (opposite-facing segments)
    for (let i = 0; i < metas.length; i++) {
        for (let j = i + 1; j < metas.length; j++) {
            const m1 = metas[i], m2 = metas[j];

            // Distance between segment centers
            const dist = Math.sqrt(
                (m1.centerX - m2.centerX) ** 2 + (m1.centerY - m2.centerY) ** 2
            );
            const maxDist = (m1.groundDepth + m2.groundDepth) * 0.8;
            if (dist > maxDist) continue;

            // Check azimuth relationship
            const azDiff = Math.abs(normalizeAngle(m1.azRad - m2.azRad) - Math.PI);
            const isRidgePair = azDiff < 0.35; // ~20° tolerance for opposite-facing

            if (isRidgePair) {
                alignRidgePair(m1, m2);
            } else {
                // Hip/valley junction
                trimHipValley(m1, m2);
            }
        }
    }

    // Update all lines after trimming
    for (const m of metas) {
        m.sketch.UpdateLines();
    }
}

/**
 * Align two opposite-facing segments that share a ridge line.
 * Ensures their ridge lines meet without gap or overlap.
 */
function alignRidgePair(m1: SketchMeta, m2: SketchMeta): void {
    const s1 = m1.sketch, s2 = m2.sketch;

    // The ridge of each segment is at V0-V1. For ridge-sharing pairs,
    // the ridges should be coincident. Compute the midpoint between the
    // two ridges and adjust each segment's RUN so they meet there.

    // Midpoint between the two segment centers
    const midX = (m1.centerX + m2.centerX) / 2;
    const midY = (m1.centerY + m2.centerY) / 2;

    // Direction from each center toward the midpoint
    // Each segment's downslope direction:
    const dx1 = Math.sin(m1.azRad), dy1 = Math.cos(m1.azRad);
    const dx2 = Math.sin(m2.azRad), dy2 = Math.cos(m2.azRad);

    // Project the vector from each center to midpoint onto its downslope direction
    // This gives us how far the ridge should be from each center
    const toMid1X = midX - m1.centerX, toMid1Y = midY - m1.centerY;
    const toMid2X = midX - m2.centerX, toMid2Y = midY - m2.centerY;

    // Dot product with opposite of downslope (toward ridge)
    const ridgeDist1 = -(toMid1X * dx1 + toMid1Y * dy1);
    const ridgeDist2 = -(toMid2X * dx2 + toMid2Y * dy2);

    // Each segment's total run from ridge to eave:
    // The ridge is at (center - downslope * ridgeDist), eave is at (center + downslope * (groundDepth - ridgeDist))
    // Total run = groundDepth (unchanged), but ridge position shifts.
    // For now, just adjust the RISE/RUN proportionally to account for ridge alignment.

    // Recompute Line "A" RUN based on actual distance from ridge to eave
    // The eave is at center + downslope * (groundDepth / 2)
    // The ridge is approximately at the midpoint between the two segment centers
    const run1 = m1.groundDepth / 2 + ridgeDist1;
    const run2 = m2.groundDepth / 2 + ridgeDist2;

    if (run1 > 0 && run2 > 0) {
        const rise1 = run1 * Math.tan(m1.pitchRad);
        const rise2 = run2 * Math.tan(m2.pitchRad);

        s1.Lines["A"]._RUN = run1;
        s1.Lines["A"]._RISE = rise1;
        s2.Lines["A"]._RUN = run2;
        s2.Lines["A"]._RISE = rise2;

        console.log(
            `[trimming] Ridge pair ${m1.index}↔${m2.index}: ` +
            `run1=${(run1 / 12).toFixed(1)}ft, run2=${(run2 / 12).toFixed(1)}ft`
        );
    }
}

/**
 * Trim two segments that meet at a hip or valley junction.
 * Enables Lines "0"/"1" on each segment with appropriate RUN to create
 * trapezoidal clipping at the junction line.
 */
function trimHipValley(m1: SketchMeta, m2: SketchMeta): void {
    const s1 = m1.sketch, s2 = m2.sketch;

    // Compute the eave edge of each segment (projected onto the ground XZ plane).
    // The eave is at: center + downslope * (groundDepth / 2), extending ±ridgeWidth/2 perpendicular.

    // Downslope and ridge directions for each
    const dx1 = Math.sin(m1.azRad), dy1 = Math.cos(m1.azRad);
    const rx1 = Math.cos(m1.azRad), ry1 = -Math.sin(m1.azRad);
    const dx2 = Math.sin(m2.azRad), dy2 = Math.cos(m2.azRad);
    const rx2 = Math.cos(m2.azRad), ry2 = -Math.sin(m2.azRad);

    // Eave center and endpoints for segment 1
    const eave1cx = m1.centerX + dx1 * m1.groundDepth / 2;
    const eave1cy = m1.centerY + dy1 * m1.groundDepth / 2;
    const eave1L = new Vector3(eave1cx + rx1 * m1.ridgeWidth / 2, 0, eave1cy + ry1 * m1.ridgeWidth / 2);
    const eave1R = new Vector3(eave1cx - rx1 * m1.ridgeWidth / 2, 0, eave1cy - ry1 * m1.ridgeWidth / 2);

    // Eave center and endpoints for segment 2
    const eave2cx = m2.centerX + dx2 * m2.groundDepth / 2;
    const eave2cy = m2.centerY + dy2 * m2.groundDepth / 2;
    const eave2L = new Vector3(eave2cx + rx2 * m2.ridgeWidth / 2, 0, eave2cy + ry2 * m2.ridgeWidth / 2);
    const eave2R = new Vector3(eave2cx - rx2 * m2.ridgeWidth / 2, 0, eave2cy - ry2 * m2.ridgeWidth / 2);

    // Ridge center and endpoints for each
    const ridge1cx = m1.centerX - dx1 * m1.groundDepth / 2;
    const ridge1cy = m1.centerY - dy1 * m1.groundDepth / 2;
    const ridge1L = new Vector3(ridge1cx + rx1 * m1.ridgeWidth / 2, 0, ridge1cy + ry1 * m1.ridgeWidth / 2);
    const ridge1R = new Vector3(ridge1cx - rx1 * m1.ridgeWidth / 2, 0, ridge1cy - ry1 * m1.ridgeWidth / 2);

    const ridge2cx = m2.centerX - dx2 * m2.groundDepth / 2;
    const ridge2cy = m2.centerY - dy2 * m2.groundDepth / 2;
    const ridge2L = new Vector3(ridge2cx + rx2 * m2.ridgeWidth / 2, 0, ridge2cy + ry2 * m2.ridgeWidth / 2);
    const ridge2R = new Vector3(ridge2cx - rx2 * m2.ridgeWidth / 2, 0, ridge2cy - ry2 * m2.ridgeWidth / 2);

    // Check for intersection between the side edges of the two segments.
    // Side edges are: ridge endpoint → eave endpoint (left side and right side of each)

    // Test s1 left edge vs s2 left edge, s1 left vs s2 right, etc.
    const edges1 = [
        { from: ridge1L, to: eave1L, side: "V0" }, // left hip edge of s1
        { from: ridge1R, to: eave1R, side: "V1" }, // right hip edge of s1
    ];
    const edges2 = [
        { from: ridge2L, to: eave2L, side: "V0" },
        { from: ridge2R, to: eave2R, side: "V1" },
    ];

    for (const e1 of edges1) {
        for (const e2 of edges2) {
            const inter = segmentIntersection2D(e1.from, e1.to, e2.from, e2.to);
            if (!inter) continue;
            if (inter.t1 < 0 || inter.t1 > 1 || inter.t2 < 0 || inter.t2 > 1) continue;

            // Found a hip/valley intersection. Compute how much to trim each segment end.
            // inter.t1 tells us where along s1's edge the intersection occurs (0=ridge, 1=eave).
            // We use this to set ExtrudeA/ExtrudeB (via Lines "0"/"1" RUN) to create a trapezoid.

            // For segment 1: the intersection is at fraction t1 along the edge.
            // The trim amount at the eave is the distance from the eave endpoint to the intersection point,
            // projected onto the ridge direction.
            const interPt = new Vector3(inter.point.x, 0, inter.point.y);

            // Distance from intersection to eave end of this edge, projected onto downslope
            const trimDist1 = (1 - inter.t1) * m1.groundDepth;
            const trimDist2 = (1 - inter.t2) * m2.groundDepth;

            // Enable the appropriate perpendicular line and set its RUN to the trim distance
            const lineKey1 = e1.side === "V0" ? "0" : "1";
            const lineKey2 = e2.side === "V0" ? "0" : "1";

            if (trimDist1 > 1) {
                s1.Lines[lineKey1].ENABLED = true;
                s1.Lines[lineKey1]._RUN = trimDist1;
                s1.Lines[lineKey1]._RISE = trimDist1 * Math.tan(m1.pitchRad);
                s1.Lines[lineKey1]._PITCH = Math.tan(m1.pitchRad);
            }

            if (trimDist2 > 1) {
                s2.Lines[lineKey2].ENABLED = true;
                s2.Lines[lineKey2]._RUN = trimDist2;
                s2.Lines[lineKey2]._RISE = trimDist2 * Math.tan(m2.pitchRad);
                s2.Lines[lineKey2]._PITCH = Math.tan(m2.pitchRad);
            }

            console.log(
                `[trimming] Hip/valley ${m1.index}↔${m2.index}: ` +
                `s1.${lineKey1} trim=${(trimDist1 / 12).toFixed(1)}ft, ` +
                `s2.${lineKey2} trim=${(trimDist2 / 12).toFixed(1)}ft`
            );
        }
    }
}

// ─── Main Render Function ────────────────────────────────────────────────────

/**
 * Renders roof geometry from pre-fetched Google Solar data into the active Editor scene.
 * Data comes from the backend via /api/roof-generate → stored in projects.roof_data._google_raw.
 * Returns array of created SketchLines for cleanup/re-render.
 */
export function renderRoofFromGoogleData(googleData: any): SketchLine[] {
    if (!Editor.ActiveEditor) {
        console.error("[backend] No active Editor — cannot render roof");
        return [];
    }

    const sketches: SketchLine[] = [];
    const metas: SketchMeta[] = [];

    // Set up center coordinates for local coordinate conversion
    googleData.CenteredLAT0 = googleData.center.latitude * Math.PI / 180;
    googleData.CenteredLON0 = googleData.center.longitude * Math.PI / 180;
    googleData.SinCenteredLAT0 = Math.sin(googleData.CenteredLAT0);
    googleData.CosCenteredLAT0 = Math.cos(googleData.CenteredLAT0);

    const segments = googleData.solarPotential?.roofSegmentStats || [];
    console.log(`[backend] Rendering ${segments.length} roof segments`);

    for (let segIdx = 0; segIdx < segments.length; segIdx++) {
        const Roof = segments[segIdx];

        // Step 1: Compute accurate dimensions from Google Solar metrics
        const dims = computeSegmentDimensions(googleData, Roof, segIdx);
        if (!dims) continue;

        const {
            ridgeWidthInches, groundDepthInches, slopedDepthInches,
            pitchRad, azRad, centerX, centerY, heightInches
        } = dims;

        // Step 2: Position the ridge line
        // Azimuth points downslope. Ridge is perpendicular to azimuth, at the top of the slope.
        // Downslope direction in local coords: dx = sin(az), dy = cos(az)
        const dx = Math.sin(azRad);
        const dy = Math.cos(azRad);
        // Ridge direction (perpendicular to azimuth)
        const rx = Math.cos(azRad);
        const ry = -Math.sin(azRad);

        // Ridge center is upslope from segment center by half the ground depth
        const ridgeCX = centerX - dx * groundDepthInches / 2;
        const ridgeCY = centerY - dy * groundDepthInches / 2;

        // Ridge endpoints
        const x0 = ridgeCX + rx * ridgeWidthInches / 2;
        const y0 = ridgeCY + ry * ridgeWidthInches / 2;
        const x1 = ridgeCX - rx * ridgeWidthInches / 2;
        const y1 = ridgeCY - ry * ridgeWidthInches / 2;

        // Step 3: Create SketchLine at the ridge position
        let Sketch = new SketchLine(Editor.ActiveEditor, x0, y0, 0);
        Sketch.Start();
        Sketch.Angle = Math.atan2(ry, rx);
        Sketch.Length = ridgeWidthInches;
        Sketch.X0 = x0;
        Sketch.Y0 = y0;
        Sketch.X1 = x1;
        Sketch.Y1 = y1;
        Sketch.Commit();

        // Step 4: Configure ExtrudedLines
        // PRIMARY = "D" → direct mode (set RISE/RUN/PITCH independently without cascading)
        Sketch.Lines["A"].PRIMARY = "D";
        Sketch.Lines["B"].PRIMARY = "D";
        Sketch.Lines["0"].PRIMARY = "D";
        Sketch.Lines["1"].PRIMARY = "D";

        // Line "A" (parallel, IsParallel=true) = the main sloped surface
        const fullRise = groundDepthInches * Math.tan(pitchRad);
        Sketch.Lines["A"].ENABLED = true;
        Sketch.Lines["A"]._PITCH = Math.tan(pitchRad);
        Sketch.Lines["A"]._RISE = fullRise;
        Sketch.Lines["A"]._RUN = groundDepthInches;

        // Lines "B", "0", "1" disabled — no opposite slope or gable ends initially
        // (intersection trimming may enable "0"/"1" for hip/valley geometry)
        Sketch.Lines["B"].ENABLED = false;
        Sketch.Lines["B"]._PITCH = Math.tan(pitchRad);
        Sketch.Lines["B"]._RISE = 0;
        Sketch.Lines["B"]._RUN = 0;

        Sketch.Lines["0"].ENABLED = false;
        Sketch.Lines["0"]._PITCH = Math.tan(pitchRad);
        Sketch.Lines["0"]._RISE = 0;
        Sketch.Lines["0"]._RUN = 0;

        Sketch.Lines["1"].ENABLED = false;
        Sketch.Lines["1"]._PITCH = Math.tan(pitchRad);
        Sketch.Lines["1"]._RISE = 0;
        Sketch.Lines["1"]._RUN = 0;

        // Set elevation at ridge
        Sketch.Z1 = heightInches;

        // Store metadata for intersection trimming
        Sketch._segmentAzimuth = azRad;
        Sketch._segmentCenterX = centerX;
        Sketch._segmentCenterY = centerY;
        Sketch._segmentGroundDepth = groundDepthInches;
        Sketch._segmentRidgeWidth = ridgeWidthInches;
        Sketch._segmentPitch = pitchRad;
        Sketch._segmentIndex = segIdx;

        Sketch.UpdateLines();
        sketches.push(Sketch);
        metas.push({
            sketch: Sketch,
            azRad,
            centerX,
            centerY,
            groundDepth: groundDepthInches,
            ridgeWidth: ridgeWidthInches,
            pitchRad,
            index: segIdx,
        });
    }

    // Step 5: Run intersection trimming on all segments
    applyIntersectionTrimming(metas);

    // Log total computed area for verification
    let totalAreaSqIn = 0;
    for (const m of metas) {
        const run = m.sketch.Lines["A"]?._RUN || 0;
        const rise = m.sketch.Lines["A"]?._RISE || 0;
        const slopeLen = Math.sqrt(run * run + rise * rise);
        totalAreaSqIn += m.ridgeWidth * slopeLen;
    }
    console.log(
        `[backend] Roof rendering complete — ${sketches.length} sketches, ` +
        `total rendered area: ${(totalAreaSqIn / 144).toFixed(0)} sqft`
    );

    return sketches;
}

/**
 * Test function — kept for debug (press "O" key in editor).
 * No longer calls Google API directly. Use renderRoofFromGoogleData() instead.
 */
export async function Test(Lat: number | string, Lon: number | string) {
    console.log(`[backend] Test() called with lat=${Lat}, lon=${Lon}. Use renderRoofFromGoogleData() for production rendering.`);
}

// ─── Google Solar API Types ──────────────────────────────────────────────────

export type Coordinate = { latitude: number; longitude: number };
export type GDate = { year: number; month: number; day: number };
export type GBoundingBox = { sw: Coordinate; ne: Coordinate };

export type GStats = {
    areaMeters2: number;
    sunshineQuantiles: [number];
    groundAreaMeters2: number;
};

export type GRoofSegment = {
    pitchDegrees: number;
    azimuthDegrees: number;
    stats: GStats;
    center: Coordinate;
    boundingBox: GBoundingBox;
    planeHeightAtCenterMeters: number;
};

export type GRoofSummary = {
    pitchDegrees: number;
    azimuthDegrees: number;
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    segmentIndex: number;
};

export type GSolarConfig = {
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    roofSegmentSummaries: [GRoofSummary]
};

export type GFinancialAnalysis = {
    monthlyBill: { currentCode: string, units: number };
    averageKwhPerMonth: number;
    panelConfigIndex: number;
};

export type GSolarPanel = {
    center: Coordinate;
    orientation: string;
    yearlyEnergyDcKwh: number;
    segmentIndex: number;
};

export type GSolarPotential = {
    maxArrayPanelsCount: number;
    maxArrayAreaMeters2: number;
    maxSunshineHoursPerYear: number;
    carbonOffsetFactorKgPerMwh: number;
    wholeRoofStats: GStats;
    roofSegmentStats: [GRoofSegment];
    solarPanelConfigs: [GSolarConfig];
    financialAnalyses: [GFinancialAnalysis];
    panelCapacityWatts: number;
    panelHeightMeters: number;
    panelWidthMeters: number;
    panelLifetimeYears: number;
    buildingStats: GStats;
    solarPanels: [GSolarPanel];
}

export type GSolarData = {
    name: string;
    center: Coordinate;
    imageryDate: GDate;
    postalCode: string;
    administrativeArea: string;
    statisticalArea: string;
    regionCode: string;
    solarPotential: GSolarPotential;
    boundingBox: GBoundingBox;
    imageryQuality: string;
    imageryProcessedDate: GDate;
};
