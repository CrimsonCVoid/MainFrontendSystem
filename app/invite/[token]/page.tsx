"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("org_invites").select("*").eq("token", token).maybeSingle();
      setInvite(data);
    })();
  }, [token]);

  const accept = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return (window.location.href = "/signin");

    if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
      alert("Invite invalid or expired.");
      return;
    }

    await (supabase.from("organization_members") as any).insert({
      org_id: invite.org_id, user_id: user.id, role: invite.role
    });
    await (supabase.from("org_invites") as any).update({ accepted_at: new Date().toISOString() }).eq("id", invite.id);

    router.replace(`/projects?org=${invite.org_id}`);
  };

  if (!invite) return <div className="p-6">Checking invite…</div>;

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-bold">Join organization</h1>
      <p>You’ve been invited to join as <b>{invite.role}</b>.</p>
      <Button onClick={accept}>Accept Invite</Button>
    </div>
  );
}