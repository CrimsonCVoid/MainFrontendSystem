"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import CompanyBrandingCard from "@/components/settings/CompanyBrandingCard";
import {
  Building2,
  TrendingUp,
  FileText,
  Settings,
  History,
  LogOut,
} from "lucide-react";

type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  company_name: string | null;
  company_logo_url: string | null;
  company_phone: string | null;
  company_address: string | null;
  company_email: string | null;
  company_website: string | null;
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
        const user = await getCurrentUser();
        if (!user) {
          router.replace("/signin");
          return;
        }

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
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

  const tabs = [
    { id: "overview", label: "Overview", icon: TrendingUp, href: "/dashboard" },
    { id: "projects", label: "Projects", icon: Building2, href: "/dashboard" },
    { id: "estimates", label: "Estimates", icon: FileText, href: "/dashboard" },
    { id: "settings", label: "Settings", icon: Settings, href: "/settings", active: true },
    { id: "audit", label: "Audit Log", icon: History, href: "/audit" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-semibold text-neutral-900">MyMetalRoofer</span>
              </div>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="space-y-8 animate-pulse">
            <div className="h-10 w-48 rounded-lg bg-neutral-200" />
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-96 rounded-xl bg-neutral-100" />
              <div className="h-96 rounded-xl bg-neutral-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-neutral-900">MyMetalRoofer</span>
            </Link>

            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab.active
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {!profile ? (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
              <p className="text-neutral-500">Manage your account and profile</p>
            </div>
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Unable to load profile information
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
              <p className="text-neutral-500">Manage your account and profile</p>
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
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your account details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
                    <div>
                      <p className="font-medium">Account Created</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-neutral-200 p-4 space-y-3">
                    <div>
                      <p className="font-medium">Need Help?</p>
                      <p className="text-sm text-muted-foreground">
                        Contact our support team for assistance
                      </p>
                    </div>
                    <a
                      href="mailto:help@mymetalroofer.com"
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full"
                    >
                      Email Support
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Company Branding */}
            <CompanyBrandingCard
              userId={profile.id}
              initialData={{
                company_name: profile.company_name,
                company_logo_url: profile.company_logo_url,
                company_phone: profile.company_phone,
                company_address: profile.company_address,
                company_email: profile.company_email,
                company_website: profile.company_website,
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
