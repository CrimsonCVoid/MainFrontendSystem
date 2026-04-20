"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Ruler,
  Compass,
  TrendingUp,
  Package,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CutsheetEdge {
  length_ft_in: string;
  length_ft: number;
}

interface CutsheetPanel {
  id: number;
  area_sqft: number;
  slope_rise: number;
  azimuth_deg: number;
  azimuth_label: string;
  perimeter_ft: number;
  vertex_count: number;
  vertices_ft: number[][];
  vertices_3d_ft?: number[][];
  edges: CutsheetEdge[];
}

interface CutsheetData {
  sample_id: string;
  project: { address: string | null };
  totals: {
    panel_count: number;
    total_area_sqft: number;
    average_slope_rise: number;
  };
  plan_view: { panels: { id: number; vertices_ft: number[][] }[] };
  panels: CutsheetPanel[];
}

const PANEL_PALETTE = [
  "#06b6d4", "#f97316", "#8b5cf6", "#84cc16",
  "#f43f5e", "#f59e0b", "#14b8a6", "#ec4899",
  "#0ea5e9", "#10b981", "#d946ef", "#6366f1",
  "#64748b", "#a8a29e", "#ef4444", "#3b82f6",
];

interface Props {
  projectId: string;
}

export default function InteractiveCutSheet({ projectId }: Props) {
  const [data, setData] = useState<CutsheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"plan" | "iso">("plan");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/projects/${projectId}/cutsheet-data`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || body.error || `HTTP ${res.status}`);
        }
        return res.json() as Promise<CutsheetData>;
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          if (d.panels.length > 0) setSelectedId(d.panels[0].id);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-neutral-600 font-medium">
          Computing cutsheet…
        </p>
        <p className="text-xs text-neutral-500 max-w-sm text-center">
          Running plane fitting and dimensioning on the labeled roof. This
          typically takes 5–15 seconds.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-neutral-900">
          Cutsheet not ready yet
        </p>
        <p className="text-xs text-neutral-500 mt-2 max-w-sm mx-auto">
          {error === "No labels saved for this project" ||
          error === "Labels have no panels" ? (
            <>
              Open the <span className="font-medium">Labeler</span> tab, draw
              the roof panels on the aerial, click <b>Save Labels</b>, then
              come back.
            </>
          ) : (
            error
          )}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const selected = data.panels.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <SummaryRow totals={data.totals} address={data.project.address} />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6">
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-neutral-900">
              {viewMode === "plan" ? "Plan View" : "3D Reconstruction"}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 hidden sm:inline">
                Click a panel to see its cuts
              </span>
              <div className="flex rounded-lg border border-neutral-200 overflow-hidden">
                <button
                  onClick={() => setViewMode("plan")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium",
                    viewMode === "plan"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-neutral-600 hover:bg-neutral-50",
                  )}
                >
                  Plan
                </button>
                <button
                  onClick={() => setViewMode("iso")}
                  className={cn(
                    "px-3 py-1 text-xs font-medium border-l border-neutral-200",
                    viewMode === "iso"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-neutral-600 hover:bg-neutral-50",
                  )}
                >
                  3D
                </button>
              </div>
            </div>
          </div>
          {viewMode === "plan" ? (
            <PlanView
              planPanels={data.plan_view.panels}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          ) : (
            <IsoView
              panels={data.panels}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900">Panels</h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {data.panels.map((p, i) => (
              <PanelRow
                key={p.id}
                panel={p}
                color={PANEL_PALETTE[i % PANEL_PALETTE.length]}
                selected={selectedId === p.id}
                onClick={() => setSelectedId(p.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {selected && <PanelDetail panel={selected} />}
    </div>
  );
}

function SummaryRow({
  totals,
  address,
}: {
  totals: CutsheetData["totals"];
  address: string | null;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <SummaryCard
        icon={Package}
        label="Panels"
        value={totals.panel_count.toString()}
        accent="bg-blue-50 text-blue-700"
      />
      <SummaryCard
        icon={Ruler}
        label="Total Area"
        value={`${totals.total_area_sqft.toLocaleString()} sq ft`}
        accent="bg-emerald-50 text-emerald-700"
      />
      <SummaryCard
        icon={TrendingUp}
        label="Avg Slope"
        value={`${totals.average_slope_rise}/12`}
        sub={address ?? undefined}
        accent="bg-orange-50 text-orange-700"
      />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 flex items-start gap-3">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          accent,
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
          {label}
        </p>
        <p className="text-xl font-bold text-neutral-900 tabular-nums truncate">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-neutral-500 mt-0.5 truncate">{sub}</p>
        )}
      </div>
    </div>
  );
}

function PlanView({
  planPanels,
  selectedId,
  onSelect,
}: {
  planPanels: CutsheetData["plan_view"]["panels"];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const bounds = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const p of planPanels)
      for (const v of p.vertices_ft) {
        xs.push(v[0]);
        ys.push(v[1]);
      }
    if (xs.length === 0)
      return { minX: -10, minY: -10, maxX: 10, maxY: 10, pad: 2 };
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = Math.max((maxX - minX) * 0.08, (maxY - minY) * 0.08, 2);
    return { minX, minY, maxX, maxY, pad };
  }, [planPanels]);

  const vbW = bounds.maxX - bounds.minX + bounds.pad * 2;
  const vbH = bounds.maxY - bounds.minY + bounds.pad * 2;

  return (
    <svg
      viewBox={`${bounds.minX - bounds.pad} ${-(bounds.maxY + bounds.pad)} ${vbW} ${vbH}`}
      className="w-full h-[440px] bg-neutral-50"
      preserveAspectRatio="xMidYMid meet"
    >
      {planPanels.map((p, i) => {
        const color = PANEL_PALETTE[i % PANEL_PALETTE.length];
        const isSelected = selectedId === p.id;
        const points = p.vertices_ft
          .map((v) => `${v[0]},${-v[1]}`)
          .join(" ");
        const cx =
          p.vertices_ft.reduce((s, v) => s + v[0], 0) / p.vertices_ft.length;
        const cy =
          p.vertices_ft.reduce((s, v) => s + v[1], 0) / p.vertices_ft.length;
        return (
          <g key={p.id} style={{ cursor: "pointer" }} onClick={() => onSelect(p.id)}>
            <polygon
              points={points}
              fill={`${color}55`}
              stroke={isSelected ? "#2563eb" : color}
              strokeWidth={isSelected ? 0.35 : 0.18}
              strokeLinejoin="round"
            />
            <text
              x={cx}
              y={-cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={vbW / 55}
              fill="#111827"
              fontWeight={700}
              style={{ pointerEvents: "none" }}
            >
              {p.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PanelRow({
  panel,
  color,
  selected,
  onClick,
}: {
  panel: CutsheetPanel;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-neutral-100 transition-colors",
        selected
          ? "bg-blue-50/60 border-l-2 border-l-blue-500"
          : "hover:bg-neutral-50 border-l-2 border-l-transparent",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="w-4 h-4 rounded-md shrink-0 ring-1 ring-neutral-200"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900">
            Panel {panel.id}
          </p>
          <p className="text-xs text-neutral-500">
            {panel.area_sqft.toLocaleString()} sf · {panel.slope_rise}/12 ·{" "}
            {panel.azimuth_label}
          </p>
        </div>
      </div>
    </button>
  );
}

function PanelDetail({ panel }: { panel: CutsheetPanel }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // no-op
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">
            Panel {panel.id}
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            {panel.vertex_count} vertices · {panel.edges.length} edges
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() =>
            copy(
              "summary",
              `Panel ${panel.id}: ${panel.area_sqft} sq ft, slope ${panel.slope_rise}/12, azimuth ${panel.azimuth_deg}° (${panel.azimuth_label}), perimeter ${panel.perimeter_ft} ft`,
            )
          }
        >
          {copied === "summary" ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy Summary
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-neutral-100">
        <Stat icon={Ruler} label="Area" value={`${panel.area_sqft} sf`} />
        <Stat icon={TrendingUp} label="Slope" value={`${panel.slope_rise}/12`} />
        <Stat
          icon={Compass}
          label="Azimuth"
          value={`${panel.azimuth_deg}° (${panel.azimuth_label})`}
        />
        <Stat label="Perimeter" value={`${panel.perimeter_ft} ft`} />
      </div>

      <div className="p-5">
        <h4 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-3">
          Edge Cuts
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {panel.edges.map((e, idx) => (
            <button
              key={idx}
              onClick={() => copy(`edge-${idx}`, e.length_ft_in)}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-white hover:border-neutral-300 transition-colors text-left group",
              )}
              title="Click to copy"
            >
              <div>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium">
                  Edge {idx + 1}
                </p>
                <p className="text-sm font-semibold text-neutral-900 tabular-nums">
                  {e.length_ft_in}
                </p>
              </div>
              {copied === `edge-${idx}` ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-neutral-50 border border-neutral-100 p-3">
      <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium uppercase tracking-wider">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <p className="text-base font-bold text-neutral-900 tabular-nums mt-1">
        {value}
      </p>
    </div>
  );
}

/**
 * Oblique isometric projection of the panel 3D polygons. Renders the
 * same data as the plan view but with elevation — gives a quick sense
 * of roof pitch and ridge/valley structure without pulling in three.js.
 *
 * Projection: (x, y, z) -> screen( x + z*cos(30°),  -y - z*sin(30°) )
 * Y inverted because SVG y grows down. Z "vertical" pushes vertices up-right.
 */
function IsoView({
  panels,
  selectedId,
  onSelect,
}: {
  panels: CutsheetPanel[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const COS = Math.cos(Math.PI / 6); // ~0.866
  const SIN = Math.sin(Math.PI / 6); // 0.5
  // Exaggerate Z a bit so low-slope roofs are still visually readable.
  const Z_SCALE = 2.5;

  const projected = useMemo(() => {
    return panels.map((p) => {
      const verts3d = p.vertices_3d_ft || [];
      if (verts3d.length === 0) return { id: p.id, pts: [] as number[][] };
      // Normalize Z so all panels share the same ground baseline for the
      // iso lift — subtract min z across this panel (local baseline is fine
      // for visualizing slope, roof-wide baseline would require a pre-pass).
      return {
        id: p.id,
        pts: verts3d.map(([x, y, z]) => [
          x + z * COS * Z_SCALE,
          -y - z * SIN * Z_SCALE,
        ]),
      };
    });
  }, [panels]);

  const bounds = useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const p of projected)
      for (const pt of p.pts) {
        xs.push(pt[0]);
        ys.push(pt[1]);
      }
    if (xs.length === 0)
      return { minX: -10, minY: -10, maxX: 10, maxY: 10, pad: 2 };
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = Math.max((maxX - minX) * 0.08, (maxY - minY) * 0.08, 3);
    return { minX, minY, maxX, maxY, pad };
  }, [projected]);

  const vbW = bounds.maxX - bounds.minX + bounds.pad * 2;
  const vbH = bounds.maxY - bounds.minY + bounds.pad * 2;

  return (
    <svg
      viewBox={`${bounds.minX - bounds.pad} ${bounds.minY - bounds.pad} ${vbW} ${vbH}`}
      className="w-full h-[440px] bg-gradient-to-b from-sky-50 to-neutral-100"
      preserveAspectRatio="xMidYMid meet"
    >
      {projected.map((p, i) => {
        if (p.pts.length === 0) return null;
        const color = PANEL_PALETTE[i % PANEL_PALETTE.length];
        const isSelected = selectedId === p.id;
        const points = p.pts.map((v) => `${v[0]},${v[1]}`).join(" ");
        const cx = p.pts.reduce((s, v) => s + v[0], 0) / p.pts.length;
        const cy = p.pts.reduce((s, v) => s + v[1], 0) / p.pts.length;
        return (
          <g
            key={p.id}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(p.id)}
          >
            <polygon
              points={points}
              fill={isSelected ? `${color}cc` : `${color}88`}
              stroke={isSelected ? "#2563eb" : "#334155"}
              strokeWidth={isSelected ? 0.5 : 0.2}
              strokeLinejoin="round"
            />
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={vbW / 45}
              fill="#ffffff"
              stroke="#111827"
              strokeWidth={vbW / 400}
              paintOrder="stroke"
              fontWeight={700}
              style={{ pointerEvents: "none" }}
            >
              {p.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
