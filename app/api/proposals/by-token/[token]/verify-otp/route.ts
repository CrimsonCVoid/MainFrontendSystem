/**
 * POST /api/proposals/by-token/[token]/verify-otp
 *
 * Body: { code: "123456" }
 *
 * Verifies the most recent unused OTP for this proposal. On success,
 * marks the OTP verified_at; the signer then proceeds to the signature
 * step (which references the otp id via verifying_otp_id).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { verifyCode, hashCode } from "@/lib/esign";

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const BodySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

type OtpRow = {
  id: string;
  code_hash: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  verified_at: string | null;
};

function codeSalt(proposalId: string): string {
  return (process.env.OTP_HASH_SALT || "proposal-otp") + ":" + proposalId;
}

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
      { error: "Invalid code format" },
      { status: 400 },
    );
  }
  const { code } = parsed.data;

  const { data: proposal } = await svc
    .from("proposals")
    .select("id, status, expires_at")
    .eq("signing_token", token)
    .maybeSingle<{ id: string; status: string; expires_at: string }>();

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }
  if (proposal.status === "signed") {
    return NextResponse.json({ error: "Already signed" }, { status: 409 });
  }
  if (new Date(proposal.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  // Grab the most recent unverified OTP.
  const { data: otp } = await svc
    .from("proposal_otps")
    .select("id, code_hash, attempts, max_attempts, expires_at, verified_at")
    .eq("proposal_id", proposal.id)
    .is("verified_at", null)
    .order("issued_at", { ascending: false })
    .limit(1)
    .maybeSingle<OtpRow>();

  if (!otp) {
    return NextResponse.json(
      { error: "No active verification code. Request a new one." },
      { status: 404 },
    );
  }
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: "Code expired. Request a new one." },
      { status: 410 },
    );
  }
  if (otp.attempts >= otp.max_attempts) {
    return NextResponse.json(
      { error: "Too many wrong attempts. Request a new code." },
      { status: 429 },
    );
  }

  const salt = codeSalt(proposal.id) + ":" + otp.id;
  const ok = verifyCode(code, salt, otp.code_hash) ||
    // Back-compat against the pre-finalize hash (shouldn't hit, but safe)
    otp.code_hash === hashCode(code, salt);

  if (!ok) {
    await svc
      .from("proposal_otps")
      .update({ attempts: otp.attempts + 1 } as never)
      .eq("id", otp.id);
    return NextResponse.json(
      {
        error: "Incorrect code",
        attemptsRemaining: Math.max(0, otp.max_attempts - otp.attempts - 1),
      },
      { status: 401 },
    );
  }

  const verifiedAt = new Date().toISOString();
  await svc
    .from("proposal_otps")
    .update({ verified_at: verifiedAt } as never)
    .eq("id", otp.id);

  return NextResponse.json({
    success: true,
    otpId: otp.id,
    verifiedAt,
  });
}
