// @ts-nocheck
/**
 * ESTIMATE SHARING LIBRARY
 *
 * Functions for creating and managing shareable estimate links,
 * tracking views, and handling client responses.
 */

import { getSupabaseBrowserClient } from "./supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================
// TYPES
// ============================================

export interface ClientInfo {
  name?: string;
  email?: string;
  phone?: string;
}

export interface ShareSettings {
  expiresInDays?: number; // Default: 30 days
  passwordProtected?: boolean;
  password?: string;
  notes?: string;
}

export interface EstimateShare {
  id: string;
  project_id: string;
  organization_id: string | null;
  share_token: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  expires_at: string | null;
  password_hash: string | null;
  view_count: number;
  last_viewed_at: string | null;
  status: "pending" | "viewed" | "approved" | "rejected" | "expired";
  approved_at: string | null;
  rejected_at: string | null;
  signature_data: Record<string, unknown> | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // SMS verification fields (legacy - deprecated)
  sms_verification_required: boolean;
  sms_otp_hash: string | null;
  sms_otp_expires_at: string | null;
  sms_verified_at: string | null;
  sms_verified_phone_last4: string | null;
  sms_attempts: number;
  // Email verification fields
  email_verification_required: boolean;
  email_otp_hash: string | null;
  email_otp_expires_at: string | null;
  email_otp_attempts: number;
  email_verified_at: string | null;
  // Signed IP tracking
  signed_ip_address: string | null;
  signed_user_agent: string | null;
}

export interface ShareWithProject extends EstimateShare {
  project: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    square_footage: number | null;
  };
}

export interface ShareResponse {
  id: string;
  share_id: string;
  response_type: "question" | "comment" | "approval" | "rejection";
  message: string | null;
  signature_data: Record<string, unknown> | null;
  client_name: string | null;
  created_at: string;
}

export interface ClientResponse {
  type: "question" | "comment" | "approval" | "rejection";
  message?: string;
  signatureData?: {
    image: string; // Base64 PNG
    capturedAt: string;
  };
  clientName?: string;
}

// ============================================
// TOKEN GENERATION
// ============================================

/**
 * Generate a secure random token for sharing
 */
export function generateShareToken(): string {
  // Generate 32 random bytes and convert to base64url
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  // Convert to base64url (URL-safe base64)
  const base64 = btoa(String.fromCharCode(...array));
  const base64url = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  return base64url;
}

/**
 * Generate a simple hash for password (for demo purposes)
 * In production, use a proper hashing library
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================
// SHARE MANAGEMENT
// ============================================

type GenericClient = SupabaseClient | ReturnType<typeof getSupabaseBrowserClient>;

/**
 * Create a new shareable estimate link
 */
export async function createEstimateShare(
  projectId: string,
  organizationId: string,
  clientInfo: ClientInfo,
  settings: ShareSettings = {},
  client?: GenericClient
): Promise<{ share: EstimateShare; shareUrl: string } | { error: string }> {
  const supabase = client || getSupabaseBrowserClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Generate token
  const shareToken = generateShareToken();

  // Calculate expiration
  const expiresAt = settings.expiresInDays
    ? new Date(Date.now() + settings.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default 30 days

  // Hash password if provided
  let passwordHash: string | null = null;
  if (settings.passwordProtected && settings.password) {
    passwordHash = await hashPassword(settings.password);
  }

  // Create share record
  // Email verification is required when email is provided
  const emailVerificationRequired = !!clientInfo.email?.trim();

  const { data, error } = await supabase
    .from("estimate_shares")
    .insert({
      project_id: projectId,
      organization_id: organizationId,
      share_token: shareToken,
      client_name: clientInfo.name || null,
      client_email: clientInfo.email || null,
      client_phone: clientInfo.phone || null,
      expires_at: expiresAt,
      password_hash: passwordHash,
      notes: settings.notes || null,
      created_by: user.id,
      email_verification_required: emailVerificationRequired,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating share:", error);
    return { error: error.message };
  }

  // Build share URL
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.mymetalroofer.net";
  const shareUrl = `${baseUrl}/estimate/${shareToken}`;

  return { share: data as EstimateShare, shareUrl };
}

/**
 * Get all shares for a project
 */
export async function getProjectShares(
  projectId: string,
  client?: GenericClient
): Promise<EstimateShare[]> {
  const supabase = client || getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("estimate_shares")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching shares:", error);
    return [];
  }

  return data as EstimateShare[];
}

/**
 * Get recent approved estimates for an organization
 */
export async function getRecentApprovals(
  orgId: string,
  limit: number = 5,
  client?: GenericClient
): Promise<(EstimateShare & { project_name?: string })[]> {
  const supabase = client || getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("estimate_shares")
    .select(`
      *,
      projects!inner(name)
    `)
    .eq("organization_id", orgId)
    .eq("status", "approved")
    .order("approved_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching recent approvals:", error);
    return [];
  }

  // Map project name
  return (data || []).map((share: any) => ({
    ...share,
    project_name: share.projects?.name,
  }));
}

