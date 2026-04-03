import type { SupabaseClient } from "@supabase/supabase-js";

export type PhotoCategory = "before" | "during" | "after" | "inspection" | "other";

export interface ProjectPhoto {
  id: string;
  project_id: string;
  organization_id: string;
  url: string;
  storage_path: string;
  category: PhotoCategory;
  caption: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string;
  created_at: string;
}

export const PHOTO_CATEGORIES: { value: PhotoCategory; label: string; color: string }[] = [
  { value: "before", label: "Before", color: "bg-red-100 text-red-700" },
  { value: "during", label: "During", color: "bg-amber-100 text-amber-700" },
  { value: "after", label: "After", color: "bg-green-100 text-green-700" },
  { value: "inspection", label: "Inspection", color: "bg-blue-100 text-blue-700" },
  { value: "other", label: "Other", color: "bg-gray-100 text-gray-700" },
];

export async function getProjectPhotos(supabase: SupabaseClient, projectId: string, category?: PhotoCategory) {
  let query = (supabase.from("project_photos") as any)
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (category) query = query.eq("category", category);
  return query;
}

export async function uploadPhoto(
  supabase: SupabaseClient,
  file: File,
  projectId: string,
  orgId: string,
  userId: string,
  category: PhotoCategory,
  caption?: string
): Promise<{ data: ProjectPhoto | null; error: any }> {
  const ext = file.name.split(".").pop() || "jpg";
  const storagePath = `${orgId}/${projectId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("project-photos")
    .upload(storagePath, file, { upsert: true });

  if (uploadError) return { data: null, error: uploadError };

  const { data: urlData } = supabase.storage.from("project-photos").getPublicUrl(storagePath);

  const { data, error } = await (supabase.from("project_photos") as any)
    .insert({
      project_id: projectId,
      organization_id: orgId,
      url: urlData.publicUrl,
      storage_path: storagePath,
      category,
      caption: caption || null,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: userId,
    })
    .select()
    .single();

  return { data, error };
}

export async function deletePhoto(supabase: SupabaseClient, photoId: string, storagePath: string) {
  await supabase.storage.from("project-photos").remove([storagePath]);
  return (supabase.from("project_photos") as any).delete().eq("id", photoId);
}

export async function updatePhotoCaption(supabase: SupabaseClient, photoId: string, caption: string) {
  return (supabase.from("project_photos") as any).update({ caption }).eq("id", photoId);
}
