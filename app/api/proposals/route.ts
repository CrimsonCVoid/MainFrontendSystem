/**
 * POST /api/proposals
 *
 * Create a new proposal snapshot and dispatch the signing invitation.
 * The request body is the full proposal content the user just built in
 * the ProposalBuilder; we freeze it, hash it, mint a signing token, and
 * send the signer an email link.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { documentHash, signingToken } from "@/lib/esign";
import { sendSigningInvitationEmail } from "@/lib/esign-email";

function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const BodySchema = z.object({
  projectId: z.string().uuid(),
  signerEmail: z.string().email(),
  signerName: z.string().min(1).max(200).optional(),
  content: z.unknown(),
  brandColor: z.string().optional(),
  companyName: z.string().min(1),
  projectName: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // Confirm the caller owns the project. RLS enforces project access too,
  // but this gives a clearer error.
  const { data: project } = await supabase
    .from("projects")
    .select("id, organization_id")
    .eq("id", body.projectId)
    .maybeSingle<{ id: string; organization_id: string | null }>();
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const token = signingToken();
  const hash = documentHash(body.content);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const { data: inserted, error: insertErr } = await supabase
    .from("proposals")
    .insert({
      project_id: body.projectId,
      organization_id: project.organization_id,
      created_by: user.id,
      signing_token: token,
      content_json: body.content,
      document_hash: hash,
      signer_email: body.signerEmail,
      signer_name: body.signerName ?? null,
      status: "sent",
      expires_at: expiresAt.toISOString(),
    } as never)
    .select("id, signing_token, expires_at")
    .single<{ id: string; signing_token: string; expires_at: string }>();

  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: "Could not create proposal", detail: insertErr?.message },
      { status: 500 },
    );
  }

  const origin = req.headers.get("origin") || req.nextUrl.origin;
  const signingUrl = `${origin}/sign/${inserted.signing_token}`;

  const senderName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.email as string | undefined) ||
    "Your contractor";

  const emailResult = await sendSigningInvitationEmail({
    to: body.signerEmail,
    signerName: body.signerName,
    senderName,
    companyName: body.companyName,
    projectName: body.projectName,
    signingUrl,
    expiresAt: new Date(inserted.expires_at),
    brandColor: body.brandColor,
  });

  if (!emailResult.success) {
    // Email failed but the proposal exists. Return the link so the sender
    // can share it manually; don't 500 out.
    return NextResponse.json(
      {
        proposalId: inserted.id,
        signingUrl,
        emailSent: false,
        emailError: emailResult.error,
      },
      { status: 207 },
    );
  }

  return NextResponse.json({
    proposalId: inserted.id,
    signingUrl,
    emailSent: true,
    emailMessageId: emailResult.messageId,
  });
}

/**
 * GET /api/proposals?projectId=... — list proposals for a project (sender view).
 */
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  const svc = getServiceClient();
  const client = svc ?? supabase;

  const { data, error } = await client
    .from("proposals")
    .select(
      "id, signing_token, signer_email, signer_name, status, sent_at, first_viewed_at, signed_at, expires_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (data) {
    const counts: Record<string, number> = {};
    for (const p of data as Array<{ status: string }>) {
      counts[p.status] = (counts[p.status] ?? 0) + 1;
    }
    const summary = Object.entries(counts)
      .map(([s, n]) => `${s}=${n}`)
      .join(", ");
    console.log(
      `[proposals] project=${projectId} returned ${data.length} proposals${summary ? ` (${summary})` : ""}`,
    );
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ proposals: data ?? [] });
}
