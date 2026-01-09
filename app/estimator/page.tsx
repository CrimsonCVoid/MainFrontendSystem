"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calculator, FileText, MapPin, Maximize2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AddressAutocomplete from "@/components/autocomplete";

import { MVPPreview } from "@/components/MVPPreview";
import SmoothMetalRoof from "@/components/viewer-3d";

// Helper: load Babylon before showing the inline preview (so first frame is smooth)
let babylonPreloaded = false;
async function preloadBabylon() {
  if (babylonPreloaded) return;
  babylonPreloaded = true;
  await new Promise<void>((resolve, reject) => {
    const s1 = document.createElement("script");
    const s2 = document.createElement("script");
    const s3 = document.createElement("script");
    s1.src = "https://cdn.babylonjs.com/babylon.js";
    s2.src = "https://cdn.babylonjs.com/gui/babylon.gui.min.js";
    s3.src = "https://cdn.babylonjs.com/materialsLibrary/babylon.gridMaterial.min.js";
    s1.async = s2.async = s3.async = true;
    s1.onload = () => {
      s2.onload = () => {
        s3.onload = () => resolve();
        s3.onerror = reject;
        document.head.appendChild(s3);
      };
      s2.onerror = reject;
      document.head.appendChild(s2);
    };
    s1.onerror = reject;
    document.head.appendChild(s1);
  });
}

export default function EstimatorPage() {
  const { toast } = useToast();
  const [projectName, setProjectName] = useState("");
  const [address, setAddress] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Reset inline preview when address changes
  useEffect(() => {
    setPreviewReady(false);
  }, [address]);

  const handleCalculate = () => {
    toast({
      title: "Estimate Calculated",
      description: "Full calculation logic will be implemented in future sprints.",
    });
  };

  const handleExportPDF = () => {
    toast({
      title: "Export to PDF",
      description: "PDF export functionality will be implemented in future sprints.",
    });
  };

  const handlePreviewClick = async () => {
    if (!address.trim()) return;
    setLoadingPreview(true);
    try {
      await preloadBabylon(); // warm cache/files
      setPreviewReady(true);
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estimator</h1>
        <p className="text-muted-foreground">Calculate project estimates and material costs</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Enter basic project information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Project Name</label>
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                type="text"
                placeholder="Enter project name"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                onSelect={(picked /*, coords*/) => {
                  setAddress(picked); // <-- ensures the input shows the chosen suggestion
                }}
                placeholder="Enter project address"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handlePreviewClick}
                  disabled={!address.trim() || loadingPreview}
                  variant="secondary"
                >
                  {loadingPreview ? (
                    <span className="inline-flex items-center gap-2">
                      <Play className="h-4 w-4 animate-pulse" /> Loading…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Preview Roof
                    </span>
                  )}
                </Button>
              </div>

              {/* Inline mini preview appears after clicking Preview */}
              {previewReady && (
                <div className="mt-3 space-y-2">
                  <div className="w-full h-[220px] rounded-lg border bg-muted/30">
                    <SmoothMetalRoof address={address} className="w-full h-full" />
                  </div>
                  <div className="flex justify-end">
                    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Maximize2 className="mr-2 h-4 w-4" />
                          Expand Preview
                        </Button>
                      </DialogTrigger>

                      {/* Responsive modal that drives correct aspect ratio */}
                      <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 overflow-hidden flex flex-col">
                        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
                          <DialogTitle>3D Viewer - Roof Test X5 — {address}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto px-4 pb-4">
                          <SmoothMetalRoof address={address} className="w-full h-full" />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Material Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Material Selection</CardTitle>
            <CardDescription>Choose roofing materials and specifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Metal Type</label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option>Standing Seam</option>
                <option>Corrugated Steel</option>
                <option>Metal Tiles</option>
                <option>Stone-Coated Steel</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Gauge</label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option>26 Gauge</option>
                <option>24 Gauge</option>
                <option>22 Gauge</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color/Finish</label>
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option>Galvanized</option>
                <option>Painted - White</option>
                <option>Painted - Black</option>
                <option>Painted - Gray</option>
                <option>Painted - Brown</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Estimate */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Estimate</CardTitle>
          <CardDescription>Estimated costs based on provided information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Material Cost</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Labor Cost</span>
              <span className="font-medium">$0.00</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t pt-2">
              <span className="font-semibold">Total Estimate</span>
              <span className="text-2xl font-bold">$0.00</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleCalculate} className="flex-1">
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Estimate
            </Button>
            <Button onClick={handleExportPDF} variant="outline" className="flex-1">
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
