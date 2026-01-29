import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ProjectPageClient from "./project-page-client";

/**
 * Project Detail Page (Server Component)
 *
 * Dynamic route for viewing individual project details.
 * Fetches project data server-side and passes to client component.
 *
 * Features:
 * - Server-side data fetching for optimal performance
 * - Authentication and authorization checks
 * - 404 handling for non-existent projects
 * - SEO-friendly metadata generation
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createSupabaseServerClient();

  // Get current user securely
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch project - RLS handles access control based on org membership and visibility settings
  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", resolvedParams.id)
    .single();

  // Handle project not found or unauthorized access
  if (error || !project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neutral-900">404</h1>
          <p className="mt-2 text-neutral-600">
            Project not found or you don't have access.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Render client component with project data
  return <ProjectPageClient project={project} userId={user.id} />;
}

/**
 * Generate dynamic metadata for SEO
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const supabase = await createSupabaseServerClient();

  const { data: project } = await supabase
    .from("projects")
    .select("name, description")
    .eq("id", resolvedParams.id)
    .single();

  if (!project) {
    return {
      title: "Project Not Found",
    };
  }

  const projectData = project as { name: string; description: string | null };

  return {
    title: `${projectData.name} | Metal Roof Projects`,
    description: projectData.description || `View details for ${projectData.name}`,
  };
}
