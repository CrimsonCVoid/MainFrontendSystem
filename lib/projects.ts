/**
 * PROJECT DATA OPERATIONS
 *
 * High-level API for CRUD operations on roofing projects.
 * All functions automatically enforce user authentication and row-level security.
 *
 * KY - HOW IT WORKS:
 * - requireUserId(): Ensures user is authenticated before any database operation
 * - All queries filter by user_id to prevent cross-user data access
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

type GenericClient = SupabaseClient<Database>;

export type ProjectRow = Tables<"projects">;

export type ProjectInput = {
  name: string;
  description?: string | null;
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
    if (error.message === "Auth session missing!" || (error as any)?.name === "AuthSessionMissingError") {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (!sessionError && sessionData.session?.user) {
        return sessionData.session.user.id;
      }
      throw new Error("You must be signed in to manage projects.");
    }
    throw new Error(error.message || "Unable to determine current user.");
  }

  if (data.user) {
    return data.user.id;
  }

  const { data: sessionData } = await client.auth.getSession();
  const sessionUser = sessionData.session?.user;
  if (sessionUser) {
    return sessionUser.id;
  }

  throw new Error("You must be signed in to manage projects.");
}

/**
 * Fetches all projects for the current user, ordered by creation date (newest first)
 * KY: Project rows include lat/lng and roof_data (once you add that column)
 */
export async function listProjects(client?: GenericClient): Promise<ProjectRow[]> {
  const supabase = resolveClient(client);
  const userId = await requireUserId(supabase);

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  throwOnError(error, "Failed to load projects.");
  return (data ?? []) as ProjectRow[];
}

/**
 * Creates a new project with minimal initial data (name, description)
 * KY: Address and roof_data are added later via updateProject or direct Supabase update
 * See dashboard-client.tsx line 219-248 for how address is saved after creation
 */
export async function createProject(input: ProjectInput, client?: GenericClient): Promise<ProjectRow> {
  const supabase = resolveClient(client);
  const userId = await requireUserId(supabase);

  const payload: Database["public"]["Tables"]["projects"]["Insert"] = {
    user_id: userId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase.from("projects") as any).insert(payload).select("*").single();
  throwOnError(error, "Failed to create project.");
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

  const { data, error } = await (supabase
    .from("projects") as any)
    .update(payload)
    .eq("id", projectId)
    .eq("user_id", userId)
    .select("*")
    .single();

  throwOnError(error, "Failed to update project.");
  return data!;
}

/**
 * Deletes a project permanently (no soft delete)
 * Enforces user ownership via .eq("user_id", userId)
 */
export async function deleteProject(projectId: string, client?: GenericClient): Promise<void> {
  const supabase = resolveClient(client);
  const userId = await requireUserId(supabase);

  const { error } = await supabase.from("projects").delete().eq("id", projectId).eq("user_id", userId);
  throwOnError(error, "Failed to delete project.");
}
