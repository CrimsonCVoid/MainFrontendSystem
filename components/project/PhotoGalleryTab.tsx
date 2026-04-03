"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Upload, Trash2, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PHOTO_CATEGORIES, type PhotoCategory } from "@/lib/project-photos";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface Photo {
  id: string; url: string; storage_path: string; category: string;
  caption: string | null; created_at: string;
}

interface Props {
  projectId: string;
  organizationId: string;
  userId: string;
}

export default function PhotoGalleryTab({ projectId, organizationId, userId }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PhotoCategory | "all">("all");
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadCategory, setUploadCategory] = useState<PhotoCategory>("before");

  const supabase = getSupabaseBrowserClient();

  const load = useCallback(async () => {
    setLoading(true);
    let query = (supabase.from("project_photos") as any)
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (activeCategory !== "all") query = query.eq("category", activeCategory);
    const { data } = await query;
    setPhotos(data || []);
    setLoading(false);
  }, [projectId, activeCategory, supabase]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "jpg";
      const storagePath = `${organizationId}/${projectId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("project-photos").upload(storagePath, file, { upsert: true });
      if (error) { console.error("Upload failed:", error.message); continue; }
      const { data: urlData } = supabase.storage.from("project-photos").getPublicUrl(storagePath);
      await (supabase.from("project_photos") as any).insert({
        project_id: projectId,
        organization_id: organizationId,
        url: urlData.publicUrl,
        storage_path: storagePath,
        category: uploadCategory,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: userId,
      });
    }
    setUploading(false);
    load();
  };

  const handleDelete = async (photo: Photo) => {
    await supabase.storage.from("project-photos").remove([photo.storage_path]);
    await (supabase.from("project_photos") as any).delete().eq("id", photo.id);
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    if (lightbox?.id === photo.id) setLightbox(null);
  };

  const filtered = activeCategory === "all" ? photos : photos.filter((p) => p.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {[{ value: "all" as const, label: "All" }, ...PHOTO_CATEGORIES].map((cat) => (
            <button key={cat.value} type="button" onClick={() => setActiveCategory(cat.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeCategory === cat.value ? "bg-slate-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}>
              {cat.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value as PhotoCategory)}
            className="text-xs rounded-lg border border-neutral-200 px-2 py-1.5">
            {PHOTO_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2 bg-orange-500 hover:bg-orange-600 text-xs">
            <Upload className="w-3.5 h-3.5" /> {uploading ? "Uploading..." : "Upload Photos"}
          </Button>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-neutral-400">Loading photos...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3 border-2 border-dashed border-neutral-200 rounded-xl"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}>
          <Camera className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-lg font-semibold text-neutral-700">No photos yet</h3>
          <p className="text-sm text-neutral-500">Drag and drop or click upload to add project photos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((photo) => (
            <div key={photo.id} className="group relative rounded-xl overflow-hidden border border-neutral-200 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setLightbox(photo)}>
              <img src={photo.url} alt={photo.caption || ""} className="w-full h-40 object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${PHOTO_CATEGORIES.find((c) => c.value === photo.category)?.color || "bg-gray-100 text-gray-700"}`}>
                    {photo.category}
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}
                    className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {photo.caption && <p className="px-2 py-1 text-xs text-neutral-600 truncate">{photo.caption}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.caption || ""} className="max-w-full max-h-[85vh] rounded-lg object-contain" />
            <button type="button" onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-lg">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PHOTO_CATEGORIES.find((c) => c.value === lightbox.category)?.color || ""}`}>
                {lightbox.category}
              </span>
              <p className="text-white text-sm mt-1">{lightbox.caption || new Date(lightbox.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
