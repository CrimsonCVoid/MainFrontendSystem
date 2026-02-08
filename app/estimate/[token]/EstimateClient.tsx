"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  getShareByToken,
  recordShareView,
  submitClientResponse,
  type ClientResponse,
} from "@/lib/estimate-sharing";
import { SignatureCapture } from "@/components/estimate/SignatureCapture";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  AlertCircle,
  Loader2,
  Building2,
  MapPin,
  Ruler,
  DollarSign,
  Calendar,
  FileText,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface EstimateClientProps {
  token: string;
}

interface ShareData {
  share: {
    id: string;
    status: string;
    client_name: string | null;
    client_email: string | null;
    notes: string | null;
    requires_password: boolean;
    approved_at: string | null;
    created_at: string;
  };
  project: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    square_footage: number | null;
    roof_data: Record<string, unknown> | null;
  };
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
    settings: Record<string, unknown>;
  };
  estimate: {
    id: string;
    name: string | null;
    materials_cost: number | null;
    labor_cost: number | null;
    permits_fees: number | null;
    contingency: number | null;
    notes: string | null;
  } | null;
}

/**
 * Public Estimate View Client Component
 *
 * Features:
 * - Professional estimate display with company branding
 * - Approve with signature capture
 * - Request changes with message
 * - Ask questions
 */
