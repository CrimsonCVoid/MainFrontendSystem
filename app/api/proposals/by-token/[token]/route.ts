/**
 * GET /api/proposals/by-token/[token]
 *
 * Public endpoint used by the /sign/[token] page to hydrate the signing
 * UI. Returns the proposal content the signer needs to review, plus the
 * current status. Updates first_viewed_at on first GET.
 *
 * Does NOT return the signing_token in the payload (it's already in the URL).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

type ProposalRow = {
  id: string;
  project_id: string;
  signer_email: string;
  signer_name: string | null;
  content_json: unknown;
  status: string;
  sent_at: string | null;
  first_viewed_at: string | null;
  signed_at: string | null;
  expires_at: string;
};

type SignatureRow = {
  signed_at: string;
  signer_name: string;
};

export async function GET(
  _req: NextRequest,
  context: { params: { token: string } | Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Service unavailable (SUPABASE_SERVICE_ROLE_KEY not set)" },
      { status: 503 },
    );
  }

  const { data: proposal, error } = await svc
    .from("proposals")
    .select(
      "id, project_id, signer_email, signer_name, content_json, status, sent_at, first_viewed_at, signed_at, expires_at",
    )
    .eq("signing_token", token)
    .maybeSingle<ProposalRow>();

  if (error || !proposal) {
    return NextResponse.json(
      { error: "Proposal not found or link invalid" },
      { status: 404 },
    );
  }

  const now = new Date();
  const expired = new Date(proposal.expires_at).getTime() < now.getTime();

  // Note first view (fire-and-forget; never block the GET).
  if (!proposal.first_viewed_at && proposal.status === "sent") {
    svc
      .from("proposals")
      .update({
        first_viewed_at: now.toISOString(),
        status: "viewed",
      } as never)
      .eq("id", proposal.id)
      .then(() => {});
  }

  // If already signed, fetch the signature summary (no sensitive fields).
  let signature: { signedAt: string; signerName: string } | null = null;
  if (proposal.status === "signed") {
    const { data: sig } = await svc
      .from("proposal_signatures")
      .select("signed_at, signer_name")
      .eq("proposal_id", proposal.id)
      .maybeSingle<SignatureRow>();
    if (sig) {
      signature = {
        signedAt: sig.signed_at,
        signerName: sig.signer_name,
      };
    }
  }

  return NextResponse.json({
    proposalId: proposal.id,
    signerEmail: proposal.signer_email,
    signerName: proposal.signer_name,
    content: proposal.content_json,
    status: expired && proposal.status !== "signed" ? "expired" : proposal.status,
    expiresAt: proposal.expires_at,
    signature,
  });
}
