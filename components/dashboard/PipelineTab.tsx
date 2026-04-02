"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, DollarSign } from "lucide-react";
import { useOrg } from "@/components/providers/org-provider";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/project-lifecycle";

interface PipelineProject {
  id: string; name: string; status: string; address: string | null;
  city: string | null; state: string | null; square_footage: number | null;
  created_at: string;
}

export default function PipelineTab() {
  const { org } = useOrg();
  const router = useRouter();
  const [projects, setProjects] = useState<PipelineProject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);
    const res = await fetch(`/api/projects?orgId=${org.id}`);
    const data = await res.json();
    setProjects(data.projects || []);
    setLoading(false);
  }, [org?.id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (projectId: string, newStatus: ProjectStatus) => {
    setProjects((prev) => prev.map((p) => p.id === projectId ? { ...p, status: newStatus } : p));
    await fetch(`/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "updateStatus", projectId, status: newStatus }),
    }).catch(() => load());
  };

  const grouped = PROJECT_STATUSES.reduce((acc, s) => {
    acc[s.value] = projects.filter((p) => (p.status || "lead") === s.value);
    return acc;
  }, {} as Record<string, PipelineProject[]>);

  if (loading) return <div className="text-center py-12 text-neutral-400">Loading pipeline...</div>;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
        {PROJECT_STATUSES.map((s) => (
          <div key={s.value} className={`rounded-lg px-3 py-2 text-center ${s.color}`}>
            <p className="text-lg font-bold">{grouped[s.value]?.length || 0}</p>
            <p className="text-[10px] font-medium truncate">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {PROJECT_STATUSES.map((status) => (
          <div key={status.value} className="flex-shrink-0 w-64 rounded-xl border border-neutral-200 bg-neutral-50 flex flex-col">
            {/* Column header */}
            <div className={`px-3 py-2 rounded-t-xl flex items-center gap-2 ${status.color}`}>
              <div className={`w-2 h-2 rounded-full ${status.dot}`} />
              <span className="text-xs font-bold">{status.label}</span>
              <span className="ml-auto text-xs font-bold">{grouped[status.value]?.length || 0}</span>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 flex-1 min-h-[200px]">
              {grouped[status.value]?.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="bg-white rounded-lg border border-neutral-200 p-3 cursor-pointer hover:shadow-md hover:border-neutral-300 transition-all"
                >
                  <p className="font-semibold text-sm text-neutral-900 truncate">{project.name}</p>
                  {project.address && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-500">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{project.city || project.address}</span>
                    </div>
                  )}
                  {project.square_footage && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-500">
                      <DollarSign className="w-3 h-3" />
                      <span>{Number(project.square_footage).toLocaleString()} sf</span>
                    </div>
                  )}
                  {/* Quick status change */}
                  <select
                    value={project.status || "lead"}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateStatus(project.id, e.target.value as ProjectStatus)}
                    className="mt-2 w-full text-[10px] rounded border border-neutral-200 px-1 py-0.5 bg-neutral-50"
                  >
                    {PROJECT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              ))}
              {!grouped[status.value]?.length && (
                <div className="text-center py-8 text-[10px] text-neutral-400">No projects</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
