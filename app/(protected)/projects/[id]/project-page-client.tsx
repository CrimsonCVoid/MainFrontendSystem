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
  Package,
  BarChart3,
  CheckCircle2,
<<<<<<< HEAD
  AlertCircle,
=======
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
  Building2,
  Calendar,
  Clock,
  Pencil,
  Save,
  X,
<<<<<<< HEAD
=======
  Layers,
  Zap,
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ProjectViewer from "@/components/project/ProjectViewer";
<<<<<<< HEAD
import AddressInput, { type AddressData } from "@/components/project/AddressInput";
import EstimationTab from "@/components/project/EstimationTab";
=======
import { type AddressData } from "@/components/project/AddressInput";
import EstimationTab from "@/components/project/EstimationTab";
import CutSheetTab from "@/components/project/CutSheetTab";
import ProposalBuilder from "@/components/project/ProposalBuilder";
import PhotoGalleryTab from "@/components/project/PhotoGalleryTab";
import FinancialsTab from "@/components/project/FinancialsTab";
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
import { DuplicateAddressDialog } from "@/components/project/DuplicateAddressDialog";
import { OwnershipBadge } from "@/components/project/OwnershipBadge";
import { CreatorAvatar } from "@/components/project/CreatorAvatar";
import { ProjectActivityTimeline } from "@/components/project/ProjectActivityTimeline";
import AddressVerificationModal from "@/components/project/AddressVerificationModal";
<<<<<<< HEAD
=======
import { GoogleMapsEmbed } from "@/components/project/GoogleMapsEmbed";
import { ProjectHelpButton } from "@/components/project/ProjectHelpButton";
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getPricingTier } from "@/lib/pricing";
import { findDuplicateProject, type DuplicateProjectResult } from "@/lib/projects";
import type { Tables } from "@/lib/database.types";
import { useOrg, useSFPool } from "@/components/providers/org-provider";
<<<<<<< HEAD
=======
import { generateAndDownloadProposal, type ProposalData } from "@/lib/pdf-generator";
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa

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
<<<<<<< HEAD
  const [activeTab, setActiveTab] = useState<"overview" | "3d-model" | "estimation">("overview");
=======
  const [activeTab, setActiveTab] = useState<"overview" | "3d-model" | "estimation" | "cut-sheet" | "proposal" | "photos" | "financials">("overview");
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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

