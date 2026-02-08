"use client";

/**
 * COMPANY BRANDING CARD
 *
 * Settings component for managing company logo and information.
 * Used in proposals and PDF exports.
 */

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

interface CompanyBrandingCardProps {
  userId: string;
  initialData: {
    company_name: string | null;
    company_logo_url: string | null;
    company_phone: string | null;
    company_address: string | null;
    company_email: string | null;
    company_website: string | null;
  };
}

export default function CompanyBrandingCard({
  userId,
  initialData,
}: CompanyBrandingCardProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = getSupabaseBrowserClient();

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialData.company_logo_url || "");
  const [companyName, setCompanyName] = useState(initialData.company_name || "");
  const [companyPhone, setCompanyPhone] = useState(initialData.company_phone || "");
  const [companyAddress, setCompanyAddress] = useState(initialData.company_address || "");
  const [companyEmail, setCompanyEmail] = useState(initialData.company_email || "");
  const [companyWebsite, setCompanyWebsite] = useState(initialData.company_website || "");

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setLogoUrl(data.url);
      toast({
        title: "Logo uploaded",
        description: "Your company logo has been updated.",
      });
    } catch (error: any) {
      console.error("Logo upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await (supabase
        .from("users") as any)
        .update({
          company_name: companyName || null,
          company_phone: companyPhone || null,
          company_address: companyAddress || null,
          company_email: companyEmail || null,
          company_website: companyWebsite || null,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Company information updated successfully.",
      });
    } catch (error: any) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Company Branding
        </CardTitle>
        <CardDescription>
          Customize your proposals with your company logo and information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center justify-center overflow-hidden bg-neutral-50 dark:bg-neutral-900">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Company logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Upload className="h-8 w-8 text-neutral-400" />
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Logo
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                PNG, JPG, or SVG. Max 2MB. Recommended: 400x200px
              </p>
            </div>
          </div>
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Your Roofing Company LLC"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="companyPhone">Phone Number</Label>
          <Input
            id="companyPhone"
            value={companyPhone}
            onChange={(e) => setCompanyPhone(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="companyAddress">Business Address</Label>
          <Input
            id="companyAddress"
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
            placeholder="123 Main St, City, State ZIP"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="companyEmail">Business Email</Label>
          <Input
            id="companyEmail"
            type="email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            placeholder="contact@yourcompany.com"
          />
        </div>

        {/* Website */}
        <div className="space-y-2">
          <Label htmlFor="companyWebsite">Website</Label>
          <Input
            id="companyWebsite"
            type="url"
            value={companyWebsite}
            onChange={(e) => setCompanyWebsite(e.target.value)}
            placeholder="https://yourcompany.com"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Company Information"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
