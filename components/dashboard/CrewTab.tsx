"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, User, Phone, Mail, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrg } from "@/components/providers/org-provider";
import { CREW_ROLES } from "@/lib/crew";

interface CrewMember {
  id: string; name: string; role: string | null; phone: string | null;
  email: string | null; skills: string[]; hourly_rate: number | null;
  is_active: boolean; created_at: string;
}

export default function CrewTab() {
  const { org } = useOrg();
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "", hourly_rate: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);
    const res = await fetch(`/api/crew?orgId=${org.id}`);
    const data = await res.json();
    setCrew(data.crew || []);
    setLoading(false);
  }, [org?.id]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.name.trim() || !org?.id) return;
    setSaving(true);
    await fetch("/api/crew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organization_id: org.id,
        name: form.name.trim(),
        role: form.role || null,
        phone: form.phone || null,
        email: form.email || null,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      }),
    });
    setShowAdd(false);
    setForm({ name: "", role: "", phone: "", email: "", hourly_rate: "" });
    setSaving(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-neutral-900">Crew Roster</h3>
          <p className="text-sm text-neutral-500">{crew.length} active crew members</p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4" /> Add Member
        </Button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 space-y-4">
          <h3 className="font-semibold text-neutral-900">New Crew Member</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div>
              <Label className="text-xs">Role</Label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm">
                <option value="">Select...</option>
                {CREW_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Hourly Rate</Label><Input inputMode="decimal" value={form.hourly_rate} onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })} placeholder="$" className="mt-1" /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={!form.name.trim() || saving} className="bg-orange-500 hover:bg-orange-600">{saving ? "Saving..." : "Add Member"}</Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-neutral-400">Loading crew...</div>
      ) : crew.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Wrench className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-lg font-semibold text-neutral-700">No crew members</h3>
          <p className="text-sm text-neutral-500">Add your installation crew to assign them to projects</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {crew.map((member) => (
            <div key={member.id} className="rounded-xl border border-neutral-200 bg-white p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                  {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900">{member.name}</p>
                  {member.role && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 capitalize">{member.role.replace("_", " ")}</span>
                  )}
                </div>
                {member.hourly_rate && (
                  <span className="text-sm font-bold text-green-600">${member.hourly_rate}/hr</span>
                )}
              </div>
              <div className="mt-3 space-y-1">
                {member.phone && <div className="flex items-center gap-2 text-xs text-neutral-500"><Phone className="w-3 h-3" />{member.phone}</div>}
                {member.email && <div className="flex items-center gap-2 text-xs text-neutral-500"><Mail className="w-3 h-3" />{member.email}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