/**
 * Get share responses (questions, comments, approvals)
 */
export async function getShareResponses(
  shareId: string,
  client?: GenericClient
): Promise<ShareResponse[]> {
  const supabase = client || getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("estimate_responses")
    .select("*")
    .eq("share_id", shareId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching responses:", error);
    return [];
  }

  return data as ShareResponse[];
}

/**
 * Revoke (delete) a share
 */
export async function revokeShare(
  shareId: string,
  client?: GenericClient
): Promise<{ success: boolean; error?: string }> {
  const supabase = client || getSupabaseBrowserClient();

  const { error } = await supabase.from("estimate_shares").delete().eq("id", shareId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update share status manually (e.g., mark as expired)
 */
export async function updateShareStatus(
  shareId: string,
  status: EstimateShare["status"],
  client?: GenericClient
): Promise<{ success: boolean; error?: string }> {
  const supabase = client || getSupabaseBrowserClient();

  const { error } = await supabase
    .from("estimate_shares")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", shareId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// ============================================
// PUBLIC ACCESS FUNCTIONS (for client portal)
// ============================================

/**
 * Get share by token (public - uses RPC)
 */
export async function getShareByToken(
  token: string,
  client?: GenericClient
): Promise<{
  success: boolean;
  error?: string;
  share?: Record<string, unknown>;
  project?: Record<string, unknown>;
  organization?: Record<string, unknown>;
  estimate?: Record<string, unknown>;
}> {
  const supabase = client || getSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_estimate_share_by_token", {
    p_token: token,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as {
    success: boolean;
    error?: string;
    share?: Record<string, unknown>;
    project?: Record<string, unknown>;
    organization?: Record<string, unknown>;
    estimate?: Record<string, unknown>;
  };
}

/**
 * Record a view of the shared estimate (public - uses RPC)
 */
export async function recordShareView(
  token: string,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
  },
  client?: GenericClient
): Promise<{ success: boolean; error?: string }> {
  const supabase = client || getSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("record_estimate_view", {
    p_token: token,
    p_ip_address: metadata?.ipAddress || null,
    p_user_agent: metadata?.userAgent || null,
    p_referrer: metadata?.referrer || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as { success: boolean; error?: string };
}

/**
 * Submit client response (public - uses RPC)
 */
export async function submitClientResponse(
  token: string,
  response: ClientResponse,
  ipAddress?: string,
  client?: GenericClient
): Promise<{ success: boolean; error?: string; message?: string }> {
  const supabase = client || getSupabaseBrowserClient();

  const signatureData = response.signatureData
    ? {
      image: response.signatureData.image,
      captured_at: response.signatureData.capturedAt,
      ip_address: ipAddress,
    }
    : null;

  const { data, error } = await supabase.rpc("submit_estimate_response", {
    p_token: token,
    p_response_type: response.type,
    p_message: response.message || null,
    p_signature_data: signatureData,
    p_client_name: response.clientName || null,
    p_ip_address: ipAddress || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as { success: boolean; error?: string; message?: string };
}

// ============================================
// SHARE STATUS HELPERS
// ============================================

export function getShareStatusColor(status: EstimateShare["status"]): string {
  switch (status) {
    case "pending":
      return "text-amber-600 bg-amber-50";
    case "viewed":
      return "text-blue-600 bg-blue-50";
    case "approved":
      return "text-emerald-600 bg-emerald-50";
    case "rejected":
      return "text-red-600 bg-red-50";
    case "expired":
      return "text-neutral-500 bg-neutral-100";
    default:
      return "text-neutral-600 bg-neutral-50";
  }
}

export function getShareStatusLabel(status: EstimateShare["status"]): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "viewed":
      return "Viewed";
    case "approved":
      return "Approved";
    case "rejected":
      return "Changes Requested";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

/**
 * Check if share is expired
 */
export function isShareExpired(share: EstimateShare): boolean {
  if (!share.expires_at) return false;
  return new Date(share.expires_at) < new Date();
}

/**
 * Get days until expiration
 */
export function getDaysUntilExpiration(share: EstimateShare): number | null {
  if (!share.expires_at) return null;
  const expiresAt = new Date(share.expires_at);
  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
