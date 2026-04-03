"use client";

/**
 * ESTIMATION TAB COMPONENT
 *
 * Contractor-facing PDF estimation tool with:
 * - Editable cost fields (materials, labor, permits, contingency)
 * - Save/load estimate versions
 * - PDF generation with 3D roof screenshot
 * - Estimate history management
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Send,
  Clock,
  Plus,
  Save,
  Loader2,
  Trash2,
  FileText,
  History,
  X,
  Share2,
  Link2,
  CheckCircle2,
  Eye,
  MessageSquare,
<<<<<<< HEAD
=======
  DollarSign,
  Package,
  Wrench,
  ScrollText,
  PercentCircle,
  Zap,
  Settings,
  Building2,
  Users,
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useEstimates } from "@/hooks/use-estimates";
import {
  calculateTotal,
  calculateContingencyFromPercentage,
  type EstimateFormData,
} from "@/lib/estimate-types";
import {
  PDFGenerator,
  generateAndDownloadProposal,
  type ProposalData,
} from "@/lib/pdf-generator";
import { captureTopDownScreenshot } from "@/lib/capture-3d";
import { ShareEstimateModal } from "@/components/estimate/ShareEstimateModal";
import { ShareDetailsDialog } from "@/components/estimate/ShareDetailsDialog";
import {
  getProjectShares,
  getShareStatusColor,
  getShareStatusLabel,
  type EstimateShare,
} from "@/lib/estimate-sharing";
import {
  exportEstimatesToCSV,
  downloadCSV,
  generateCSVFilename,
} from "@/lib/csv-export";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { Tables } from "@/lib/database.types";

type ProjectRow = Tables<"projects">;
type UserRow = Tables<"users">;

interface EstimationTabProps {
  project: ProjectRow;
  user: UserRow | null;
  userId: string;
  organizationId?: string;
  addressData: {
    formatted_address?: string;
  } | null;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function EstimationTab({
  project,
  user,
  userId,
  organizationId,
  addressData,
  canvasRef,
}: EstimationTabProps) {
  const { toast } = useToast();
  const supabase = getSupabaseBrowserClient();
  const {
    estimates,
    activeEstimate,
    loading,
    saving,
    error,
    createEstimate,
    updateEstimate,
    deleteEstimate,
    selectEstimate,
  } = useEstimates(project.id, userId);

  // Form state
  const [formData, setFormData] = useState<EstimateFormData>({
    name: "",
    materials_cost: 4500,
    labor_cost: 3200,
    permits_fees: 450,
    contingency: 315,
    notes: "",
  });

  const [contingencyPercent, setContingencyPercent] = useState(5);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shares, setShares] = useState<EstimateShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [selectedShare, setSelectedShare] = useState<EstimateShare | null>(null);

  // Load shares
  useEffect(() => {
    async function loadShares() {
      if (!organizationId) return;
      setSharesLoading(true);
      const projectShares = await getProjectShares(project.id, supabase);
      setShares(projectShares);
      setSharesLoading(false);
    }
    loadShares();
  }, [project.id, organizationId, supabase]);

  // Handle share created
  const handleShareCreated = (share: EstimateShare) => {
    setShares((prev) => [share, ...prev]);
    toast({
      title: "Share link created",
      description: "Your estimate is ready to share with the client.",
    });
  };

  // Export estimates to CSV
  const handleExportCSV = () => {
    const exportData = estimates.map((est) => ({
      project_name: project.name,
      materials_cost: est.materials_cost,
      labor_cost: est.labor_cost,
      permits_fees: est.permits_fees,
      contingency: est.contingency,
      total:
        (est.materials_cost || 0) +
        (est.labor_cost || 0) +
        (est.permits_fees || 0) +
        (est.contingency || 0),
      created_at: est.created_at,
    }));
    const csv = exportEstimatesToCSV(exportData);
    const filename = generateCSVFilename(
      `Estimates_${project.name.replace(/[^a-zA-Z0-9]/g, "_")}`
    );
    downloadCSV(csv, filename);
    toast({
      title: "Export complete",
      description: "Estimates have been exported to CSV.",
    });
  };

  // Sync form with active estimate
  useEffect(() => {
    if (activeEstimate) {
      setFormData({
        name: activeEstimate.name || "",
        materials_cost: activeEstimate.materials_cost || 0,
        labor_cost: activeEstimate.labor_cost || 0,
        permits_fees: activeEstimate.permits_fees || 0,
        contingency: activeEstimate.contingency || 0,
        notes: activeEstimate.notes || "",
      });

      // Calculate contingency percentage
      const subtotal =
        (activeEstimate.materials_cost || 0) +
        (activeEstimate.labor_cost || 0) +
        (activeEstimate.permits_fees || 0);
      if (subtotal > 0 && activeEstimate.contingency) {
        setContingencyPercent(
          Math.round((activeEstimate.contingency / subtotal) * 100)
        );
      }
    }
  }, [activeEstimate]);

  // Update contingency when percentage changes
  const handleContingencyPercentChange = (percent: number) => {
    setContingencyPercent(percent);
    const subtotal =
      formData.materials_cost + formData.labor_cost + formData.permits_fees;
    const newContingency = calculateContingencyFromPercentage(subtotal, percent);
    setFormData((prev) => ({ ...prev, contingency: newContingency }));
  };

  // Update field
  const updateField = (field: keyof EstimateFormData, value: number | string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // Recalculate contingency if cost fields change
      if (["materials_cost", "labor_cost", "permits_fees"].includes(field)) {
        const subtotal =
          (field === "materials_cost" ? (value as number) : updated.materials_cost) +
          (field === "labor_cost" ? (value as number) : updated.labor_cost) +
          (field === "permits_fees" ? (value as number) : updated.permits_fees);
        updated.contingency = calculateContingencyFromPercentage(
          subtotal,
          contingencyPercent
        );
      }
      return updated;
    });
  };

  const totalCost = calculateTotal(formData);

  // Save estimate
  const handleSave = async () => {
    if (activeEstimate) {
      const success = await updateEstimate(activeEstimate.id, formData);
      if (success) {
        toast({
          title: "Estimate saved",
          description: "Your changes have been saved successfully.",
        });
      }
    } else {
      const result = await createEstimate({
        ...formData,
        name: formData.name || `Estimate ${new Date().toLocaleDateString()}`,
      });
      if (result) {
        toast({
          title: "Estimate created",
          description: "New estimate has been saved.",
        });
      }
    }
  };

  // Create new estimate
  const handleNewEstimate = async () => {
    const newName = `Estimate ${new Date().toLocaleDateString()} - Version ${estimates.length + 1}`;
    const result = await createEstimate({
      ...formData,
      name: newName,
    });
    if (result) {
      toast({
        title: "New estimate created",
        description: `Created "${newName}"`,
      });
    }
  };

  // Delete estimate
  const handleDelete = async (estimateId: string) => {
    const success = await deleteEstimate(estimateId);
    if (success) {
      toast({
        title: "Estimate deleted",
        description: "The estimate has been removed.",
      });
    }
  };

  // Generate PDF
  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);

    try {
      // Note: 3D screenshot capture code preserved but not used
      // To re-enable, uncomment and use captureTopDownScreenshot(canvasRef, 800, 500)

      // Prepare proposal data
      const proposalData: ProposalData = {
        companyName: user?.company_name || "Metal Roofing Co.",
        companyLogoUrl: user?.company_logo_url || null,
        companyPhone: user?.company_phone || null,
        companyAddress: user?.company_address || null,
        companyEmail: user?.company_email || undefined,
        companyWebsite: user?.company_website || undefined,
        projectName: project.name,
        projectAddress: addressData?.formatted_address || project.address || "",
        squareFootage: project.square_footage || 0,
        estimateName: formData.name || "Standard Estimate",
        materialsCost: formData.materials_cost,
        laborCost: formData.labor_cost,
        permitsFees: formData.permits_fees,
        contingency: formData.contingency,
        totalCost: totalCost,
        notes: formData.notes,
        roofImageDataUrl: null, // 3D image disabled for now
        estimateDate: new Date().toLocaleDateString(),
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toLocaleDateString(),
      };

      // Generate and download PDF
      await generateAndDownloadProposal(proposalData);

      toast({
        title: "PDF Generated",
        description: "Your proposal has been downloaded.",
      });
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast({
        title: "PDF Generation Failed",
        description: err.message || "Failed to generate PDF",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <motion.div
      key="estimation"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="grid grid-cols-1 gap-6 lg:grid-cols-3"
    >
      {/* Left - Estimation Form */}
