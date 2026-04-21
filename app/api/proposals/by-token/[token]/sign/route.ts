/**
 * POST /api/proposals/by-token/[token]/sign
 *
 * Body: {
 *   otpId, signerName, signatureDataUrl,
 *   signatureMethod: "drawn"|"typed",
 *   consentToEsign: true, consentToTerms: true
 * }
 *
 * Records the signature + full ESIGN/UETA audit trail. The OTP row
 * referenced by otpId must be verified, unused for signing, and issued
 * against this proposal. Emails both parties a signed-copy confirmation.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { CONSENT_TEXT_VERSION, getClientIp } from "@/lib/esign";
import { sendSignedCopyEmail } from "@/lib/esign-email";

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Body validation. signatureDataUrl is a data: URL; cap at ~2MB raw.
const BodySchema = z.object({
  otpId: z.string().uuid(),
  signerName: z.string().min(1).max(200),
  signatureDataUrl: z
    .string()
    .startsWith("data:")
    .max(2_800_000),
  signatureMethod: z.enum(["drawn", "typed"]),
  consentToEsign: z.literal(true),
  consentToTerms: z.literal(true),
});

type ProposalRow = {
  id: string;
  project_id: string;
  created_by: string;
  signer_email: string;
  document_hash: string;
  status: string;
  expires_at: string;
  content_json: {
    companyName?: string;
    projectName?: string;
    brandColor?: string;
  } | null;
};

type OtpRow = {
  id: string;
  proposal_id: string;
  email: string;
  verified_at: string | null;
};

export async function POST(
  req: NextRequest,
  context: { params: { token: string } | Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const svc = getServiceClient();
  if (!svc) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  const { data: proposal } = await svc
    .from("proposals")
    .select(
      "id, project_id, created_by, signer_email, document_hash, status, expires_at, content_json",
    )
    .eq("signing_token", token)
    .maybeSingle<ProposalRow>();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status === "signed") {
    return NextResponse.json({ error: "Already signed" }, { status: 409 });
  }
  if (new Date(proposal.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // Confirm the OTP is (a) owned by this proposal, (b) verified, (c) fresh.
  const { data: otp } = await svc
    .from("proposal_otps")
    .select("id, proposal_id, email, verified_at")
    .eq("id", body.otpId)
    .maybeSingle<OtpRow>();

  if (!otp || otp.proposal_id !== proposal.id) {
    return NextResponse.json(
      { error: "Verification record not found" },
      { status: 404 },
    );
  }
  if (!otp.verified_at) {
    return NextResponse.json(
      { error: "Email not verified" },
      { status: 403 },
    );
  }
  if (otp.email.toLowerCase() !== proposal.signer_email.toLowerCase()) {
    return NextResponse.json(
      { error: "Verification email does not match the signer" },
      { status: 403 },
    );
  }

  const now = new Date();
  const ip = getClientIp(req);
  const ua = req.headers.get("user-agent") ?? "";

  // Record the signature. Guard against retries: if a signature already
  // exists for this proposal, treat as idempotent success (the earlier
  // response may have been dropped before the client saw it).
  const { data: existing } = await svc
    .from("proposal_signatures")
    .select("id, signed_at")
    .eq("proposal_id", proposal.id)
    .maybeSingle<{ id: string; signed_at: string }>();
  if (existing) {
    console.log(
      `[sign] idempotent — signature ${existing.id} already exists for proposal ${proposal.id}`,
    );
    const { error: idemStatusErr } = await svc
      .from("proposals")
      .update({ status: "signed", signed_at: existing.signed_at } as never)
      .eq("id", proposal.id);
    if (idemStatusErr) {
      console.error(
        `[sign] idempotent status update FAILED for ${proposal.id}:`,
        idemStatusErr,
      );
    } else {
      console.log(
        `[sign] idempotent: proposal ${proposal.id} status set to signed`,
      );
    }
    return NextResponse.json({
      success: true,
      signedAt: existing.signed_at,
      downloadUrl: `${req.headers.get("origin") || req.nextUrl.origin}/sign/${token}?signed=1`,
    });
  }

  const insertPayload = {
    proposal_id: proposal.id,
    signer_name: body.signerName,
    signer_email: proposal.signer_email,
    signature_data_url: body.signatureDataUrl,
    signature_method: body.signatureMethod,
    consent_to_esign: body.consentToEsign,
    consent_to_terms: body.consentToTerms,
    consent_text_version: CONSENT_TEXT_VERSION,
    verifying_otp_id: otp.id,
    otp_verified_at: otp.verified_at,
    signed_at: now.toISOString(),
    signer_ip: ip,
    signer_ua: ua,
    document_hash_at_sign: proposal.document_hash,
  };
  const { error: sigErr } = await svc
    .from("proposal_signatures")
    .insert(insertPayload as never);

  if (sigErr) {
    console.error("[sign] insert failed:", {
      message: sigErr.message,
      details: (sigErr as { details?: string }).details,
      hint: (sigErr as { hint?: string }).hint,
      code: (sigErr as { code?: string }).code,
      proposalId: proposal.id,
      otpId: otp.id,
      ip,
      uaLen: ua.length,
      sigDataUrlLen: body.signatureDataUrl.length,
    });
    return NextResponse.json(
      {
        error: "Could not save signature",
        detail: sigErr.message,
        hint: (sigErr as { hint?: string }).hint,
        code: (sigErr as { code?: string }).code,
      },
      { status: 500 },
    );
  }

  // Mark the proposal signed. This is what makes the contractor's
  // SignatureStatusCard flip from "Sent"/"Viewed" to "Signed" — if this
  // update silently fails, the dashboard will stay stuck even though
  // the signature row was written. Log explicitly so we can tell.
  const { error: statusErr } = await svc
    .from("proposals")
    .update({
      status: "signed",
      signed_at: now.toISOString(),
    } as never)
    .eq("id", proposal.id);
  if (statusErr) {
    console.error(
      `[sign] proposal.status update failed for ${proposal.id}:`,
      statusErr,
    );
  } else {
    console.log(
      `[sign] proposal ${proposal.id} marked signed at ${now.toISOString()}`,
    );
  }

  // Notify both parties (fire-and-forget; errors logged but don't fail the sign).
  const content = proposal.content_json ?? {};
  const companyName = (content.companyName as string) || "My Metal Roofer";
  const projectName = (content.projectName as string) || "Your project";
  const brandColor = (content.brandColor as string) || "#059669";

  const origin = req.headers.get("origin") || req.nextUrl.origin;
  const downloadUrl = `${origin}/sign/${token}?signed=1`;

  // Sender email — look up the creator's address.
  const { data: sender } = await svc
    .from("users")
    .select("email, full_name")
    .eq("id", proposal.created_by)
    .maybeSingle<{ email: string | null; full_name: string | null }>();

  const auditFields = {
    signerEmail: proposal.signer_email,
    signedAt: now,
    otpVerifiedAt: new Date(otp.verified_at),
    signerIp: ip,
    signerUa: ua,
    documentHash: proposal.document_hash,
    consentTextVersion: CONSENT_TEXT_VERSION,
  };

  const notifyPromises: Promise<unknown>[] = [
    sendSignedCopyEmail({
      to: proposal.signer_email,
      recipientName: body.signerName,
      companyName,
      projectName,
      signerName: body.signerName,
      downloadUrl,
      brandColor,
      audienceKind: "signer",
      ...auditFields,
    }),
  ];
  if (sender?.email) {
    notifyPromises.push(
      sendSignedCopyEmail({
        to: sender.email,
        recipientName: sender.full_name ?? undefined,
        companyName,
        projectName,
        signerName: body.signerName,
        downloadUrl,
        brandColor,
        audienceKind: "sender",
        ...auditFields,
      }),
    );
  }
  console.log(
    `[sign] dispatching ${notifyPromises.length} signed-copy email(s) ` +
      `(signer=${proposal.signer_email}${sender?.email ? `, sender=${sender.email}` : ""})`,
  );
  Promise.allSettled(notifyPromises).then((results) => {
    results.forEach((r, i) => {
      const target = i === 0 ? "signer" : "sender";
      if (r.status === "rejected") {
        console.warn(`[sign] ${target} email rejected:`, r.reason);
      } else if (!r.value || (r.value as { success?: boolean }).success === false) {
        console.warn(`[sign] ${target} email failed:`, r.value);
      }
    });
  });

  return NextResponse.json({
    success: true,
    signedAt: now.toISOString(),
    downloadUrl,
  });
}
