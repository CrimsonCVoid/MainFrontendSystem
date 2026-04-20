/**
 * Shared helpers for the e-signature flow.
 *
 * - signingToken(): unguessable URL-safe id for the /sign/[token] route
 * - hashCode() / verifyCode(): OTP storage (hashed, never plaintext)
 * - documentHash(): canonical SHA-256 of the proposal content snapshot
 * - generateOtp(): 6-digit numeric code
 * - getClientIp(): trust-aware extractor from the Next request headers
 */

import { createHash, randomBytes, randomInt, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

/**
 * URL-safe random token. 32 bytes → ~43 chars base64url. Shareable in
 * email links; collision-resistant; not guessable.
 */
export function signingToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * SHA-256 of the canonical JSON form of the proposal content. Used to
 * prove the signed document wasn't altered post-signature. We stringify
 * with stable key order so the hash is deterministic.
 */
export function documentHash(content: unknown): string {
  const stable = stableStringify(content);
  return createHash("sha256").update(stable).digest("hex");
}

function stableStringify(x: unknown): string {
  if (x === null || typeof x !== "object") return JSON.stringify(x);
  if (Array.isArray(x)) return "[" + x.map(stableStringify).join(",") + "]";
  const keys = Object.keys(x as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          stableStringify((x as Record<string, unknown>)[k]),
      )
      .join(",") +
    "}"
  );
}

/** 6-digit numeric OTP, zero-padded. */
export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Salted SHA-256 of a code. Not bcrypt — these are 6-digit short-lived
 *  codes with server-side rate limiting + 10-min TTL, so offline cracking
 *  doesn't apply; the hash just stops a dumped DB from exposing active
 *  codes. */
export function hashCode(code: string, salt: string): string {
  return createHash("sha256").update(salt + ":" + code).digest("hex");
}

/** Timing-safe compare for OTP verification. */
export function verifyCode(
  code: string,
  salt: string,
  expectedHash: string,
): boolean {
  const got = Buffer.from(hashCode(code, salt));
  const want = Buffer.from(expectedHash);
  if (got.length !== want.length) return false;
  return timingSafeEqual(got, want);
}

/**
 * Extract client IP honoring common proxy headers. Vercel / most hosts
 * set x-forwarded-for; we take the first (original client) hop.
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}

/** The consent language we show to signers — versioned so future edits
 *  don't retroactively change what historical signers agreed to. */
export const CONSENT_TEXT_VERSION = "v1";
export const CONSENT_TEXTS = {
  v1: {
    esign:
      "I consent to conduct this transaction by electronic means. I understand that my electronic signature is the legal equivalent of my handwritten signature under the ESIGN Act and applicable state laws (UETA).",
    terms:
      "I have read and agree to the proposal and its terms. I understand this is a binding document.",
  },
} as const;