<<<<<<< HEAD
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-white/50 bg-white/80 p-8 shadow-lg backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between border-b border-neutral-200 pb-6">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                Project Estimation
              </h1>
              <p className="text-sm text-neutral-600">{project.name}</p>
              {addressData && (
                <p className="text-sm text-neutral-600">
                  {addressData.formatted_address}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-neutral-600">Estimate Date</p>
              <p className="text-sm font-medium text-neutral-900">
                {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Estimate Selector */}
          {estimates.length > 0 && (
            <div className="mb-6">
              <Label className="mb-2 block">Select Estimate Version</Label>
              <Select
                value={activeEstimate?.id || ""}
                onValueChange={(value: string) => selectEstimate(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an estimate" />
                </SelectTrigger>
                <SelectContent>
                  {estimates.map((est) => (
                    <SelectItem key={est.id} value={est.id}>
                      {est.name || "Untitled Estimate"} -{" "}
                      {new Date(est.created_at).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Estimate Name */}
          <div className="mb-6">
            <Label htmlFor="estimateName">Estimate Name</Label>
            <Input
              id="estimateName"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g., Option A - Premium Materials"
              className="mt-1"
            />
          </div>

          {/* Cost Fields */}
          <div className="space-y-4 mb-8">
            {/* Materials */}
            <div className="flex items-center justify-between py-3 border-b border-neutral-100">
              <div className="flex-1">
                <Label htmlFor="materials" className="font-medium text-neutral-900">
                  Materials
                </Label>
                <p className="text-sm text-neutral-600">
                  Standing seam panels, underlayment, fasteners
                </p>
              </div>
              <div className="w-36">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                    $
                  </span>
                  <Input
                    id="materials"
                    type="number"
                    value={formData.materials_cost}
                    onChange={(e) =>
                      updateField("materials_cost", parseFloat(e.target.value) || 0)
                    }
                    className="pl-7 text-right"
                  />
                </div>
              </div>
            </div>

            {/* Labor */}
            <div className="flex items-center justify-between py-3 border-b border-neutral-100">
              <div className="flex-1">
                <Label htmlFor="labor" className="font-medium text-neutral-900">
                  Labor
                </Label>
                <p className="text-sm text-neutral-600">
                  Installation and removal ({project.square_footage || 0} SF)
                </p>
              </div>
              <div className="w-36">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                    $
                  </span>
                  <Input
                    id="labor"
                    type="number"
                    value={formData.labor_cost}
                    onChange={(e) =>
                      updateField("labor_cost", parseFloat(e.target.value) || 0)
                    }
                    className="pl-7 text-right"
                  />
                </div>
              </div>
            </div>

            {/* Permits */}
            <div className="flex items-center justify-between py-3 border-b border-neutral-100">
              <div className="flex-1">
                <Label htmlFor="permits" className="font-medium text-neutral-900">
                  Permits & Fees
                </Label>
                <p className="text-sm text-neutral-600">
                  Building permits and inspections
                </p>
              </div>
              <div className="w-36">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                    $
                  </span>
                  <Input
                    id="permits"
                    type="number"
                    value={formData.permits_fees}
                    onChange={(e) =>
                      updateField("permits_fees", parseFloat(e.target.value) || 0)
                    }
                    className="pl-7 text-right"
                  />
                </div>
              </div>
            </div>

            {/* Contingency */}
            <div className="flex items-center justify-between py-3 border-b border-neutral-100">
              <div className="flex-1">
                <Label htmlFor="contingency" className="font-medium text-neutral-900">
                  Contingency ({contingencyPercent}%)
                </Label>
                <p className="text-sm text-neutral-600">Unforeseen conditions</p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="range"
                    min={0}
                    max={20}
                    value={contingencyPercent}
                    onChange={(e) =>
                      handleContingencyPercentChange(parseInt(e.target.value))
                    }
                    className="w-32 h-2"
                  />
                  <span className="text-xs text-neutral-500 w-12">
                    {contingencyPercent}%
                  </span>
                </div>
              </div>
              <div className="w-36">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                    $
                  </span>
                  <Input
                    id="contingency"
                    type="number"
                    value={formData.contingency}
                    onChange={(e) =>
                      updateField("contingency", parseFloat(e.target.value) || 0)
                    }
                    className="pl-7 text-right"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Project Cost</p>
                <p className="text-xs opacity-75 mt-1">Valid for 30 days</p>
              </div>
              <p className="text-4xl font-bold">${totalCost.toLocaleString()}</p>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <Label htmlFor="notes">Additional Notes</Label>
=======
      <div className="lg:col-span-2 space-y-6">
        {/* Header Card */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50/50 px-6 py-5 border-b border-emerald-100/50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-sm">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">
                    Project Estimation
                  </h1>
                  <p className="text-sm text-neutral-600 mt-0.5">{project.name}</p>
                  {addressData && (
                    <p className="text-sm text-neutral-500">
                      {addressData.formatted_address}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Estimate Date</p>
                <p className="text-sm font-semibold text-neutral-900 mt-0.5">
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Estimate Selector */}
            {estimates.length > 0 && (
              <div className="mb-6">
                <Label className="mb-2 block text-sm font-medium text-neutral-700">Select Estimate Version</Label>
                <Select
                  value={activeEstimate?.id || ""}
                  onValueChange={(value: string) => selectEstimate(value)}
                >
                  <SelectTrigger className="border-neutral-300">
                    <SelectValue placeholder="Select an estimate" />
                  </SelectTrigger>
                  <SelectContent>
                    {estimates.map((est) => (
                      <SelectItem key={est.id} value={est.id}>
                        {est.name || "Untitled Estimate"} -{" "}
                        {new Date(est.created_at).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Estimate Name */}
            <div className="mb-6">
              <Label htmlFor="estimateName" className="text-sm font-medium text-neutral-700">Estimate Name</Label>
              <Input
                id="estimateName"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g., Option A - Premium Materials"
                className="mt-1.5 border-neutral-300"
              />
            </div>
          </div>
        </div>

        {/* Cost Breakdown Card */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 px-6 py-4 border-b border-blue-100/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Cost Breakdown</h2>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Materials */}
            <CostField
              icon={Package}
              label="Materials"
              description="Standing seam panels, underlayment, fasteners"
              value={formData.materials_cost}
              onChange={(val) => updateField("materials_cost", val)}
              color="blue"
            />

            {/* Labor */}
            <CostField
              icon={Wrench}
              label="Labor"
              description={`Installation and removal (${project.square_footage || 0} SF)`}
              value={formData.labor_cost}
              onChange={(val) => updateField("labor_cost", val)}
              color="purple"
            />

            {/* Permits */}
            <CostField
              icon={ScrollText}
              label="Permits & Fees"
              description="Building permits and inspections"
              value={formData.permits_fees}
              onChange={(val) => updateField("permits_fees", val)}
              color="amber"
            />

            {/* Contingency */}
            <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shadow-sm">
                    <PercentCircle className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="contingency" className="font-semibold text-neutral-900">
                      Contingency ({contingencyPercent}%)
                    </Label>
                    <p className="text-sm text-neutral-500">Unforeseen conditions</p>
                    <div className="mt-3 flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={20}
                        value={contingencyPercent}
                        onChange={(e) =>
                          handleContingencyPercentChange(parseInt(e.target.value))
                        }
                        className="w-32 h-2 accent-slate-600"
                      />
                      <span className="text-sm font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                        {contingencyPercent}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="w-36">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                      $
                    </span>
                    <Input
                      id="contingency"
                      type="number"
                      value={formData.contingency}
                      onChange={(e) =>
                        updateField("contingency", parseFloat(e.target.value) || 0)
                      }
                      className="pl-7 text-right border-slate-300 font-semibold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 shadow-lg">
                <div>
                  <p className="text-sm font-medium text-white/90">Total Project Cost</p>
                  <p className="text-xs text-white/70 mt-0.5">Valid for 30 days</p>
                </div>
                <p className="text-4xl font-bold text-white">${totalCost.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Card */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-slate-50 to-neutral-50/50 px-6 py-4 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-200/70 flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-600" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-900">Additional Notes</h2>
            </div>
          </div>
          <div className="p-6">
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Add any special conditions, exclusions, or notes for the client..."
<<<<<<< HEAD
              className="mt-1 min-h-[100px]"
            />
          </div>

          {/* Terms */}
          <div className="rounded-xl bg-neutral-50 p-4">
            <p className="text-xs font-medium text-neutral-700 mb-2">
              Terms & Conditions
            </p>
            <p className="text-xs text-neutral-600 leading-relaxed">
              50% deposit required to begin work. Final payment due upon completion.
              Warranty: 20-year manufacturer warranty on materials, 5-year
              workmanship guarantee.
            </p>
=======
              className="min-h-[120px] border-neutral-300"
            />

            {/* Terms */}
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200/50 p-4">
              <p className="text-xs font-semibold text-amber-800 mb-1.5">
                Terms & Conditions
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                50% deposit required to begin work. Final payment due upon completion.
                Warranty: 20-year manufacturer warranty on materials, 5-year
                workmanship guarantee.
              </p>
            </div>
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
          </div>
        </div>
      </div>

      {/* Right - Actions */}
      <div className="space-y-6">
        {/* Primary Actions */}
<<<<<<< HEAD
        <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Estimation Actions
          </h3>
          <div className="space-y-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
              variant="outline"
=======
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 px-5 py-4 border-b border-blue-100/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">Quick Actions</h3>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="outline"
              className="w-full h-11 border-neutral-300 hover:bg-neutral-50"
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {activeEstimate ? "Save Changes" : "Save Estimate"}
                </>
              )}
            </Button>

            <Button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
<<<<<<< HEAD
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
=======
              className="w-full h-11 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>

            <Button
              variant="outline"
<<<<<<< HEAD
              className="w-full"
=======
              className="w-full h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300"
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
              onClick={() => setShowShareModal(true)}
              disabled={!organizationId}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Send to Client
            </Button>

            <Button
              variant="outline"
<<<<<<< HEAD
              className="w-full"
=======
              className="w-full h-11 border-neutral-300 hover:bg-neutral-50"
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
              onClick={handleExportCSV}
              disabled={estimates.length === 0}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Estimate Management */}
<<<<<<< HEAD
        <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Estimate Versions
          </h3>
          <div className="space-y-3">
            <Button
              onClick={handleNewEstimate}
              variant="outline"
              className="w-full"
=======
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50/30 px-5 py-4 border-b border-purple-100/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <History className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">Estimate Versions</h3>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <Button
              onClick={handleNewEstimate}
              variant="outline"
              className="w-full h-11 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
              disabled={saving}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Version
            </Button>

            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
              <DialogTrigger asChild>
<<<<<<< HEAD
                <Button variant="outline" className="w-full">
=======
                <Button variant="outline" className="w-full h-11 border-neutral-300">
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                  <History className="mr-2 h-4 w-4" />
                  View History ({estimates.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Estimate History</DialogTitle>
                  <DialogDescription>
                    View and manage your saved estimates
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {estimates.length === 0 ? (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      No saved estimates yet
                    </p>
                  ) : (
                    estimates.map((est) => (
                      <div
                        key={est.id}
<<<<<<< HEAD
                        className={`p-4 rounded-lg border ${
                          activeEstimate?.id === est.id
                            ? "border-blue-500 bg-blue-50"
=======
                        className={`p-4 rounded-xl border ${
                          activeEstimate?.id === est.id
                            ? "border-blue-300 bg-blue-50"
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                            : "border-neutral-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
<<<<<<< HEAD
                            <p className="font-medium text-neutral-900">
                              {est.name || "Untitled Estimate"}
                            </p>
                            <p className="text-xs text-neutral-500">
                              Created: {new Date(est.created_at).toLocaleString()}
                            </p>
                            <p className="text-sm font-medium text-neutral-700 mt-1">
                              Total: $
=======
                            <p className="font-semibold text-neutral-900">
                              {est.name || "Untitled Estimate"}
                            </p>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              Created: {new Date(est.created_at).toLocaleString()}
                            </p>
                            <p className="text-sm font-semibold text-emerald-600 mt-1">
                              $
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                              {(
                                (est.materials_cost || 0) +
                                (est.labor_cost || 0) +
                                (est.permits_fees || 0) +
                                (est.contingency || 0)
                              ).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeEstimate?.id !== est.id && (
                              <Button
                                size="sm"
                                variant="outline"
<<<<<<< HEAD
=======
                                className="border-blue-200 text-blue-600 hover:bg-blue-50"
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                                onClick={() => {
                                  selectEstimate(est.id);
                                  setShowHistoryDialog(false);
                                }}
                              >
                                Load
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(est.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Company Branding Status */}
<<<<<<< HEAD
        <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            PDF Branding
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Company Logo</span>
              <Badge variant={user?.company_logo_url ? "default" : "secondary"}>
                {user?.company_logo_url ? "Set" : "Not Set"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Company Name</span>
              <Badge variant={user?.company_name ? "default" : "secondary"}>
                {user?.company_name ? "Set" : "Not Set"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Phone</span>
              <Badge variant={user?.company_phone ? "default" : "secondary"}>
                {user?.company_phone ? "Set" : "Not Set"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Email</span>
              <Badge variant={user?.company_email ? "default" : "secondary"}>
                {user?.company_email ? "Set" : "Not Set"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Website</span>
              <Badge variant={user?.company_website ? "default" : "secondary"}>
                {user?.company_website ? "Set" : "Not Set"}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-3">
              Configure your company branding in{" "}
              <a href="/settings" className="text-blue-600 hover:underline">
=======
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-slate-50 to-neutral-50/50 px-5 py-4 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-200/70 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-slate-600" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">PDF Branding</h3>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <BrandingRow label="Company Logo" isSet={!!user?.company_logo_url} />
            <BrandingRow label="Company Name" isSet={!!user?.company_name} />
            <BrandingRow label="Phone" isSet={!!user?.company_phone} />
            <BrandingRow label="Email" isSet={!!user?.company_email} />
            <BrandingRow label="Website" isSet={!!user?.company_website} />
            <p className="text-xs text-neutral-500 pt-2 border-t border-neutral-100 mt-3">
              Configure branding in{" "}
              <a href="/settings" className="text-blue-600 hover:underline font-medium">
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                Settings
              </a>
            </p>
          </div>
        </div>

        {/* Payment Status */}
<<<<<<< HEAD
        <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Payment Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Deposit (50%)</span>
              <Badge variant={project.payment_completed ? "default" : "secondary"}>
                {project.payment_completed ? "Paid" : "Pending"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Final Payment</span>
              <Badge variant="secondary">Pending</Badge>
=======
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          <div className={`px-5 py-4 border-b ${
            project.payment_completed
              ? "bg-gradient-to-r from-emerald-50 to-green-50/50 border-emerald-100/50"
              : "bg-gradient-to-r from-amber-50 to-yellow-50/50 border-amber-100/50"
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                project.payment_completed ? "bg-emerald-100" : "bg-amber-100"
              }`}>
                <DollarSign className={`w-4 h-4 ${
                  project.payment_completed ? "text-emerald-600" : "text-amber-600"
                }`} />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900">Payment Status</h3>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
              <span className="text-sm text-neutral-600">Deposit (50%)</span>
              <Badge className={project.payment_completed
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-amber-100 text-amber-700 border-amber-200"
              }>
                {project.payment_completed ? "Paid" : "Pending"}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
              <span className="text-sm text-neutral-600">Final Payment</span>
              <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200">Pending</Badge>
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
            </div>
          </div>
        </div>

        {/* Client Responses & Share History */}
<<<<<<< HEAD
        <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Client Responses
          </h3>

          {sharesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          ) : shares.length === 0 ? (
            <div className="text-center py-6">
              <Share2 className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No estimates shared yet</p>
              <p className="text-xs text-neutral-400 mt-1">
                Use "Send to Client" to share
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Show approved estimates first with highlight */}
              {shares.filter(s => s.status === "approved").length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-2">
                    Approved
                  </p>
                  {shares.filter(s => s.status === "approved").map((share) => (
                    <button
                      key={share.id}
                      onClick={() => setSelectedShare(share)}
                      className="w-full text-left p-3 rounded-lg bg-green-50 border border-green-200 hover:bg-green-100 transition-colors mb-2"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-green-900">
                            {share.client_name || share.client_email || "Client"}
                          </p>
                          <p className="text-xs text-green-700">
                            Approved {share.approved_at ? new Date(share.approved_at).toLocaleDateString() : ""}
                          </p>
                          {share.signature_data?.image && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              Signature captured
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-green-600">View</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Show pending/viewed/rejected */}
              {shares.filter(s => s.status !== "approved").length > 0 && (
                <div>
                  {shares.filter(s => s.status === "approved").length > 0 && (
                    <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                      Other
                    </p>
                  )}
                  {shares.filter(s => s.status !== "approved").slice(0, 5).map((share) => (
                    <button
                      key={share.id}
                      onClick={() => setSelectedShare(share)}
                      className={`w-full text-left p-3 rounded-lg border hover:bg-neutral-50 transition-colors mb-2 ${
                        share.status === "rejected"
                          ? "bg-red-50 border-red-200"
                          : "bg-white border-neutral-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {share.client_name || share.client_email || "Unnamed"}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-neutral-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {share.view_count}
                            </span>
                            <span>
                              {new Date(share.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getShareStatusColor(
                            share.status
                          )}`}
                        >
                          {getShareStatusLabel(share.status)}
                        </span>
                      </div>
                    </button>
                  ))}
                  {shares.filter(s => s.status !== "approved").length > 5 && (
                    <p className="text-xs text-neutral-500 text-center pt-1">
                      +{shares.filter(s => s.status !== "approved").length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
=======
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50/50 px-5 py-4 border-b border-indigo-100/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">Client Responses</h3>
              </div>
              {shares.filter(s => s.status === "approved").length > 0 && (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  {shares.filter(s => s.status === "approved").length} Approved
                </Badge>
              )}
            </div>
          </div>

          <div className="p-5">
            {sharesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
              </div>
            ) : shares.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
                  <Share2 className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-600">No estimates shared yet</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Use "Send to Client" to share
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show approved estimates first with highlight */}
                {shares.filter(s => s.status === "approved").length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                      Approved
                    </p>
                    {shares.filter(s => s.status === "approved").map((share) => (
                      <button
                        key={share.id}
                        onClick={() => setSelectedShare(share)}
                        className="w-full text-left p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50/50 border border-emerald-200 hover:border-emerald-300 transition-colors mb-2"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-emerald-900">
                              {share.client_name || share.client_email || "Client"}
                            </p>
                            <p className="text-xs text-emerald-700">
                              Approved {share.approved_at ? new Date(share.approved_at).toLocaleDateString() : ""}
                            </p>
                            {(share.signature_data as any)?.image && (
                              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Signature captured
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">View</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Show pending/viewed/rejected */}
                {shares.filter(s => s.status !== "approved").length > 0 && (
                  <div>
                    {shares.filter(s => s.status === "approved").length > 0 && (
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                        Other
                      </p>
                    )}
                    {shares.filter(s => s.status !== "approved").slice(0, 5).map((share) => (
                      <button
                        key={share.id}
                        onClick={() => setSelectedShare(share)}
                        className={`w-full text-left p-4 rounded-xl border hover:shadow-sm transition-all mb-2 ${
                          share.status === "rejected"
                            ? "bg-red-50/50 border-red-200 hover:border-red-300"
                            : "bg-white border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-900 truncate">
                              {share.client_name || share.client_email || "Unnamed"}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                {share.view_count}
                              </span>
                              <span>
                                {new Date(share.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${getShareStatusColor(
                              share.status
                            )}`}
                          >
                            {getShareStatusLabel(share.status)}
                          </span>
                        </div>
                      </button>
                    ))}
                    {shares.filter(s => s.status !== "approved").length > 5 && (
                      <p className="text-xs text-neutral-500 text-center pt-2">
                        +{shares.filter(s => s.status !== "approved").length - 5} more
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && organizationId && (
        <ShareEstimateModal
          projectId={project.id}
          projectName={project.name}
          organizationId={organizationId}
          onClose={() => setShowShareModal(false)}
          onShareCreated={handleShareCreated}
        />
      )}

      {/* Share Details Dialog */}
      {selectedShare && (
        <ShareDetailsDialog
          share={selectedShare}
          isOpen={!!selectedShare}
          onClose={() => setSelectedShare(null)}
        />
      )}
    </motion.div>
  );
}
<<<<<<< HEAD
=======

// Cost Field Component
function CostField({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  color,
}: {
  icon: any;
  label: string;
  description: string;
  value: number;
  onChange: (val: number) => void;
  color: "blue" | "purple" | "amber";
}) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50/70",
      icon: "bg-blue-100 text-blue-600",
      border: "border-blue-100",
    },
    purple: {
      bg: "bg-purple-50/70",
      icon: "bg-purple-100 text-purple-600",
      border: "border-purple-100",
    },
    amber: {
      bg: "bg-amber-50/70",
      icon: "bg-amber-100 text-amber-600",
      border: "border-amber-100",
    },
  };

  const styles = colorClasses[color];

  return (
    <div className={`p-4 rounded-xl ${styles.bg} border ${styles.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${styles.icon} shadow-sm`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <Label className="font-semibold text-neutral-900">{label}</Label>
            <p className="text-sm text-neutral-500">{description}</p>
          </div>
        </div>
        <div className="w-36">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
              $
            </span>
            <Input
              type="number"
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              className="pl-7 text-right border-neutral-300 bg-white font-semibold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Branding Row Component
function BrandingRow({ label, isSet }: { label: string; isSet: boolean }) {
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50/70">
      <span className="text-sm text-neutral-600">{label}</span>
      <Badge className={isSet
        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
        : "bg-neutral-100 text-neutral-500 border-neutral-200"
      }>
        {isSet ? "Set" : "Not Set"}
      </Badge>
    </div>
  );
}
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
