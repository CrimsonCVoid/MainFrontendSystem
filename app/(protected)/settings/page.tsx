"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getCurrentSession, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const session = await getCurrentSession();
        if (!session?.user) {
          router.replace("/signin");
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data) {
          const profile = data as UserProfile;
          setProfile(profile);
          setFullName(profile.full_name || "");
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
        toast({
          title: "Error",
          description: "Unable to load profile information.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [router, toast]);

  async function handleSave() {
    if (!profile) return;

    try {
      setSaving(true);
      const { error } = await (supabase
        .from("users") as any)
        .update({
          full_name: fullName || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, full_name: fullName } : prev));

      toast({
        title: "Settings saved",
        description: "Your profile has been updated successfully.",
      });
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      toast({
        title: "Error",
        description: err?.message || "Failed to save settings.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/signin");
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (err) {
      console.error("Sign out error:", err);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 rounded-lg bg-neutral-200" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 rounded-xl bg-neutral-100" />
          <div className="h-96 rounded-xl bg-neutral-100" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and profile</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Unable to load profile information
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and profile</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={profile.email || ""} disabled />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
            <CardDescription>Manage your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-muted-foreground">
                  Sign out of your account and return to the sign-in page
                </p>
              </div>
              <Button variant="outline" onClick={handleSignOut} className="w-full">
                Sign Out
              </Button>
            </div>

            <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
              <div>
                <p className="font-medium">Account Created</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
