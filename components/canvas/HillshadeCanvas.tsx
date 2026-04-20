"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useLabelerStore } from "@/stores/labeler-store";
import type { PanelData } from "@/stores/labeler-store";
import { PolygonLayer } from "./PolygonLayer";
import { DrawingLayer } from "./DrawingLayer";
import { MagnetIndicator } from "./MagnetIndicator";
import { AutoCloseIndicator } from "./AutoCloseIndicator";
import { SnapPreviewLayer } from "./SnapPreviewLayer";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const MAGNET_RADIUS_PX = 3;
const AUTOCLOSE_RADIUS_PX = 3;
const SCALE_BY = 1.05;
const MIN_SCALE = 0.1;
const MAX_SCALE = 10;

function findNearestVertex(
  point: { x: number; y: number },
  panels: PanelData[],
  excludePanelIndex?: number,
): { vertex: number[]; distance: number } | null {
  let nearest: { vertex: number[]; distance: number } | null = null;
  for (let i = 0; i < panels.length; i++) {
    if (i === excludePanelIndex) continue;
    for (const corner of panels[i].corners_pix) {
      const dx = point.x - corner[0];
      const dy = point.y - corner[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MAGNET_RADIUS_PX && (!nearest || dist < nearest.distance)) {
        nearest = { vertex: corner, distance: dist };
      }
    }
  }
  return nearest;
}

interface HillshadeCanvasProps {
  sampleId: string;
  showHeatmap: boolean;
  heatmapOpacity: number;
  /**
   * Bumped by the workspace after an aerial snapshot is persisted, so
   * this canvas re-fetches the sidecar image with a cache-bust.
   */
  cacheBust?: number;
  /**
   * Fired when the heatmap image load resolves (loaded or failed), so
   * the toolbar can disable the Heatmap button when no DSM is available
   * for this sample.
   */
  onHeatmapAvailabilityChange?: (available: boolean) => void;
  /**
   * True once the workspace's snapshot POST has resolved AND written a
   * training_samples row. Until then, the canvas should show a loading
   * overlay rather than the fallback empty-canvas banner — the data is
   * still coming.
   */
  snapshotReady?: boolean;
}

