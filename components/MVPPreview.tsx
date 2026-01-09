"use client";

import React from "react";
import { motion } from "framer-motion";

export function MVPPreview({
  mode = "diagram",
  address = "123 Copper Ridge Ln",
}: {
  mode?: "diagram" | "cut" | "bom";
  address?: string;
}) {
  return (
    <div className="h-full w-full grid place-items-center bg-neutral-50 dark:bg-neutral-950">
      <div className="w-[92%] h-[86%] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b dark:border-neutral-800">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">{address}</p>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-500">
            {mode === "diagram" ? "Roof Diagram" : mode === "cut" ? "Cut Sheet" : "Takeoff"}
          </div>
        </div>

        {mode === "diagram" && <Diagram />}
        {mode === "cut" && <CutSheet />}
        {mode === "bom" && <BOM />}
      </div>
    </div>
  );
}

function Diagram() {
  return (
    <div className="p-3 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4 h-[calc(100%-40px)]">
      <div className="relative rounded-lg border dark:border-neutral-800 bg-neutral-25 dark:bg-neutral-950 flex items-center justify-center">
        <svg viewBox="0 0 640 380" className="w-full h-full max-h-[360px]">
          {/* planes */}
          <polygon points="80,120 360,80 560,170 280,210" fill="#EFF3F7" stroke="#C9D4DE" strokeWidth="2" />
          <polygon points="80,120 280,210 260,300 60,210" fill="#F6F8FA" stroke="#C9D4DE" strokeWidth="2" />
          {/* trims (colored lines) */}
          {/* Ridge (red) */}
          <polyline points="150,110 430,90" stroke="#E5484D" strokeWidth="6" strokeLinecap="round" />
          {/* Eave (blue) */}
          <polyline points="70,220 270,310" stroke="#3B82F6" strokeWidth="6" strokeLinecap="round" />
          {/* Gable (green) */}
          <polyline points="80,120 60,210" stroke="#10B981" strokeWidth="6" strokeLinecap="round" />
          {/* Valley (purple) */}
          <polyline points="280,210 560,170" stroke="#7C3AED" strokeWidth="6" strokeLinecap="round" />
          {/* Sidewall/Endwall (amber) */}
          <polyline points="260,300 560,170" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>

      <div className="rounded-lg border dark:border-neutral-800 p-3">
        <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 mb-2">Legend</p>
        <ul className="space-y-2 text-[12px]">
          <LegendItem color="#E5484D" label="Ridge cap" />
          <LegendItem color="#3B82F6" label="Eave trim" />
          <LegendItem color="#10B981" label="Gable (rake) trim" />
          <LegendItem color="#7C3AED" label="Valley metal" />
          <LegendItem color="#F59E0B" label="Sidewall / Endwall flashing" />
        </ul>

        <div className="mt-3 border-t dark:border-neutral-800 pt-3 text-[11px] text-neutral-600 dark:text-neutral-400">
          <p>Pitch: 6/12 · Primary</p>
          <p>Panels: 46 @ 22'6</p>
          <p>Waste: 10%</p>
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span className="text-neutral-700 dark:text-neutral-300">{label}</span>
    </li>
  );
}

function CutSheet() {
  const rows = [
    { length: "22'6", qty: 23 },
    { length: "22'0", qty: 12 },
    { length: "21'6", qty: 8 },
    { length: 'Misc.', qty: 2 },
  ];
  return (
    <div className="p-3 h-[calc(100%-40px)]">
      <div className="rounded-lg border dark:border-neutral-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900 border-b dark:border-neutral-800">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-neutral-700 dark:text-neutral-300">Panel Length</th>
              <th className="text-left px-3 py-2 font-medium text-neutral-700 dark:text-neutral-300">Quantity</th>
              <th className="text-left px-3 py-2 font-medium text-neutral-700 dark:text-neutral-300">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b dark:border-neutral-800 last:border-0">
                <td className="px-3 py-2 dark:text-neutral-300">{r.length}</td>
                <td className="px-3 py-2 dark:text-neutral-300">{r.qty}</td>
                <td className="px-3 py-2 dark:text-neutral-300">16″ Standing Seam</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-neutral-500 dark:text-neutral-500">
        Export as CSV/PDF
      </p>
    </div>
  );
}

function BOM() {
  const items = [
    { label: "Panels (26ga)", value: "46 total" },
    { label: "Ridge cap", value: "30'0" },
    { label: "Eave trim", value: "60'0" },
    { label: "Valley metal", value: "40'0" },
    { label: "Gable trim", value: "60'0" },
  ];
  return (
    <div className="p-3 h-[calc(100%-40px)] grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded-lg border dark:border-neutral-800 p-3">
        <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 mb-2">Takeoff</p>
        <ul className="text-sm space-y-[6px]">
          {items.map((i) => (
            <li key={i.label} className="flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">{i.label}</span>
              <span className="font-medium dark:text-neutral-300">{i.value}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border dark:border-neutral-800 p-3">
        <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 mb-2">Notes</p>
        <ul className="text-[12px] text-neutral-700 dark:text-neutral-400 space-y-2 list-disc pl-5">
          <li>Waste factor adjustable (default 10%)</li>
          <li>Trim breakdown auto-populates by detected edges</li>
          <li>Export CSV/PDF from this summary</li>
        </ul>
      </div>
    </div>
  );
}
