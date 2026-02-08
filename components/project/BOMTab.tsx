"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  calculateBOM,
  groupBOMByCategory,
  getBOMCategoryTotals,
  applyBOMOverrides,
  type BOMSummary,
  type BOMItem,
} from "@/lib/bom-calculator";
import { exportBOMToCSV, downloadCSV, generateCSVFilename } from "@/lib/csv-export";
import { Button } from "@/components/ui/button";
import {
  Package,
  Wrench,
  Scissors,
  Box,
  Download,
  RefreshCw,
  Edit2,
  Check,
  X,
  Calculator,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import type { RoofData } from "@/lib/database.types";

interface ProjectForBOM {
  id: string;
  name: string;
  square_footage: number | null;
  roof_data: RoofData | null;
}

interface BOMTabProps {
  project: ProjectForBOM;
  panelWidth?: number;
  onBOMChange?: (bom: BOMSummary) => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  panel: Package,
  fastener: Wrench,
  trim: Scissors,
  accessory: Box,
};

const CATEGORY_COLORS: Record<string, string> = {
  panel: "bg-blue-50 text-blue-700 border-blue-200",
  fastener: "bg-amber-50 text-amber-700 border-amber-200",
  trim: "bg-emerald-50 text-emerald-700 border-emerald-200",
  accessory: "bg-purple-50 text-purple-700 border-purple-200",
};

/**
 * BOMTab - Bill of Materials tab for project detail page
 *
 * Features:
 * - Auto-calculated quantities from project data
 * - Editable quantity overrides
 * - Cost calculations (when pricing available)
 * - CSV export
 * - Category grouping
 */
export function BOMTab({ project, panelWidth = 18, onBOMChange }: BOMTabProps) {
  // Calculate BOM
  const [bom, setBOM] = useState<BOMSummary | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Calculate on mount and when project changes
  useEffect(() => {
    if (!project.square_footage) {
      setBOM(null);
      return;
    }

    try {
      const calculatedBOM = calculateBOM(project, panelWidth);
      setBOM(calculatedBOM);
      onBOMChange?.(calculatedBOM);
    } catch (err) {
      console.error("Error calculating BOM:", err);
    }
  }, [project, panelWidth, onBOMChange]);

  // Apply overrides when they change
  const displayBOM = useMemo(() => {
    if (!bom) return null;
    if (Object.keys(overrides).length === 0) return bom;
    return applyBOMOverrides(bom, overrides);
  }, [bom, overrides]);

  // Group by category
  const groupedBOM = useMemo(() => {
    if (!displayBOM) return {};
    return groupBOMByCategory(displayBOM);
  }, [displayBOM]);

  const categoryTotals = useMemo(() => {
    if (!displayBOM) return {};
    return getBOMCategoryTotals(displayBOM);
  }, [displayBOM]);

  // Handle quantity edit
  const startEdit = (item: BOMItem) => {
    setEditingItem(item.id);
    setEditValue(String(item.quantity));
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditValue("");
  };

  const saveEdit = (itemId: string) => {
    const newQuantity = parseFloat(editValue);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      setOverrides((prev) => ({
        ...prev,
        [itemId]: newQuantity,
      }));
    }
    setEditingItem(null);
    setEditValue("");
  };

  // Reset to calculated values
  const resetOverride = (itemId: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const resetAllOverrides = () => {
    setOverrides({});
  };

  // Export to CSV
  const handleExport = () => {
    if (!displayBOM) return;
    const csv = exportBOMToCSV(displayBOM, project.name);
    const filename = generateCSVFilename(`BOM_${project.name.replace(/[^a-zA-Z0-9]/g, "_")}`);
    downloadCSV(csv, filename);
  };

  // No square footage
  if (!project.square_footage) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 bg-amber-50 rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-medium text-neutral-900 mb-2">
          Square Footage Required
        </h3>
        <p className="text-neutral-600 max-w-md">
          Add an address to this project to calculate the roof area and generate a bill
          of materials.
        </p>
      </div>
    );
  }

  // Loading/calculating
  if (!displayBOM) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 text-neutral-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Bill of Materials</h3>
          <p className="text-sm text-neutral-500">
            Auto-calculated for {project.square_footage?.toLocaleString()} sq ft roof
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(overrides).length > 0 && (
            <Button variant="ghost" size="sm" onClick={resetAllOverrides}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Reset All
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["panel", "fastener", "trim", "accessory"] as const).map((category) => {
          const Icon = CATEGORY_ICONS[category];
          const totals = categoryTotals[category] || { count: 0, cost: 0 };
          const items = groupedBOM[category] || [];

          return (
            <div
              key={category}
              className={`p-4 rounded-lg border ${CATEGORY_COLORS[category]}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium capitalize">{category}s</span>
              </div>
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs opacity-75">items</p>
              {totals.cost > 0 && (
                <p className="text-sm font-medium mt-1">
                  ${totals.cost.toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* BOM Table by Category */}
      {(["panel", "fastener", "trim", "accessory"] as const).map((category) => {
        const items = groupedBOM[category];
        if (!items || items.length === 0) return null;

        const Icon = CATEGORY_ICONS[category];

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-neutral-200 rounded-lg overflow-hidden"
          >
            {/* Category Header */}
            <div className={`px-4 py-3 border-b ${CATEGORY_COLORS[category]}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="font-medium capitalize">{category}s</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-100 text-left">
                    <th className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase">
                      Item
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase text-right">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase">
                      Unit
                    </th>
                    {items.some((i) => i.unitCost) && (
                      <>
                        <th className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase text-right">
                          Unit Cost
                        </th>
                        <th className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase text-right">
                          Total
                        </th>
                      </>
                    )}
                    <th className="px-4 py-2 text-xs font-medium text-neutral-500 uppercase text-right w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{item.item}</p>
                        {item.description && (
                          <p className="text-xs text-neutral-500">{item.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingItem === item.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-20 px-2 py-1 text-sm border border-neutral-300 rounded text-right"
                              autoFocus
                            />
                            <button
                              onClick={() => saveEdit(item.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-neutral-400 hover:bg-neutral-100 rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`font-medium ${
                              !item.isAutoCalculated
                                ? "text-blue-600"
                                : "text-neutral-900"
                            }`}
                          >
                            {item.quantity.toLocaleString()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{item.unit}</td>
                      {items.some((i) => i.unitCost) && (
                        <>
                          <td className="px-4 py-3 text-right text-neutral-600">
                            {item.unitCost ? `$${item.unitCost.toFixed(2)}` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-neutral-900">
                            {item.totalCost ? `$${item.totalCost.toLocaleString()}` : "—"}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {editingItem !== item.id && (
                            <button
                              onClick={() => startEdit(item)}
                              className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded"
                              title="Edit quantity"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          {!item.isAutoCalculated && (
                            <button
                              onClick={() => resetOverride(item.id)}
                              className="p-1 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded"
                              title="Reset to calculated"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      })}

      {/* Total Summary */}
      {displayBOM.totalCost > 0 && (
        <div className="bg-neutral-50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-neutral-500" />
            <span className="text-neutral-600">Estimated Materials Cost</span>
          </div>
          <span className="text-2xl font-bold text-neutral-900">
            ${displayBOM.totalCost.toLocaleString()}
          </span>
        </div>
      )}

      {/* Footer Notes */}
      <div className="text-xs text-neutral-500 space-y-1">
        <p className="flex items-center gap-1">
          <Calculator className="h-3 w-3" />
          Quantities include 10% waste factor
        </p>
        {Object.keys(overrides).length > 0 && (
          <p className="text-blue-600">
            * Blue quantities have been manually adjusted
          </p>
        )}
      </div>
    </div>
  );
}
