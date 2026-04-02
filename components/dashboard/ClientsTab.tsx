"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Upload, User, Phone, Mail, Building2, MapPin, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrg } from "@/components/providers/org-provider";
import { CLIENT_SOURCES } from "@/lib/clients";

interface Client {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; address: string | null; city: string | null;
  state: string | null; source: string | null; tags: string[];
  created_at: string;
}

export default function ClientsTab() {
  const { org } = useOrg();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", address: "", city: "", state: "", zip_code: "", source: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!org?.id) return;
    setLoading(true);
    const params = new URLSearchParams({ orgId: org.id });
    if (search) params.set("search", search);
    const res = await fetch(`/api/clients?${params}`);
    const data = await res.json();
    setClients(data.clients || []);
    setLoading(false);
  }, [org?.id, search]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.name.trim() || !org?.id) return;
    setSaving(true);
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, organization_id: org.id }),
    });
    setShowAdd(false);
    setForm({ name: "", email: "", phone: "", company: "", address: "", city: "", state: "", zip_code: "", source: "", notes: "" });
    setSaving(false);
    load();
  };

  return (
    <div className="space-y-4">
      {/* Search + Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients..." className="pl-10" />
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 bg-orange-500 hover:bg-orange-600">
          <Plus className="w-4 h-4" /> Add Client
        </Button>
      </div>

      {/* Add Client Form */}
      {showAdd && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 space-y-4">
          <h3 className="font-semibold text-neutral-900">New Client</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1" /></div>
            <div>
              <Label className="text-xs">Source</Label>
              <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm">
                <option value="">Select...</option>
                {CLIENT_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={!form.name.trim() || saving} className="bg-orange-500 hover:bg-orange-600">
              {saving ? "Saving..." : "Save Client"}
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Client List */}
      {loading ? (
        <div className="text-center py-12 text-neutral-400">Loading clients...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <User className="w-12 h-12 text-neutral-300 mx-auto" />
          <h3 className="text-lg font-semibold text-neutral-700">No clients yet</h3>
          <p className="text-sm text-neutral-500">Add your first client to start tracking relationships</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50">
                <th className="text-left py-3 px-4 font-semibold text-neutral-600">Client</th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-600">Contact</th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-600">Location</th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-600">Source</th>
                <th className="text-left py-3 px-4 font-semibold text-neutral-600">Added</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, i) => (
                <tr key={client.id} className={`border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer ${i % 2 === 0 ? "" : "bg-neutral-50/30"}`}
                  onClick={() => router.push(`/clients/${client.id}`)}>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-neutral-900">{client.name}</p>
                    {client.company && <p className="text-xs text-neutral-500">{client.company}</p>}
                  </td>
                  <td className="py-3 px-4">
                    {client.email && <div className="flex items-center gap-1 text-xs text-neutral-600"><Mail className="w-3 h-3" />{client.email}</div>}
                    {client.phone && <div className="flex items-center gap-1 text-xs text-neutral-600"><Phone className="w-3 h-3" />{client.phone}</div>}
                  </td>
                  <td className="py-3 px-4 text-neutral-600">
                    {[client.city, client.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="py-3 px-4">
                    {client.source && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 capitalize">{client.source.replace("_", " ")}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-neutral-500">
                    {new Date(client.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
