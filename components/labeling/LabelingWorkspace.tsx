"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FileText, Loader2, Maximize2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLabelerStore } from "@/stores/labeler-store";
import { getLabels, saveLabels, snapPreview, ApiError } from "@/lib/labeler-api";
import { initErrorCapture } from "@/lib/labeler-errors";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { LabelingHeader } from "@/components/labeling/LabelingHeader";
import { LabelingToolbar } from "@/components/labeling/LabelingToolbar";

const HillshadeCanvas = dynamic(
  () =>
    import("@/components/canvas/HillshadeCanvas").then((m) => ({
      default: m.HillshadeCanvas,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        Loading canvas...
      </div>
    ),
  },
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface LabelingWorkspaceProps {
  projectId: string;
  projectName?: string | null;
  /**
   * Chrome mode:
   * - "page" (default): fullscreen h-screen wrapper + LabelingHeader.
   *   Used by /projects/[id]/label dedicated route.
   * - "embedded": fills its parent container, no header. Used inside
   *   the project page's labeler tab where the outer chrome is already
   *   provided by the project shell.
   */
  chrome?: "page" | "embedded";
}

export function LabelingWorkspace({
  projectId,
  projectName,
  chrome = "page",
}: LabelingWorkspaceProps) {
  const { toast } = useToast();
  const loadPanels = useLabelerStore((s) => s.loadPanels);
  const isSaving = useLabelerStore((s) => s.isSaving);
  const isLoadingPreview = useLabelerStore((s) => s.isLoadingPreview);

  useKeyboardShortcuts();

  useEffect(() => {
    loadPanels([]);

    async function loadExistingLabels() {
      try {
        const data = await getLabels(projectId);
        loadPanels(data.panels);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return;
        }
        toast({
          variant: "destructive",
          title: "Could not load labels",
          description:
            "The project may not exist or the service is unreachable.",
        });
      }
    }
    loadExistingLabels();
  }, [projectId, loadPanels, toast]);

  useEffect(() => {
    const cleanup = initErrorCapture(projectId);
    return cleanup;
  }, [projectId]);

  const handleSave = async () => {
    const { panels, setIsSaving } = useLabelerStore.getState();
    if (panels.length === 0) return;
    setIsSaving(true);
    try {
      const result = await saveLabels(projectId, panels);
      toast({
        title: "Labels saved",
        description: `${result.panel_count} panels saved.`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Check your connection and try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSnapPreview = async () => {
    const {
      panels,
      snapPreview: currentPreview,
      setSnapPreview,
      setIsLoadingPreview,
    } = useLabelerStore.getState();

    if (currentPreview) {
      setSnapPreview(null);
      return;
    }

    if (panels.length < 2) {
      toast({
        variant: "destructive",
        title: "Snap preview failed",
        description: "Label at least 2 panels, then try again.",
      });
      return;
    }

    setIsLoadingPreview(true);
    try {
      const result = await snapPreview({ panels });
      setSnapPreview({
        features: result.feature_graph.features,
        snappedPolygons: result.snapped_polygons,
      });
      toast({
        title: "Snap preview ready",
        description: `${result.feature_graph.features.length} features detected.`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Snap preview failed",
        description: "Label at least 2 panels, then try again.",
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.5);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleGeneratePdf = async () => {
    const { panels } = useLabelerStore.getState();
    if (panels.length === 0) {
      toast({
        variant: "destructive",
        title: "No panels to export",
        description: "Draw and save labels first.",
      });
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/pipeline/generate-pdf/${projectId}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({ detail: res.statusText }))) as {
          detail?: string;
        };
        throw new Error(err.detail || "PDF generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectId.slice(0, 8)}_cutsheets.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF downloaded" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "PDF generation failed",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const isEmbedded = chrome === "embedded";

  return (
    <div
      className={
        isEmbedded
          ? "flex flex-col h-full w-full bg-zinc-950"
          : "flex flex-col h-screen bg-zinc-950"
      }
    >
      {!isEmbedded && (
        <LabelingHeader
          projectId={projectId}
          projectName={projectName}
          onSave={handleSave}
          isSaving={isSaving}
          onGeneratePdf={handleGeneratePdf}
          isGeneratingPdf={isGeneratingPdf}
        />
      )}
      {isEmbedded && (
        <EmbeddedLabelingActions
          projectId={projectId}
          onSave={handleSave}
          isSaving={isSaving}
          onGeneratePdf={handleGeneratePdf}
          isGeneratingPdf={isGeneratingPdf}
        />
      )}
      <LabelingToolbar
        onSnapPreview={handleSnapPreview}
        isLoadingPreview={isLoadingPreview}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap((v) => !v)}
        heatmapOpacity={heatmapOpacity}
        onHeatmapOpacityChange={setHeatmapOpacity}
      />
      <div className="flex-1" data-testid="labeler-canvas">
        <HillshadeCanvas
          sampleId={projectId}
          showHeatmap={showHeatmap}
          heatmapOpacity={heatmapOpacity}
        />
      </div>
    </div>
  );
}

interface EmbeddedActionsProps {
  projectId: string;
  onSave: () => void;
  isSaving: boolean;
  onGeneratePdf: () => void;
  isGeneratingPdf: boolean;
}

function EmbeddedLabelingActions({
  projectId,
  onSave,
  isSaving,
  onGeneratePdf,
  isGeneratingPdf,
}: EmbeddedActionsProps) {
  return (
    <div className="h-10 bg-zinc-900 flex items-center px-4 gap-2 shrink-0 border-b border-zinc-800">
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
        Labeler
      </span>
      <div className="flex-1" />
      <Button
        size="sm"
        variant="ghost"
        onClick={onGeneratePdf}
        disabled={isGeneratingPdf}
        className="h-7 text-zinc-300 hover:text-white"
      >
        {isGeneratingPdf ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <FileText className="h-3.5 w-3.5 mr-1.5" />
        )}
        {isGeneratingPdf ? "Generating…" : "PDF"}
      </Button>
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="h-7 bg-blue-500 hover:bg-blue-600 text-white"
      >
        <Save className="h-3.5 w-3.5 mr-1.5" />
        {isSaving ? "Saving…" : "Save"}
      </Button>
      <Link
        href={`/projects/${projectId}/label`}
        aria-label="Open labeler fullscreen"
        className="inline-flex items-center justify-center h-7 w-7 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
