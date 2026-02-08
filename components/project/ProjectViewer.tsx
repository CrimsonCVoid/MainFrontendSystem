"use client";

import { useState } from "react";
import RoofViewer3D from "@/components/dashboard/RoofViewer3D";
import { Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectViewerProps {
  projectId: string;
  projectName: string;
  roofData?: any; // KY - Pass project.roof_data from parent
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export default function ProjectViewer({
  projectId,
  projectName,
  roofData, // KY - Use this to pass to RoofViewer3D
  onCanvasReady,
}: ProjectViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const exitFullscreen = () => {
    setIsFullscreen(false);
  };

  return (
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
    </div>
  );
}
