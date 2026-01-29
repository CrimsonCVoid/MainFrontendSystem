/**
 * Organization Types and Permissions
 *
 * Multi-tenant organization system with role-based access control.
 * Every user belongs to at least one organization.
 */

import type { Json } from "./database.types";

// ============================================
// CORE TYPES
// ============================================

/** Organization roles with hierarchy (owner > admin > member > viewer) */
export type OrgRole = "owner" | "admin" | "member" | "viewer";

/** Organization billing plans */
export type OrgPlan = "free" | "trial" | "paid" | "enterprise";

/** Organization billing status */
export type BillingStatus = "inactive" | "active" | "past_due" | "canceled";

/** Project visibility modes */
export type ProjectVisibility = "all" | "own-only";

/** Organization settings stored in JSONB column */
export interface OrganizationSettings {
  /** Controls whether members see all projects or only their own */
  projectVisibility?: ProjectVisibility;
}

/** Invitation types */
export type InviteType = "email" | "link" | "domain";

// ============================================
// ROLE HIERARCHY & PERMISSIONS
// ============================================

/** Role hierarchy for permission checks (higher number = more permissions) */
export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/** Permission actions in the system */
export type OrgAction =
  | "org:read"
  | "org:update"
  | "org:delete"
  | "org:billing"
  | "members:read"
  | "members:invite"
  | "members:update"
  | "members:remove"
  | "projects:read"
  | "projects:create"
  | "projects:update"
  | "projects:delete";

/** Role-to-action permission matrix */
export const ROLE_PERMISSIONS: Record<OrgRole, OrgAction[]> = {
  owner: [
    "org:read",
    "org:update",
    "org:delete",
    "org:billing",
    "members:read",
    "members:invite",
    "members:update",
    "members:remove",
    "projects:read",
    "projects:create",
    "projects:update",
    "projects:delete",
  ],
  admin: [
    "org:read",
    "org:update",
    "org:billing",
    "members:read",
    "members:invite",
    "members:update",
    "members:remove",
    "projects:read",
    "projects:create",
    "projects:update",
    "projects:delete",
  ],
  member: [
    "org:read",
    "members:read",
    "projects:read",
    "projects:create",
    "projects:update",
  ],
  viewer: ["org:read", "members:read", "projects:read"],
};

// ============================================
// DATABASE ROW TYPES
// ============================================

/** Organization record from database */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: OrgPlan;
  billing_status: BillingStatus;
  billing_owner_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  settings: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // SF Pool fields
  sf_pool_total: number;
  sf_pool_used: number;
  sf_pool_updated_at: string | null;
}

/** Organization membership record */
export interface OrganizationMember {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  invited_by: string | null;
  joined_at: string;
  updated_at: string;
}

/** Organization member with joined user data */
export interface OrganizationMemberWithUser extends OrganizationMember {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

/** Organization invite record */
export interface OrgInvite {
  id: string;
  org_id: string;
  email: string | null;
  token: string;
  role: Exclude<OrgRole, "owner">; // Can't invite as owner
  invite_type: InviteType;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  max_uses: number;
  use_count: number;
  created_at: string;
}

/** Organization invite with joined data */
export interface OrgInviteWithOrg extends OrgInvite {
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

/** Domain auto-join rule */
export interface OrgDomainRule {
  id: string;
  org_id: string;
  domain: string;
  default_role: Exclude<OrgRole, "owner">;
  enabled: boolean;
  verified_at: string | null;
  created_by: string;
  created_at: string;
}

// ============================================
// CONTEXT & API TYPES
// ============================================

/** Current organization context for authenticated requests */
export interface OrgContext {
  org: Organization;
  membership: OrganizationMember;
  role: OrgRole;
}

/** Organization create input */
export interface CreateOrgInput {
  name: string;
  slug?: string; // Auto-generated if not provided
  logo_url?: string;
}

/** Organization update input */
export interface UpdateOrgInput {
  name?: string;
  slug?: string;
  logo_url?: string | null;
  settings?: Json;
}

/** Invite create input */
export interface CreateInviteInput {
  email?: string; // Required for email type
  role: Exclude<OrgRole, "owner">;
  invite_type: InviteType;
  expires_in_days?: number; // Default 7
  max_uses?: number; // Default 1, use higher for link invites
}

/** Member update input */
export interface UpdateMemberInput {
  role: OrgRole;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a role has permission for an action
 */
export function hasPermission(role: OrgRole, action: OrgAction): boolean {
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false;
}

/**
 * Check if role1 can manage role2 in the hierarchy
 * - Owners can manage everyone except other owners
 * - Admins can manage members and viewers only
 */
export function canManageRole(actorRole: OrgRole, targetRole: OrgRole): boolean {
  if (actorRole === "owner" && targetRole !== "owner") return true;
  if (actorRole === "admin" && ["member", "viewer"].includes(targetRole)) return true;
  return false;
}

/**
 * Check if a role is higher than another in the hierarchy
 */
export function isHigherRole(role1: OrgRole, role2: OrgRole): boolean {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
}

/**
 * Get display label for a role
 */
export function getRoleLabel(role: OrgRole): string {
  const labels: Record<OrgRole, string> = {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
    viewer: "Viewer",
  };
  return labels[role];
}

/**
 * Get description for a role
 */
export function getRoleDescription(role: OrgRole): string {
  const descriptions: Record<OrgRole, string> = {
    owner: "Full control including billing and organization deletion",
    admin: "Manage members, projects, and billing",
    member: "Create and edit projects",
    viewer: "View-only access to projects",
  };
  return descriptions[role];
}

/**
 * Check if invite is expired
 */
export function isInviteExpired(invite: OrgInvite): boolean {
  return new Date(invite.expires_at) < new Date();
}

/**
 * Check if invite is valid (not expired, not revoked, has uses remaining)
 */
export function isInviteValid(invite: OrgInvite): boolean {
  if (invite.revoked_at) return false;
  if (isInviteExpired(invite)) return false;
  if (invite.use_count >= invite.max_uses) return false;
  return true;
}

/**
 * Generate a URL-safe slug from a string
 */
export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug) && slug.length >= 3 && slug.length <= 50;
}
