"use client";

/**
 * SHARE DETAILS DIALOG
 *
 * Full-screen modal showing comprehensive estimate share details:
 * - Client info and approval status
 * - Full itemized estimate breakdown
 * - Project details and measurements
 * - Signature capture (if approved)
 * - Client messages/feedback
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  User,
  Calendar,
  FileSignature,
  MapPin,
  Ruler,
  DollarSign,
  FileText,
  Package,
  Wrench,
  ClipboardList,
  X,
  Loader2,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  type EstimateShare,
  getShareStatusColor,
  getShareStatusLabel,
} from "@/lib/estimate-sharing";
import { useToast } from "@/hooks/use-toast";

interface EstimateResponse {
  id: string;
  response_type: "question" | "comment" | "approval" | "rejection";
  message: string | null;
  signature_data: any | null;
  client_name: string | null;
  created_at: string;
}

interface EstimateData {
  id: string;
  name: string | null;
  materials_cost: number | null;
  labor_cost: number | null;
  permits_fees: number | null;
  contingency: number | null;
  notes: string | null;
}

interface ProjectData {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  square_footage: number | null;
  roof_data: any | null;
}

interface ShareDetailsDialogProps {
  share: EstimateShare;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDetailsDialog({
  share,
  isOpen,
  onClose,
}: ShareDetailsDialogProps) {
  const { toast } = useToast();
  const supabase = getSupabaseBrowserClient();
  const [responses, setResponses] = useState<EstimateResponse[]>([]);
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load all data for this share
  useEffect(() => {
    async function loadData() {
      if (!isOpen) return;
      setLoading(true);

      try {
        // Load responses, project, and estimate in parallel
        const [responsesRes, projectRes, estimateRes] = await Promise.all([
          supabase
            .from("estimate_responses")
            .select("*")
            .eq("share_id", share.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("projects")
            .select("id, name, address, city, state, postal_code, square_footage, roof_data")
            .eq("id", share.project_id)
            .single(),
          supabase
            .from("project_estimates")
            .select("*")
            .eq("project_id", share.project_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single(),
        ]);

        if (responsesRes.data) {
          setResponses(responsesRes.data as EstimateResponse[]);
        }
        if (projectRes.data) {
          setProject(projectRes.data as ProjectData);
        }
        if (estimateRes.data) {
          setEstimate(estimateRes.data as EstimateData);
        }
      } catch (err) {
        console.error("Failed to load share details:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [share.id, share.project_id, isOpen, supabase]);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/estimate/${share.share_token}`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied",
      description: "Share link copied to clipboard",
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString();
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "$0";
    return `$${amount.toLocaleString()}`;
  };

  // Calculate total
  const totalCost = estimate
    ? (estimate.materials_cost || 0) +
      (estimate.labor_cost || 0) +
      (estimate.permits_fees || 0) +
      (estimate.contingency || 0)
    : 0;

  // Get signature image from share or responses
  const signatureImage =
    share.signature_data?.image ||
    responses.find((r) => r.response_type === "approval")?.signature_data?.image;

  // Get roof panels count from roof_data if available
  const roofData = project?.roof_data as any;
  const panelCount = roofData?.panels?.length || roofData?.panelCount || null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold">
                Estimate Share Details
              </DialogTitle>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getShareStatusColor(
                  share.status
                )}`}
              >
                {getShareStatusLabel(share.status)}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          {project && (
            <p className="text-sm text-neutral-500 mt-1">
              {project.name} • {project.address ? `${project.city}, ${project.state}` : "No address"}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
          ) : (
            <div className="p-6">
              {/* Approved Banner */}
              {share.status === "approved" && (
                <div className="mb-6 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">Estimate Approved!</h3>
                      <p className="text-green-100 mt-1">
                        {share.client_name || "Client"} approved this estimate on{" "}
                        {share.approved_at
                          ? new Date(share.approved_at).toLocaleDateString()
                          : ""}
                      </p>
                    </div>
                    {signatureImage && (
                      <div className="bg-white rounded-lg p-2">
                        <img
                          src={signatureImage}
                          alt="Signature"
                          className="h-16 w-auto"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Estimate Details */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Project Info Card */}
                  {project && (
                    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                        <h4 className="font-semibold text-neutral-900 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-neutral-500" />
                          Project Details
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wide">
                              Project Name
                            </p>
                            <p className="font-medium text-neutral-900">{project.name}</p>
                          </div>
                          {project.address && (
                            <div>
                              <p className="text-xs text-neutral-500 uppercase tracking-wide">
                                Address
                              </p>
                              <p className="text-neutral-900">
                                {project.address}
                                <br />
                                <span className="text-neutral-600">
                                  {project.city}, {project.state} {project.postal_code}
                                </span>
                              </p>
                            </div>
                          )}
                          {project.square_footage && (
                            <div>
                              <p className="text-xs text-neutral-500 uppercase tracking-wide">
                                Roof Area
                              </p>
                              <p className="font-medium text-neutral-900 flex items-center gap-1">
                                <Ruler className="h-4 w-4 text-blue-500" />
                                {project.square_footage.toLocaleString()} sq ft
                              </p>
                            </div>
                          )}
                          {panelCount && (
                            <div>
                              <p className="text-xs text-neutral-500 uppercase tracking-wide">
                                Roof Panels
                              </p>
                              <p className="font-medium text-neutral-900 flex items-center gap-1">
                                <Package className="h-4 w-4 text-purple-500" />
                                {panelCount} panels
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Itemized Estimate */}
                  {estimate && (
                    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                        <h4 className="font-semibold text-neutral-900 flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-neutral-500" />
                          Itemized Estimate
                        </h4>
                      </div>
                      <div className="divide-y divide-neutral-100">
                        {/* Materials */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900">Materials</p>
                              <p className="text-sm text-neutral-500">
                                Standing seam panels, underlayment, fasteners
                              </p>
                            </div>
                          </div>
                          <p className="text-lg font-semibold text-neutral-900">
                            {formatCurrency(estimate.materials_cost)}
                          </p>
                        </div>

                        {/* Labor */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                              <Wrench className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900">Labor</p>
                              <p className="text-sm text-neutral-500">
                                Installation and removal
                              </p>
                            </div>
                          </div>
                          <p className="text-lg font-semibold text-neutral-900">
                            {formatCurrency(estimate.labor_cost)}
                          </p>
                        </div>

                        {/* Permits */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900">Permits & Fees</p>
                              <p className="text-sm text-neutral-500">
                                Building permits and inspections
                              </p>
                            </div>
                          </div>
                          <p className="text-lg font-semibold text-neutral-900">
                            {formatCurrency(estimate.permits_fees)}
                          </p>
                        </div>

                        {/* Contingency */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-neutral-600" />
                            </div>
                            <div>
                              <p className="font-medium text-neutral-900">Contingency</p>
                              <p className="text-sm text-neutral-500">
                                Unforeseen conditions
                              </p>
                            </div>
                          </div>
                          <p className="text-lg font-semibold text-neutral-900">
                            {formatCurrency(estimate.contingency)}
                          </p>
                        </div>

                        {/* Total */}
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-indigo-600">
                          <p className="text-lg font-semibold text-white">Total</p>
                          <p className="text-2xl font-bold text-white">
                            {formatCurrency(totalCost)}
                          </p>
                        </div>
                      </div>

                      {/* Estimate Notes */}
                      {estimate.notes && (
                        <div className="p-4 bg-neutral-50 border-t border-neutral-200">
                          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">
                            Notes
                          </p>
                          <p className="text-sm text-neutral-700">{estimate.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Client Messages */}
                  {responses.length > 0 && (
                    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                        <h4 className="font-semibold text-neutral-900 flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-neutral-500" />
                          Client Responses ({responses.length})
                        </h4>
                      </div>
                      <div className="p-4 space-y-3">
                        {responses.map((response) => (
                          <div
                            key={response.id}
                            className={`p-4 rounded-lg border ${
                              response.response_type === "approval"
                                ? "bg-green-50 border-green-200"
                                : response.response_type === "rejection"
                                ? "bg-red-50 border-red-200"
                                : "bg-white border-neutral-200"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant={
                                  response.response_type === "approval"
                                    ? "default"
                                    : response.response_type === "rejection"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {response.response_type === "approval"
                                  ? "Approved"
                                  : response.response_type === "rejection"
                                  ? "Changes Requested"
                                  : response.response_type === "question"
                                  ? "Question"
                                  : "Comment"}
                              </Badge>
                              <span className="text-xs text-neutral-500">
                                {formatDate(response.created_at)}
                              </span>
                            </div>
                            {response.message && (
                              <p className="text-neutral-700">{response.message}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Client & Status */}
                <div className="space-y-6">
                  {/* Client Info */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                      <h4 className="font-semibold text-neutral-900 flex items-center gap-2">
                        <User className="h-4 w-4 text-neutral-500" />
                        Client Information
                      </h4>
                    </div>
                    <div className="p-4 space-y-3">
                      {share.client_name && (
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-neutral-400" />
                          <span className="font-medium">{share.client_name}</span>
                        </div>
                      )}
                      {share.client_email && (
                        <div className="flex items-center gap-3">
                          <Mail className="h-5 w-5 text-neutral-400" />
                          <a
                            href={`mailto:${share.client_email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {share.client_email}
                          </a>
                        </div>
                      )}
                      {share.client_phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-5 w-5 text-neutral-400" />
                          <a
                            href={`tel:${share.client_phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            {share.client_phone}
                          </a>
                        </div>
                      )}
                      {!share.client_name && !share.client_email && !share.client_phone && (
                        <p className="text-neutral-500">No client info provided</p>
                      )}
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                      <h4 className="font-semibold text-neutral-900 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-neutral-500" />
                        Timeline
                      </h4>
                    </div>
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Shared</p>
                          <p className="text-xs text-neutral-500">
                            {formatDate(share.created_at)}
                          </p>
                        </div>
                      </div>

                      {share.view_count > 0 && (
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                            <Eye className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              Viewed {share.view_count}x
                            </p>
                            <p className="text-xs text-neutral-500">
                              Last: {formatDate(share.last_viewed_at)}
                            </p>
                          </div>
                        </div>
                      )}

                      {share.status === "approved" && (
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-700">Approved</p>
                            <p className="text-xs text-neutral-500">
                              {formatDate(share.approved_at)}
                            </p>
                          </div>
                        </div>
                      )}

                      {share.status === "rejected" && (
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-red-700">
                              Changes Requested
                            </p>
                            <p className="text-xs text-neutral-500">
                              {formatDate(share.rejected_at)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signature */}
                  {share.status === "approved" && signatureImage && (
                    <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
                      <div className="px-4 py-3 bg-green-100 border-b border-green-200">
                        <h4 className="font-semibold text-green-900 flex items-center gap-2">
                          <FileSignature className="h-4 w-4" />
                          Client Signature
                        </h4>
                      </div>
                      <div className="p-4">
                        <div className="bg-white rounded-lg p-3 border border-green-100">
                          <img
                            src={signatureImage}
                            alt="Client signature"
                            className="w-full h-auto"
                          />
                        </div>
                        <p className="text-xs text-green-700 mt-2 text-center">
                          Signed on {formatDate(share.approved_at)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Share Link */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                      <h4 className="font-semibold text-neutral-900">Share Link</h4>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="flex-1 text-xs bg-neutral-100 p-2 rounded border border-neutral-200 truncate block">
                          {shareUrl}
                        </code>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={copyLink} className="flex-1">
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(shareUrl, "_blank")}
                          className="flex-1"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open
                        </Button>
                      </div>
                      {share.expires_at && (
                        <p className="text-xs text-neutral-500 mt-2">
                          Expires: {formatDate(share.expires_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {share.notes && (
                    <div className="rounded-xl border border-neutral-200 bg-white p-4">
                      <h4 className="font-semibold text-neutral-900 mb-2">Notes</h4>
                      <p className="text-sm text-neutral-600">{share.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
