"use client";

import {
  Pencil,
  MousePointer2,
  Move,
  Undo2,
  Redo2,
  Trash2,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLabelerStore } from "@/stores/labeler-store";
import { cn } from "@/lib/utils";

interface LabelingToolbarProps {
  showHeatmap?: boolean;
  onToggleHeatmap?: () => void;
  heatmapOpacity?: number;
  onHeatmapOpacityChange?: (v: number) => void;
  /** False if the sidecar returned no DSM for this sample. */
  heatmapAvailable?: boolean;
}

const modeActive = "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-700";
const modeActiveEdit =
  "bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-700";
const modeIdle = "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50";

export function LabelingToolbar({
  showHeatmap = false,
  onToggleHeatmap,
  heatmapOpacity = 0.5,
  onHeatmapOpacityChange,
  heatmapAvailable = false,
}: LabelingToolbarProps) {
  const mode = useLabelerStore((s) => s.mode);
  const setMode = useLabelerStore((s) => s.setMode);
  const selectedPanelIndex = useLabelerStore((s) => s.selectedPanelIndex);
  const panels = useLabelerStore((s) => s.panels);
  const deletePanel = useLabelerStore((s) => s.deletePanel);

  const handleUndo = () => useLabelerStore.temporal.getState().undo();
  const handleRedo = () => useLabelerStore.temporal.getState().redo();
  const handleDelete = () => {
    if (selectedPanelIndex !== null) {
      deletePanel(selectedPanelIndex);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-12 bg-white border-b border-neutral-200 flex items-center px-4 gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("draw")}
              className={cn("h-8", mode === "draw" ? modeActive : modeIdle)}
              aria-label="Draw mode"
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              Draw
            </Button>
          </TooltipTrigger>
          <TooltipContent>Draw mode (D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("select")}
              className={cn("h-8", mode === "select" ? modeActive : modeIdle)}
              aria-label="Select mode"
            >
              <MousePointer2 className="h-4 w-4 mr-1.5" />
              Select
            </Button>
          </TooltipTrigger>
          <TooltipContent>Select mode (S)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("edit")}
              className={cn("h-8", mode === "edit" ? modeActiveEdit : modeIdle)}
              aria-label="Edit mode"
            >
              <Move className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit — drag vertices, click edges to add points (E)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-2 h-6 bg-neutral-200" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              className={cn("h-8", modeIdle)}
              aria-label="Undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (⌘Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              className={cn("h-8", modeIdle)}
              aria-label="Redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (⌘⇧Z)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-2 h-6 bg-neutral-200" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={selectedPanelIndex === null}
              className={cn(
                "h-8 text-red-600 hover:text-red-700 hover:bg-red-50",
                "disabled:text-neutral-300 disabled:hover:bg-transparent",
              )}
              aria-label="Delete selected panel"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete selected panel</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-2 h-6 bg-neutral-200" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleHeatmap}
              disabled={!heatmapAvailable}
              className={cn(
                "h-8",
                showHeatmap
                  ? "bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-700"
                  : modeIdle,
                "disabled:text-neutral-300 disabled:hover:bg-transparent disabled:cursor-not-allowed",
              )}
              aria-label="Toggle elevation heatmap"
            >
              <Flame className="h-4 w-4 mr-1.5" />
              Heatmap
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {heatmapAvailable
              ? "Toggle elevation heatmap overlay"
              : "Elevation data (DSM) not available for this project"}
          </TooltipContent>
        </Tooltip>

        {showHeatmap && heatmapAvailable && (
          <div className="flex items-center gap-2 ml-1">
            <span className="text-xs text-neutral-500 font-medium">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={heatmapOpacity}
              onChange={(e) => onHeatmapOpacityChange?.(parseFloat(e.target.value))}
              className="w-20 h-1 accent-orange-500"
            />
            <span className="text-xs text-neutral-500 w-8 tabular-nums">
              {Math.round(heatmapOpacity * 100)}%
            </span>
          </div>
        )}

        <div className="flex-1" />
        <Badge
          variant="secondary"
          className="bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-medium"
        >
          {panels.length} panel{panels.length !== 1 ? "s" : ""}
        </Badge>
      </div>
    </TooltipProvider>
  );
}
