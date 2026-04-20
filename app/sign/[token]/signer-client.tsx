"use client";

/**
 * Public signer page. Walks the signer through:
 *   1. Review — proposal preview + consent checkboxes + signer name
 *   2. Verify — enter emailed OTP (with resend)
 *   3. Sign   — draw or type a signature, submit
 *   4. Done   — confirmation + signer's signed copy
 *
 * All network calls hit /api/proposals/by-token/[token]/... which is
 * public (no auth) but validates the signing_token on every request.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShieldCheck,
  Loader2,
  Mail,
  Pencil,
  Type,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types matching the proposal content JSON shape
// ---------------------------------------------------------------------------

interface ProposalContent {
  companyName?: string;
  projectName?: string;
  brandColor?: string;
  proposalTitle?: string;
  proposalNumber?: string;
  validDays?: number;
  company?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
    logoUrl?: string;
  };
  client?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  projectMeta?: {
    address?: string;
    squareFootage?: number;
  };
  scopeText?: string;
  lineItems?: Array<{
    id: string;
    name: string;
    description: string;
    qty: number;
    unitPrice: number;
  }>;
  totals?: {
    subtotal: number;
    discount: number;
    discountPercent: number;
    tax: number;
    taxRate: number;
    total: number;
    deposit: number;
    depositPercent: number;
  };
  notesText?: string;
}

interface ProposalInfo {
  proposalId: string;
  signerEmail: string;
  signerName: string | null;
  content: ProposalContent;
  status: "sent" | "viewed" | "signed" | "expired" | "voided";
  expiresAt: string;
  signature?: { signedAt: string; signerName: string } | null;
}

type Step = "review" | "verify" | "sign" | "done" | "error";

// ---------------------------------------------------------------------------

export default function SignerClient({ token }: { token: string }) {
  const [info, setInfo] = useState<ProposalInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("review");

  // Review step
  const [signerName, setSignerName] = useState("");
  const [consentEsign, setConsentEsign] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);

  // Verify step
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sign step
  const [sigMode, setSigMode] = useState<"drawn" | "typed">("drawn");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Done step
  const [doneInfo, setDoneInfo] = useState<{
    signedAt: string;
    downloadUrl: string;
  } | null>(null);

  // Load proposal on mount.
  useEffect(() => {
    fetch(`/api/proposals/by-token/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || "Could not load proposal");
        }
        return r.json();
      })
      .then((data: ProposalInfo) => {
        setInfo(data);
        if (data.status === "signed") {
          setStep("done");
          if (data.signature) {
            setDoneInfo({
              signedAt: data.signature.signedAt,
              downloadUrl: `/sign/${token}?signed=1`,
            });
          }
        } else if (data.status === "expired" || data.status === "voided") {
          setStep("error");
        } else {
          setSignerName(data.signerName || "");
        }
      })
      .catch((e: Error) => setLoadError(e.message));
  }, [token]);

  // Resend cooldown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const canContinueReview =
    signerName.trim().length > 0 && consentEsign && consentTerms;

  const requestOtp = useCallback(
    async (isResend = false) => {
      setOtpSending(true);
      setOtpError(null);
      try {
        const r = await fetch(`/api/proposals/by-token/${token}/otp`, {
          method: "POST",
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Could not send code");
        setMaskedEmail(data.maskedEmail ?? null);
        setOtpSent(true);
        setResendCooldown(30);
        if (!isResend) setStep("verify");
      } catch (e) {
        setOtpError(e instanceof Error ? e.message : "Could not send code");
      } finally {
        setOtpSending(false);
      }
    },
    [token],
  );

  const verifyOtp = useCallback(async () => {
    if (otpInput.length !== 6) return;
    setOtpVerifying(true);
    setOtpError(null);
    try {
      const r = await fetch(
        `/api/proposals/by-token/${token}/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: otpInput }),
        },
      );
      const data = await r.json();
      if (!r.ok) {
        setOtpError(data.error || "Incorrect code");
        return;
      }
      setOtpId(data.otpId);
      setStep("sign");
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : "Could not verify code");
    } finally {
      setOtpVerifying(false);
    }
  }, [otpInput, token]);

  const submitSignature = useCallback(
    async (signatureDataUrl: string) => {
      if (!otpId || !info) return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        const r = await fetch(`/api/proposals/by-token/${token}/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            otpId,
            signerName: signerName.trim(),
            signatureDataUrl,
            signatureMethod: sigMode,
            consentToEsign: true,
            consentToTerms: true,
          }),
        });
        const data = await r.json();
        if (!r.ok) {
          setSubmitError(data.error || "Could not submit signature");
          return;
        }
        setDoneInfo({
          signedAt: data.signedAt,
          downloadUrl: data.downloadUrl,
        });
        setStep("done");
      } catch (e) {
        setSubmitError(
          e instanceof Error ? e.message : "Could not submit signature",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [info, otpId, sigMode, signerName, token],
  );

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  if (loadError) {
    return <ErrorCard message={loadError} />;
  }
  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  const accent = info.content.brandColor || "#2563eb";
  const companyName =
    info.content.companyName || info.content.company?.name || "";
  const projectName = info.content.projectName || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: accent + "15", color: accent }}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-neutral-500">
                {companyName ? `${companyName} · ` : ""}Secure Signing
              </div>
              <div className="font-semibold text-neutral-900 truncate">
                {projectName || "Proposal"}
              </div>
            </div>
          </div>
          <StepBadge step={step} />
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {step === "review" && (
          <ReviewStep
            info={info}
            signerName={signerName}
            setSignerName={setSignerName}
            consentEsign={consentEsign}
            setConsentEsign={setConsentEsign}
            consentTerms={consentTerms}
            setConsentTerms={setConsentTerms}
            canContinue={canContinueReview}
            onContinue={() => requestOtp(false)}
            sending={otpSending}
            error={otpError}
            accent={accent}
          />
        )}
        {step === "verify" && (
          <VerifyStep
            maskedEmail={maskedEmail || info.signerEmail}
            code={otpInput}
            setCode={setOtpInput}
            onVerify={verifyOtp}
            verifying={otpVerifying}
            error={otpError}
            onResend={() => requestOtp(true)}
            resendCooldown={resendCooldown}
            otpSent={otpSent}
            accent={accent}
          />
        )}
        {step === "sign" && (
          <SignStep
            signerName={signerName}
            sigMode={sigMode}
            setSigMode={setSigMode}
            onSubmit={submitSignature}
            submitting={submitting}
            error={submitError}
            accent={accent}
          />
        )}
        {step === "done" && (
          <DoneStep
            signerName={signerName || info.signature?.signerName || ""}
            signedAt={doneInfo?.signedAt || info.signature?.signedAt || ""}
            downloadUrl={doneInfo?.downloadUrl}
            accent={accent}
            projectName={projectName}
            companyName={companyName}
          />
        )}
        {step === "error" && (
          <ErrorCard
            message={
              info.status === "expired"
                ? "This signing link has expired. Please contact the sender for a new one."
                : info.status === "voided"
                  ? "This proposal was voided by the sender."
                  : "This link is no longer valid."
            }
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepBadge({ step }: { step: Step }) {
  const map: Record<Step, { label: string; idx: number }> = {
    review: { label: "Review", idx: 1 },
    verify: { label: "Verify", idx: 2 },
    sign: { label: "Sign", idx: 3 },
    done: { label: "Complete", idx: 4 },
    error: { label: "Unavailable", idx: 0 },
  };
  const m = map[step];
  if (step === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
        <AlertCircle className="w-3.5 h-3.5" /> {m.label}
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className={`w-2 h-2 rounded-full ${
            n <= m.idx ? "bg-blue-500" : "bg-neutral-200"
          }`}
        />
      ))}
      <span className="ml-2 font-medium text-neutral-600">{m.label}</span>
    </div>
  );
}

function ReviewStep({
  info,
  signerName,
  setSignerName,
  consentEsign,
  setConsentEsign,
  consentTerms,
  setConsentTerms,
  canContinue,
  onContinue,
  sending,
  error,
  accent,
}: {
  info: ProposalInfo;
  signerName: string;
  setSignerName: (v: string) => void;
  consentEsign: boolean;
  setConsentEsign: (v: boolean) => void;
  consentTerms: boolean;
  setConsentTerms: (v: boolean) => void;
  canContinue: boolean;
  onContinue: () => void;
  sending: boolean;
  error: string | null;
  accent: string;
}) {
  return (
    <div className="space-y-6">
      <ProposalPreview content={info.content} accent={accent} />

      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900 mb-4">
          Your information
        </h3>
        <label className="block text-xs font-medium text-neutral-600 mb-1">
          Full legal name
        </label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="Enter your full name"
          className="w-full h-11 px-3 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-neutral-400 mt-1">
          We&apos;ll send verification to{" "}
          <span className="font-medium text-neutral-600">
            {info.signerEmail}
          </span>
        </p>

        <div className="mt-5 space-y-3">
          <ConsentCheckbox
            checked={consentEsign}
            onChange={setConsentEsign}
            label="I consent to sign electronically"
            detail="I consent to conduct this transaction by electronic means. My electronic signature is the legal equivalent of my handwritten signature under the US ESIGN Act and UETA."
          />
          <ConsentCheckbox
            checked={consentTerms}
            onChange={setConsentTerms}
            label="I have read and agree to the proposal"
            detail="I have reviewed the proposal above and understand this is a binding document."
          />
        </div>

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          onClick={onContinue}
          disabled={!canContinue || sending}
          className="mt-6 w-full h-12 rounded-lg text-white font-semibold shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ backgroundColor: accent }}
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Continue to verification <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  label,
  detail,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  detail: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1">
        <div className="text-sm font-medium text-neutral-800">{label}</div>
        <div className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
          {detail}
        </div>
      </div>
    </label>
  );
}

function VerifyStep({
  maskedEmail,
  code,
  setCode,
  onVerify,
  verifying,
  error,
  onResend,
  resendCooldown,
  otpSent,
  accent,
}: {
  maskedEmail: string;
  code: string;
  setCode: (v: string) => void;
  onVerify: () => void;
  verifying: boolean;
  error: string | null;
  onResend: () => void;
  resendCooldown: number;
  otpSent: boolean;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm max-w-md mx-auto">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto"
        style={{ backgroundColor: accent + "15", color: accent }}
      >
        <Mail className="w-6 h-6" />
      </div>
      <h2 className="mt-4 text-center text-lg font-semibold text-neutral-900">
        Check your email
      </h2>
      <p className="mt-1 text-center text-sm text-neutral-500">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-neutral-700">{maskedEmail}</span>
      </p>

      <div className="mt-6">
        <input
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={6}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && onVerify()}
          placeholder="000000"
          className="w-full h-14 text-center text-2xl font-mono tracking-[0.5em] rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-600 text-center">{error}</div>
      )}

      <button
        onClick={onVerify}
        disabled={code.length !== 6 || verifying}
        className="mt-4 w-full h-12 rounded-lg text-white font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ backgroundColor: accent }}
      >
        {verifying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          "Verify code"
        )}
      </button>

      <div className="mt-4 text-center text-xs text-neutral-500">
        Didn&apos;t get it?{" "}
        <button
          onClick={onResend}
          disabled={resendCooldown > 0 || !otpSent}
          className="font-medium text-blue-600 hover:text-blue-700 disabled:text-neutral-400 disabled:cursor-not-allowed"
        >
          {resendCooldown > 0
            ? `Resend in ${resendCooldown}s`
            : "Resend code"}
        </button>
      </div>
    </div>
  );
}

function SignStep({
  signerName,
  sigMode,
  setSigMode,
  onSubmit,
  submitting,
  error,
  accent,
}: {
  signerName: string;
  sigMode: "drawn" | "typed";
  setSigMode: (v: "drawn" | "typed") => void;
  onSubmit: (dataUrl: string) => void;
  submitting: boolean;
  error: string | null;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-neutral-900">
        Sign your name
      </h2>
      <p className="text-sm text-neutral-500 mt-1">
        Choose to draw or type. Both are legally binding.
      </p>

      <div className="mt-5 inline-flex rounded-lg border border-neutral-200 p-0.5 bg-neutral-50">
        <button
          onClick={() => setSigMode("drawn")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 ${
            sigMode === "drawn"
              ? "bg-white shadow-sm text-neutral-900"
              : "text-neutral-500"
          }`}
        >
          <Pencil className="w-3.5 h-3.5" /> Draw
        </button>
        <button
          onClick={() => setSigMode("typed")}
          className={`px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5 ${
            sigMode === "typed"
              ? "bg-white shadow-sm text-neutral-900"
              : "text-neutral-500"
          }`}
        >
          <Type className="w-3.5 h-3.5" /> Type
        </button>
      </div>

      <div className="mt-4">
        {sigMode === "drawn" ? (
          <DrawnSignature
            onSubmit={onSubmit}
            submitting={submitting}
            accent={accent}
          />
        ) : (
          <TypedSignature
            name={signerName}
            onSubmit={onSubmit}
            submitting={submitting}
            accent={accent}
          />
        )}
      </div>

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}

function DrawnSignature({
  onSubmit,
  submitting,
  accent,
}: {
  onSubmit: (dataUrl: string) => void;
  submitting: boolean;
  accent: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // HiDPI
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const clear = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const rect = c.getBoundingClientRect();
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasInk(false);
  };

  const handleSubmit = () => {
    const c = canvasRef.current;
    if (!c) return;
    onSubmit(c.toDataURL("image/png"));
  };

  return (
    <div>
      <div className="relative rounded-lg border-2 border-dashed border-neutral-300 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-40 touch-none cursor-crosshair"
          onPointerDown={(e) => {
            drawing.current = true;
            last.current = getPoint(e);
            (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const p = getPoint(e);
            const ctx = canvasRef.current!.getContext("2d")!;
            ctx.beginPath();
            ctx.moveTo(last.current!.x, last.current!.y);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            last.current = p;
            if (!hasInk) setHasInk(true);
          }}
          onPointerUp={() => {
            drawing.current = false;
          }}
          onPointerCancel={() => {
            drawing.current = false;
          }}
        />
        <div className="absolute bottom-2 left-4 right-4 h-px bg-neutral-300 pointer-events-none" />
        <div className="absolute bottom-3 left-4 text-[10px] text-neutral-400 pointer-events-none">
          Sign here
        </div>
        {!hasInk && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-300 pointer-events-none">
            Draw with your finger or mouse
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={clear}
          disabled={!hasInk}
          className="text-xs text-neutral-500 hover:text-neutral-800 disabled:opacity-30 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" /> Clear
        </button>
        <button
          onClick={handleSubmit}
          disabled={!hasInk || submitting}
          className="h-11 px-6 rounded-lg text-white font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ backgroundColor: accent }}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Sign &amp; Submit <CheckCircle2 className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function TypedSignature({
  name,
  onSubmit,
  submitting,
  accent,
}: {
  name: string;
  onSubmit: (dataUrl: string) => void;
  submitting: boolean;
  accent: string;
}) {
  // Render the typed name as an SVG data URL so the server stores the
  // actual rendered signature image, not just the string.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 120"><text x="20" y="80" font-family="'Brush Script MT', 'Caveat', cursive" font-size="56" fill="#111827">${escapeXml(
    name || "Your name",
  )}</text></svg>`;
  const dataUrl = "data:image/svg+xml;base64," + btoa(svg);

  return (
    <div>
      <div className="rounded-lg border-2 border-dashed border-neutral-300 bg-white h-40 flex items-center px-6 relative overflow-hidden">
        <div
          className="text-5xl italic text-neutral-900"
          style={{ fontFamily: "'Brush Script MT', 'Caveat', cursive" }}
        >
          {name || "—"}
        </div>
        <div className="absolute bottom-3 left-4 right-4 h-px bg-neutral-300 pointer-events-none" />
        <div className="absolute bottom-4 left-4 text-[10px] text-neutral-400 pointer-events-none">
          Your typed signature
        </div>
      </div>
      <button
        onClick={() => onSubmit(dataUrl)}
        disabled={!name.trim() || submitting}
        className="mt-3 w-full h-11 rounded-lg text-white font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ backgroundColor: accent }}
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Sign &amp; Submit <CheckCircle2 className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function DoneStep({
  signerName,
  signedAt,
  downloadUrl,
  accent,
  projectName,
  companyName,
}: {
  signerName: string;
  signedAt: string;
  downloadUrl?: string;
  accent: string;
  projectName: string;
  companyName: string;
}) {
  const when = signedAt
    ? new Date(signedAt).toLocaleString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-10 shadow-sm max-w-md mx-auto text-center">
      <div
        className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
        style={{ backgroundColor: accent + "20", color: accent }}
      >
        <CheckCircle2 className="w-9 h-9" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-neutral-900">
        Signed!
      </h2>
      <p className="mt-2 text-sm text-neutral-500">
        {signerName ? `${signerName}, t` : "T"}hanks for signing the proposal
        {projectName ? ` for ${projectName}` : ""}
        {companyName ? ` from ${companyName}` : ""}.
      </p>
      {when && (
        <p className="mt-4 text-xs text-neutral-400">Signed on {when}</p>
      )}
      <p className="mt-6 text-xs text-neutral-500">
        A copy with the full audit certificate is on its way to your inbox.
      </p>
      {downloadUrl && (
        <a
          href={downloadUrl}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View this page again <ArrowRight className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm max-w-md text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-neutral-900">
          Link unavailable
        </h2>
        <p className="mt-2 text-sm text-neutral-500">{message}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Proposal preview (lightweight; avoids pulling in ProposalBuilder's
// full renderer to keep this page public + fast)
// ---------------------------------------------------------------------------

function ProposalPreview({
  content,
  accent,
}: {
  content: ProposalContent;
  accent: string;
}) {
  const c = content;
  const money = (n: number) =>
    "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden"
      style={{ borderTop: `4px solid ${accent}` }}
    >
      <div className="p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            {c.company?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.company.logoUrl}
                alt=""
                className="h-10 mb-3 object-contain"
              />
            )}
            <div
              className="text-2xl font-bold"
              style={{ color: accent }}
            >
              {c.company?.name || c.companyName || "Company"}
            </div>
            {c.company?.phone && (
              <div className="text-xs text-neutral-500">
                {c.company.phone}
              </div>
            )}
            {c.company?.email && (
              <div className="text-xs text-neutral-500">
                {c.company.email}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-neutral-800">PROPOSAL</div>
            <div className="text-xs text-neutral-500">
              #{c.proposalNumber}
            </div>
          </div>
        </div>

        {c.client && (
          <div className="mt-6 pb-6 border-b border-neutral-100">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
              Prepared for
            </div>
            <div className="text-sm font-semibold text-neutral-800 mt-1">
              {c.client.name}
            </div>
            {c.client.address && (
              <div className="text-xs text-neutral-500">
                {c.client.address}
              </div>
            )}
          </div>
        )}

        {c.scopeText && (
          <div className="mt-6">
            <div className="text-sm font-semibold text-neutral-800">
              Scope of Work
            </div>
            <p className="text-sm text-neutral-600 mt-1 leading-relaxed">
              {c.scopeText}
            </p>
          </div>
        )}

        {c.lineItems && c.lineItems.length > 0 && (
          <div className="mt-6">
            <div className="text-sm font-semibold text-neutral-800 mb-2">
              Pricing
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] text-neutral-400 uppercase border-b border-neutral-200">
                  <th className="text-left py-2 font-medium">Item</th>
                  <th className="text-right py-2 font-medium w-14">Qty</th>
                  <th className="text-right py-2 font-medium w-20">Rate</th>
                  <th className="text-right py-2 font-medium w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {c.lineItems.map((it) => (
                  <tr key={it.id} className="border-b border-neutral-50">
                    <td className="py-2">
                      <div className="font-medium text-neutral-800">
                        {it.name}
                      </div>
                      {it.description && (
                        <div className="text-xs text-neutral-400">
                          {it.description}
                        </div>
                      )}
                    </td>
                    <td className="text-right text-neutral-600">{it.qty}</td>
                    <td className="text-right text-neutral-600">
                      {money(it.unitPrice)}
                    </td>
                    <td className="text-right font-medium text-neutral-800">
                      {money(it.qty * it.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {c.totals && (
          <div className="mt-4 pt-4 border-t border-neutral-200 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <Row label="Subtotal" value={money(c.totals.subtotal)} />
              {c.totals.discount > 0 && (
                <Row
                  label={`Discount (${c.totals.discountPercent}%)`}
                  value={"-" + money(c.totals.discount)}
                  color="text-green-600"
                />
              )}
              {c.totals.tax > 0 && (
                <Row
                  label={`Tax (${c.totals.taxRate}%)`}
                  value={money(c.totals.tax)}
                />
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-neutral-200">
                <span>Total</span>
                <span>{money(c.totals.total)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-neutral-500">{label}</span>
      <span className={color || "text-neutral-800"}>{value}</span>
    </div>
  );
}