export function HillshadeCanvas({
  sampleId,
  showHeatmap,
  heatmapOpacity,
  cacheBust = 0,
  onHeatmapAvailabilityChange,
  snapshotReady = false,
}: HillshadeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [zoomScale, setZoomScale] = useState(1);

  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [magnetTarget, setMagnetTarget] = useState<{ x: number; y: number } | null>(null);
  const [autoCloseTarget, setAutoCloseTarget] = useState<{ x: number; y: number } | null>(null);

  const panels = useLabelerStore((s) => s.panels);
  const activeDrawing = useLabelerStore((s) => s.activeDrawing);
  const mode = useLabelerStore((s) => s.mode);
  const selectedPanelIndex = useLabelerStore((s) => s.selectedPanelIndex);
  const addVertex = useLabelerStore((s) => s.addVertex);
  const closePolygon = useLabelerStore((s) => s.closePolygon);
  const selectPanel = useLabelerStore((s) => s.selectPanel);
  const moveVertex = useLabelerStore((s) => s.moveVertex);
  const insertVertex = useLabelerStore((s) => s.insertVertex);

  // Sidecar is the single source of truth. It serves the Solar-API
  // GeoTIFF (when available) or a Static Maps PNG fallback, but either
  // way the pixel-space of the displayed image is the same pixel-space
  // that labels and the pipeline operate in. Drawing a Google Static
  // Maps tile directly in parallel produced coordinate drift (different
  // zoom, different extent) that made polygons land on the wrong house
  // when images swapped.
  const rgbUrl = `${API_BASE}/api/hillshade/${sampleId}/rgb${cacheBust ? `?v=${cacheBust}` : ""}`;
  const [image, imageStatus] = useImage(rgbUrl, "anonymous");

  const heatmapUrl = `${API_BASE}/api/hillshade/${sampleId}/heatmap${cacheBust ? `?v=${cacheBust}` : ""}`;
  const [heatmapImage, heatmapStatus] = useImage(heatmapUrl, "anonymous");

  useEffect(() => {
    if (!onHeatmapAvailabilityChange) return;
    if (heatmapStatus === "loaded") onHeatmapAvailabilityChange(true);
    else if (heatmapStatus === "failed") onHeatmapAvailabilityChange(false);
  }, [heatmapStatus, onHeatmapAvailabilityChange]);

  const [hasFitImage, setHasFitImage] = useState(false);
  useEffect(() => {
    const stage = stageRef.current;
    if (hasFitImage || !stage) return;
    // With image: fit to image bounds.
    if (image) {
      const scaleX = dimensions.width / image.width;
      const scaleY = dimensions.height / image.height;
      const fitScale = Math.min(scaleX, scaleY) * 0.95;
      const offsetX = (dimensions.width - image.width * fitScale) / 2;
      const offsetY = (dimensions.height - image.height * fitScale) / 2;
      stage.scale({ x: fitScale, y: fitScale });
      stage.position({ x: offsetX, y: offsetY });
      setZoomScale(fitScale);
      setHasFitImage(true);
      return;
    }
    // Without image (sidecar 404 or not configured): apply a sensible
    // default so the user can still draw on an empty canvas. Assumes a
    // 512x512 working area centered in the container.
    if (imageStatus === "failed") {
      const defaultImageSize = 512;
      const fitScale =
        Math.min(dimensions.width, dimensions.height) / defaultImageSize;
      const offsetX = (dimensions.width - defaultImageSize * fitScale) / 2;
      const offsetY = (dimensions.height - defaultImageSize * fitScale) / 2;
      stage.scale({ x: fitScale, y: fitScale });
      stage.position({ x: offsetX, y: offsetY });
      setZoomScale(fitScale);
      setHasFitImage(true);
    }
  }, [image, hasFitImage, dimensions, imageStatus]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function getImageCoords(stage: Konva.Stage): { x: number; y: number } | null {
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    const imageX = (pos.x - stage.x()) / stage.scaleX();
    const imageY = (pos.y - stage.y()) / stage.scaleY();
    return { x: imageX, y: imageY };
  }

  function handleMouseMove(e: KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage();
    if (!stage) return;
    const coords = getImageCoords(stage);
    if (!coords) return;

    setCursorPosition(coords);

    if (mode === "draw") {
      const snap = findNearestVertex(coords, panels);
      setMagnetTarget(snap ? { x: snap.vertex[0], y: snap.vertex[1] } : null);

      if (activeDrawing && activeDrawing.length >= 3) {
        const first = activeDrawing[0];
        const dx = coords.x - first[0];
        const dy = coords.y - first[1];
        if (Math.sqrt(dx * dx + dy * dy) < AUTOCLOSE_RADIUS_PX) {
          setAutoCloseTarget({ x: first[0], y: first[1] });
        } else {
          setAutoCloseTarget(null);
        }
      } else {
        setAutoCloseTarget(null);
      }
    } else {
      setMagnetTarget(null);
      setAutoCloseTarget(null);
    }
  }

  function handleStageClick(e: KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage();
    if (!stage) return;
    const coords = getImageCoords(stage);
    if (!coords) return;

    if (mode === "select" || mode === "edit") {
      if (e.target === stage) {
        selectPanel(null);
      }
      return;
    }

    const shiftHeld = e.evt.shiftKey;
    let placeX = coords.x;
    let placeY = coords.y;

    if (activeDrawing && activeDrawing.length >= 3) {
      const first = activeDrawing[0];
      const dx = coords.x - first[0];
      const dy = coords.y - first[1];
      if (Math.sqrt(dx * dx + dy * dy) < AUTOCLOSE_RADIUS_PX) {
        closePolygon();
        return;
      }
    }

    if (!shiftHeld) {
      const snap = findNearestVertex({ x: coords.x, y: coords.y }, panels);
      if (snap) {
        placeX = snap.vertex[0];
        placeY = snap.vertex[1];
      }
    }

    addVertex(placeX, placeY);
  }

  function handleWheel(e: KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(
        MIN_SCALE,
        direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY,
      ),
    );
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
    setZoomScale(newScale);
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-neutral-100"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {imageStatus !== "loaded" && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-neutral-50/85 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-4 px-8 py-7 rounded-2xl bg-white border border-neutral-200 shadow-lg">
            <div className="relative w-12 h-12">
              <span className="absolute inset-0 rounded-full border-2 border-neutral-200" />
              <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-neutral-900">
                Preparing roof imagery
              </p>
              <p className="text-xs text-neutral-500 mt-1 max-w-[18rem]">
                Loading high-resolution aerial and elevation data for this
                property. This takes a few seconds.
              </p>
            </div>
          </div>
        </div>
      )}
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable={mode !== "edit"}
        onClick={handleStageClick}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
      >
        <Layer>
          {image && <KonvaImage image={image} />}
          {showHeatmap && heatmapImage && (
            <KonvaImage image={heatmapImage} opacity={heatmapOpacity} />
          )}
          <PolygonLayer
            panels={panels}
            selectedPanelIndex={selectedPanelIndex}
            mode={mode}
            onSelectPanel={selectPanel}
            onMoveVertex={moveVertex}
            onInsertVertex={insertVertex}
            scale={zoomScale}
          />
          <DrawingLayer
            activeDrawing={activeDrawing}
            cursorPosition={cursorPosition}
            scale={zoomScale}
          />
          <MagnetIndicator
            x={magnetTarget?.x ?? 0}
            y={magnetTarget?.y ?? 0}
            visible={magnetTarget !== null}
            scale={zoomScale}
          />
          <AutoCloseIndicator
            x={autoCloseTarget?.x ?? 0}
            y={autoCloseTarget?.y ?? 0}
            visible={autoCloseTarget !== null}
            scale={zoomScale}
          />
          <SnapPreviewLayer />
        </Layer>
      </Stage>
    </div>
  );
}
