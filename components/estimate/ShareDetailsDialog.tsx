"use client";

/**
 * SHARE DETAILS DIALOG - OVERHAULED
 *
 * Comprehensive estimate share details with:
 * - Client info and approval status
 * - Email OTP verification status (REQUIRED before signing)
 * - IP logging and evidence timeline
 * - Geolocation tracking
 * - Device fingerprinting
 * - Full itemized estimate breakdown
 * - Signature capture display
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Shield,
  Globe,
  Monitor,
  AlertTriangle,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Activity,
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  type EstimateShare,
  getShareStatusColor,
  getShareStatusLabel,
} from "@/lib/estimate-sharing";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

interface EvidenceEvent {
  id: string;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  referrer: string | null;
  geo: {
    country?: string;
    region?: string;
    city?: string;
    lat?: number;
    lon?: number;
    isp?: string;
    asn?: string;
  } | null;
  metadata: Record<string, any>;
  created_at: string;
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
  const [evidence, setEvidence] = useState<EvidenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Load all data for this share
  useEffect(() => {
    async function loadData() {
      if (!isOpen) return;
      setLoading(true);

      try {
        // Load responses, project, estimate, and evidence in parallel
        const [responsesRes, projectRes, estimateRes, evidenceRes] = await Promise.all([
          (supabase.from("estimate_responses") as any)
            .select("*")
            .eq("share_id", share.id)
            .order("created_at", { ascending: false }),
          (supabase.from("projects") as any)
            .select("id, name, address, city, state, postal_code, square_footage, roof_data")
            .eq("id", share.project_id)
            .single(),
          (supabase.from("project_estimates") as any)
            .select("*")
            .eq("project_id", share.project_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single(),
          (supabase.from("estimate_signature_evidence") as any)
            .select("*")
            .eq("share_id", share.id)
            .order("created_at", { ascending: true }),
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
        if (evidenceRes.data) {
          setEvidence(evidenceRes.data as EvidenceEvent[]);
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
    share.signature_data?.data ||
    responses.find((r) => r.response_type === "approval")?.signature_data?.image ||
    responses.find((r) => r.response_type === "approval")?.signature_data?.data;

  // Get roof panels count from roof_data if available
  const roofData = project?.roof_data as any;
  const panelCount = roofData?.panels?.length || roofData?.panelCount || null;

  // Evidence summary
  const uniqueIPs = new Set(evidence.filter(e => e.ip_address).map(e => e.ip_address)).size;
  const emailVerifiedEvent = evidence.find(e => e.event_type === "email_otp_verified");
  const signedEvent = evidence.find(e => e.event_type === "signed" || e.event_type === "approved");
  const viewEvents = evidence.filter(e => e.event_type === "viewed");

  // Check for geo anomalies
  const geoAnomalies: string[] = [];
  const countries = new Set(evidence.filter(e => e.geo?.country).map(e => e.geo?.country));
  if (countries.size > 1) {
    geoAnomalies.push(`Multiple countries detected: ${Array.from(countries).join(", ")}`);
  }

  const toggleEventExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "viewed": return <Eye className="w-4 h-4 text-blue-600" />;
      case "sms_sent": return <Phone className="w-4 h-4 text-purple-600" />;
      case "sms_verified": return <Shield className="w-4 h-4 text-green-600" />;
      case "sms_failed": return <XCircle className="w-4 h-4 text-red-600" />;
      case "email_otp_sent": return <Mail className="w-4 h-4 text-purple-600" />;
      case "email_otp_verified": return <Shield className="w-4 h-4 text-green-600" />;
      case "email_otp_failed": return <XCircle className="w-4 h-4 text-red-600" />;
      case "signed": return <FileSignature className="w-4 h-4 text-green-600" />;
      case "approved": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "rejected": return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-neutral-400" />;
    }
  };

  const getEventLabel = (eventType: string) => {
    switch (eventType) {
      case "viewed": return "Estimate Viewed";
      case "sms_sent": return "SMS Code Sent";
      case "sms_verified": return "Phone Verified";
      case "sms_failed": return "SMS Verification Failed";
      case "email_otp_sent": return "Email Code Sent";
      case "email_otp_verified": return "Email Verified";
      case "email_otp_failed": return "Email Verification Failed";
      case "signed": return "Document Signed";
      case "approved": return "Estimate Approved";
      case "rejected": return "Estimate Rejected";
      default: return eventType;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-semibold">
                Estimate Share Details
              </DialogTitle>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getShareStatusColor(share.status)}`}
              >
                {getShareStatusLabel(share.status)}
              </span>
              {/* OTP Verification Badge */}
              {share.email_verification_required && (
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                  share.email_verified_at
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700"
                )}>
                  {share.email_verified_at ? (
                    <>
                      <Lock className="w-3 h-3" />
                      Email Verified
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3" />
                      Email Pending
                    </>
                  )}
                </span>
              )}
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
                        {share.approved_at ? new Date(share.approved_at).toLocaleDateString() : ""}
                      </p>
                      {share.email_verified_at && (
                        <div className="flex items-center gap-2 mt-2 text-green-100">
                          <Shield className="w-4 h-4" />
                          <span className="text-sm">Email verified via OTP before signing</span>
                        </div>
                      )}
                    </div>
                    {signatureImage && (
                      <div className="bg-white rounded-lg p-2">
                        <img src={signatureImage} alt="Signature" className="h-16 w-auto" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* OTP Required but Not Verified Warning */}
              {share.email_verification_required && !share.email_verified_at && share.status !== "approved" && share.status !== "rejected" && (
                <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-900">Email Verification Required</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        The client must verify their email address via OTP before they can sign this estimate.
                        This provides additional security and evidence for the signature.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="messages" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Messages
                    {responses.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {responses.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Estimate Details */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <QuickStat
                          label="Views"
                          value={share.view_count?.toString() || "0"}
                          icon={<Eye className="w-4 h-4 text-blue-600" />}
                        />
                        <QuickStat
                          label="Email Verified"
                          value={share.email_verified_at ? "Yes" : "No"}
                          icon={<Mail className="w-4 h-4 text-purple-600" />}
                          valueClass={share.email_verified_at ? "text-green-600" : "text-amber-600"}
                        />
                        <QuickStat
                          label="Unique IPs"
                          value={uniqueIPs.toString()}
                          icon={<Globe className="w-4 h-4 text-slate-600" />}
                          valueClass={uniqueIPs > 3 ? "text-amber-600" : ""}
                        />
                        <QuickStat
                          label="Events"
                          value={evidence.length.toString()}
                          icon={<Activity className="w-4 h-4 text-indigo-600" />}
                        />
                      </div>

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
                                <p className="text-xs text-neutral-500 uppercase tracking-wide">Project Name</p>
                                <p className="font-medium text-neutral-900">{project.name}</p>
                              </div>
                              {project.address && (
                                <div>
                                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Address</p>
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
                                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Roof Area</p>
                                  <p className="font-medium text-neutral-900 flex items-center gap-1">
                                    <Ruler className="h-4 w-4 text-blue-500" />
                                    {project.square_footage.toLocaleString()} sq ft
                                  </p>
                                </div>
                              )}
                              {panelCount && (
                                <div>
                                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Roof Panels</p>
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
                            <EstimateLineItem
                              icon={<Package className="h-5 w-5 text-blue-600" />}
                              iconBg="bg-blue-100"
                              label="Materials"
                              description="Standing seam panels, underlayment, fasteners"
                              amount={estimate.materials_cost}
                            />
                            <EstimateLineItem
                              icon={<Wrench className="h-5 w-5 text-purple-600" />}
                              iconBg="bg-purple-100"
                              label="Labor"
                              description="Installation and removal"
                              amount={estimate.labor_cost}
                            />
                            <EstimateLineItem
                              icon={<FileText className="h-5 w-5 text-amber-600" />}
                              iconBg="bg-amber-100"
                              label="Permits & Fees"
                              description="Building permits and inspections"
                              amount={estimate.permits_fees}
                            />
                            <EstimateLineItem
                              icon={<DollarSign className="h-5 w-5 text-neutral-600" />}
                              iconBg="bg-neutral-100"
                              label="Contingency"
                              description="Unforeseen conditions"
                              amount={estimate.contingency}
                            />
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-indigo-600">
                              <p className="text-lg font-semibold text-white">Total</p>
                              <p className="text-2xl font-bold text-white">{formatCurrency(totalCost)}</p>
                            </div>
                          </div>
                          {estimate.notes && (
                            <div className="p-4 bg-neutral-50 border-t border-neutral-200">
                              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Notes</p>
                              <p className="text-sm text-neutral-700">{estimate.notes}</p>
                            </div>
                          )}
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
                              <a href={`mailto:${share.client_email}`} className="text-blue-600 hover:underline">
                                {share.client_email}
                              </a>
                            </div>
                          )}
                          {share.client_phone && (
                            <div className="flex items-center gap-3">
                              <Phone className="h-5 w-5 text-neutral-400" />
                              <a href={`tel:${share.client_phone}`} className="text-blue-600 hover:underline">
                                {share.client_phone}
                              </a>
                            </div>
                          )}
                          {share.client_email && share.email_verified_at && (
                            <div className="flex items-center gap-2 ml-8">
                              <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Email Verified
                              </Badge>
                            </div>
                          )}
                          {!share.client_name && !share.client_email && !share.client_phone && (
                            <p className="text-neutral-500">No client info provided</p>
                          )}
                        </div>
                      </div>

                      {/* Verification Status */}
                      <div className={cn(
                        "rounded-xl border overflow-hidden",
                        share.email_verified_at
                          ? "border-green-200 bg-green-50"
                          : share.email_verification_required
                          ? "border-amber-200 bg-amber-50"
                          : "border-neutral-200 bg-neutral-50"
                      )}>
                        <div className={cn(
                          "px-4 py-3 border-b",
                          share.email_verified_at
                            ? "bg-green-100 border-green-200"
                            : share.email_verification_required
                            ? "bg-amber-100 border-amber-200"
                            : "bg-neutral-100 border-neutral-200"
                        )}>
                          <h4 className={cn(
                            "font-semibold flex items-center gap-2",
                            share.email_verified_at
                              ? "text-green-900"
                              : share.email_verification_required
                              ? "text-amber-900"
                              : "text-neutral-900"
                          )}>
                            <Shield className="h-4 w-4" />
                            Email Verification
                          </h4>
                        </div>
                        <div className="p-4">
                          {share.email_verified_at ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-green-700">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-medium">Email Verified</span>
                              </div>
                              <p className="text-xs text-green-600">
                                Verified on {formatDate(share.email_verified_at)}
                              </p>
                            </div>
                          ) : share.email_verification_required ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-amber-700">
                                <Clock className="w-5 h-5" />
                                <span className="font-medium">Awaiting Verification</span>
                              </div>
                              <p className="text-xs text-amber-600">
                                Client must verify email via OTP before signing
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-neutral-600">
                                Email verification was not required for this share
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                        <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                          <h4 className="font-semibold text-neutral-900 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-neutral-500" />
                            Timeline
                          </h4>
                        </div>
                        <div className="p-4 space-y-4">
                          <TimelineItem
                            icon={<Calendar className="h-4 w-4 text-blue-600" />}
                            iconBg="bg-blue-100"
                            label="Shared"
                            date={share.created_at}
                          />
                          {share.view_count > 0 && (
                            <TimelineItem
                              icon={<Eye className="h-4 w-4 text-yellow-600" />}
                              iconBg="bg-yellow-100"
                              label={`Viewed ${share.view_count}x`}
                              date={share.last_viewed_at}
                              sublabel="Last view"
                            />
                          )}
                          {share.email_verified_at && (
                            <TimelineItem
                              icon={<Shield className="h-4 w-4 text-purple-600" />}
                              iconBg="bg-purple-100"
                              label="Email Verified"
                              date={share.email_verified_at}
                            />
                          )}
                          {share.status === "approved" && (
                            <TimelineItem
                              icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
                              iconBg="bg-green-100"
                              label="Approved"
                              date={share.approved_at}
                              labelClass="text-green-700"
                            />
                          )}
                          {share.status === "rejected" && (
                            <TimelineItem
                              icon={<XCircle className="h-4 w-4 text-red-600" />}
                              iconBg="bg-red-100"
                              label="Changes Requested"
                              date={share.rejected_at}
                              labelClass="text-red-700"
                            />
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
                              <img src={signatureImage} alt="Client signature" className="w-full h-auto" />
                            </div>
                            <p className="text-xs text-green-700 mt-2 text-center">
                              Signed on {formatDate(share.approved_at)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* IP & Device Info - Visible when signed */}
                      {(share.status === "approved" || share.status === "rejected") && share.signed_ip_address && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                          <div className="px-4 py-3 bg-slate-100 border-b border-slate-200">
                            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              Signing Details
                            </h4>
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="flex items-start gap-3">
                              <Monitor className="h-5 w-5 text-slate-400 mt-0.5" />
                              <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide">Client IP Address</p>
                                <p className="font-mono text-sm text-slate-900">{share.signed_ip_address}</p>
                              </div>
                            </div>
                            {share.signed_user_agent && (
                              <div className="flex items-start gap-3">
                                <Fingerprint className="h-5 w-5 text-slate-400 mt-0.5" />
                                <div>
                                  <p className="text-xs text-slate-500 uppercase tracking-wide">Device / Browser</p>
                                  <p className="text-xs text-slate-700 break-all">{share.signed_user_agent}</p>
                                </div>
                              </div>
                            )}
                            <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                              IP and device information captured when client signed the estimate
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
                    </div>
                  </div>
                </TabsContent>

                {/* Messages Tab */}
                <TabsContent value="messages" className="mt-0">
                  {responses.length === 0 ? (
                    <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
                      <MessageSquare className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                      <p className="text-neutral-500">No client messages yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {responses.map((response) => (
                        <div
                          key={response.id}
                          className={cn(
                            "rounded-xl border p-4",
                            response.response_type === "approval"
                              ? "bg-green-50 border-green-200"
                              : response.response_type === "rejection"
                              ? "bg-red-50 border-red-200"
                              : "bg-white border-neutral-200"
                          )}
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
                            {response.client_name && (
                              <span className="text-xs text-neutral-500">
                                by {response.client_name}
                              </span>
                            )}
                          </div>
                          {response.message && (
                            <p className="text-neutral-700">{response.message}</p>
                          )}
                          {response.signature_data?.image && (
                            <div className="mt-3 bg-white rounded-lg p-2 border border-neutral-200 inline-block">
                              <img
                                src={response.signature_data.image}
                                alt="Signature"
                                className="h-16 w-auto"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper Components
function QuickStat({
  label,
  value,
  icon,
  valueClass = "",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-100">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-neutral-500">{label}</span>
      </div>
      <p className={cn("text-sm font-semibold", valueClass)}>{value}</p>
    </div>
  );
}

function EstimateLineItem({
  icon,
  iconBg,
  label,
  description,
  amount,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  description: string;
  amount: number | null;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", iconBg)}>
          {icon}
        </div>
        <div>
          <p className="font-medium text-neutral-900">{label}</p>
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
      </div>
      <p className="text-lg font-semibold text-neutral-900">
        ${(amount || 0).toLocaleString()}
      </p>
    </div>
  );
}

function TimelineItem({
  icon,
  iconBg,
  label,
  date,
  sublabel,
  labelClass = "",
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  date: string | null;
  sublabel?: string;
  labelClass?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", iconBg)}>
        {icon}
      </div>
      <div>
        <p className={cn("text-sm font-medium", labelClass)}>{label}</p>
        <p className="text-xs text-neutral-500">
          {sublabel && `${sublabel}: `}
          {date ? new Date(date).toLocaleString() : "N/A"}
        </p>
      </div>
    </div>
  );
}
