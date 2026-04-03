"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic import for RoofViewer3D to reduce bundle size on project pages
const RoofViewer3D = dynamic(
  () => import("@/components/dashboard/RoofViewer3D"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading 3D Viewer...</p>
        </div>
      </div>
    ),
  }
);

interface ProjectViewerProps {
  projectId: string;
  projectName: string;
  roofData?: any;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function ProjectViewer({
  projectId,
  projectName,
  roofData,
  onCanvasReady,
}: ProjectViewerProps) {
  return (
    <div className="relative w-full h-full">
      <RoofViewer3D
        className="h-full w-full"
        width={14}
        depth={11}
        pitch={0.5}
        spin={false}
        hideControls={false}
        roofData={roofData}
        onCanvasReady={onCanvasReady}
      />
    </div>
  );
}
