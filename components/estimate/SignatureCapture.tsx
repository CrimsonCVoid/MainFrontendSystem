"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { PenTool, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SignatureCaptureProps {
  onCapture: (signatureData: { image: string; capturedAt: string }) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  strokeColor?: string;
  strokeWidth?: number;
  className?: string;
}

/**
 * SignatureCapture - Canvas-based signature input component
 *
 * Features:
 * - Touch and mouse support
 * - Responsive canvas sizing
 * - Clear/redo functionality
 * - Exports as base64 PNG
 */
export function SignatureCapture({
  onCapture,
  onClear,
  width = 400,
  height = 200,
  strokeColor = "#1a1a1a",
  strokeWidth = 2,
  className = "",
}: SignatureCaptureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up high-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Set drawing styles
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }, [width, height, strokeColor, strokeWidth]);

  // Get position relative to canvas
  const getPos = useCallback(
    (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();

      if ("touches" in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        };
      }

      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  // Start drawing
  const startDrawing = useCallback(
    (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      setIsDrawing(true);
      setLastPos(getPos(e));
    },
    [getPos]
  );

  // Draw
  const draw = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDrawing || !lastPos) return;
      e.preventDefault();

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const currentPos = getPos(e);

      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();

      setLastPos(currentPos);
      setHasSignature(true);
    },
    [isDrawing, lastPos, getPos]
  );

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    setLastPos(null);
  }, []);

  // Add event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Mouse events
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseleave", stopDrawing);

    // Touch events
    canvas.addEventListener("touchstart", startDrawing, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stopDrawing);
    canvas.addEventListener("touchcancel", stopDrawing);

    return () => {
      canvas.removeEventListener("mousedown", startDrawing);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseleave", stopDrawing);
      canvas.removeEventListener("touchstart", startDrawing);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stopDrawing);
      canvas.removeEventListener("touchcancel", stopDrawing);
    };
  }, [startDrawing, draw, stopDrawing]);

  // Clear signature
  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

    setHasSignature(false);
    onClear?.();
  }, [onClear]);

  // Capture signature
  const handleCapture = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;

    const image = canvas.toDataURL("image/png");
    onCapture({
      image,
      capturedAt: new Date().toISOString(),
    });
  }, [hasSignature, onCapture]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Instructions */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <PenTool className="h-4 w-4" />
        <span>Sign using your mouse or finger</span>
      </div>

      {/* Canvas */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <canvas
          ref={canvasRef}
          className="border-2 border-neutral-200 rounded-lg cursor-crosshair touch-none bg-white"
          style={{ width, height }}
        />

        {/* Signature line */}
        <div
          className="absolute bottom-8 left-4 right-4 border-b border-dashed border-neutral-300"
          style={{ pointerEvents: "none" }}
        />
        <span
          className="absolute bottom-2 left-4 text-xs text-neutral-400"
          style={{ pointerEvents: "none" }}
        >
          Signature
        </span>
      </motion.div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={!hasSignature}
          className="text-neutral-500 hover:text-neutral-700"
        >
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Clear
        </Button>

        <Button
          type="button"
          onClick={handleCapture}
          disabled={!hasSignature}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Check className="h-4 w-4 mr-1.5" />
          Confirm Signature
        </Button>
      </div>

      {/* Visual feedback */}
      {hasSignature && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-emerald-600 text-center"
        >
          Signature captured. Click "Confirm Signature" to continue.
        </motion.p>
      )}
    </div>
  );
}

/**
 * SignaturePreview - Display a captured signature
 */
export function SignaturePreview({
  signatureData,
  className = "",
}: {
  signatureData: { image: string; capturedAt: string };
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="relative border border-neutral-200 rounded-lg p-2 bg-neutral-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signatureData.image}
          alt="Signature"
          className="max-w-full h-auto rounded"
        />
      </div>
      <p className="text-xs text-neutral-500 text-center">
        Signed on {new Date(signatureData.capturedAt).toLocaleString()}
      </p>
    </div>
  );
}
