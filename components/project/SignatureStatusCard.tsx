"use client";

/**
 * Signature Status card — lives on the project's Proposal tab (or
 * overview). Lists all proposals that have been sent for signature
 * with their lifecycle status and a link to the signer page.
 *
 * Data source: GET /api/proposals?projectId=... (owner-scoped).
 */

import { useEffect, useState } from "react";
import {
  Mail,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Loader2,
} from "lucide-react";

interface Proposal {
  id: string;
  signing_token: string;
  signer_email: string;
  signer_name: string | null;
  status: "draft" | "sent" | "viewed" | "signed" | "voided" | "expired";
  sent_at: string | null;
  first_viewed_at: string | null;
  signed_at: string | null;
  expires_at: string;
}

type StatusKey = Proposal["status"];

const STATUS_META: Record<
  StatusKey,
  { label: string; color: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  draft:   { label: "Draft",   color: "bg-neutral-100 text-neutral-600", Icon: Clock },
  sent:    { label: "Sent",    color: "bg-blue-50 text-blue-700",       Icon: Mail },
  viewed:  { label: "Viewed",  color: "bg-amber-50 text-amber-700",     Icon: Eye },
  signed:  { label: "Signed",  color: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
  voided:  { label: "Voided",  color: "bg-neutral-100 text-neutral-500", Icon: XCircle },
  expired: { label: "Expired", color: "bg-red-50 text-red-600",          Icon: Clock },
};

export default function SignatureStatusCard({
  projectId,
  refreshKey,
}: {
  projectId: string;
  /** Bump to force a re-fetch (e.g., after sending a new proposal). */
  refreshKey?: number;
}) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(
          `/api/proposals?projectId=${encodeURIComponent(projectId)}`,
          { cache: "no-store" },
        );
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error || "Could not load proposals");
        }
        const data: { proposals: Proposal[] } = await r.json();
        if (!cancelled) setProposals(data.proposals || []);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [projectId, refreshKey, tick]);

  // Refresh when the contractor comes back to the tab — catches the
  // case where the customer signed while they were elsewhere so the
  // status card flips Sent → Signed without a manual reload.
  useEffect(() => {
    const onFocus = () => setTick((t) => t + 1);
    const onVisible = () => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Also poll every 30s while any proposal is still pending — low cost,
  // covers the case where the user stays on the tab the whole time.
  useEffect(() => {
    const hasPending = (proposals ?? []).some(
      (p) => p.status === "sent" || p.status === "viewed",
    );
    if (!hasPending) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [proposals]);

  const handleCopy = async (p: Proposal) => {
    const url = `${window.location.origin}/sign/${p.signing_token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(p.id);
      setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 1500);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-5 flex items-center gap-3 text-sm text-neutral-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading signatures…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!proposals || proposals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-center">
        <Mail className="w-5 h-5 mx-auto text-neutral-400 mb-2" />
        <p className="text-sm font-medium text-neutral-700">
          No signatures yet
        </p>
        <p className="text-xs text-neutral-500 mt-1">
          Use the Send for Signature button in the Proposal tab to start a
          signing session.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">
          Signature Status
        </h3>
        <span className="text-xs text-neutral-500">
          {proposals.length} {proposals.length === 1 ? "proposal" : "proposals"}
        </span>
      </div>
      <div className="divide-y divide-neutral-100">
        {proposals.map((p) => {
          const meta = STATUS_META[p.status] ?? STATUS_META.sent;
          const { Icon } = meta;
          return (
            <div
              key={p.id}
              className="px-5 py-4 flex items-center gap-4 hover:bg-neutral-50/50"
            >
              <div
                className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${meta.color}`}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-900 truncate">
                    {p.signer_name || p.signer_email}
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.color}`}
                  >
                    {meta.label}
                  </span>
                </div>
                {p.signer_name && (
                  <div className="text-xs text-neutral-500 truncate">
                    {p.signer_email}
                  </div>
                )}
                <div className="text-[11px] text-neutral-400 mt-0.5">
                  {describeTimeline(p)}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleCopy(p)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                  aria-label="Copy signing link"
                  title="Copy signing link"
                >
                  {copiedId === p.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <a
                  href={`/sign/${p.signing_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
                  aria-label="Open signing page"
                  title="Open signing page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function describeTimeline(p: Proposal): string {
  if (p.status === "signed" && p.signed_at) {
    return `Signed ${rel(p.signed_at)}`;
  }
  if (p.status === "viewed" && p.first_viewed_at) {
    return `Viewed ${rel(p.first_viewed_at)}`;
  }
  if (p.status === "expired") {
    return `Expired ${rel(p.expires_at)}`;
  }
  if (p.status === "voided") {
    return `Voided`;
  }
  if (p.sent_at) {
    const exp = new Date(p.expires_at);
    return `Sent ${rel(p.sent_at)} · expires ${exp.toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" },
    )}`;
  }
  return "";
}

function rel(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const abs = Math.abs(diff);
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  const prefix = diff >= 0 ? "" : "in ";
  const suffix = diff >= 0 ? " ago" : "";
  if (abs < min) return diff >= 0 ? "just now" : "in a moment";
  if (abs < hr) return prefix + Math.round(abs / min) + "m" + suffix;
  if (abs < day) return prefix + Math.round(abs / hr) + "h" + suffix;
  if (abs < 30 * day) return prefix + Math.round(abs / day) + "d" + suffix;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
