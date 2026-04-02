"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  createEstimateShare,
  type ClientInfo,
  type ShareSettings,
  type EstimateShare,
} from "@/lib/estimate-sharing";
import { Button } from "@/components/ui/button";
import {
  X,
  Share2,
  Mail,
  User,
  Calendar,
  Lock,
  Copy,
  Send,
  CheckCircle2,
  Loader2,
  Link2,
  ExternalLink,
} from "lucide-react";

interface ShareEstimateModalProps {
  projectId: string;
  projectName: string;
  organizationId: string;
  onClose: () => void;
  onShareCreated?: (share: EstimateShare, shareUrl: string) => void;
}

/**
 * ShareEstimateModal - Create and manage shareable estimate links
 *
 * Features:
 * - Client name, email, phone inputs
 * - Optional password protection
 * - Expiration date picker
 * - Copy link / Send via email
 */
export function ShareEstimateModal({
  projectId,
  projectName,
  organizationId,
  onClose,
  onShareCreated,
}: ShareEstimateModalProps) {
  const supabase = getSupabaseBrowserClient();

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [expirationDays, setExpirationDays] = useState(30);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [notes, setNotes] = useState("");

  // Status state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdShare, setCreatedShare] = useState<{
    share: EstimateShare;
    shareUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Create share
  const handleCreateShare = async () => {
    setIsCreating(true);
    setError(null);

    const clientInfo: ClientInfo = {
      name: clientName || undefined,
      email: clientEmail || undefined,
      phone: clientPhone || undefined,
    };

    const settings: ShareSettings = {
      expiresInDays: expirationDays,
      passwordProtected,
      password: passwordProtected ? password : undefined,
      notes: notes || undefined,
    };

    const result = await createEstimateShare(
      projectId,
      organizationId,
      clientInfo,
      settings,
      supabase
    );

    setIsCreating(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setCreatedShare(result);
    onShareCreated?.(result.share, result.shareUrl);
  };

  // Copy link
  const handleCopyLink = async () => {
    if (!createdShare) return;

    await navigator.clipboard.writeText(createdShare.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Send email (opens mailto link)
  const handleSendEmail = () => {
    if (!createdShare || !clientEmail) return;

    const subject = encodeURIComponent(`Estimate for ${projectName}`);
    const body = encodeURIComponent(
      `Hi ${clientName || ""},\n\nPlease review the estimate for ${projectName}:\n\n${createdShare.shareUrl}\n\nThank you!`
    );
    window.open(`mailto:${clientEmail}?subject=${subject}&body=${body}`);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* Dialog */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Share2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-neutral-900">Share Estimate</h2>
                <p className="text-sm text-neutral-500">{projectName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-neutral-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {createdShare ? (
              // Success state - show share link
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-900">Link Created!</p>
                    <p className="text-sm text-emerald-700">
                      Share this link with your client
                    </p>
                  </div>
                </div>

                {/* Share URL */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700">
                    Share Link
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-lg border border-neutral-200">
                      <Link2 className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                      <input
                        type="text"
                        readOnly
                        value={createdShare.shareUrl}
                        className="flex-1 bg-transparent text-sm text-neutral-600 outline-none truncate"
                      />
                    </div>
                    <Button
                      onClick={handleCopyLink}
                      variant={copied ? "default" : "outline"}
                      className={copied ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-1.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1.5" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => window.open(createdShare.shareUrl, "_blank")}
                    variant="outline"
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Preview
                  </Button>
                  {clientEmail && (
                    <Button onClick={handleSendEmail} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Send className="h-4 w-4 mr-1.5" />
                      Email to Client
                    </Button>
                  )}
                </div>

                {/* Details */}
                <div className="text-sm text-neutral-500 space-y-1">
                  {createdShare.share.client_name && (
                    <p>Client: {createdShare.share.client_name}</p>
                  )}
                  {createdShare.share.expires_at && (
                    <p>
                      Expires:{" "}
                      {new Date(createdShare.share.expires_at).toLocaleDateString()}
                    </p>
                  )}
                  {passwordProtected && <p>Password protected</p>}
                </div>
              </motion.div>
            ) : (
              // Form state
              <div className="space-y-5">
                {/* Client Info */}
                <div className="space-y-4">
                  <h3 className="font-medium text-neutral-900">Client Information</h3>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-neutral-700">
                      Client Name{" "}
                      {passwordProtected && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="John Smith"
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          passwordProtected && !clientName.trim()
                            ? "border-red-300 bg-red-50"
                            : "border-neutral-200"
                        }`}
                        required={passwordProtected}
                      />
                    </div>
                    {passwordProtected && !clientName.trim() && (
                      <p className="text-xs text-red-500">
                        Client name is required for password-protected links
                      </p>
                    )}
                  </div>

                  {/* Email - REQUIRED for email verification */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-neutral-700">
                      Client Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="john@example.com"
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          !clientEmail.trim() ? "border-amber-300 bg-amber-50" : "border-neutral-200"
                        }`}
                        required
                      />
                    </div>
                    <p className="text-xs text-amber-600">
                      Required for email verification before signing
                    </p>
                  </div>

                  {/* Phone (optional) */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-neutral-700">
                      Client Phone{" "}
                      <span className="text-neutral-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Verification Notice */}
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Email Verification Enabled</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      Client will receive a verification code via email before they can sign.
                      This provides additional security and evidence for the signature.
                    </p>
                  </div>
                </div>

                {/* Settings */}
                <div className="space-y-4 pt-4 border-t border-neutral-200">
                  <h3 className="font-medium text-neutral-900">Share Settings</h3>

                  {/* Expiration */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-neutral-700">
                      Link Expires In
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                      <select
                        value={expirationDays}
                        onChange={(e) => setExpirationDays(Number(e.target.value))}
                        className="w-full pl-10 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                      >
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                        <option value={30}>30 days</option>
                        <option value={60}>60 days</option>
                        <option value={90}>90 days</option>
                      </select>
                    </div>
                  </div>

                  {/* Password Protection */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={passwordProtected}
                        onChange={(e) => setPasswordProtected(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-neutral-700">
                        Password protect this link
                      </span>
                    </label>

                    {passwordProtected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <div className="relative mt-2">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                          <input
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            className="w-full pl-10 pr-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          Client will need this password to view the estimate
                        </p>
                      </motion.div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-neutral-700">
                      Notes for Client{" "}
                      <span className="text-neutral-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes or special instructions..."
                      rows={3}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!createdShare && (
            <div className="px-6 py-4 border-t border-neutral-200 flex flex-col gap-3 sticky bottom-0 bg-white">
              {/* Validation warning */}
              {!clientEmail.trim() && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm text-center">
                  Email is required for verification
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose} disabled={isCreating}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateShare}
                  disabled={isCreating || !clientEmail.trim() || (passwordProtected && !clientName.trim())}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4 mr-2" />
                      Create Share Link
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {createdShare && (
            <div className="px-6 py-4 border-t border-neutral-200 flex justify-end sticky bottom-0 bg-white">
              <Button onClick={onClose}>Done</Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
