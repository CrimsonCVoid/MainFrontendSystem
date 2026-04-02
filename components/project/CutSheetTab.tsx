"use client";

import { useMemo, useRef, useState } from "react";
import {
  Ruler,
  Layers,
  ArrowDown,
  ArrowRight,
  Download,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Scissors,
  Package,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CutSheetProps {
  project: any;
  roofData: any;
}

// Standard panel lengths available from supplier (in feet)
const STOCK_LENGTHS = [8, 10, 12, 14, 16, 18, 20, 24];

// Trim types for standing seam metal roofing
const TRIM_TYPES = [
  { id: "ridge-cap", name: "Ridge Cap", description: "Covers the peak where two slopes meet", unit: "LF" },
  { id: "eave-drip", name: "Eave Drip Edge", description: "Directs water into gutters at eave", unit: "LF" },
  { id: "rake-trim", name: "Rake/Gable Trim", description: "Finishes exposed edges at gable ends", unit: "LF" },
  { id: "valley", name: "Valley Flashing", description: "W-shaped channel for valley intersections", unit: "LF" },
  { id: "hip-cap", name: "Hip Cap", description: "Covers hip ridges where slopes meet", unit: "LF" },
  { id: "sidewall", name: "Sidewall Flashing", description: "Seals roof-to-wall transitions", unit: "LF" },
  { id: "endwall", name: "Endwall Flashing", description: "Seals roof termination at walls", unit: "LF" },
  { id: "transition", name: "Transition Flashing", description: "Connects different roof planes", unit: "LF" },
  { id: "z-bar", name: "Z-Bar Closure", description: "Seals panel ends at eave/ridge", unit: "LF" },
  { id: "inside-closure", name: "Inside Closure Strip", description: "Foam closure matching panel profile", unit: "EA" },
  { id: "outside-closure", name: "Outside Closure Strip", description: "Foam closure for outside profile", unit: "EA" },
];

// Fastener specs
const FASTENER_TYPES = [
  { id: "clip", name: "Panel Clips", description: "Concealed clips for standing seam attachment", perPanel: 4, unit: "EA" },
  { id: "clip-screw", name: "Clip Screws", description: "#12 x 1\" pancake head into structure", perClip: 2, unit: "EA" },
  { id: "trim-screw", name: "Trim Fasteners", description: "#10 x 1\" stitch screws for trim", perFtTrim: 1, unit: "EA" },
  { id: "butyl-tape", name: "Butyl Sealant Tape", description: "3/4\" x 30' for trim-to-panel seals", unit: "ROLL" },
  { id: "caulk", name: "Urethane Sealant", description: "10oz tube for penetrations and details", unit: "TUBE" },
];

// Underlayment specs
const UNDERLAYMENT_TYPES = [
  { id: "synthetic", name: "Synthetic Underlayment", description: "High-temp rated (228°F+), 10 sq/roll", sqPerRoll: 10, unit: "ROLL" },
  { id: "ice-water", name: "Ice & Water Shield", description: "Self-adhering membrane for eaves/valleys", sqPerRoll: 2, unit: "ROLL" },
  { id: "slip-sheet", name: "Slip Sheet", description: "Between underlayment and metal panels", sqPerRoll: 10, unit: "ROLL" },
];

export default function CutSheetTab({ project, roofData }: CutSheetProps) {
  const [panelWidth, setPanelWidth] = useState(16); // inches
  const [expandedSection, setExpandedSection] = useState<string | null>("panels");

  const totalAreaSf = roofData?.total_area_sf || Number(project.square_footage) || 0;
  const totalSquares = totalAreaSf / 100; // 1 square = 100 sqft
  const planes = roofData?.planes || [];
  const measurements = roofData?.measurements || {};

  // Compute cut list from roof data
  const cutList = useMemo(() => {
    if (!totalAreaSf) return null;

    const panelWidthFt = panelWidth / 12;
    const wasteFactor = 1.10; // 10% waste

    // --- PANELS ---
    // For each plane, compute how many panels and what length
    const panelsByPlane = planes.map((plane: any, i: number) => {
      const areaSf = plane.area_sf || 0;
      const slope = plane.slope || 0;
      const slopeRad = (slope * Math.PI) / 180;

      // Estimate dimensions from area and slope
      const groundArea = areaSf / (slope > 0 ? 1 / Math.cos(slopeRad) : 1);
      const estimatedWidth = Math.sqrt(groundArea * 1.3);
      const estimatedDepth = groundArea / estimatedWidth;
      const slopedDepth = slope > 0 ? estimatedDepth / Math.cos(slopeRad) : estimatedDepth;

      const panelCount = Math.ceil(estimatedWidth / panelWidthFt);
      const panelLengthFt = Math.ceil(slopedDepth);

      // Find best stock length
      const stockLength = STOCK_LENGTHS.find((l) => l >= panelLengthFt) || STOCK_LENGTHS[STOCK_LENGTHS.length - 1];

      return {
        planeId: plane.id || `Plane ${i + 1}`,
        azimuth: plane.azimuth || 0,
        slope,
        areaSf,
        panelCount,
        panelLengthFt: Math.round(panelLengthFt * 10) / 10,
        stockLength,
        cutOff: Math.round((stockLength - panelLengthFt) * 12), // waste in inches
        widthFt: Math.round(estimatedWidth * 10) / 10,
      };
    });

    const totalPanels = panelsByPlane.reduce((s: number, p: any) => s + p.panelCount, 0);
    const totalPanelsWithWaste = Math.ceil(totalPanels * wasteFactor);

    // --- TRIM ---
    const ridgeLf = measurements.ridge_length_ft || Math.sqrt(totalAreaSf) * 0.4;
    const eaveLf = measurements.eave_length_ft || Math.sqrt(totalAreaSf) * 0.8;
    const perimeterLf = measurements.total_perimeter_ft || Math.sqrt(totalAreaSf) * 2.5;
    const valleyLf = measurements.valley_length_ft || 0;
    const hipLf = measurements.hip_length_ft || 0;
    const rakeLf = perimeterLf - eaveLf - (ridgeLf * 2);

    const trimQuantities: Record<string, number> = {
      "ridge-cap": Math.ceil(ridgeLf * wasteFactor),
      "eave-drip": Math.ceil(eaveLf * wasteFactor),
      "rake-trim": Math.ceil(Math.max(rakeLf, 0) * wasteFactor),
      "valley": Math.ceil(valleyLf * wasteFactor),
      "hip-cap": Math.ceil(hipLf * wasteFactor),
      "sidewall": 0,
      "endwall": 0,
      "transition": planes.length > 2 ? Math.ceil(planes.length * 3) : 0,
      "z-bar": Math.ceil((ridgeLf + eaveLf) * wasteFactor),
      "inside-closure": totalPanels * 2,
      "outside-closure": totalPanels * 2,
    };

    // --- FASTENERS ---
    const clipCount = totalPanels * 4;
    const clipScrewCount = clipCount * 2;
    const trimScrewCount = Math.ceil((ridgeLf + eaveLf + Math.max(rakeLf, 0) + valleyLf + hipLf) * 1);
    const butylRolls = Math.ceil((ridgeLf + eaveLf + Math.max(rakeLf, 0)) / 30);
    const caulkTubes = Math.ceil(planes.length * 0.5) + 2;

    const fastenerQuantities: Record<string, number> = {
      "clip": clipCount,
      "clip-screw": clipScrewCount,
      "trim-screw": trimScrewCount,
      "butyl-tape": butylRolls,
      "caulk": caulkTubes,
    };

    // --- UNDERLAYMENT ---
    const syntheticRolls = Math.ceil(totalSquares / 10 * wasteFactor);
    const iceWaterRolls = Math.ceil((eaveLf * 3 / 100 + valleyLf * 3 / 100) * wasteFactor) || 1;
    const slipSheetRolls = Math.ceil(totalSquares / 10 * wasteFactor);

    const underlaymentQuantities: Record<string, number> = {
      "synthetic": syntheticRolls,
      "ice-water": iceWaterRolls,
      "slip-sheet": slipSheetRolls,
    };

    return {
      panelsByPlane,
      totalPanels,
      totalPanelsWithWaste,
      panelWidthIn: panelWidth,
      trimQuantities,
      fastenerQuantities,
      underlaymentQuantities,
      ridgeLf: Math.round(ridgeLf),
      eaveLf: Math.round(eaveLf),
      rakeLf: Math.round(Math.max(rakeLf, 0)),
      valleyLf: Math.round(valleyLf),
      hipLf: Math.round(hipLf),
      perimeterLf: Math.round(perimeterLf),
      totalSquares: Math.round(totalSquares * 10) / 10,
    };
  }, [totalAreaSf, panelWidth, planes, measurements, totalSquares]);

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  if (!totalAreaSf) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
        <h3 className="text-lg font-semibold text-neutral-900">No Roof Data Available</h3>
        <p className="text-sm text-neutral-500">Generate the roof model first to see the cut sheet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Cut Sheet</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Material takeoff and panel cut list for {project.name}
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Roof Plan Diagram */}
      {planes.length > 0 && (
        <RoofPlanDiagram planes={planes} measurements={measurements} />
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={Maximize2} label="Total Area" value={`${totalAreaSf.toLocaleString()} SF`} sub={`${cutList?.totalSquares} squares`} />
        <SummaryCard icon={Layers} label="Roof Planes" value={`${planes.length}`} sub={`${cutList?.totalPanels || 0} panels needed`} />
        <SummaryCard icon={Ruler} label="Panel Width" value={`${panelWidth}"`} sub="Standing Seam" editable>
          <select
            value={panelWidth}
            onChange={(e) => setPanelWidth(Number(e.target.value))}
            className="absolute inset-0 opacity-0 cursor-pointer"
          >
            {[12, 14, 16, 18, 20, 24].map((w) => (
              <option key={w} value={w}>{w}" panel</option>
            ))}
          </select>
        </SummaryCard>
        <SummaryCard icon={Scissors} label="Trim Pieces" value={`${Object.values(cutList?.trimQuantities || {}).reduce((a: number, b: number) => a + b, 0)} LF`} sub="Ridge, eave, rake" />
      </div>

      {/* Panel Cut List */}
      <CollapsibleSection
        id="panels"
        title="Panel Schedule"
        subtitle={`${cutList?.totalPanelsWithWaste} panels total (incl. 10% waste)`}
        icon={Layers}
        expanded={expandedSection === "panels"}
        onToggle={() => toggleSection("panels")}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="py-3 px-4 font-semibold text-neutral-600">Plane</th>
                <th className="py-3 px-4 font-semibold text-neutral-600">Azimuth</th>
                <th className="py-3 px-4 font-semibold text-neutral-600">Pitch</th>
                <th className="py-3 px-4 font-semibold text-neutral-600">Area</th>
                <th className="py-3 px-4 font-semibold text-neutral-600">Width</th>
                <th className="py-3 px-4 font-semibold text-neutral-600">Panels</th>
                <th className="py-3 px-4 font-semibold text-neutral-600">Cut Length</th>
                <th className="py-3 px-4 font-semibold text-neutral-600">Stock</th>
                <th className="py-3 px-4 font-semibold text-neutral-600">Waste</th>
              </tr>
            </thead>
            <tbody>
              {cutList?.panelsByPlane.map((plane: any, i: number) => (
                <tr key={i} className={`border-b border-neutral-100 ${i % 2 === 0 ? "bg-neutral-50/50" : ""}`}>
                  <td className="py-3 px-4 font-medium text-neutral-900">{plane.planeId}</td>
                  <td className="py-3 px-4 text-neutral-600">{plane.azimuth}°</td>
                  <td className="py-3 px-4 text-neutral-600">{plane.slope}°</td>
                  <td className="py-3 px-4 text-neutral-600">{plane.areaSf.toLocaleString()} sf</td>
                  <td className="py-3 px-4 text-neutral-600">{plane.widthFt} ft</td>
                  <td className="py-3 px-4 font-semibold text-neutral-900">{plane.panelCount}</td>
                  <td className="py-3 px-4 text-neutral-900">{plane.panelLengthFt} ft</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                      {plane.stockLength}&apos;
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-500">{plane.cutOff}&quot; off</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-300 font-semibold">
                <td className="py-3 px-4 text-neutral-900" colSpan={5}>Total</td>
                <td className="py-3 px-4 text-neutral-900">{cutList?.totalPanels}</td>
                <td className="py-3 px-4 text-neutral-500" colSpan={3}>+ 10% waste = {cutList?.totalPanelsWithWaste}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CollapsibleSection>

      {/* Trim & Flashing */}
      <CollapsibleSection
        id="trim"
        title="Trim & Flashing"
        subtitle={`${TRIM_TYPES.filter((t) => (cutList?.trimQuantities[t.id] || 0) > 0).length} trim types required`}
        icon={ArrowRight}
        expanded={expandedSection === "trim"}
        onToggle={() => toggleSection("trim")}
      >
        <div className="space-y-2">
          {TRIM_TYPES.map((trim) => {
            const qty = cutList?.trimQuantities[trim.id] || 0;
            if (qty === 0 && !["ridge-cap", "eave-drip", "rake-trim", "z-bar"].includes(trim.id)) return null;
            return (
              <div key={trim.id} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-all">
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">{trim.name}</p>
                  <p className="text-xs text-neutral-500">{trim.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-neutral-900">{qty} <span className="text-xs font-normal text-neutral-500">{trim.unit}</span></p>
                  {trim.unit === "LF" && qty > 0 && (
                    <p className="text-xs text-neutral-400">{Math.ceil(qty / 10.5)} pcs @ 10&apos;6&quot;</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Linear Measurements */}
      <CollapsibleSection
        id="measurements"
        title="Linear Measurements"
        subtitle="Ridge, eave, rake, valley, hip lengths"
        icon={Ruler}
        expanded={expandedSection === "measurements"}
        onToggle={() => toggleSection("measurements")}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MeasurementCard label="Ridge" value={cutList?.ridgeLf || 0} />
          <MeasurementCard label="Eave" value={cutList?.eaveLf || 0} />
          <MeasurementCard label="Rake/Gable" value={cutList?.rakeLf || 0} />
          <MeasurementCard label="Valley" value={cutList?.valleyLf || 0} />
          <MeasurementCard label="Hip" value={cutList?.hipLf || 0} />
          <MeasurementCard label="Total Perimeter" value={cutList?.perimeterLf || 0} highlight />
        </div>
      </CollapsibleSection>

      {/* Fasteners & Hardware */}
      <CollapsibleSection
        id="fasteners"
        title="Fasteners & Hardware"
        subtitle="Clips, screws, sealants"
        icon={Package}
        expanded={expandedSection === "fasteners"}
        onToggle={() => toggleSection("fasteners")}
      >
        <div className="space-y-2">
          {FASTENER_TYPES.map((fastener) => {
            const qty = cutList?.fastenerQuantities[fastener.id] || 0;
            return (
              <div key={fastener.id} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-all">
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">{fastener.name}</p>
                  <p className="text-xs text-neutral-500">{fastener.description}</p>
                </div>
                <p className="font-bold text-neutral-900">{qty.toLocaleString()} <span className="text-xs font-normal text-neutral-500">{fastener.unit}</span></p>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Underlayment */}
      <CollapsibleSection
        id="underlayment"
        title="Underlayment & Substrate"
        subtitle={`${cutList?.totalSquares} squares coverage needed`}
        icon={ArrowDown}
        expanded={expandedSection === "underlayment"}
        onToggle={() => toggleSection("underlayment")}
      >
        <div className="space-y-2">
          {UNDERLAYMENT_TYPES.map((layer) => {
            const qty = cutList?.underlaymentQuantities[layer.id] || 0;
            return (
              <div key={layer.id} className="flex items-center justify-between py-3 px-4 rounded-lg hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-all">
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">{layer.name}</p>
                  <p className="text-xs text-neutral-500">{layer.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-neutral-900">{qty} <span className="text-xs font-normal text-neutral-500">{layer.unit}</span></p>
                  <p className="text-xs text-neutral-400">{layer.sqPerRoll} sq/roll</p>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* Notes */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900">Important Notes</h4>
            <ul className="mt-2 space-y-1.5 text-sm text-amber-800">
              <li>All quantities include 10% waste factor for cuts, overlaps, and field conditions</li>
              <li>Panel lengths are based on satellite-derived roof geometry — field verify before ordering</li>
              <li>Trim quantities are estimates — confirm with field measurements for penetrations and special details</li>
              <li>Ice & water shield calculated for 36&quot; eave coverage and full valley coverage per code</li>
              <li>Fastener counts assume 24&quot; clip spacing on standing seam panels</li>
              <li>Consult local building code for underlayment and fastening requirements</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function SummaryCard({ icon: Icon, label, value, sub, editable, children }: {
  icon: any; label: string; value: string; sub: string; editable?: boolean; children?: React.ReactNode;
}) {
  return (
    <div className="relative bg-white rounded-xl border border-neutral-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-600" />
        </div>
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{label}</span>
        {editable && <span className="text-[10px] text-blue-500 ml-auto">tap to change</span>}
      </div>
      <p className="text-xl font-bold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500 mt-0.5">{sub}</p>
      {children}
    </div>
  );
}

function CollapsibleSection({ id, title, subtitle, icon: Icon, expanded, onToggle, children }: {
  id: string; title: string; subtitle: string; icon: any; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon className="w-4.5 h-4.5 text-slate-700" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-neutral-900">{title}</h3>
            <p className="text-xs text-neutral-500">{subtitle}</p>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-neutral-400" /> : <ChevronRight className="w-5 h-5 text-neutral-400" />}
      </button>
      {expanded && <div className="border-t border-neutral-100 p-4">{children}</div>}
    </div>
  );
}

function MeasurementCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-4 ${highlight ? "bg-slate-900 text-white" : "bg-neutral-50 border border-neutral-200"}`}>
      <p className={`text-xs font-medium ${highlight ? "text-slate-300" : "text-neutral-500"}`}>{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? "text-white" : "text-neutral-900"}`}>
        {value} <span className={`text-sm font-normal ${highlight ? "text-slate-400" : "text-neutral-400"}`}>LF</span>
      </p>
    </div>
  );
}

// --- Interactive 3D Roof Schematic with selectable planes, zoom, detail panel ---

const EDGE_COLORS: Record<string, string> = {
  ridge: "#2563eb",
  eave: "#16a34a",
  rake: "#eab308",
  valley: "#f97316",
  hip: "#06b6d4",
  highside: "#dc2626",
};

const PLANE_FILLS = [
  "#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa",
  "#2dd4bf", "#fb923c", "#818cf8", "#4ade80", "#f472b6",
];

function getAzLabel(az: number): string {
  const labels: Record<number, string> = { 0: "N", 45: "NE", 90: "E", 135: "SE", 180: "S", 225: "SW", 270: "W", 315: "NW" };
  const nearest = [0, 45, 90, 135, 180, 225, 270, 315].reduce((p, c) => Math.abs(c - az) < Math.abs(p - az) ? c : p);
  return labels[nearest] || `${az}°`;
}

function RoofPlanDiagram({ planes, measurements }: { planes: any[]; measurements: any }) {
  // Use refs for drag state to avoid re-render lag during rotation
  const rotXRef = useRef(90);
  const rotZRef = useRef(0);
  const zoomRef = useRef(1.8);
  const panXRef = useRef(0);
  const panYRef = useRef(0);
  const draggingRef = useRef(false);
  const panningRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, rx: 0, rz: 0, px: 0, py: 0 });

  // State only for things that need React re-render
  const [, forceRender] = useState(0);
  const [showLabels, setShowLabels] = useState(true);
  const [showEdgeTypes, setShowEdgeTypes] = useState(true);
  const [viewMode, setViewMode] = useState<"3d" | "top" | "front" | "side">("top");
  const [selectedPlane, setSelectedPlane] = useState<number | null>(null);
  const [hoveredPlane, setHoveredPlane] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const validPlanes = planes.filter((p: any) => p.vertices?.length >= 3);
  if (!validPlanes.length) return null;

  // Bounds
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const plane of validPlanes) {
    for (const v of plane.vertices) {
      minX = Math.min(minX, v[0]); maxX = Math.max(maxX, v[0]);
      minY = Math.min(minY, v[1]); maxY = Math.max(maxY, v[1]);
      minZ = Math.min(minZ, v[2]); maxZ = Math.max(maxZ, v[2]);
    }
  }
  const cx3d = (minX + maxX) / 2, cy3d = (minY + maxY) / 2, cz3d = (minZ + maxZ) / 2;
  const span = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);
  const svgW = 700, svgH = 360;
  const baseScale = Math.min(svgW, svgH) * 0.32 / span;
  const scale = baseScale * zoomRef.current;

  const fixedAngles: Record<string, { rx: number; rz: number }> = {
    "top": { rx: 90, rz: 0 },
    "front": { rx: 0, rz: 0 },
    "side": { rx: 0, rz: -90 },
  };
  const rx = viewMode === "3d" ? rotXRef.current : (fixedAngles[viewMode]?.rx ?? 35);
  const rz = viewMode === "3d" ? rotZRef.current : (fixedAngles[viewMode]?.rz ?? -30);

  const project = (x: number, y: number, z: number) => {
    const px = x - cx3d, py = y - cy3d, pz = z - cz3d;
    const rxR = rx * Math.PI / 180, rzR = rz * Math.PI / 180;
    const x1 = px * Math.cos(rzR) - pz * Math.sin(rzR);
    const z1 = px * Math.sin(rzR) + pz * Math.cos(rzR);
    const y2 = py * Math.cos(rxR) - z1 * Math.sin(rxR);
    const z2 = py * Math.sin(rxR) + z1 * Math.cos(rxR);
    return { x: svgW / 2 + x1 * scale + panXRef.current, y: svgH / 2 - y2 * scale + panYRef.current, depth: z2 };
  };

  // requestAnimationFrame-based re-render for smooth dragging
  const scheduleRender = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => forceRender((n) => n + 1));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 || e.shiftKey) {
      panningRef.current = true;
      dragStartRef.current = { ...dragStartRef.current, x: e.clientX, y: e.clientY, px: panXRef.current, py: panYRef.current };
    } else if (viewMode === "3d") {
      draggingRef.current = true;
      dragStartRef.current = { x: e.clientX, y: e.clientY, rx: rotXRef.current, rz: rotZRef.current, px: panXRef.current, py: panYRef.current };
    }
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (panningRef.current) {
      panXRef.current = dragStartRef.current.px + (e.clientX - dragStartRef.current.x);
      panYRef.current = dragStartRef.current.py + (e.clientY - dragStartRef.current.y);
      scheduleRender();
    } else if (draggingRef.current) {
      rotZRef.current = dragStartRef.current.rz + (e.clientX - dragStartRef.current.x) * 0.4;
      rotXRef.current = Math.max(0, Math.min(90, dragStartRef.current.rx - (e.clientY - dragStartRef.current.y) * 0.4));
      scheduleRender();
    }
  };
  const onMouseUp = () => { draggingRef.current = false; panningRef.current = false; };
  const zoomIn = () => { zoomRef.current = Math.min(5, zoomRef.current + 0.3); scheduleRender(); };
  const zoomOut = () => { zoomRef.current = Math.max(0.3, zoomRef.current - 0.3); scheduleRender(); };

  const classifyEdge = (i: number, total: number): string => {
    if (total === 4) { if (i === 0) return "ridge"; if (i === 2) return "eave"; return "rake"; }
    if (total === 3) { if (i === 0) return "ridge"; return "rake"; }
    return "eave";
  };

  const edgeLen = (v0: number[], v1: number[]) =>
    Math.sqrt((v1[0] - v0[0]) ** 2 + (v1[1] - v0[1]) ** 2 + (v1[2] - v0[2]) ** 2) * 3.28084;

  const planeArea = (plane: any) => {
    if (plane.area_sf) return plane.area_sf;
    if (plane.vertices?.length < 3) return 0;
    const v = plane.vertices;
    let a = 0;
    for (let i = 1; i < v.length - 1; i++) {
      const ax = v[i][0] - v[0][0], ay = v[i][1] - v[0][1], az = v[i][2] - v[0][2];
      const bx = v[i + 1][0] - v[0][0], by = v[i + 1][1] - v[0][1], bz = v[i + 1][2] - v[0][2];
      const cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
      a += Math.sqrt(cx * cx + cy * cy + cz * cz) / 2;
    }
    return a * 10.7639;
  };

  const sortedPlanes = validPlanes.map((plane: any, i: number) => {
    const d = plane.vertices.reduce((s: number, v: number[]) => s + project(v[0], v[1], v[2]).depth, 0) / plane.vertices.length;
    return { plane, index: i, depth: d };
  }).sort((a: any, b: any) => a.depth - b.depth);

  const selPlane = selectedPlane !== null ? validPlanes[selectedPlane] : null;
  const selEdges = selPlane?.vertices?.map((v: number[], i: number) => {
    const v2 = selPlane.vertices[(i + 1) % selPlane.vertices.length];
    return { type: classifyEdge(i, selPlane.vertices.length), length: edgeLen(v, v2) };
  }) || [];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
      {/* Header toolbar */}
      <div className="px-4 py-3 border-b border-neutral-100 bg-gradient-to-r from-slate-50 to-neutral-50">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Maximize2 className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Interactive 3D Schematic</h3>
              <p className="text-[10px] text-neutral-400">Drag to rotate | Scroll to zoom | Shift+drag to pan | Click plane to inspect</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(["3d", "top", "front", "side"] as const).map((v) => (
              <button key={v} type="button" onClick={() => { setViewMode(v); panXRef.current = 0; panYRef.current = 0; forceRender((n) => n + 1); }}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-all ${viewMode === v ? "bg-slate-900 text-white shadow-sm" : "bg-white text-neutral-500 hover:bg-neutral-100 border border-neutral-200"}`}>
                {v === "3d" ? "3D" : v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            <div className="w-px h-5 bg-neutral-200 mx-1" />
            <button type="button" onClick={() => setShowLabels(!showLabels)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${showLabels ? "bg-blue-600 text-white" : "bg-white text-neutral-500 border border-neutral-200"}`}>
              Dims
            </button>
            <button type="button" onClick={() => setShowEdgeTypes(!showEdgeTypes)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded transition-all ${showEdgeTypes ? "bg-emerald-600 text-white" : "bg-white text-neutral-500 border border-neutral-200"}`}>
              Edges
            </button>
            <button type="button" onClick={() => { zoomRef.current = 1.8; panXRef.current = 0; panYRef.current = 0; rotXRef.current = 90; rotZRef.current = 0; setViewMode("top"); setSelectedPlane(null); forceRender((n) => n + 1); }}
              className="px-2.5 py-1 text-[10px] font-bold rounded bg-white text-neutral-500 border border-neutral-200 hover:bg-neutral-100">
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* 3D Canvas */}
        <div ref={containerRef}
          className={`flex-1 bg-gradient-to-br from-slate-100 via-white to-slate-50 relative ${viewMode === "3d" ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          style={{ minHeight: "320px" }}>
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full select-none">
            {/* Subtle grid */}
            <defs>
              <pattern id="cutgrid" width="25" height="25" patternUnits="userSpaceOnUse">
                <circle cx="12.5" cy="12.5" r="0.4" fill="#cbd5e1" />
              </pattern>
            </defs>
            <rect width={svgW} height={svgH} fill="url(#cutgrid)" />

            {/* Ground grid lines */}
            {viewMode === "3d" && Array.from({ length: 9 }).map((_, i) => {
              const t = (i - 4) * span * 0.25;
              const a = project(cx3d + t, minY - 0.05, cz3d - span);
              const b = project(cx3d + t, minY - 0.05, cz3d + span);
              const c = project(cx3d - span, minY - 0.05, cz3d + t);
              const d = project(cx3d + span, minY - 0.05, cz3d + t);
              return <g key={`gg-${i}`} opacity={0.08}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#475569" strokeWidth={0.5} /><line x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="#475569" strokeWidth={0.5} /></g>;
            })}

            {/* Plane fills */}
            {sortedPlanes.map(({ plane, index: i }: any) => {
              const pts = plane.vertices.map((v: number[]) => project(v[0], v[1], v[2]));
              const pathD = pts.map((p: any, j: number) => `${j === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
              const isSelected = selectedPlane === i;
              const isHovered = hoveredPlane === i;
              const dimmed = selectedPlane !== null && !isSelected;
              return (
                <path key={`f-${i}`} d={pathD}
                  fill={PLANE_FILLS[i % PLANE_FILLS.length]}
                  fillOpacity={isSelected ? 0.55 : isHovered ? 0.45 : dimmed ? 0.08 : 0.25}
                  stroke={isSelected ? PLANE_FILLS[i % PLANE_FILLS.length] : "none"}
                  strokeWidth={isSelected ? 2 : 0}
                  className="cursor-pointer"
                  onClick={() => setSelectedPlane(isSelected ? null : i)}
                  onMouseEnter={() => setHoveredPlane(i)}
                  onMouseLeave={() => setHoveredPlane(null)}
                />
              );
            })}

            {/* Edges */}
            {sortedPlanes.map(({ plane, index: pi }: any) =>
              plane.vertices.map((v: number[], ei: number) => {
                const v2 = plane.vertices[(ei + 1) % plane.vertices.length];
                const p0 = project(v[0], v[1], v[2]);
                const p1 = project(v2[0], v2[1], v2[2]);
                const edgeType = classifyEdge(ei, plane.vertices.length);
                const color = showEdgeTypes ? (EDGE_COLORS[edgeType] || "#94a3b8") : "#475569";
                const dimmed = selectedPlane !== null && selectedPlane !== pi;
                const isSelected = selectedPlane === pi;
                return (
                  <line key={`e-${pi}-${ei}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y}
                    stroke={color} strokeWidth={isSelected ? 2.5 : edgeType === "ridge" ? 2 : 1.2}
                    strokeLinecap="round" opacity={dimmed ? 0.15 : 1}
                    strokeDasharray={edgeType === "valley" ? "4,3" : undefined}
                  />
                );
              })
            )}

            {/* Dimension labels on edges */}
            {showLabels && sortedPlanes.map(({ plane, index: pi }: any) => {
              const dimmed = selectedPlane !== null && selectedPlane !== pi;
              if (dimmed) return null;
              return plane.vertices.map((v: number[], ei: number) => {
                const v2 = plane.vertices[(ei + 1) % plane.vertices.length];
                const len = edgeLen(v, v2);
                if (len < 1.5) return null;
                const p0 = project(v[0], v[1], v[2]);
                const p1 = project(v2[0], v2[1], v2[2]);
                const mx = (p0.x + p1.x) / 2, my = (p0.y + p1.y) / 2;
                let angle = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
                if (angle > 90) angle -= 180;
                if (angle < -90) angle += 180;
                const edgeType = classifyEdge(ei, plane.vertices.length);
                const ft = Math.floor(len);
                const inches = Math.round((len - ft) * 12);
                return (
                  <g key={`dl-${pi}-${ei}`} transform={`translate(${mx},${my}) rotate(${angle})`}>
                    <rect x={-24} y={-8} width={48} height={16} rx={4} fill="white" stroke={showEdgeTypes ? EDGE_COLORS[edgeType] || "#cbd5e1" : "#cbd5e1"} strokeWidth={0.8} />
                    <text textAnchor="middle" y={4} fontSize={8} fontWeight="700" fill="#1e293b">
                      {ft}&apos;{inches}&quot;
                    </text>
                  </g>
                );
              });
            })}

            {/* Plane ID badges */}
            {sortedPlanes.map(({ plane, index: i }: any) => {
              const dimmed = selectedPlane !== null && selectedPlane !== i;
              const avgX = plane.vertices.reduce((s: number, v: number[]) => s + v[0], 0) / plane.vertices.length;
              const avgY = plane.vertices.reduce((s: number, v: number[]) => s + v[1], 0) / plane.vertices.length;
              const avgZ = plane.vertices.reduce((s: number, v: number[]) => s + v[2], 0) / plane.vertices.length;
              const pos = project(avgX, avgY, avgZ);
              const isSelected = selectedPlane === i;
              return (
                <g key={`pb-${i}`} opacity={dimmed ? 0.2 : 1} className="cursor-pointer" onClick={() => setSelectedPlane(isSelected ? null : i)}>
                  <rect x={pos.x - 20} y={pos.y - 12} width={40} height={24} rx={6}
                    fill={isSelected ? PLANE_FILLS[i % PLANE_FILLS.length] : "white"}
                    stroke={PLANE_FILLS[i % PLANE_FILLS.length]} strokeWidth={isSelected ? 0 : 1.5} />
                  <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={10} fontWeight="800"
                    fill={isSelected ? "white" : "#1e293b"}>
                    P{i}
                  </text>
                </g>
              );
            })}

            {/* Compass */}
            <g transform={`translate(${svgW - 40}, ${svgH - 40})`}>
              <circle r="22" fill="white" fillOpacity={0.95} stroke="#e2e8f0" strokeWidth={1.5} />
              {["N", "E", "S", "W"].map((d, di) => {
                const a = di * Math.PI / 2;
                const p = project(cx3d + Math.sin(a) * span * 0.3, cy3d, cz3d + Math.cos(a) * span * 0.3);
                const c = project(cx3d, cy3d, cz3d);
                const dx = p.x - c.x, dy = p.y - c.y;
                const l = Math.sqrt(dx * dx + dy * dy) || 1;
                return <text key={d} x={dx / l * 15} y={dy / l * 15 + 3} textAnchor="middle" fontSize={7} fontWeight="bold"
                  fill={d === "N" ? "#dc2626" : "#94a3b8"}>{d}</text>;
              })}
            </g>

            {/* Zoom controls — left center */}
            <g transform={`translate(14, ${svgH / 2 - 38})`}>
              <rect x={0} y={0} width={28} height={28} rx={6} fill="white" stroke="#e2e8f0" strokeWidth={1} className="cursor-pointer" onClick={zoomIn} />
              <text x={14} y={18} textAnchor="middle" fontSize={16} fontWeight="700" fill="#475569" className="cursor-pointer pointer-events-none">+</text>
              <rect x={0} y={32} width={28} height={28} rx={6} fill="white" stroke="#e2e8f0" strokeWidth={1} className="cursor-pointer" onClick={zoomOut} />
              <text x={14} y={50} textAnchor="middle" fontSize={16} fontWeight="700" fill="#475569" className="cursor-pointer pointer-events-none">-</text>
              <text x={14} y={72} textAnchor="middle" fontSize={8} fill="#94a3b8" fontWeight="600">{Math.round(zoomRef.current * 100)}%</text>
            </g>
          </svg>
        </div>

        {/* Detail Panel (right sidebar) */}
        {selectedPlane !== null && selPlane && (
          <div className="w-64 border-l border-neutral-200 bg-white flex flex-col" style={{ minHeight: "320px" }}>
            <div className="px-4 py-3 border-b border-neutral-100" style={{ backgroundColor: PLANE_FILLS[selectedPlane % PLANE_FILLS.length] + "15" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: PLANE_FILLS[selectedPlane % PLANE_FILLS.length] }}>
                    P{selectedPlane}
                  </div>
                  <span className="font-semibold text-sm text-neutral-900">Plane {selectedPlane}</span>
                </div>
                <button type="button" onClick={() => setSelectedPlane(null)} className="text-neutral-400 hover:text-neutral-600 text-lg leading-none">&times;</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-neutral-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">Area</p>
                  <p className="text-base font-bold text-neutral-900">{Math.round(planeArea(selPlane))} <span className="text-xs font-normal">sf</span></p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">Pitch</p>
                  <p className="text-base font-bold text-neutral-900">{selPlane.slope}°</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">Azimuth</p>
                  <p className="text-base font-bold text-neutral-900">{selPlane.azimuth}° <span className="text-xs font-normal">{getAzLabel(selPlane.azimuth)}</span></p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-2.5">
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">Pitch Ratio</p>
                  <p className="text-base font-bold text-neutral-900">{Math.round(Math.tan(selPlane.slope * Math.PI / 180) * 12)}:12</p>
                </div>
              </div>

              {/* Edge details */}
              <div>
                <p className="text-[10px] text-neutral-400 uppercase font-semibold mb-2">Edge Details</p>
                <div className="space-y-1.5">
                  {selEdges.map((edge: any, i: number) => {
                    const ft = Math.floor(edge.length);
                    const inches = Math.round((edge.length - ft) * 12);
                    return (
                      <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-neutral-50 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-0.5 rounded" style={{ backgroundColor: EDGE_COLORS[edge.type] || "#999" }} />
                          <span className="capitalize font-medium text-neutral-700">{edge.type}</span>
                        </div>
                        <span className="font-bold text-neutral-900">{ft}&apos;{inches}&quot;</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Panel estimate for this plane */}
              <div>
                <p className="text-[10px] text-neutral-400 uppercase font-semibold mb-2">Panel Estimate</p>
                <div className="bg-blue-50 rounded-lg p-3 space-y-1.5">
                  {(() => {
                    const area = planeArea(selPlane);
                    const panelW = 16 / 12;
                    const estWidth = Math.sqrt(area / 10.7639 * 1.3);
                    const panels = Math.ceil(estWidth * 3.28084 / panelW);
                    const estDepth = (area / 10.7639) / estWidth;
                    const slopedFt = (selPlane.slope > 0 ? estDepth / Math.cos(selPlane.slope * Math.PI / 180) : estDepth) * 3.28084;
                    const stock = STOCK_LENGTHS.find((l) => l >= slopedFt) || STOCK_LENGTHS[STOCK_LENGTHS.length - 1];
                    return (
                      <>
                        <div className="flex justify-between text-xs"><span className="text-blue-700">Panels needed</span><span className="font-bold text-blue-900">{panels}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-blue-700">Panel length</span><span className="font-bold text-blue-900">{slopedFt.toFixed(1)} ft</span></div>
                        <div className="flex justify-between text-xs"><span className="text-blue-700">Stock length</span><span className="font-bold text-blue-900">{stock} ft</span></div>
                        <div className="flex justify-between text-xs"><span className="text-blue-700">Waste per cut</span><span className="font-bold text-blue-900">{Math.round((stock - slopedFt) * 12)}&quot;</span></div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Vertex coordinates */}
              <div>
                <p className="text-[10px] text-neutral-400 uppercase font-semibold mb-2">Vertex Coordinates (m)</p>
                <div className="space-y-1 text-[10px] font-mono">
                  {selPlane.vertices.map((v: number[], i: number) => (
                    <div key={i} className="flex items-center gap-2 text-neutral-600 bg-neutral-50 px-2 py-1 rounded">
                      <span className="font-bold text-neutral-900 w-5">V{i}</span>
                      <span>{v[0]?.toFixed(2)}, {v[1]?.toFixed(2)}, {v[2]?.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend bar */}
      <div className="px-4 py-2.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
        <div className="flex flex-wrap gap-3 text-[10px]">
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-3 h-0.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-neutral-500 capitalize font-medium">{type}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-neutral-400">
          <span>{validPlanes.length} planes</span>
          <span>|</span>
          <span>{Math.round(validPlanes.reduce((s: number, p: any) => s + planeArea(p), 0))} sf total</span>
        </div>
      </div>
    </div>
  );
}
