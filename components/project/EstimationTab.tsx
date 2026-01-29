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
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Add any special conditions, exclusions, or notes for the client..."
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
          </div>
        </div>
      </div>

      {/* Right - Actions */}
      <div className="space-y-6">
        {/* Primary Actions */}
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
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
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
              className="w-full"
              onClick={() => setShowShareModal(true)}
              disabled={!organizationId}
            >
              <Share2 className="mr-2 h-4 w-4" />
              Send to Client
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleExportCSV}
              disabled={estimates.length === 0}
            >
              <FileText className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Estimate Management */}
        <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            Estimate Versions
          </h3>
          <div className="space-y-3">
            <Button
              onClick={handleNewEstimate}
              variant="outline"
              className="w-full"
              disabled={saving}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Version
            </Button>

            <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
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
                        className={`p-4 rounded-lg border ${
                          activeEstimate?.id === est.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-neutral-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-neutral-900">
                              {est.name || "Untitled Estimate"}
                            </p>
                            <p className="text-xs text-neutral-500">
                              Created: {new Date(est.created_at).toLocaleString()}
                            </p>
                            <p className="text-sm font-medium text-neutral-700 mt-1">
                              Total: $
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
                Settings
              </a>
            </p>
          </div>
        </div>

        {/* Payment Status */}
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
            </div>
          </div>
        </div>

        {/* Client Responses & Share History */}
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
