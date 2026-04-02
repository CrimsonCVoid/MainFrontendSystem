// @ts-nocheck
/**
 * PROJECT DATA OPERATIONS
 *
 * High-level API for CRUD operations on roofing projects.
 * All functions automatically enforce user authentication and row-level security.
 *
 * ORGANIZATION SCOPING:
 * - Projects can be scoped to an organization via organization_id
 * - When orgId is provided, projects are filtered by organization
 * - Legacy projects without organization_id are filtered by user_id
 *
 * KY - HOW IT WORKS:
 * - requireUserId(): Ensures user is authenticated before any database operation
 * - All queries filter by organization_id or user_id to prevent cross-tenant data access
 * - Projects are created with minimal data, then address/roof_data added via updates
 *
 * KY - TYPICAL FLOW:
 * 1. User creates project with name (createProject)
 * 2. User selects address (address data saved via update in dashboard-client.tsx)
 * 3. Generate roof geometry from lat/lng with your algorithm
 * 4. Update project.roof_data with geometry results
 * 5. User views project with 3D model populated from roof_data
 */

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "./database.types";
import { getSupabaseBrowserClient } from "./supabaseClient";
import { logProjectCreated, logSFConsumed } from "./activity-log";

type GenericClient = SupabaseClient<Database>;

export type ProjectRow = Tables<"projects">;

/**
 * Extended project type with creator information for ownership display
 */
export interface ProjectWithCreator extends ProjectRow {
  creator: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  isOwn: boolean;
}

export type ProjectInput = {
  name: string;
  description?: string | null;
  organization_id?: string | null;
};

function resolveClient(client?: GenericClient): GenericClient {
  return client ?? getSupabaseBrowserClient();
}

function throwOnError(error: PostgrestError | null, fallback: string): void {
  if (error) {
    throw new Error(error.message || fallback);
  }
}

// Authenticates user and returns their ID - throws if not logged in
async function requireUserId(client: GenericClient): Promise<string> {
  const { data, error } = await client.auth.getUser();

  if (error) {
    // Auth session missing or other auth error
    throw new Error("You must be signed in to manage projects.");
  }

  if (data.user) {
    return data.user.id;
  }

  throw new Error("You must be signed in to manage projects.");
}

/**
 * Fetches the user's active organization ID
 * Returns null if organizations aren't set up yet
 */
async function getActiveOrgId(supabase: GenericClient, userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("users")
      .select("active_org_id")
      .eq("id", userId)
      .single();
    return (data as { active_org_id: string | null } | null)?.active_org_id || null;
  } catch {
    // Column doesn't exist yet - orgs not set up
    return null;
  }
}

/**
 * Check if organization_id column exists on projects table
 */
let orgColumnExists: boolean | null = null;

/**
 * Fetches organization settings (for visibility checks)
 */
async function getOrgSettings(supabase: GenericClient, orgId: string): Promise<{ projectVisibility?: "all" | "own-only" } | null> {
  try {
    const { data } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", orgId)
      .single();
    const orgData = data as { settings: { projectVisibility?: "all" | "own-only" } | null } | null;
    return orgData?.settings || null;
  } catch {
    return null;
  }
}

/**
 * Checks if user has admin/owner role in the organization
 */
async function isOrgAdminOrOwner(supabase: GenericClient, orgId: string, userId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("organization_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();
    const memberData = data as { role: string } | null;
    return memberData?.role === "owner" || memberData?.role === "admin";
  } catch {
    return false;
  }
}

/**
 * Fetches all projects for the current organization or user, ordered by creation date (newest first)
 * If orgId is provided, filters by organization_id. Otherwise uses user's active org or falls back to user_id.
 * Backward-compatible: works without organization columns if migrations haven't run.
 */
