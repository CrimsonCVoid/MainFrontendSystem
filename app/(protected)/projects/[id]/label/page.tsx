import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { LabelingWorkspace } from "@/components/labeling/LabelingWorkspace";

/**
 * Labeling Page (Server Component)
 *
 * Ownership gate for the topology-aware roof labeler. RLS on `projects`
 * already enforces that a user can only see their org's rows; if the
 * query returns nothing, we 404.
 */

interface ProjectRow {
  id: string;
  name: string | null;
  latitude: number | null;
  longitude: number | null;
}

export default async function LabelingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin");
  }

  const { data } = await supabase
    .from("projects")
    .select("id, name, latitude, longitude")
    .eq("id", projectId)
    .maybeSingle();

  const project = data as ProjectRow | null;

  if (!project) {
    notFound();
  }

  return (
    <LabelingWorkspace
      projectId={project.id}
      projectName={project.name}
      latitude={project.latitude}
      longitude={project.longitude}
    />
  );
}
