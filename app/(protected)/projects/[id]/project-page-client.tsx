"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  FileText,
  Box,
  DollarSign,
  Check,
  Download,
  Send,
  Package,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ProjectViewer from "@/components/project/ProjectViewer";
import AddressInput, { type AddressData } from "@/components/project/AddressInput";
import EstimationTab from "@/components/project/EstimationTab";
import { DuplicateAddressDialog } from "@/components/project/DuplicateAddressDialog";
import { OwnershipBadge } from "@/components/project/OwnershipBadge";
import { CreatorAvatar } from "@/components/project/CreatorAvatar";
import { ProjectActivityTimeline } from "@/components/project/ProjectActivityTimeline";
import AddressVerificationModal from "@/components/project/AddressVerificationModal";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getPricingTier } from "@/lib/pricing";
import { findDuplicateProject, type DuplicateProjectResult } from "@/lib/projects";
import type { Tables } from "@/lib/database.types";
import { useOrg, useSFPool } from "@/components/providers/org-provider";

type ProjectRow = Tables<"projects">;
type UserRow = Tables<"users">;

interface CreatorInfo {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}


interface ProjectPageClientProps {
  project: ProjectRow;
  userId: string;
}

export default function ProjectPageClient({
  project: initialProject,
  userId,
}: ProjectPageClientProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // Core state
  const [project, setProject] = useState<ProjectRow>(initialProject);
  const [user, setUser] = useState<UserRow | null>(null);
  const [creator, setCreator] = useState<CreatorInfo | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "3d-model" | "estimation">("overview");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Computed ownership
  const isOwn = project.user_id === userId;

  // Edit mode state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDescription, setEditDescription] = useState(project.description || "");

  // SF Pool state (used for verification modal)
  const { org, refreshOrgs } = useOrg();
  const { pool, hasEnough, format: formatSF } = useSFPool();
  const projectSF = project.square_footage || 500; // Default to 500 if not set

  // Canvas ref for 3D screenshot
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Address state
  const [addressData, setAddressData] = useState<AddressData | null>(() => {
    if (project.address && project.city && project.state) {
      return {
        address: project.address,
        address_line2: project.address_line2 || undefined,
        city: project.city,
        state: project.state,
        postal_code: project.postal_code || "",
        country: project.country || "US",
        latitude: project.latitude || 0,
        longitude: project.longitude || 0,
        google_place_id: project.google_place_id || "",
        formatted_address: `${project.address}, ${project.city}, ${project.state} ${project.postal_code}`,
      };
    }
    return null;
  });

  // Duplicate address state
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateProjectResult | null>(null);
  const [pendingAddressData, setPendingAddressData] = useState<AddressData | null>(null);

  // Address verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationAddressData, setVerificationAddressData] = useState<AddressData | null>(null);

  // Fetch fresh project data on mount to ensure persistence
  useEffect(() => {
    async function fetchLatestProject() {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", initialProject.id)
        .single();
      if (data) {
        setProject(data);
        // Update address state if project has address data
        if (data.address && data.city && data.state) {
          setAddressData({
            address: data.address,
            address_line2: data.address_line2 || undefined,
            city: data.city,
            state: data.state,
            postal_code: data.postal_code || "",
            country: data.country || "US",
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            google_place_id: data.google_place_id || "",
            formatted_address: `${data.address}, ${data.city}, ${data.state} ${data.postal_code}`,
          });
        }
      }
    }
    fetchLatestProject();
  }, [initialProject.id, supabase]);

  // Fetch user data and project creator
  useEffect(() => {
    async function fetchUserAndCreator() {
      // Fetch current user
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      if (userData) setUser(userData);

      // Fetch project creator if different from current user
      if (project.user_id) {
        const { data: creatorData } = await supabase
          .from("users")
          .select("id, email, full_name, avatar_url")
          .eq("id", project.user_id)
          .single();
        if (creatorData) {
          const creator = creatorData as { id: string; email: string | null; full_name: string | null; avatar_url: string | null };
          setCreator({
            id: creator.id,
            email: creator.email || "",
            full_name: creator.full_name,
            avatar_url: creator.avatar_url,
          });
        }
      }
    }
    fetchUserAndCreator();
  }, [userId, project.user_id, supabase]);

  // Save helper with feedback
  const saveToDatabase = useCallback(
    async (updates: Partial<ProjectRow>) => {
      setSaving(true);
      setSaveMessage(null);
      try {
        // RLS handles access control based on org membership and visibility settings
        const { data, error } = await (supabase.from("projects").update as any)({
          ...updates,
          updated_at: new Date().toISOString(),
        })
          .eq("id", project.id)
          .select()
          .single();

        if (error) throw error;
        setProject(data);
        setSaveMessage("Saved");
        setTimeout(() => setSaveMessage(null), 2000);
        return true;
      } catch (error: any) {
        console.error("Save failed:", error);
        setSaveMessage("Error saving");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [project.id, userId, supabase]
  );

  // Handle details save
  const handleSaveDetails = useCallback(async () => {
    const success = await saveToDatabase({
      name: editName.trim() || project.name,
      description: editDescription.trim() || null,
    });
    if (success) {
      setIsEditingDetails(false);
    }
  }, [editName, editDescription, project.name, saveToDatabase]);

  // Save address to database (used after duplicate check)
  const saveAddressToDatabase = useCallback(
    async (newAddress: AddressData) => {
      setAddressData(newAddress);
      await saveToDatabase({
        address: newAddress.address,
        address_line2: newAddress.address_line2 || null,
        city: newAddress.city,
        state: newAddress.state,
        postal_code: newAddress.postal_code,
        country: newAddress.country,
        latitude: newAddress.latitude,
        longitude: newAddress.longitude,
        google_place_id: newAddress.google_place_id,
      });
    },
    [saveToDatabase]
  );

  // Handle address change with duplicate check and verification
  const handleAddressChange = useCallback(
    async (newAddress: AddressData | null) => {
      if (!newAddress) {
        setAddressData(null);
        return;
      }

      // Check for duplicates if we have an organization
      if (org?.id && newAddress.address && newAddress.city && newAddress.state) {
        try {
          const duplicate = await findDuplicateProject(
            org.id,
            newAddress.address,
            newAddress.city,
            newAddress.state,
            project.id // Exclude current project
          );

          if (duplicate) {
            // Store pending address and show dialog
            setPendingAddressData(newAddress);
            setDuplicateResult(duplicate);
            setShowDuplicateDialog(true);
            return;
          }
        } catch (err) {
          // If duplicate check fails, proceed anyway
          console.warn("Duplicate check failed:", err);
        }
      }

      // If project is NOT paid, show verification modal
      if (!project.payment_completed) {
        setVerificationAddressData(newAddress);
        setShowVerificationModal(true);
        return;
      }

      // Already paid, save directly
      await saveAddressToDatabase(newAddress);
    },
    [org?.id, project.id, project.payment_completed, saveAddressToDatabase]
  );

  // Handle duplicate dialog confirmation
  const handleDuplicateConfirm = useCallback(async () => {
    if (pendingAddressData) {
      await saveAddressToDatabase(pendingAddressData);
    }
    setShowDuplicateDialog(false);
    setPendingAddressData(null);
    setDuplicateResult(null);
  }, [pendingAddressData, saveAddressToDatabase]);

  // Handle duplicate dialog cancel
  const handleDuplicateCancel = useCallback(() => {
    setShowDuplicateDialog(false);
    setPendingAddressData(null);
    setDuplicateResult(null);
  }, []);

  // Handle verification modal - confirm with SF pool
  const handleVerificationConfirmWithPool = useCallback(async () => {
    if (!verificationAddressData || !org) return;

    try {
      // Deduct from SF pool
      const res = await fetch(`/api/orgs/${org.id}/sf-pool/deduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          squareFootage: projectSF,
          notes: `Unlocked project: ${project.name}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to deduct from SF pool");
      }

      // Save address
      await saveAddressToDatabase(verificationAddressData);

      // Refresh project data
      const { data: updatedProject } = await supabase
        .from("projects")
        .select("*")
        .eq("id", project.id)
        .single();

      if (updatedProject) {
        setProject(updatedProject);
      }

      // Refresh org data to update pool balance
      await refreshOrgs();

      // Close modal
      setShowVerificationModal(false);
      setVerificationAddressData(null);
    } catch (err: any) {
      console.error("Pool verification failed:", err);
      throw err;
    }
  }, [verificationAddressData, org, project.id, project.name, projectSF, saveAddressToDatabase, supabase, refreshOrgs]);

  // Handle verification modal - confirm with promo code
  const handleVerificationConfirmWithPromo = useCallback(
    async (promoCode: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      if (!verificationAddressData) {
        return { success: false, error: "No address data" };
      }

      try {
        const res = await fetch("/api/promo-keys/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyCode: promoCode,
            projectId: project.id,
            userId: userId,
          }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          return { success: false, error: data.error || "Invalid promo code" };
        }

        // Save address
        await saveAddressToDatabase(verificationAddressData);

        // Refresh project data
        const { data: updatedProject } = await supabase
          .from("projects")
          .select("*")
          .eq("id", project.id)
          .single();

        if (updatedProject) {
          setProject(updatedProject);
        }

        // Close modal
        setShowVerificationModal(false);
        setVerificationAddressData(null);

        return { success: true, message: data.message };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to apply promo code" };
      }
    },
    [verificationAddressData, project.id, userId, saveAddressToDatabase, supabase]
  );

  // Handle verification modal cancel
  const handleVerificationCancel = useCallback(() => {
    setShowVerificationModal(false);
    setVerificationAddressData(null);
  }, []);

  const pricingTier = project.square_footage ? getPricingTier(project.square_footage) : null;

  const tabs = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "3d-model", label: "3D Model", icon: Box },
    { id: "estimation", label: "Estimation", icon: DollarSign },
  ] as const;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header - Matches Dashboard */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back + Logo */}
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-neutral-200" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                  <Building2 className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-neutral-900 hidden sm:inline">MyMetalRoofer</span>
              </div>
            </div>

            {/* Center: Project Name + Creator */}
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-neutral-900 truncate max-w-xs">
                  {project.name}
                </h1>
                <OwnershipBadge isOwn={isOwn} size="sm" />
              </div>
              {creator && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <CreatorAvatar creator={creator} size="sm" />
                  <span>
                    {isOwn ? "Created by you" : `Created by ${creator.full_name || creator.email.split("@")[0]}`}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Status + Save Indicator */}
            <div className="flex items-center gap-3">
              {/* Save Status */}
              <AnimatePresence>
                {saving && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs text-neutral-500"
                  >
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </motion.div>
                )}
                {saveMessage === "Saved" && !saving && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5 text-xs text-emerald-600"
                  >
                    <Check className="w-3 h-3" />
                    Saved
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex gap-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Stats Row */}
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  label="Square Feet"
                  value={project.square_footage?.toLocaleString() || "—"}
                  icon={BarChart3}
                  color="blue"
                />
                <StatCard
                  label="Status"
                  value={project.payment_completed ? "Verified" : "Draft"}
                  icon={project.payment_completed ? CheckCircle2 : Clock}
                  color={project.payment_completed ? "green" : "neutral"}
                />
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Project Details Card */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-neutral-900">Project Details</h2>
                      {!isEditingDetails ? (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingDetails(true)}>
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setIsEditingDetails(false);
                            setEditName(project.name);
                            setEditDescription(project.description || "");
                          }}>
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleSaveDetails} disabled={saving}>
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      )}
                    </div>

                    {isEditingDetails ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Project Name</label>
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Enter project name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Optional notes about the project"
                            rows={3}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-neutral-500">Name</p>
                          <p className="font-medium text-neutral-900">{project.name}</p>
                        </div>
                        {project.description && (
                          <div>
                            <p className="text-sm text-neutral-500">Description</p>
                            <p className="text-neutral-700">{project.description}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Creator Attribution */}
                    {creator && (
                      <div className="mt-6 pt-4 border-t border-neutral-100">
                        <p className="text-sm text-neutral-500 mb-2">Created by</p>
                        <div className="flex items-center gap-3">
                          <CreatorAvatar creator={creator} size="md" />
                          <div>
                            <p className="font-medium text-neutral-900">
                              {creator.full_name || creator.email.split("@")[0]}
                              {isOwn && <span className="ml-2 text-blue-600 text-sm">(You)</span>}
                            </p>
                            <p className="text-sm text-neutral-500">{creator.email}</p>
                          </div>
                          <div className="ml-auto">
                            <OwnershipBadge isOwn={isOwn} size="md" />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Created {new Date(project.created_at).toLocaleDateString()}
                          </div>
                          {project.updated_at && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Updated {new Date(project.updated_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Address Card */}
                  <div className={`rounded-xl border ${project.payment_completed ? "border-emerald-200 bg-emerald-50/30" : "border-neutral-200 bg-white"} p-6`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${project.payment_completed ? "bg-emerald-100" : "bg-teal-50"}`}>
                          <MapPin className={`w-4 h-4 ${project.payment_completed ? "text-emerald-600" : "text-teal-600"}`} />
                        </div>
                        <h2 className="text-lg font-semibold text-neutral-900">Property Address</h2>
                      </div>
                      {project.payment_completed && (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>

                    {project.payment_completed ? (
                      // Verified: Show address with option to change
                      <>
                        <AddressInput
                          value={addressData}
                          onChange={handleAddressChange}
                          disabled={saving}
                          placeholder="Search for an address..."
                        />
                        {addressData && (
                          <div className="mt-4 p-3 rounded-lg bg-emerald-50 text-sm text-emerald-700">
                            <p><strong>Coordinates:</strong> {addressData.latitude.toFixed(6)}, {addressData.longitude.toFixed(6)}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      // Not verified: Show address input with verification hint
                      <>
                        <AddressInput
                          value={addressData}
                          onChange={handleAddressChange}
                          disabled={saving}
                          placeholder="Search for an address..."
                        />
                        <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-sm text-blue-700 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>
                              Entering an address will prompt verification. You can use your organization's SF pool or a promo code to unlock this project.
                            </span>
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* CAD Export Section (if paid) */}
                  {project.payment_completed && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Package className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-neutral-900">CAD Files Ready</h2>
                          <p className="text-sm text-neutral-600">Download your project files</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {["DWG", "DXF", "PDF", "CSV"].map((format) => (
                          <Button key={format} variant="outline" className="bg-white">
                            <Download className="w-4 h-4 mr-2" />
                            {format}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Project Info */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-6">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">Project Info</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Created
                        </span>
                        <span className="font-medium text-neutral-900">
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          Updated
                        </span>
                        <span className="font-medium text-neutral-900">
                          {new Date(project.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      {pricingTier && (
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">Pricing Tier</span>
                          <span className="font-medium text-neutral-900">{pricingTier.label}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="rounded-xl border border-neutral-200 bg-white p-6">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setActiveTab("3d-model")}
                      >
                        <Box className="w-4 h-4 mr-2" />
                        View 3D Model
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setActiveTab("estimation")}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Create Estimate
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Send className="w-4 h-4 mr-2" />
                        Send to Client
                      </Button>
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <ProjectActivityTimeline projectId={project.id} />
                </div>
              </div>
            </motion.div>
          )}

          {/* 3D MODEL TAB */}
          {activeTab === "3d-model" && (
            <motion.div
              key="3d-model"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-neutral-200 bg-white overflow-hidden"
              style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}
            >
              <ProjectViewer
                projectId={project.id}
                projectName={project.name}
                onCanvasReady={(canvas) => {
                  canvasRef.current = canvas;
                }}
              />
            </motion.div>
          )}

          {/* ESTIMATION TAB */}
          {activeTab === "estimation" && (
            <motion.div
              key="estimation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EstimationTab
                project={project}
                user={user}
                userId={userId}
                organizationId={org?.id}
                addressData={addressData}
                canvasRef={canvasRef}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Duplicate Address Warning Dialog */}
      <DuplicateAddressDialog
        open={showDuplicateDialog}
        onOpenChange={setShowDuplicateDialog}
        duplicate={duplicateResult}
        address={pendingAddressData ? `${pendingAddressData.address}, ${pendingAddressData.city}, ${pendingAddressData.state}` : ""}
        onConfirm={handleDuplicateConfirm}
        onCancel={handleDuplicateCancel}
      />

      {/* Address Verification Modal */}
      {showVerificationModal && verificationAddressData && (
        <AddressVerificationModal
          addressData={{
            address: verificationAddressData.address,
            city: verificationAddressData.city,
            state: verificationAddressData.state,
            zip: verificationAddressData.postal_code,
          }}
          squareFootage={projectSF}
          sfPool={pool}
          projectId={project.id}
          userId={userId}
          onConfirmWithPool={handleVerificationConfirmWithPool}
          onConfirmWithPromo={handleVerificationConfirmWithPromo}
          onCancel={handleVerificationCancel}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: any;
  color: "blue" | "green" | "amber" | "neutral";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    neutral: "bg-neutral-100 text-neutral-600",
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-neutral-500">{label}</span>
      </div>
      <p className="text-xl font-semibold text-neutral-900">{value}</p>
    </div>
  );
}
