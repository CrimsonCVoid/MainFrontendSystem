/**
 * POST /api/proposals/by-token/[token]/otp
 *
 * Issue (or resend) a 6-digit OTP to the signer's email. Rate-limited
 * to 5 issuances per proposal per 10 minutes, and the sent email is
 * restricted to the signer_email recorded on the proposal (the signer
 * cannot redirect the code to a different inbox).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateOtp, getClientIp, hashCode } from "@/lib/esign";
import { sendOtpEmail } from "@/lib/esign-email";
import { randomBytes } from "crypto";

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const OTP_TTL_MINUTES = 10;
const RATE_WINDOW_MIN = 10;
const MAX_OTPS_PER_WINDOW = 5;

// Salt for the OTP hash. In production set OTP_HASH_SALT; otherwise we
// use a per-row salt by prefixing with the proposal id.
function codeSalt(proposalId: string): string {
  return (process.env.OTP_HASH_SALT || "proposal-otp") + ":" + proposalId;
}

type ProposalRow = {
  id: string;
  signer_email: string;
  status: string;
  expires_at: string;
  content_json: {
    companyName?: string;
    projectName?: string;
  } | null;
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

  const { data: proposal } = await svc
    .from("proposals")
    .select("id, signer_email, status, expires_at, content_json")
    .eq("signing_token", token)
    .maybeSingle<ProposalRow>();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status === "signed") {
    return NextResponse.json(
      { error: "Already signed" },
      { status: 409 },
    );
  }
  if (new Date(proposal.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // Rate-limit: count OTPs issued in the last window.
  const windowStart = new Date(
    Date.now() - RATE_WINDOW_MIN * 60 * 1000,
  ).toISOString();
  const { count } = await svc
    .from("proposal_otps")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", proposal.id)
    .gte("issued_at", windowStart);

  if ((count ?? 0) >= MAX_OTPS_PER_WINDOW) {
    return NextResponse.json(
      {
        error:
          "Too many verification codes requested. Wait a few minutes and try again.",
      },
      { status: 429 },
    );
  }

  // Issue a new code.
  const code = generateOtp();
  const hash = hashCode(code, codeSalt(proposal.id) + ":" + randomBytes(8).toString("hex"));
  // We need the full "salt" reproducible for verify — store it by using a
  // deterministic salt based on the OTP row id. Insert first, then update
  // with the real hash.
  const { data: otp, error: insertErr } = await svc
    .from("proposal_otps")
    .insert({
      proposal_id: proposal.id,
      email: proposal.signer_email,
      code_hash: hash, // temp; we'll overwrite below with the real salt
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
      request_ip: getClientIp(req),
      request_ua: req.headers.get("user-agent") ?? "",
    } as never)
    .select("id")
    .single<{ id: string }>();

  if (insertErr || !otp) {
    return NextResponse.json(
      { error: "Could not issue verification code", detail: insertErr?.message },
      { status: 500 },
    );
  }

  // Re-hash with a salt tied to the otp.id so verify() can reconstruct it.
  const finalHash = hashCode(code, codeSalt(proposal.id) + ":" + otp.id);
  await svc
    .from("proposal_otps")
    .update({ code_hash: finalHash } as never)
    .eq("id", otp.id);

  const companyName =
    (proposal.content_json?.companyName as string | undefined) ||
    "My Metal Roofer";
  const projectName =
    (proposal.content_json?.projectName as string | undefined) || "Your project";

  const emailResult = await sendOtpEmail({
    to: proposal.signer_email,
    code,
    companyName,
    projectName,
    expiresInMinutes: OTP_TTL_MINUTES,
  });

  if (!emailResult.success) {
    return NextResponse.json(
      { error: "Could not send verification email", detail: emailResult.error },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    expiresInSeconds: OTP_TTL_MINUTES * 60,
    maskedEmail: maskEmail(proposal.signer_email),
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return visible + "•••@" + domain;
}