export async function listProjects(orgId?: string | null, client?: GenericClient): Promise<ProjectRow[]> {
  const supabase = resolveClient(client);
  const userId = await requireUserId(supabase);

  // First, try to load projects the legacy way (by user_id only)
  // This ensures backward compatibility if org columns don't exist yet
  if (orgColumnExists === null) {
    // Test if organization_id column exists
    const { error: testError } = await supabase
      .from("projects")
      .select("organization_id")
      .limit(1);

    orgColumnExists = !testError || !testError.message.includes("does not exist");
  }

  // If org columns don't exist, use legacy user_id filtering
  if (!orgColumnExists) {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    throwOnError(error, "Failed to load projects.");
    return (data ?? []) as ProjectRow[];
  }

  // Get org ID - use provided, or fetch active, or null for legacy
  let organizationId = orgId;
  if (organizationId === undefined) {
    organizationId = await getActiveOrgId(supabase, userId);
  }

  let query = supabase
    .from("projects")
    .select("*")
    .is("archived_at", null) // Exclude archived projects
    .order("created_at", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  } else {
    // Legacy fallback: user-owned projects without org
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  throwOnError(error, "Failed to load projects.");

  let projects = (data ?? []) as ProjectRow[];

  // Apply visibility filtering if organization has "own-only" setting
  if (organizationId && projects.length > 0) {
    const settings = await getOrgSettings(supabase, organizationId);
    if (settings?.projectVisibility === "own-only") {
      // Check if user is admin/owner (they always see all projects)
      const isAdminOrOwner = await isOrgAdminOrOwner(supabase, organizationId, userId);
      if (!isAdminOrOwner) {
        // Filter to only show user's own projects
        projects = projects.filter((p) => p.user_id === userId);
      }
    }
  }

  return projects;
}

/**
 * Fetches all projects with creator information for ownership display
 * Returns projects with creator avatar, name, email, and isOwn flag
 *
 * @param orgId - Organization ID to filter by
 * @param client - Optional Supabase client
 * @returns Projects with creator info and ownership flag
 */
export async function listProjectsWithCreators(
  orgId?: string | null,
  client?: GenericClient
): Promise<ProjectWithCreator[]> {
  const supabase = resolveClient(client);
  const userId = await requireUserId(supabase);

  // Check org column exists (reuse cached value)
  if (orgColumnExists === null) {
    const { error: testError } = await supabase
      .from("projects")
      .select("organization_id")
      .limit(1);
    orgColumnExists = !testError || !testError.message.includes("does not exist");
  }

  // Legacy mode - no org support
  if (!orgColumnExists) {
    const { data, error } = await supabase
      .from("projects")
      .select("*, users!projects_user_id_fkey(id, email, full_name, avatar_url)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    throwOnError(error, "Failed to load projects.");

    return ((data ?? []) as any[]).map((p) => ({
      ...p,
      creator: p.users || null,
      users: undefined,
      isOwn: true, // All legacy projects are user's own
    }));
  }

  // Get org ID
  let organizationId = orgId;
  if (organizationId === undefined) {
    organizationId = await getActiveOrgId(supabase, userId);
  }

  // Build query with user join
  let query = supabase
    .from("projects")
    .select("*, users!projects_user_id_fkey(id, email, full_name, avatar_url)")
    .is("archived_at", null) // Exclude archived projects
    .order("created_at", { ascending: false });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  } else {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  throwOnError(error, "Failed to load projects.");

  let projects = ((data ?? []) as any[]).map((p) => ({
    ...p,
    creator: p.users || null,
    users: undefined,
    isOwn: p.user_id === userId,
  })) as ProjectWithCreator[];

  // Apply visibility filtering
  if (organizationId && projects.length > 0) {
    const settings = await getOrgSettings(supabase, organizationId);
    if (settings?.projectVisibility === "own-only") {
      const isAdminOrOwner = await isOrgAdminOrOwner(supabase, organizationId, userId);
      if (!isAdminOrOwner) {
        projects = projects.filter((p) => p.user_id === userId);
      }
    }
  }

  return projects;
}

/**
 * Creates a new project with minimal initial data (name, description)
 * If organization_id is provided, project is scoped to that org.
 * Otherwise uses user's active organization.
 * Backward-compatible: works without organization columns if migrations haven't run.
 * KY: Address and roof_data are added later via updateProject or direct Supabase update
 * See dashboard-client.tsx line 219-248 for how address is saved after creation
 */
export async function createProject(input: ProjectInput, client?: GenericClient): Promise<ProjectRow> {
  const supabase = resolveClient(client);
  const userId = await requireUserId(supabase);

  // Build payload based on whether org columns exist
  const payload: Record<string, any> = {
    user_id: userId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  // Only add organization_id if the column exists
  if (orgColumnExists !== false) {
    // Get organization ID - use provided or fetch active
    let organizationId = input.organization_id;
    if (organizationId === undefined) {
      organizationId = await getActiveOrgId(supabase, userId);
    }
    if (organizationId) {
      payload.organization_id = organizationId;
    }
  }

  const { data, error } = await (supabase.from("projects") as any).insert(payload).select("*").single();
  throwOnError(error, "Failed to create project.");

  // Log project creation for admin visibility
  if (data && payload.organization_id) {
    try {
      await logProjectCreated(supabase, {
        orgId: payload.organization_id,
        userId: userId,
        projectId: data.id,
        projectName: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        squareFootage: data.square_footage,
        roofData: data.roof_data,
      });
    } catch (logErr) {
      // Don't fail project creation if logging fails
      console.warn("Failed to log project creation:", logErr);
    }
  }

  return data!;
}

/**
 * Updates project name and/or description
 * KY: For address/roof_data updates, use direct Supabase client update (see dashboard-client.tsx)
 */
export async function updateProject(
  projectId: string,
  input: ProjectInput,
  client?: GenericClient
): Promise<ProjectRow> {
  const supabase = resolveClient(client);
  const userId = await requireUserId(supabase);

  const payload: Database["public"]["Tables"]["projects"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (typeof input.name === "string") payload.name = input.name.trim();
  if (typeof input.description !== "undefined") {
    payload.description = input.description ? input.description.trim() : null;
  }

  // RLS handles access control based on org membership and visibility settings
  const { data, error } = await (supabase
    .from("projects") as any)
    .update(payload)
    .eq("id", projectId)
    .select("*")
    .single();

  throwOnError(error, "Failed to update project.");
  return data!;
}

/**
 * Deletes a project permanently (no soft delete)
 * RLS enforces access based on org membership and visibility settings
 */
export async function deleteProject(projectId: string, client?: GenericClient): Promise<void> {
  const supabase = resolveClient(client);
  await requireUserId(supabase); // Still require auth, but RLS handles permissions

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  throwOnError(error, "Failed to delete project.");
}

/**
 * Duplicate project check result
 */
export interface DuplicateProjectResult {
  project: ProjectRow;
  creator: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

/**
 * Finds an existing project with the same address in the organization
 * Used to warn users before creating duplicates
 *
 * @param orgId - Organization ID to search within
 * @param address - Street address to match (case-insensitive)
 * @param city - City to match (case-insensitive)
 * @param state - State to match (case-insensitive)
 * @param excludeProjectId - Optional project ID to exclude (for editing existing projects)
 * @returns Matching project with creator info, or null if no duplicate found
 */
export async function findDuplicateProject(
  orgId: string,
  address: string,
  city: string,
  state: string,
  excludeProjectId?: string,
  client?: GenericClient
): Promise<DuplicateProjectResult | null> {
  const supabase = resolveClient(client);
  await requireUserId(supabase);

  // Normalize inputs for case-insensitive comparison
  const normalizedAddress = address.trim().toLowerCase();
  const normalizedCity = city.trim().toLowerCase();
  const normalizedState = state.trim().toLowerCase();

  // Query for projects in the same org with matching address
  let query = supabase
    .from("projects")
    .select("*, users!projects_user_id_fkey(id, email, full_name)")
    .eq("organization_id", orgId)
    .ilike("address", normalizedAddress)
    .ilike("city", normalizedCity)
    .ilike("state", normalizedState);

  // Exclude the current project if editing
  if (excludeProjectId) {
    query = query.neq("id", excludeProjectId);
  }

  const { data, error } = await query.limit(1).single();

  // No match found or error (including PGRST116 "no rows returned")
  if (error || !data) {
    return null;
  }

  // Extract user info from joined data
  const projectData = data as any;
  const user = projectData.users;

  return {
    project: {
      ...projectData,
      users: undefined, // Remove joined data from project object
    } as ProjectRow,
    creator: {
      id: user?.id || projectData.user_id,
      email: user?.email || "Unknown",
      full_name: user?.full_name || null,
    },
  };
}

/**
 * Reassign project ownership to a different user
 * Admin-only function - caller must verify admin permissions
 *
 * @param projectId - Project ID to reassign
 * @param newOwnerId - User ID of the new owner
 * @param client - Optional Supabase client
 * @returns Updated project row
 */
export async function reassignProject(
  projectId: string,
  newOwnerId: string,
  client?: GenericClient
): Promise<ProjectRow> {
  const supabase = resolveClient(client);
  await requireUserId(supabase); // Ensure caller is authenticated

  // Update the project's user_id
  const { data, error } = await (supabase
    .from("projects") as any)
    .update({
      user_id: newOwnerId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select("*")
    .single();

  throwOnError(error, "Failed to reassign project.");
  return data!;
}

/**
 * Get organization members for reassignment dropdown
 *
 * @param orgId - Organization ID
 * @param client - Optional Supabase client
 * @returns Array of org members with user details
 */
export async function getOrgMembersForReassignment(
  orgId: string,
  client?: GenericClient
): Promise<Array<{
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
}>> {
  const supabase = resolveClient(client);
  await requireUserId(supabase);

  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, role, users!organization_members_user_id_fkey(id, email, full_name)")
    .eq("org_id", orgId);

  if (error) {
    console.error("Failed to fetch org members:", error);
    return [];
  }

  return ((data || []) as any[]).map((m) => ({
    user_id: m.user_id,
    email: m.users?.email || "Unknown",
    full_name: m.users?.full_name || null,
    role: m.role,
  }));
}

/**
 * Archive a project (soft delete)
 * Only admins/owners can archive projects in their organization
 *
 * @param projectId - Project ID to archive
 * @param client - Optional Supabase client
 */
export async function archiveProject(
  projectId: string,
  client?: GenericClient
): Promise<{ success: boolean; projectName?: string; error?: string }> {
  const supabase = resolveClient(client);
  const userId = await requireUserId(supabase);

  const { data, error } = await supabase.rpc("archive_project", {
    p_project_id: projectId,
    p_user_id: userId,
  });

  if (error) {
    console.error("Failed to archive project:", error);
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string; project_name?: string };
  return {
    success: result.success,
    projectName: result.project_name,
    error: result.error,
  };
}

/**
 * Unarchive/restore a project
 * Optionally reassign to a different user
 * Only admins/owners can unarchive projects in their organization
 *
 * @param projectId - Project ID to restore
 * @param newOwnerId - Optional new owner ID (for reassignment)
 * @param client - Optional Supabase client
 */
export async function unarchiveProject(
  projectId: string,
  newOwnerId?: string,
  client?: GenericClient
): Promise<{ success: boolean; projectName?: string; reassigned?: boolean; error?: string }> {
  const supabase = resolveClient(client);
  const userId = await requireUserId(supabase);

  const { data, error } = await supabase.rpc("unarchive_project", {
    p_project_id: projectId,
    p_user_id: userId,
    p_new_owner_id: newOwnerId || null,
  });

  if (error) {
    console.error("Failed to unarchive project:", error);
    return { success: false, error: error.message };
  }

  const result = data as { success: boolean; error?: string; project_name?: string; reassigned?: boolean };
  return {
    success: result.success,
    projectName: result.project_name,
    reassigned: result.reassigned,
    error: result.error,
  };
}

/**
 * List archived projects for admin view
 * Only returns archived projects for the organization
 *
 * @param orgId - Organization ID
 * @param client - Optional Supabase client
 */
export async function listArchivedProjects(
  orgId: string,
  client?: GenericClient
): Promise<ProjectWithCreator[]> {
  const supabase = resolveClient(client);
  const userId = await requireUserId(supabase);

  // Query archived projects with user info
  const { data, error } = await supabase
    .from("projects")
    .select("*, users!projects_user_id_fkey(id, email, full_name, avatar_url)")
    .eq("organization_id", orgId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch archived projects:", error);
    return [];
  }

  return ((data ?? []) as any[]).map((p) => ({
    ...p,
    creator: p.users || null,
    users: undefined,
    isOwn: p.user_id === userId,
  })) as ProjectWithCreator[];
}
