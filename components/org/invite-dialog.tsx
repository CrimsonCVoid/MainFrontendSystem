"use client";

/**
 * Invite Member Dialog
 *
 * Modal for inviting new members to an organization.
 * Supports email invites and shareable link invites.
 */

import { useState } from "react";
import { useOrg } from "@/components/providers/org-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Link2, Copy, Check, Loader2 } from "lucide-react";
import { type OrgRole, getRoleLabel, getRoleDescription } from "@/lib/org-types";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteSent?: () => void;
}

export function InviteDialog({ open, onOpenChange, onInviteSent }: InviteDialogProps) {
  const { org, role } = useOrg();
  const [activeTab, setActiveTab] = useState<"email" | "link">("email");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<Exclude<OrgRole, "owner">>("member");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Available roles based on current user's role
  const availableRoles: Exclude<OrgRole, "owner">[] =
    role === "owner" ? ["admin", "member", "viewer"] : ["member", "viewer"];

  const handleSendEmailInvite = async () => {
    if (!email || !org) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/orgs/${org.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role: selectedRole,
          invite_type: "email",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invite");
      }

      setEmail("");
      onInviteSent?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!org) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/orgs/${org.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          invite_type: "link",
          max_uses: 10,
          expires_in_days: 7,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate link");
      }

      setInviteUrl(data.invite.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleClose = () => {
    setEmail("");
    setError(null);
    setInviteUrl(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Invite someone to join {org?.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "link")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Invite Link
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Role selector - shared between tabs */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as Exclude<OrgRole, "owner">)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((r) => (
                    <SelectItem key={r} value={r}>
                      <div>
                        <div className="font-medium">{getRoleLabel(r)}</div>
                        <div className="text-xs text-neutral-500">
                          {getRoleDescription(r)}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <TabsContent value="email" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="teammate@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleSendEmailInvite}
                disabled={loading || !email}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Invite
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="link" className="mt-0 space-y-4">
              {!inviteUrl ? (
                <>
                  <p className="text-sm text-neutral-600">
                    Generate a shareable link that anyone can use to join your
                    organization. The link will expire in 7 days and can be used
                    up to 10 times.
                  </p>

                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                      {error}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleGenerateLink}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4 mr-2" />
                        Generate Invite Link
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Invite Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={inviteUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyLink}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-500">
                    This link expires in 7 days and can be used up to 10 times.
                  </p>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setInviteUrl(null)}
                  >
                    Generate New Link
                  </Button>
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
