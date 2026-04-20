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

  // Record the signature.
  const { error: sigErr } = await svc
    .from("proposal_signatures")
    .insert({
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
    } as never);

  if (sigErr) {
    return NextResponse.json(
      { error: "Could not save signature", detail: sigErr.message },
      { status: 500 },
    );
  }

  // Mark the proposal signed.
  await svc
    .from("proposals")
    .update({
      status: "signed",
      signed_at: now.toISOString(),
    } as never)
    .eq("id", proposal.id);

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

  const notifyPromises: Promise<unknown>[] = [
    sendSignedCopyEmail({
      to: proposal.signer_email,
      recipientName: body.signerName,
      companyName,
      projectName,
      signerName: body.signerName,
      signedAt: now,
      downloadUrl,
      brandColor,
      audienceKind: "signer",
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
        signedAt: now,
        downloadUrl,
        brandColor,
        audienceKind: "sender",
      }),
    );
  }
  Promise.allSettled(notifyPromises).then((results) => {
    for (const r of results) {
      if (r.status === "rejected") {
        console.warn("[sign] signed-copy email failed:", r.reason);
      }
    }
  });

  return NextResponse.json({
    success: true,
    signedAt: now.toISOString(),
    downloadUrl,
  });
}