export function EstimateClient({ token }: EstimateClientProps) {
  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ShareData | null>(null);

  // Action state
  const [showApprovalSection, setShowApprovalSection] = useState(false);
  const [showRejectSection, setShowRejectSection] = useState(false);
  const [showQuestionSection, setShowQuestionSection] = useState(false);
  const [signatureData, setSignatureData] = useState<{
    image: string;
    capturedAt: string;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Fetch share data
  useEffect(() => {
    async function fetchData() {
      const result = await getShareByToken(token, supabase);

      if (!result.success || result.error) {
        setError(result.error || "Failed to load estimate");
        setLoading(false);
        return;
      }

      setData(result as unknown as ShareData);
      setLoading(false);

      // Record the view
      recordShareView(token, {
        userAgent: navigator.userAgent,
        referrer: document.referrer,
      });
    }

    fetchData();
  }, [token, supabase]);

  // Calculate total
  const calculateTotal = () => {
    if (!data?.estimate) return 0;
    const { materials_cost, labor_cost, permits_fees, contingency } = data.estimate;
    return (
      (materials_cost || 0) +
      (labor_cost || 0) +
      (permits_fees || 0) +
      (contingency || 0)
    );
  };

  // Handle approval
  const handleApprove = async () => {
    if (!signatureData) return;

    setSubmitting(true);
    const response: ClientResponse = {
      type: "approval",
      signatureData,
      clientName: data?.share.client_name || undefined,
    };

    const result = await submitClientResponse(token, response, undefined, supabase);

    setSubmitting(false);
    if (result.success) {
      setSubmitSuccess("Estimate approved successfully! Thank you.");
      setShowApprovalSection(false);

      // Send notification email to contractor (fire and forget)
      try {
        fetch("/api/email/approval-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shareToken: token }),
        }).catch(console.error);
      } catch {
        // Non-critical, don't block user
      }
    } else {
      setError(result.error || "Failed to submit approval");
    }
  };

  // Handle rejection/changes request
  const handleRequestChanges = async () => {
    if (!message.trim()) return;

    setSubmitting(true);
    const response: ClientResponse = {
      type: "rejection",
      message: message.trim(),
      clientName: data?.share.client_name || undefined,
    };

    const result = await submitClientResponse(token, response, undefined, supabase);

    setSubmitting(false);
    if (result.success) {
      setSubmitSuccess(
        "Your feedback has been submitted. The team will review and get back to you."
      );
      setShowRejectSection(false);
      setMessage("");
    } else {
      setError(result.error || "Failed to submit feedback");
    }
  };

  // Handle question
  const handleQuestion = async () => {
    if (!message.trim()) return;

    setSubmitting(true);
    const response: ClientResponse = {
      type: "question",
      message: message.trim(),
      clientName: data?.share.client_name || undefined,
    };

    const result = await submitClientResponse(token, response, undefined, supabase);

    setSubmitting(false);
    if (result.success) {
      setSubmitSuccess("Your question has been submitted. The team will respond shortly.");
      setShowQuestionSection(false);
      setMessage("");
    } else {
      setError(result.error || "Failed to submit question");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading estimate...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">
            Unable to Load Estimate
          </h1>
          <p className="text-neutral-600">{error || "Something went wrong"}</p>
        </div>
      </div>
    );
  }

  const { share, project, organization, estimate } = data;
  const isApproved = share.status === "approved";
  const isRejected = share.status === "rejected";

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {organization.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={organization.logo_url}
                  alt={organization.name}
                  className="h-12 w-auto"
                />
              ) : (
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-blue-600" />
                </div>
              )}
              <div>
                <h1 className="font-semibold text-neutral-900">{organization.name}</h1>
                <p className="text-sm text-neutral-500">Roofing Estimate</p>
              </div>
            </div>

            {/* Status badge */}
            {isApproved && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">Approved</span>
              </div>
            )}
            {isRejected && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-medium">Changes Requested</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Success message */}
        {submitSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-emerald-800">{submitSuccess}</p>
          </motion.div>
        )}

        {/* Project Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">{project.name}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Address */}
            {project.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-sm text-neutral-500">Property Address</p>
                  <p className="text-neutral-900">
                    {project.address}
                    {project.city && `, ${project.city}`}
                    {project.state && `, ${project.state}`}
                    {project.postal_code && ` ${project.postal_code}`}
                  </p>
                </div>
              </div>
            )}

            {/* Square Footage */}
            {project.square_footage && (
              <div className="flex items-start gap-3">
                <Ruler className="h-5 w-5 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-sm text-neutral-500">Roof Area</p>
                  <p className="text-neutral-900">
                    {project.square_footage.toLocaleString()} sq ft
                  </p>
                </div>
              </div>
            )}

            {/* Date */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-neutral-400 mt-0.5" />
              <div>
                <p className="text-sm text-neutral-500">Estimate Date</p>
                <p className="text-neutral-900">
                  {new Date(share.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Notes from contractor */}
          {share.notes && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-neutral-400 mt-0.5" />
                <div>
                  <p className="text-sm text-neutral-500 mb-1">Notes</p>
                  <p className="text-neutral-700">{share.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Estimate Breakdown */}
        {estimate && (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">
              Estimate Breakdown
            </h2>

            <div className="space-y-3">
              {estimate.materials_cost !== null && estimate.materials_cost > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Materials</span>
                  <span className="font-medium text-neutral-900">
                    ${estimate.materials_cost.toLocaleString()}
                  </span>
                </div>
              )}

              {estimate.labor_cost !== null && estimate.labor_cost > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Labor</span>
                  <span className="font-medium text-neutral-900">
                    ${estimate.labor_cost.toLocaleString()}
                  </span>
                </div>
              )}

              {estimate.permits_fees !== null && estimate.permits_fees > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Permits & Fees</span>
                  <span className="font-medium text-neutral-900">
                    ${estimate.permits_fees.toLocaleString()}
                  </span>
                </div>
              )}

              {estimate.contingency !== null && estimate.contingency > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Contingency</span>
                  <span className="font-medium text-neutral-900">
                    ${estimate.contingency.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center pt-3">
                <span className="text-lg font-semibold text-neutral-900">Total</span>
                <span className="text-2xl font-bold text-neutral-900">
                  ${calculateTotal().toLocaleString()}
                </span>
              </div>
            </div>

            {/* Estimate notes */}
            {estimate.notes && (
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <p className="text-sm text-neutral-500 mb-1">Additional Notes</p>
                <p className="text-neutral-700">{estimate.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!isApproved && !submitSuccess && (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Your Response</h2>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Button
                onClick={() => {
                  setShowApprovalSection(!showApprovalSection);
                  setShowRejectSection(false);
                  setShowQuestionSection(false);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Estimate
                {showApprovalSection ? (
                  <ChevronUp className="h-4 w-4 ml-2" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-2" />
                )}
              </Button>

              <Button
                onClick={() => {
                  setShowRejectSection(!showRejectSection);
                  setShowApprovalSection(false);
                  setShowQuestionSection(false);
                }}
                variant="outline"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Request Changes
              </Button>

              <Button
                onClick={() => {
                  setShowQuestionSection(!showQuestionSection);
                  setShowApprovalSection(false);
                  setShowRejectSection(false);
                }}
                variant="outline"
                className="flex-1"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Ask Question
              </Button>
            </div>

            {/* Approval Section */}
            {showApprovalSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-neutral-200 pt-4"
              >
                <p className="text-sm text-neutral-600 mb-4">
                  Please sign below to approve this estimate. Your signature confirms your
                  acceptance of the proposed work and pricing.
                </p>

                <SignatureCapture
                  onCapture={setSignatureData}
                  onClear={() => setSignatureData(null)}
                  width={Math.min(400, window.innerWidth - 80)}
                  height={200}
                />

                {signatureData && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={handleApprove}
                      disabled={submitting}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Submit Approval
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Request Changes Section */}
            {showRejectSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-neutral-200 pt-4"
              >
                <p className="text-sm text-neutral-600 mb-4">
                  Please describe the changes you&apos;d like to see in this estimate.
                </p>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your requested changes..."
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none mb-4"
                />

                <div className="flex justify-end">
                  <Button
                    onClick={handleRequestChanges}
                    disabled={submitting || !message.trim()}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Feedback
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Question Section */}
            {showQuestionSection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-neutral-200 pt-4"
              >
                <p className="text-sm text-neutral-600 mb-4">
                  Have a question about this estimate? Ask below and the team will respond.
                </p>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your question here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none mb-4"
                />

                <div className="flex justify-end">
                  <Button
                    onClick={handleQuestion}
                    disabled={submitting || !message.trim()}
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Question
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Already approved message */}
        {isApproved && !submitSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-emerald-900 mb-2">
              Estimate Approved
            </h3>
            <p className="text-emerald-700">
              This estimate was approved on{" "}
              {share.approved_at
                ? new Date(share.approved_at).toLocaleDateString()
                : "a previous date"}
              .
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-neutral-500">
          <p>
            Powered by{" "}
            <span className="font-medium text-neutral-700">MyMetalRoofer</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
