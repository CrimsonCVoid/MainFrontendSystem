/**
 * Transactional emails for the e-signature flow.
 *
 * - sendSigningInvitationEmail: "Action Required — Sign your proposal"
 * - sendOtpEmail: 6-digit verification code (with resend support)
 * - sendSignedCopyEmail: completed proposal + audit cert link
 *
 * Uses the same Resend client + fallback (console log) pattern as
 * lib/email.ts.
 */

import { Resend } from "resend";

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@mymetalroofer.com";

type EmailResult = { success: boolean; messageId?: string; error?: string };

let resendClient: Resend | null = null;
async function getResendClient(): Promise<Resend | null> {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const bodyStyle =
  "margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f5;";
const cardStyle =
  "max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.08);";

// ---------------------------------------------------------------------------
// Signing invitation
// ---------------------------------------------------------------------------

export async function sendSigningInvitationEmail(data: {
  to: string;
  signerName?: string;
  senderName: string;
  companyName: string;
  projectName: string;
  signingUrl: string;
  expiresAt: Date;
  brandColor?: string;
}): Promise<EmailResult> {
  const client = await getResendClient();
  const accent = data.brandColor || "#2563eb";
  const subject = `Action required — sign your proposal from ${data.companyName}`;
  const greeting = data.signerName ? `Hi ${esc(data.signerName)},` : "Hi,";

  const html = `<!DOCTYPE html>
<html><body style="${bodyStyle}">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" style="${cardStyle}">
<tr><td style="padding:28px 32px;background:${accent};color:#fff;">
<div style="font-size:13px;opacity:.85;text-transform:uppercase;letter-spacing:1px;">Proposal for Your Review</div>
<h1 style="margin:8px 0 0;font-size:22px;">${esc(data.projectName)}</h1>
</td></tr>
<tr><td style="padding:28px 32px;color:#374151;line-height:1.6;font-size:15px;">
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">${esc(data.senderName)} at <strong>${esc(data.companyName)}</strong> has prepared a proposal for your review. Click below to view and sign it electronically.</p>
<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td>
<a href="${data.signingUrl}" style="display:inline-block;padding:14px 28px;background:${accent};color:#fff;text-decoration:none;font-weight:600;border-radius:8px;font-size:15px;">Review &amp; Sign Proposal →</a>
</td></tr></table>
<p style="margin:16px 0 0;font-size:13px;color:#6b7280;">This link expires on ${data.expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}. You'll be asked to verify your email address with a short code before signing.</p>
<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Your electronic signature carries the same legal weight as a handwritten one under the US ESIGN Act and UETA. We log your IP address, timestamp, and email verification for the audit record delivered with your signed copy.</p>
</td></tr>
<tr><td style="padding:16px 32px;background:#f9fafb;color:#9ca3af;font-size:11px;">
Button not working? Paste this URL into your browser:<br>
<span style="word-break:break-all;color:#6b7280;">${data.signingUrl}</span>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  if (!client) {
    console.log("📧 [Email] Would send signing invitation:", {
      to: data.to,
      subject,
      signingUrl: data.signingUrl,
    });
    return { success: true, messageId: "logged" };
  }
  try {
    const { data: res, error } = await client.emails.send({
      from: `${data.companyName} <${FROM_EMAIL}>`,
      to: [data.to],
      subject,
      html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, messageId: res?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// OTP verification code
// ---------------------------------------------------------------------------

export async function sendOtpEmail(data: {
  to: string;
  code: string;
  companyName: string;
  projectName: string;
  expiresInMinutes: number;
}): Promise<EmailResult> {
  const client = await getResendClient();
  const subject = `Your verification code: ${data.code}`;

  // Code split into two halves for readability: 123 · 456.
  const codeA = data.code.slice(0, 3);
  const codeB = data.code.slice(3);

  const html = `<!DOCTYPE html>
<html><body style="${bodyStyle}">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" style="${cardStyle}">
<tr><td style="padding:28px 32px;border-bottom:1px solid #e5e7eb;">
<div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">${esc(data.companyName)}</div>
<h1 style="margin:8px 0 4px;font-size:20px;color:#111827;">Verify your email to sign</h1>
<div style="font-size:14px;color:#6b7280;">${esc(data.projectName)}</div>
</td></tr>
<tr><td style="padding:28px 32px;text-align:center;">
<p style="margin:0 0 20px;color:#374151;font-size:15px;">Enter this 6-digit code on the signing page:</p>
<div style="display:inline-block;padding:20px 32px;background:#f3f4f6;border-radius:12px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:32px;font-weight:700;color:#111827;letter-spacing:8px;">${codeA} ${codeB}</div>
<p style="margin:24px 0 0;font-size:13px;color:#6b7280;">This code expires in ${data.expiresInMinutes} minutes. If you didn't request it, you can ignore this email.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  if (!client) {
    console.log("📧 [Email] Would send OTP:", { to: data.to, code: data.code });
    return { success: true, messageId: "logged" };
  }
  try {
    const { data: res, error } = await client.emails.send({
      from: `${data.companyName} <${FROM_EMAIL}>`,
      to: [data.to],
      subject,
      html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, messageId: res?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// Signed copy confirmation
// ---------------------------------------------------------------------------

export async function sendSignedCopyEmail(data: {
  to: string;
  recipientName?: string;
  companyName: string;
  projectName: string;
  signerName: string;
  signedAt: Date;
  downloadUrl: string;
  brandColor?: string;
  audienceKind: "signer" | "sender";
}): Promise<EmailResult> {
  const client = await getResendClient();
  const accent = data.brandColor || "#059669";
  const subject =
    data.audienceKind === "signer"
      ? `Signed — your copy of the ${esc(data.companyName)} proposal`
      : `${esc(data.signerName)} signed the proposal — ${esc(data.projectName)}`;

  const leadLine =
    data.audienceKind === "signer"
      ? `Thanks for signing! This is your signed copy of the proposal from <strong>${esc(data.companyName)}</strong>.`
      : `<strong>${esc(data.signerName)}</strong> has signed the proposal for <strong>${esc(data.projectName)}</strong>.`;

  const html = `<!DOCTYPE html>
<html><body style="${bodyStyle}">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">
<table cellpadding="0" cellspacing="0" style="${cardStyle}">
<tr><td style="padding:28px 32px;background:${accent};color:#fff;">
<div style="font-size:13px;opacity:.85;text-transform:uppercase;letter-spacing:1px;">Proposal Signed ✓</div>
<h1 style="margin:8px 0 0;font-size:22px;">${esc(data.projectName)}</h1>
</td></tr>
<tr><td style="padding:28px 32px;color:#374151;line-height:1.6;font-size:15px;">
<p style="margin:0 0 16px;">${data.recipientName ? `Hi ${esc(data.recipientName)},` : "Hi,"}</p>
<p style="margin:0 0 16px;">${leadLine}</p>
<p style="margin:0 0 16px;color:#6b7280;font-size:14px;">Signed ${data.signedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} at ${data.signedAt.toLocaleTimeString("en-US")}.</p>
<table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td>
<a href="${data.downloadUrl}" style="display:inline-block;padding:14px 28px;background:${accent};color:#fff;text-decoration:none;font-weight:600;border-radius:8px;font-size:15px;">Download Signed PDF</a>
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">The signed PDF includes a Certificate of Completion with the full audit trail: signer email, IP address, timestamps, and email verification record.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  if (!client) {
    console.log("📧 [Email] Would send signed copy:", {
      to: data.to,
      subject,
      downloadUrl: data.downloadUrl,
    });
    return { success: true, messageId: "logged" };
  }
  try {
    const { data: res, error } = await client.emails.send({
      from: `${data.companyName} <${FROM_EMAIL}>`,
      to: [data.to],
      subject,
      html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, messageId: res?.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
