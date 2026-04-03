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
<<<<<<< HEAD
  roofData?: any; // KY - Pass project.roof_data from parent
=======
  roofData?: any;
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function ProjectViewer({
  projectId,
  projectName,
<<<<<<< HEAD
  roofData, // KY - Use this to pass to RoofViewer3D
=======
  roofData,
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
  onCanvasReady,
}: ProjectViewerProps) {
  return (
<<<<<<< HEAD
    <div
      className={`
        relative overflow-hidden transition-all duration-300
        ${
          isFullscreen
            ? "fixed inset-0 z-50 bg-white dark:bg-black p-6"
            : "w-full h-full"
        }
      `}
    >
      {/* Fullscreen Header */}
      {isFullscreen && (
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">3D Roof Configurator</h2>
            <p className="text-sm text-muted-foreground">{projectName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exitFullscreen}
            >
              <Minimize2 className="h-4 w-4 mr-2" />
              Exit Fullscreen
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exitFullscreen}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Fullscreen Toggle Button (non-fullscreen mode) */}
      {!isFullscreen && (
        <div className="absolute top-4 right-4 z-20">
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFullscreen}
            className="shadow-lg"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Fullscreen
          </Button>
        </div>
      )}

      {/* Advanced 3D Roof Configurator */}
      <div className={`h-full w-full ${isFullscreen ? '' : 'min-h-[600px]'}`}>
        {/* KY - Uncomment roofData prop when backend is ready */}
        <RoofViewer3D
          className="h-full w-full"
          width={14}
          depth={11}
          pitch={0.5}
          spin={false}
          hideControls={false}
          onCanvasReady={onCanvasReady}
          // roofData={roofData}
        />
      </div>
=======
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
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
    </div>
  );
}
