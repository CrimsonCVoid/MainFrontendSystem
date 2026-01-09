"use client";
import { supabase } from "@/lib/supabase";

export async function ensureDefaultOrgForUser() {
  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr || !user) throw new Error("No authenticated user.");

  const { data: mems, error: merr } = await (supabase
    .from("organization_members") as any)
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);
  if (merr) throw merr;
  if (mems?.length) return mems[0].org_id as string;

  const orgName = `${(user.email ?? "user").split("@")[0]}'s Org`;
  const { data: org, error: oerr } = await (supabase
    .from("organizations") as any)
    .insert([{ name: orgName }])
    .select("id")
    .single();
  if (oerr) throw oerr;

  const { error: iErr } = await (supabase
    .from("organization_members") as any)
    .insert([{ org_id: org.id, user_id: user.id, role: "owner" }]);
  if (iErr) throw iErr;

  return org.id as string;
}
