"use client";

/**
 * Modal that sends a proposal for e-signature.
 *
 * Flow:
 *   1. User enters signer email (+ optional name)
 *   2. Click "Send"
 *   3. POST /api/proposals with the proposal content; server creates a
 *      signing token, records the proposal, emails the signer.
 *   4. Success state shows the signing URL (so the sender can share it
 *      through other channels too) with a Copy button.
 */

import { useState } from "react";
import { Mail, Copy, Check, Loader2, Link as LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  companyName: string;
  brandColor?: string;
  content: unknown;
  onSent?: () => void;
}

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | {
      kind: "sent";
      proposalId: string;
      signingUrl: string;
      emailSent: boolean;
      emailError?: string;
    }
  | { kind: "error"; message: string };

export default function SendForSignatureDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  companyName,
  brandColor,
  content,
  onSent,
}: Props) {
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const [state, setState] = useState<SendState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setSignerEmail("");
    setSignerName("");
    setState({ kind: "idle" });
    setCopied(false);
  };

  const handleSubmit = async () => {
    if (!signerEmail.trim()) return;
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          signerEmail: signerEmail.trim(),
          signerName: signerName.trim() || undefined,
          content,
          brandColor,
          companyName,
          projectName,
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 207) {
        setState({
          kind: "error",
          message: data.error || "Could not send proposal",
        });
        return;
      }
      setState({
        kind: "sent",
        proposalId: data.proposalId,
        signingUrl: data.signingUrl,
        emailSent: data.emailSent,
        emailError: data.emailError,
      });
      onSent?.();
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  };

  const handleCopy = async () => {
    if (state.kind !== "sent") return;
    try {
      await navigator.clipboard.writeText(state.signingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const accent = brandColor || "#2563eb";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        {state.kind !== "sent" ? (
          <>
            <DialogHeader>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                style={{ backgroundColor: accent + "15", color: accent }}
              >
                <Mail className="w-5 h-5" />
              </div>
              <DialogTitle>Send for Signature</DialogTitle>
              <DialogDescription>
                We&apos;ll email the signer a secure link. They&apos;ll verify
                their email with a 6-digit code and then sign the proposal —
                fully ESIGN/UETA compliant.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <Label htmlFor="signer-email">Signer email *</Label>
                <Input
                  id="signer-email"
                  type="email"
                  placeholder="client@example.com"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="signer-name">Signer name (optional)</Label>
                <Input
                  id="signer-name"
                  type="text"
                  placeholder="Jane Homeowner"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="mt-1.5"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  We&apos;ll greet them by this name in the invitation email.
                  They&apos;ll confirm their legal name on the signing page.
                </p>
              </div>

              {state.kind === "error" && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {state.message}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={state.kind === "sending"}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 text-white"
                style={{ backgroundColor: accent }}
                onClick={handleSubmit}
                disabled={!signerEmail.trim() || state.kind === "sending"}
              >
                {state.kind === "sending" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-1.5" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-2"
                style={{ backgroundColor: "#059669" + "15", color: "#059669" }}
              >
                <Check className="w-5 h-5" />
              </div>
              <DialogTitle>Proposal sent!</DialogTitle>
              <DialogDescription>
                {state.emailSent
                  ? "The signer will receive an email with a secure signing link."
                  : `Email dispatch failed${state.emailError ? ` (${state.emailError})` : ""} — share the link below manually.`}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs text-neutral-500">Signing link</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 mr-1" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" /> Copy link
                    </>
                  )}
                </Button>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2 text-[11px] text-neutral-700 font-mono break-all leading-relaxed max-h-24 overflow-y-auto">
                {state.signingUrl}
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                You can also share this link via text or another channel. It
                expires in 30 days.
              </p>
            </div>

            <div className="mt-5 flex gap-2">
              <a
                href={state.signingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center h-10 rounded-md border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <LinkIcon className="w-4 h-4 mr-1.5" />
                Open signer page
              </a>
              <Button
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  reset();
                }}
              >
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
