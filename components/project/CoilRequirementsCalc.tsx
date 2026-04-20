"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  COIL_SPECS,
  DEFAULT_ID_IN,
  DEFAULT_WASTE_PCT,
  coilFromRequired,
} from "@/lib/coil-calc";

export interface PanelTotals {
  totalPerimeterFt: number;
  panelCount: number;
}

interface CoilRow {
  id: string;
  linearFtRaw: number;
  widthIn: number;
  material: string;
  gauge: string;
  idIn: number;
  wastePct: number;
}

function makeDefaultRow(totals: PanelTotals): CoilRow {
  return {
    id: Math.random().toString(36).slice(2),
    linearFtRaw: Math.round(totals.totalPerimeterFt || 100),
    widthIn: 16,
    material: "steel",
    gauge: "24ga",
    idIn: DEFAULT_ID_IN,
    wastePct: DEFAULT_WASTE_PCT,
  };
}

export function CoilRequirementsCalc({ totals }: { totals: PanelTotals }) {
  const [rows, setRows] = useState<CoilRow[]>(() => [makeDefaultRow(totals)]);

  const addRow = () => setRows((r) => [...r, makeDefaultRow(totals)]);
  const removeRow = (id: string) =>
    setRows((r) => (r.length > 1 ? r.filter((x) => x.id !== id) : r));
  const updateRow = (id: string, patch: Partial<CoilRow>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">
            Coil Requirements
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Edit any value — OD, sqft and weight recompute live. Prefilled
            from this project's panel perimeter totals.
          </p>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addRow}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Coil
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-neutral-50 text-neutral-600 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Material</th>
              <th className="text-left px-3 py-2 font-medium">Gauge</th>
              <th className="text-right px-3 py-2 font-medium">Width (in)</th>
              <th className="text-right px-3 py-2 font-medium">
                Linear Ft (raw)
              </th>
              <th className="text-right px-3 py-2 font-medium">Waste %</th>
              <th className="text-right px-3 py-2 font-medium">ID (in)</th>
              <th className="text-right px-3 py-2 font-medium bg-blue-50/60">
                Linear Ft +Waste
              </th>
              <th className="text-right px-3 py-2 font-medium bg-blue-50/60">
                Rec. OD (in)
              </th>
              <th className="text-right px-3 py-2 font-medium bg-blue-50/60">
                Sqft
              </th>
              <th className="text-right px-3 py-2 font-medium bg-blue-50/60">
                Weight (lb)
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <CoilRowView
                key={row.id}
                row={row}
                canRemove={rows.length > 1}
                onChange={(patch) => updateRow(row.id, patch)}
                onRemove={() => removeRow(row.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50 text-[11px] text-neutral-500">
        Computed fields (highlighted) use the standard annulus formula:
        linear_ft = (buildup / thickness) × π × (ID + buildup) / 12. Edit
        values to match your supplier's coil dimensions.
      </div>
    </div>
  );
}

function CoilRowView({
  row,
  canRemove,
  onChange,
  onRemove,
}: {
  row: CoilRow;
  canRemove: boolean;
  onChange: (patch: Partial<CoilRow>) => void;
  onRemove: () => void;
}) {
  const result = useMemo(
    () =>
      coilFromRequired({
        linearFtRaw: row.linearFtRaw,
        widthIn: row.widthIn,
        material: row.material,
        gauge: row.gauge,
        idIn: row.idIn,
        wastePct: row.wastePct,
      }),
    [row],
  );

  const gaugeOptions = Object.keys(COIL_SPECS[row.material] ?? {});

  return (
    <tr className="border-t border-neutral-100 hover:bg-neutral-50/40">
      <td className="px-2 py-1.5">
        <select
          value={row.material}
          onChange={(e) => {
            const mat = e.target.value;
            const gauges = Object.keys(COIL_SPECS[mat] ?? {});
            onChange({ material: mat, gauge: gauges[0] ?? row.gauge });
          }}
          className="w-full h-8 px-2 text-xs rounded border border-neutral-200 bg-white"
        >
          {Object.keys(COIL_SPECS).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <select
          value={row.gauge}
          onChange={(e) => onChange({ gauge: e.target.value })}
          className="w-full h-8 px-2 text-xs rounded border border-neutral-200 bg-white"
        >
          {gaugeOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </td>
      <NumericCell
        value={row.widthIn}
        step={0.5}
        onChange={(v) => onChange({ widthIn: v })}
      />
      <NumericCell
        value={row.linearFtRaw}
        step={10}
        onChange={(v) => onChange({ linearFtRaw: v })}
      />
      <NumericCell
        value={row.wastePct}
        step={1}
        suffix="%"
        onChange={(v) => onChange({ wastePct: v })}
      />
      <NumericCell
        value={row.idIn}
        step={1}
        onChange={(v) => onChange({ idIn: v })}
      />
      <ComputedCell value={formatNumber(result.linearFtNeeded, 0)} />
      <ComputedCell value={formatNumber(result.odIn, 2)} emphasize />
      <ComputedCell value={formatNumber(result.sqft, 0)} />
      <ComputedCell value={formatNumber(result.weightLb, 0)} />
      <td className="px-2 py-1.5 text-right">
        <button
          disabled={!canRemove}
          onClick={onRemove}
          className={cn(
            "w-7 h-7 rounded inline-flex items-center justify-center transition-colors",
            canRemove
              ? "text-red-500 hover:bg-red-50"
              : "text-neutral-300 cursor-not-allowed",
          )}
          aria-label="Remove coil row"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

function NumericCell({
  value,
  step,
  onChange,
  suffix,
}: {
  value: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <td className="px-2 py-1.5">
      <div className="relative">
        <Input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          step={step ?? 1}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className="h-8 text-xs text-right tabular-nums pr-6"
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </td>
  );
}

function ComputedCell({
  value,
  emphasize,
}: {
  value: string;
  emphasize?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-3 py-1.5 text-right tabular-nums bg-blue-50/40",
        emphasize
          ? "font-bold text-neutral-900"
          : "font-medium text-neutral-700",
      )}
    >
      {value}
    </td>
  );
}

function formatNumber(n: number, digits: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