<<<<<<< HEAD
  // Fetch fresh project data on mount to ensure persistence
  useEffect(() => {
    async function fetchLatestProject() {
      const { data } = await supabase
        .from("projects")
=======
  // Roof generation state
  const [roofGenerating, setRoofGenerating] = useState(false);
  const [roofError, setRoofError] = useState<string | null>(null);

  // Fetch fresh project data on mount to ensure persistence
  useEffect(() => {
    async function fetchLatestProject() {
      const { data } = await (supabase
        .from("projects") as any)
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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

<<<<<<< HEAD
=======
  // Auto-generate roof data ONCE if project has address but no roof_data
  const roofGenAttempted = useRef(false);
  useEffect(() => {
    if (roofGenAttempted.current) return;
    // if (project.roof_data) return; // TODO: re-enable after testing — always regenerate for now
    if (!project.address) return;

    const fullAddress = [project.address, project.city, project.state, project.postal_code]
      .filter(Boolean)
      .join(", ");
    if (!fullAddress) return;

    roofGenAttempted.current = true;
    setRoofGenerating(true);
    setRoofError(null);

    console.log("[ProjectPage] No roof_data found, auto-generating for:", fullAddress);

    fetch("/api/roof-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, address: fullAddress }),
    })
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.error || "Generation failed");
        if (data.success && data.roofData) {
          console.log("[ProjectPage] Roof generated:", data.roofData.total_area_sf, "sf");
          setProject((prev) => ({
            ...prev,
            roof_data: data.roofData,
            square_footage: data.roofData.total_area_sf || prev.square_footage,
          }));
        }
      })
      .catch((err) => {
        console.error("[ProjectPage] Roof generation failed:", err.message);
        setRoofError(err.message);
      })
      .finally(() => setRoofGenerating(false));
  }, [project.id, project.address, project.city, project.state, project.postal_code, project.roof_data]);

>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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

<<<<<<< HEAD
=======
  // Generate and download estimate PDF
  const handleDownloadPDF = useCallback(async () => {
    const fullAddress = [project.address, project.city, project.state, project.postal_code]
      .filter(Boolean)
      .join(", ");

    const data: ProposalData = {
      companyName: user?.company_name || "My Metal Roofer",
      companyLogoUrl: user?.company_logo_url || null,
      companyPhone: user?.company_phone || null,
      companyAddress: user?.company_address || null,
      companyEmail: user?.company_email || undefined,
      companyWebsite: user?.company_website || undefined,
      projectName: project.name,
      projectAddress: fullAddress || "Address not set",
      squareFootage: Number(project.square_footage) || 0,
      estimateName: `${project.name} Estimate`,
      materialsCost: 0,
      laborCost: 0,
      permitsFees: 0,
      contingency: 0,
      totalCost: 0,
      notes: project.description || "",
      roofImageDataUrl: null,
      estimateDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      validUntil: new Date(Date.now() + 30 * 86400000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    };

    // Try to pull estimate data from the project's active estimate
    try {
      const { data: estimates } = await (supabase.from("project_estimates") as any)
        .select("*")
        .eq("project_id", project.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (estimates?.[0]) {
        const est = estimates[0];
        data.materialsCost = Number(est.materials_cost) || 0;
        data.laborCost = Number(est.labor_cost) || 0;
        data.permitsFees = Number(est.permits_fees) || 0;
        data.contingency = Number(est.contingency) || 0;
        data.totalCost = Number(est.total_cost) || data.materialsCost + data.laborCost + data.permitsFees + data.contingency;
        data.estimateName = est.name || data.estimateName;
        if (est.notes) data.notes = est.notes;
      }
    } catch (err) {
      console.warn("Could not load estimate for PDF:", err);
    }

    await generateAndDownloadProposal(data);
  }, [project, user, supabase]);

>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
=======
    { id: "cut-sheet", label: "Cut Sheet", icon: Layers },
    { id: "photos", label: "Photos", icon: Calendar },
    { id: "financials", label: "Financials", icon: DollarSign },
    { id: "proposal", label: "Proposal", icon: FileText },
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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

<<<<<<< HEAD
            {/* Right: Status + Save Indicator */}
            <div className="flex items-center gap-3">
=======
            {/* Right: Help + Save Indicator */}
            <div className="flex items-center gap-3">
              {/* Help Button */}
              <ProjectHelpButton />

>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
          <nav className="flex gap-1 -mb-px">
=======
          <nav className="flex gap-1 -mb-px" data-tutorial="project-tabs">
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
=======
      <main className={activeTab === "3d-model" ? "" : "max-w-7xl mx-auto px-4 sm:px-6 py-6"}>
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
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
=======
              {/* Hero Stats Row - 4 columns */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Square Feet"
                  value={project.square_footage?.toLocaleString() || "—"}
                  subValue={project.square_footage ? "Total roof area" : undefined}
                  icon={BarChart3}
                  color="blue"
                  size="large"
                />
                <StatCard
                  label="Created"
                  value={new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  subValue={new Date(project.created_at).getFullYear().toString()}
                  icon={Calendar}
                  color="slate"
                />
                <StatCard
                  label="Updated"
                  value={new Date(project.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  subValue={new Date(project.updated_at).getFullYear().toString()}
                  icon={Clock}
                  color="neutral"
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                />
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Project Details Card */}
<<<<<<< HEAD
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
=======
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow" data-tutorial="project-details">
                    {/* Gradient Header */}
                    <div className="bg-gradient-to-r from-slate-50 to-neutral-50 px-6 py-4 border-b border-neutral-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-200/70 flex items-center justify-center">
                            <Layers className="w-4 h-4 text-slate-600" />
                          </div>
                          <h2 className="text-lg font-semibold text-neutral-900">Project Details</h2>
                        </div>
                        {!isEditingDetails ? (
                          <Button variant="ghost" size="sm" onClick={() => setIsEditingDetails(true)} className="text-slate-600 hover:text-slate-800 hover:bg-slate-100">
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => {
                              setIsEditingDetails(false);
                              setEditName(project.name);
                              setEditDescription(project.description || "");
                            }} className="text-neutral-600">
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                            <Button size="sm" onClick={handleSaveDetails} disabled={saving} className="bg-slate-600 hover:bg-slate-700">
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-6">
                      {isEditingDetails ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Project Name</label>
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Enter project name"
                              className="border-neutral-300 focus:border-slate-500 focus:ring-slate-500/20"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                            <Textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              placeholder="Optional notes about the project"
                              rows={3}
                              className="border-neutral-300 focus:border-slate-500 focus:ring-slate-500/20"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg bg-neutral-50/70 border border-neutral-100">
                            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Project Name</p>
                            <p className="text-lg font-semibold text-neutral-900">{project.name}</p>
                          </div>
                          {project.description && (
                            <div className="p-4 rounded-lg bg-neutral-50/70 border border-neutral-100">
                              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">Description</p>
                              <p className="text-neutral-700">{project.description}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Creator Attribution */}
                      {creator && (
                        <div className="mt-6 pt-5 border-t border-neutral-100">
                          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-3">Created by</p>
                          <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50/50 to-neutral-50/50 border border-blue-100/50">
                            <CreatorAvatar creator={creator} size="lg" />
                            <div className="flex-1">
                              <p className="font-semibold text-neutral-900">
                                {creator.full_name || creator.email.split("@")[0]}
                                {isOwn && <span className="ml-2 text-blue-600 text-sm font-normal">(You)</span>}
                              </p>
                              <p className="text-sm text-neutral-500">{creator.email}</p>
                            </div>
                            <OwnershipBadge isOwn={isOwn} size="md" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Address Card */}
                  <div className={`rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                    project.payment_completed
                      ? "border-emerald-200/50"
                      : "border-neutral-200"
                  }`} data-tutorial="project-address">
                    {/* Gradient Header */}
                    <div className={`px-6 py-4 border-b ${
                      project.payment_completed
                        ? "bg-gradient-to-r from-emerald-50 to-green-50/50 border-emerald-100"
                        : "bg-gradient-to-r from-neutral-50 to-slate-50/50 border-neutral-100"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            project.payment_completed ? "bg-emerald-100" : "bg-neutral-200/70"
                          }`}>
                            <MapPin className={`w-4 h-4 ${project.payment_completed ? "text-emerald-600" : "text-neutral-600"}`} />
                          </div>
                          <h2 className="text-lg font-semibold text-neutral-900">Property Address</h2>
                        </div>
                      </div>
                    </div>

                    <div className={`p-6 ${project.payment_completed ? "bg-white" : "bg-white"}`}>
                      <div className="space-y-4">
                        {addressData && (
                          <div className={`p-5 rounded-lg ${
                            project.payment_completed
                              ? "bg-gradient-to-r from-emerald-50/50 to-green-50/30 border border-emerald-100"
                              : "bg-neutral-50 border border-neutral-200"
                          }`}>
                            <p className="text-lg font-semibold text-neutral-900 mb-1">{addressData.address}</p>
                            <p className="text-neutral-600">
                              {addressData.city}, {addressData.state} {addressData.postal_code}
                            </p>
                          </div>
                        )}
                        <GoogleMapsEmbed
                          latitude={project.latitude}
                          longitude={project.longitude}
                          address={addressData ? `${addressData.address}, ${addressData.city}, ${addressData.state} ${addressData.postal_code}` : undefined}
                        />
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                      </div>
                    </div>
                  </div>

<<<<<<< HEAD
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
=======
                  {/* Roof Analysis Data */}
                  {project.roof_data && (() => {
                    const rd = project.roof_data as any;
                    return (
                      <div className="rounded-xl border border-cyan-200/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-gradient-to-r from-cyan-50 to-blue-50/50 px-6 py-4 border-b border-cyan-100/50">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center">
                              <Layers className="w-4 h-4 text-cyan-600" />
                            </div>
                            <div>
                              <h2 className="text-lg font-semibold text-neutral-900">Roof Analysis</h2>
                              <p className="text-xs text-neutral-500">Generated from satellite imagery</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-6 bg-white">
                          {/* Key Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                            <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50/50 border border-cyan-100">
                              <p className="text-xs font-medium text-cyan-600 uppercase tracking-wide">Total Area</p>
                              <p className="text-2xl font-bold text-neutral-900 mt-1">
                                {rd.total_area_sf?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </p>
                              <p className="text-xs text-neutral-500">sq ft</p>
                            </div>
                            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100">
                              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Roof Planes</p>
                              <p className="text-2xl font-bold text-neutral-900 mt-1">{rd.planes?.length || 0}</p>
                              <p className="text-xs text-neutral-500">surfaces</p>
                            </div>
                            <div className="p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50/50 border border-indigo-100">
                              <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">Avg Pitch</p>
                              <p className="text-2xl font-bold text-neutral-900 mt-1">
                                {rd.planes?.length
                                  ? (rd.planes.reduce((s: number, p: any) => s + (p.slope || 0), 0) / rd.planes.length).toFixed(1)
                                  : "—"}
                              </p>
                              <p className="text-xs text-neutral-500">degrees</p>
                            </div>
                            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50/50 border border-purple-100">
                              <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Ridge Length</p>
                              <p className="text-2xl font-bold text-neutral-900 mt-1">
                                {rd.measurements?.ridge_length_ft
                                  ? rd.measurements.ridge_length_ft.toFixed(0)
                                  : "—"}
                              </p>
                              <p className="text-xs text-neutral-500">ft</p>
                            </div>
                          </div>

                          {/* Measurements Row */}
                          {rd.measurements && (
                            <div className="grid grid-cols-3 gap-3 mb-5">
                              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50/50">
                                <span className="text-xs text-neutral-500">Eave Length</span>
                                <span className="text-sm font-semibold text-neutral-900">{rd.measurements.eave_length_ft?.toFixed(0) || "—"} ft</span>
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50/50">
                                <span className="text-xs text-neutral-500">Perimeter</span>
                                <span className="text-sm font-semibold text-neutral-900">{rd.measurements.total_perimeter_ft?.toFixed(0) || "—"} ft</span>
                              </div>
                              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50/50">
                                <span className="text-xs text-neutral-500">Panel Type</span>
                                <span className="text-sm font-semibold text-neutral-900 capitalize">{rd.panel_type?.replace(/-/g, " ") || "—"}</span>
                              </div>
                            </div>
                          )}

                          {/* Imagery Source */}
                          {rd._google_raw?.imageryDate && (
                            <div className="flex items-center gap-2 text-xs text-neutral-400 pt-3 border-t border-neutral-100">
                              <BarChart3 className="w-3 h-3" />
                              <span>
                                Satellite imagery: {rd._google_raw.imageryDate.month}/{rd._google_raw.imageryDate.day}/{rd._google_raw.imageryDate.year}
                                {rd._google_raw.postalCode && ` • ${rd._google_raw.postalCode}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* CAD Export Section (if paid) */}
                  {project.payment_completed && (
                    <div className="rounded-xl border border-emerald-200/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow" data-tutorial="project-cad">
                      <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Package className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-lg font-semibold text-white">CAD Files Ready</h2>
                            <p className="text-sm text-emerald-100">Download your professional project files</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-emerald-50 to-green-50/50 p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <Button
                            variant="outline"
                            className="bg-white hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 h-auto py-3 flex-col gap-1"
                            onClick={handleDownloadPDF}
                          >
                            <div className="flex items-center gap-2">
                              <Download className="w-4 h-4 text-emerald-600" />
                              <span className="font-semibold">PDF</span>
                            </div>
                            <span className="text-xs text-neutral-500">Print Ready</span>
                          </Button>
                          {[
                            { format: "DWG", desc: "AutoCAD" },
                            { format: "DXF", desc: "Universal" },
                            { format: "CSV", desc: "Data Export" },
                          ].map((item) => (
                            <Button
                              key={item.format}
                              variant="outline"
                              className="bg-white hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300 h-auto py-3 flex-col gap-1"
                              disabled
                            >
                              <div className="flex items-center gap-2">
                                <Download className="w-4 h-4 text-emerald-600" />
                                <span className="font-semibold">{item.format}</span>
                              </div>
                              <span className="text-xs text-neutral-500">{item.desc}</span>
                            </Button>
                          ))}
                        </div>
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-6">
<<<<<<< HEAD
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
=======
                  {/* Quick Actions */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow" data-tutorial="project-quick-actions">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 px-5 py-4 border-b border-blue-100/50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-900">Quick Actions</h3>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <Button
                        variant="outline"
                        className="w-full justify-start h-12 border-blue-200 hover:border-blue-300 hover:bg-blue-50/50 group"
                        onClick={() => setActiveTab("3d-model")}
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center mr-3 transition-colors">
                          <Box className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium">View 3D Model</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-12 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/50 group"
                        onClick={() => setActiveTab("estimation")}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center mr-3 transition-colors">
                          <DollarSign className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span className="font-medium">Create Estimate</span>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-12 border-orange-200 hover:border-orange-300 hover:bg-orange-50/50 group"
                        onClick={handleDownloadPDF}
                      >
                        <div className="w-8 h-8 rounded-lg bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center mr-3 transition-colors">
                          <FileText className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="font-medium">Download PDF Estimate</span>
                      </Button>
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
                    <div className="bg-gradient-to-r from-slate-50 to-neutral-50/50 px-5 py-4 border-b border-neutral-100">
                      <h3 className="text-lg font-semibold text-neutral-900">Project Info</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50/50">
                        <span className="text-neutral-600 flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-neutral-400" />
                          Created
                        </span>
                        <span className="font-semibold text-neutral-900">
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50/50">
                        <span className="text-neutral-600 flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-neutral-400" />
                          Updated
                        </span>
                        <span className="font-semibold text-neutral-900">
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                          {new Date(project.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      {pricingTier && (
<<<<<<< HEAD
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-500">Pricing Tier</span>
                          <span className="font-medium text-neutral-900">{pricingTier.label}</span>
=======
                        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                          <span className="text-neutral-600 text-sm">Pricing Tier</span>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                            {pricingTier.label}
                          </Badge>
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
                        </div>
                      )}
                    </div>
                  </div>

<<<<<<< HEAD
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
=======
                  {/* Activity Timeline */}
                  <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm" data-tutorial="project-activity">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50/30 px-5 py-4 border-b border-purple-100/50 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-neutral-900">Activity</h3>
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5 animate-pulse" />
                        Live
                      </Badge>
                    </div>
                    <div className="p-5">
                      <ProjectActivityTimeline projectId={project.id} />
                    </div>
                  </div>
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
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
=======
              className="fixed inset-0 top-[120px] z-10"
            >
              {roofGenerating ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 bg-neutral-50">
                  <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-neutral-900">Generating 3D Roof Model</p>
                    <p className="text-sm text-neutral-500 mt-1">Analyzing satellite imagery for {project.address}...</p>
                  </div>
                </div>
              ) : roofError ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 bg-neutral-50">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-red-600">Roof Generation Failed</p>
                    <p className="text-sm text-neutral-500 mt-1">{roofError}</p>
                    <Button
                      className="mt-4"
                      variant="outline"
                      onClick={() => {
                        setRoofError(null);
                        setProject((prev) => ({ ...prev, roof_data: null }));
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : (
                <ProjectViewer
                  projectId={project.id}
                  projectName={project.name}
                  roofData={project.roof_data}
                  onCanvasReady={(canvas) => {
                    canvasRef.current = canvas;
                  }}
                />
              )}
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
=======

          {/* CUT SHEET TAB */}
          {activeTab === "cut-sheet" && (
            <motion.div
              key="cut-sheet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <CutSheetTab project={project} roofData={project.roof_data as any} />
            </motion.div>
          )}

          {/* PHOTOS TAB */}
          {activeTab === "photos" && (
            <motion.div key="photos" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PhotoGalleryTab projectId={project.id} organizationId={project.organization_id || org?.id || ""} userId={userId} />
            </motion.div>
          )}

          {/* FINANCIALS TAB */}
          {activeTab === "financials" && (
            <motion.div key="financials" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <FinancialsTab projectId={project.id} organizationId={project.organization_id || org?.id || ""} userId={userId} clientId={project.client_id || undefined} />
            </motion.div>
          )}

          {/* PROPOSAL TAB */}
          {activeTab === "proposal" && (
            <motion.div
              key="proposal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProposalBuilder project={project} user={user} roofData={project.roof_data as any} />
            </motion.div>
          )}
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
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
<<<<<<< HEAD
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
=======
  subValue,
  icon: Icon,
  color,
  size = "default",
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: any;
  color: "blue" | "green" | "amber" | "neutral" | "slate";
  size?: "default" | "large";
}) {
  const colors = {
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100/50",
      icon: "bg-blue-100 text-blue-600",
      value: "text-blue-900",
      border: "border-blue-200/50",
    },
    green: {
      bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50",
      icon: "bg-emerald-100 text-emerald-600",
      value: "text-emerald-900",
      border: "border-emerald-200/50",
    },
    amber: {
      bg: "bg-gradient-to-br from-amber-50 to-amber-100/50",
      icon: "bg-amber-100 text-amber-600",
      value: "text-amber-900",
      border: "border-amber-200/50",
    },
    neutral: {
      bg: "bg-gradient-to-br from-neutral-50 to-neutral-100/50",
      icon: "bg-neutral-200 text-neutral-600",
      value: "text-neutral-900",
      border: "border-neutral-200/50",
    },
    slate: {
      bg: "bg-gradient-to-br from-slate-50 to-slate-100/50",
      icon: "bg-slate-200 text-slate-600",
      value: "text-slate-900",
      border: "border-slate-200/50",
    },
  };

  const styles = colors[color];
  const isLarge = size === "large";

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} p-5 hover:shadow-md transition-shadow`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`${isLarge ? "w-10 h-10" : "w-8 h-8"} rounded-lg flex items-center justify-center ${styles.icon} shadow-sm`}>
          <Icon className={`${isLarge ? "w-5 h-5" : "w-4 h-4"}`} />
        </div>
        <span className="text-sm font-medium text-neutral-600">{label}</span>
      </div>
      <p className={`${isLarge ? "text-3xl" : "text-2xl"} font-bold ${styles.value}`}>{value}</p>
      {subValue && (
        <p className="text-xs text-neutral-500 mt-1">{subValue}</p>
      )}
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
    </div>
  );
}
