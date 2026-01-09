"use client";

/**
 * PROJECT PAGE CLIENT - Individual Project Detail View
 *
 * Full-featured project detail page with 3D viewer, address management,
 * quote calculator, and export functionality.
 *
 * KY - KEY SECTIONS:
 * 1. Line 89-103: Integration point for loading/generating roof_data
 * 2. handleAddressUpdate (search for it): Saves address changes and should trigger roof regeneration
 * 3. ProjectViewer component: Displays 3D model from roof_data (see ProjectViewer.tsx)
 * 4. Pricing/quote calculations: Based on square_footage from roof_data
 *
 * KY - DATA FLOW:
 * 1. Page loads project from Supabase (passed as prop from server component)
 * 2. If project has address but no roof_data:
 *    - Call /api/roof-generate with lat/lng
 *    - Update project.roof_data with geometry results
 * 3. Pass roof_data to ProjectViewer component for 3D visualization
 * 4. Use roof_data.total_area_sf for quote calculations and Stripe pricing
 *
 * KY - TABS:
 * - Overview: Project info, address, 3D viewer
 * - Quote: Cost breakdown (materials, labor, fees)
 * - Takeoff: Material list (panels, trims) - populated from roof_data.measurements
 * - Export: PDF/CSV download functionality
 */

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Save,
  Loader2,
  Settings,
  User,
  MapPin,
  Calendar,
  FileText,
  Box,
  DollarSign,
  Clock,
  Check,
  Download,
  Send,
  Package,
  BarChart3,
  CheckCircle2,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ProjectDetails from "@/components/project/ProjectDetails";
import ProjectViewer from "@/components/project/ProjectViewer";
import AddressInput, { type AddressData } from "@/components/project/AddressInput";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getPricingTier, hasActiveSubscription } from "@/lib/pricing";
import type { Tables } from "@/lib/database.types";

type ProjectRow = Tables<"projects">;
type UserRow = Tables<"users">;

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

  // Local state
  const [project, setProject] = useState<ProjectRow>(initialProject);
  const [user, setUser] = useState<UserRow | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Quote state (mock data)
  const [quote, setQuote] = useState({
    materialsCost: 4500,
    laborCost: 3200,
    permitsFees: 450,
    contingency: 315,
  });

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

  // KY - INTEGRATION POINT:
  // Load roof geometry data when project loads
  // If project.roof_data is null, trigger generation:
  // useEffect(() => {
  //   if (project.latitude && !project.roof_data) {
  //     fetch('/api/roof-generate', {
  //       method: 'POST',
  //       body: JSON.stringify({ projectId: project.id, latitude: project.latitude, longitude: project.longitude })
  //     }).then(res => res.json()).then(data => {
  //       // Update project with roof_data
  //       supabase.from('projects').update({ roof_data: data }).eq('id', project.id)
  //     })
  //   }
  // }, [project.id, project.latitude, project.roof_data])

  // Fetch user data
  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) setUser(data);
    }
    fetchUser();
  }, [userId, supabase]);

  /**
   * ⚠️ PRESERVED SUPABASE LOGIC - DO NOT MODIFY
   * Update project details (name, description, square_footage, etc.)
   */
  const handleUpdateProject = useCallback(
    async (updates: Partial<ProjectRow>) => {
      setIsUpdating(true);
      setSaveStatus("saving");

      try {
        const { data, error } = await (supabase
          .from("projects")
          .update as any)({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("id", project.id)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;

        setProject(data);
        setSaveStatus("saved");
        setLastSavedTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error: any) {
        console.error("Failed to update project:", error);
        setSaveStatus("error");
        alert("Failed to update project. Please try again.");
      } finally {
        setIsUpdating(false);
      }
    },
    [project.id, userId, supabase]
  );

  /**
   * ⚠️ PRESERVED SUPABASE LOGIC - DO NOT MODIFY
   * Handle address change and auto-save
   */
  const handleAddressChange = useCallback(
    async (newAddress: AddressData | null) => {
      setAddressData(newAddress);

      if (newAddress) {
        setIsSavingAddress(true);
        setSaveStatus("saving");

        try {
          const { data, error } = await (supabase
            .from("projects")
            .update as any)({
              address: newAddress.address,
              address_line2: newAddress.address_line2 || null,
              city: newAddress.city,
              state: newAddress.state,
              postal_code: newAddress.postal_code,
              country: newAddress.country,
              latitude: newAddress.latitude,
              longitude: newAddress.longitude,
              google_place_id: newAddress.google_place_id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", project.id)
            .eq("user_id", userId)
            .select()
            .single();

          if (error) throw error;

          setProject(data);
          setSaveStatus("saved");
          setLastSavedTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch (error: any) {
          console.error("Failed to save address:", error);
          setSaveStatus("error");
          alert("Failed to save address. Please try again.");
        } finally {
          setIsSavingAddress(false);
        }
      }
    },
    [project.id, userId, supabase]
  );

  // Calculate pricing
  const pricingTier = project.square_footage
    ? getPricingTier(project.square_footage)
    : null;

  const hasSubscription = user
    ? hasActiveSubscription(user)
    : false;

  const totalQuote = quote.materialsCost + quote.laborCost + quote.permitsFees + quote.contingency;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-neutral-50 to-stone-50">
      {/* Enhanced Header with Autosave Indicator */}
      <header className="sticky top-0 z-50 border-b border-white/20 bg-white/70 backdrop-blur-xl shadow-sm">
        <div className="mx-auto max-w-[1920px] px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Back Button */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-white/80 hover:text-neutral-900"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            {/* Center: Project Title */}
            <div className="flex-1 mx-6">
              <h1 className="text-center text-lg font-semibold text-neutral-900 truncate">
                {project.name}
              </h1>
            </div>

            {/* Right: Save Status + User Avatar */}
            <div className="flex items-center gap-3">
              {/* Autosave Status */}
              <AnimatePresence mode="wait">
                {saveStatus === "saving" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs text-blue-700"
                  >
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </motion.div>
                )}
                {saveStatus === "saved" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700"
                  >
                    <Check className="h-3 w-3" />
                    Saved {lastSavedTime && `at ${lastSavedTime}`}
                  </motion.div>
                )}
                {saveStatus === "error" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="rounded-full bg-red-50 px-3 py-1.5 text-xs text-red-700"
                  >
                    Error saving
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User Avatar */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md transition-all hover:shadow-lg hover:scale-105"
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || user.email}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </button>

                {/* Settings Dropdown */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-12 w-56 rounded-xl border border-neutral-200 bg-white/95 backdrop-blur-xl shadow-xl"
                    >
                      <div className="p-3 border-b border-neutral-100">
                        <p className="text-sm font-medium text-neutral-900">{user?.full_name || "User"}</p>
                        <p className="text-xs text-neutral-500">{user?.email}</p>
                      </div>
                      <div className="p-2">
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          <Settings className="h-4 w-4" />
                          Account Settings
                        </Link>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          All Projects
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Tabbed Interface */}
      <div className="mx-auto max-w-[1920px] p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Tab Navigation - Apple-style */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/50 bg-white/80 p-2 shadow-lg backdrop-blur-xl"
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-2 bg-transparent">
              <TabsTrigger
                value="overview"
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger
                value="3d-model"
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <Box className="h-4 w-4" />
                <span className="hidden sm:inline">3D Model</span>
              </TabsTrigger>
              <TabsTrigger
                value="materials"
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">CAD Export</span>
              </TabsTrigger>
              <TabsTrigger
                value="quote"
                className="flex items-center gap-2 rounded-xl data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Quote</span>
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* Tab Content with Framer Motion Transitions */}
          <AnimatePresence mode="wait">
            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="mt-0">
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 gap-6 lg:grid-cols-3"
              >
                {/* Left Column - Project Details */}
                <div className="space-y-6 lg:col-span-2">
                  {/* Project Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-lg backdrop-blur-xl text-center"
                    >
                      <BarChart3 className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold text-neutral-900">
                        {project.square_footage?.toLocaleString() || "—"}
                      </p>
                      <p className="text-xs text-neutral-600">Square Feet</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-lg backdrop-blur-xl text-center"
                    >
                      <MapPin className="h-6 w-6 mx-auto mb-2 text-teal-500" />
                      <p className="text-2xl font-bold text-neutral-900">
                        {addressData ? "✓" : "—"}
                      </p>
                      <p className="text-xs text-neutral-600">Address Set</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-lg backdrop-blur-xl text-center"
                    >
                      <DollarSign className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                      <p className="text-2xl font-bold text-neutral-900">
                        ${totalQuote.toLocaleString()}
                      </p>
                      <p className="text-xs text-neutral-600">Est. Total</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-lg backdrop-blur-xl text-center"
                    >
                      <Check className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold text-neutral-900">
                        {project.payment_completed ? "Paid" : "Pending"}
                      </p>
                      <p className="text-xs text-neutral-600">Status</p>
                    </motion.div>
                  </div>

                  {/* Project Details Card */}
                  <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
                    <ProjectDetails
                      project={project}
                      onUpdate={handleUpdateProject}
                      isUpdating={isUpdating}
                    />
                  </div>

                  {/* Address Card */}
                  <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
                    <div className="mb-4 flex items-center gap-2">
                      <div className="rounded-lg bg-teal-100 p-2">
                        <MapPin className="h-5 w-5 text-teal-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-900">
                        Property Location
                      </h3>
                    </div>
                    <AddressInput
                      value={addressData}
                      onChange={handleAddressChange}
                      disabled={isSavingAddress}
                      placeholder="Search address..."
                    />
                    {addressData && (
                      <div className="mt-4 rounded-xl bg-neutral-50 p-4 text-sm">
                        <p className="text-neutral-600">
                          <strong>Coordinates:</strong><br />
                          {addressData.latitude.toFixed(6)}, {addressData.longitude.toFixed(6)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Metadata & Actions */}
                <div className="space-y-6">
                  {/* Project Metadata */}
                  <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
                    <h3 className="mb-4 text-lg font-semibold text-neutral-900">
                      Project Info
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-600">Created</span>
                        <span className="font-medium text-neutral-900">
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-600">Last Updated</span>
                        <span className="font-medium text-neutral-900">
                          {new Date(project.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-600">Payment</span>
                        <Badge variant={project.payment_completed ? "default" : "secondary"}>
                          {project.payment_completed ? "Completed" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
                    <h3 className="mb-4 text-lg font-semibold text-neutral-900">
                      Quick Actions
                    </h3>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setActiveTab("quote")}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export Quote PDF
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => alert("Share coming soon!")}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send to Client
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setActiveTab("3d-model")}
                      >
                        <Box className="mr-2 h-4 w-4" />
                        View 3D Model
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            {/* 3D MODEL TAB */}
            <TabsContent value="3d-model" className="mt-0">
              <motion.div
                key="3d-model"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-white/50 bg-white/80 shadow-2xl backdrop-blur-xl overflow-hidden"
                style={{ height: "calc(100vh - 240px)", minHeight: "600px" }}
              >
                <ProjectViewer
                  projectId={project.id}
                  projectName={project.name}
                />
              </motion.div>
            </TabsContent>

            {/* CAD EXPORT TAB */}
            <TabsContent value="materials" className="mt-0">
              <motion.div
                key="materials"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                {project.payment_completed ? (
                  // UNLOCKED - Show CAD Export Options
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left - CAD Export Options */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="rounded-lg bg-emerald-100 p-2">
                            <Package className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-neutral-900">
                              CAD Files & Specifications
                            </h2>
                            <p className="text-sm text-neutral-600">
                              Export detailed technical drawings for your metal roof project
                            </p>
                          </div>
                        </div>

                        {/* Export Formats */}
                        <div className="space-y-4 mb-6">
                          <h3 className="text-lg font-semibold text-neutral-900">Available Export Formats</h3>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[
                              { format: "DWG", desc: "AutoCAD Drawing", icon: "📐" },
                              { format: "DXF", desc: "Drawing Exchange Format", icon: "📄" },
                              { format: "PDF", desc: "Technical Drawings", icon: "📋" },
                              { format: "CSV", desc: "Material Cut List", icon: "📊" },
                            ].map((item) => (
                              <button
                                key={item.format}
                                className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 bg-white hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                              >
                                <span className="text-2xl">{item.icon}</span>
                                <div>
                                  <p className="font-semibold text-neutral-900">{item.format}</p>
                                  <p className="text-xs text-neutral-600">{item.desc}</p>
                                </div>
                                <Download className="ml-auto h-5 w-5 text-neutral-400" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Technical Specifications */}
                        <div className="rounded-xl bg-neutral-50 p-4 space-y-3">
                          <h4 className="text-sm font-semibold text-neutral-900">Technical Specifications</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-neutral-600">Roof Area</p>
                              <p className="font-medium text-neutral-900">2,500 SF</p>
                            </div>
                            <div>
                              <p className="text-neutral-600">Panel Type</p>
                              <p className="font-medium text-neutral-900">Standing Seam</p>
                            </div>
                            <div>
                              <p className="text-neutral-600">Gauge</p>
                              <p className="font-medium text-neutral-900">24 Gauge</p>
                            </div>
                            <div>
                              <p className="text-neutral-600">Coating</p>
                              <p className="font-medium text-neutral-900">Kynar 500</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Material Cut List */}
                      <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
                        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                          Material Cut List
                        </h3>
                        <div className="space-y-2">
                          {[
                            { item: "16\" Standing Seam Panels", qty: "42 sheets", length: "20' each" },
                            { item: "Ridge Cap", qty: "65 LF", length: "10' lengths" },
                            { item: "Eave Trim", qty: "120 LF", length: "12' lengths" },
                            { item: "Gable Trim", qty: "80 LF", length: "10' lengths" },
                            { item: "Panel Clips", qty: "840 pcs", length: "—" },
                            { item: "Self-Tapping Screws", qty: "12 lbs", length: "#10 x 1\"" },
                          ].map((material, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-neutral-900">{material.item}</p>
                                <p className="text-xs text-neutral-600">{material.length}</p>
                              </div>
                              <span className="text-sm font-semibold text-neutral-700">{material.qty}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right - Download Actions */}
                    <div className="space-y-6">
                      <div className="rounded-2xl border border-white/50 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-lg backdrop-blur-xl">
                        <div className="flex items-center gap-2 mb-4">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <h3 className="text-lg font-semibold text-neutral-900">
                            Export Ready
                          </h3>
                        </div>

                        <p className="text-sm text-neutral-600 mb-6">
                          Your project has been unlocked. Download CAD files and technical specifications for fabrication.
                        </p>

                        <div className="space-y-3">
                          <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                            <Download className="mr-2 h-4 w-4" />
                            Download All Files (.zip)
                          </Button>
                          <Button variant="outline" className="w-full">
                            <FileText className="mr-2 h-4 w-4" />
                            Technical Specifications PDF
                          </Button>
                          <Button variant="outline" className="w-full">
                            <Package className="mr-2 h-4 w-4" />
                            Material Cut List (CSV)
                          </Button>
                        </div>
                      </div>

                      {/* Project Info */}
                      <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
                        <h4 className="text-sm font-semibold text-neutral-900 mb-3">
                          Project Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Square Footage</span>
                            <span className="font-medium text-neutral-900">2,500 SF</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Pricing Tier</span>
                            <span className="font-medium text-neutral-900">
                              {pricingTier?.label || "Standard"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Project Fee</span>
                            <span className="font-medium text-neutral-900">
                              ${pricingTier?.price ? (pricingTier.price / 100).toFixed(2) : "60.00"}
                            </span>
                          </div>
                          <div className="border-t border-neutral-200 pt-2 mt-2">
                            <div className="flex justify-between">
                              <span className="text-neutral-600">Status</span>
                              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                <CheckCircle2 className="h-3 w-3" />
                                Paid
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // LOCKED - Show Paywall
                  <div className="rounded-2xl border border-white/50 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/20 p-12 shadow-lg backdrop-blur-xl">
                    <div className="max-w-2xl mx-auto text-center">
                      {/* Lock Icon */}
                      <div className="relative mx-auto mb-6 w-20 h-20">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 opacity-20 blur-xl"></div>
                        <div className="relative rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-6 flex items-center justify-center">
                          <Package className="h-8 w-8 text-white" />
                        </div>
                      </div>

                      <h2 className="text-3xl font-bold text-neutral-900 mb-3">
                        CAD Files & Specifications
                      </h2>
                      <p className="text-neutral-600 mb-8">
                        Unlock detailed CAD drawings, cut lists, and technical specifications for your metal roof project
                      </p>

                      {/* Features List */}
                      <div className="rounded-xl bg-white/80 p-6 mb-8 text-left">
                        <h3 className="text-lg font-semibold text-neutral-900 mb-4">What's Included:</h3>
                        <ul className="space-y-3">
                          {[
                            "Complete CAD files (DWG, DXF formats)",
                            "Technical specification PDF with dimensions",
                            "Material cut list with exact quantities",
                            "Panel layout and installation guide",
                            "Trim and flashing specifications",
                            "Fastener schedule and placement diagrams",
                          ].map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm">
                              <CheckCircle2 className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                              <span className="text-neutral-700">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Pricing */}
                      <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white mb-6">
                        {hasSubscription ? (
                          // User has subscription - show only project fee
                          <>
                            <div className="flex items-center justify-between">
                              <div className="text-left">
                                <p className="text-sm opacity-90">Project Square Footage</p>
                                <p className="text-3xl font-bold mt-1">2,500 SF</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm opacity-90">One-Time Fee</p>
                                <p className="text-3xl font-bold mt-1">
                                  ${pricingTier?.price ? (pricingTier.price / 100).toFixed(2) : "60.00"}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs opacity-75 mt-4">
                              Based on {pricingTier?.label || "1,501 - 3,000 SF"} tier pricing
                            </p>
                          </>
                        ) : (
                          // User doesn't have subscription - show subscription + project fee breakdown
                          <>
                            <div className="space-y-3 mb-4">
                              <div className="flex justify-between items-center">
                                <span className="text-sm opacity-90">Project Fee (2,500 SF)</span>
                                <span className="text-lg font-semibold">
                                  ${pricingTier?.price ? (pricingTier.price / 100).toFixed(2) : "60.00"}
                                </span>
                              </div>
                            </div>
                            <div className="border-t border-white/20 pt-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm opacity-90">Total Today</span>
                                <span className="text-3xl font-bold">
                                  ${((1000 + (pricingTier?.price || 6000)) / 100).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* CTA */}
                      {hasSubscription ? (
                        <Button
                          size="lg"
                          className="bg-white text-blue-600 hover:bg-neutral-50 px-8 py-6 text-lg font-semibold"
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/stripe/checkout", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  userId,
                                  projectId: project.id,
                                  type: "per_project",
                                  squareFootage: 2500,
                                }),
                              });

                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || "Failed to create checkout");

                              if (data.url) {
                                window.location.href = data.url;
                              }
                            } catch (err: any) {
                              console.error("Checkout error:", err);
                              alert(err.message || "Failed to start checkout. Please try again.");
                            }
                          }}
                        >
                          <CreditCard className="mr-2 h-5 w-5" />
                          Unlock CAD Files - ${pricingTier?.price ? (pricingTier.price / 100).toFixed(2) : "60.00"}
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          className="bg-white text-blue-600 hover:bg-neutral-50 px-8 py-6 text-lg font-semibold"
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/stripe/checkout", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  userId,
                                  projectId: project.id,
                                  type: "subscription_plus_project",
                                  squareFootage: 2500,
                                }),
                              });

                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || "Failed to create checkout");

                              if (data.url) {
                                window.location.href = data.url;
                              }
                            } catch (err: any) {
                              console.error("Checkout error:", err);
                              alert(err.message || "Failed to start checkout. Please try again.");
                            }
                          }}
                        >
                          <CreditCard className="mr-2 h-5 w-5" />
                          Subscribe + Unlock - ${((1000 + (pricingTier?.price || 6000)) / 100).toFixed(2)}
                        </Button>
                      )}

                      <p className="text-xs text-neutral-500 mt-6">
                        Secure payment • Instant download • Cancel anytime
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </TabsContent>

            {/* QUOTE & INVOICE TAB */}
            <TabsContent value="quote" className="mt-0">
              <motion.div
                key="quote"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 gap-6 lg:grid-cols-3"
              >
                {/* Left - Quote Preview */}
                <div className="lg:col-span-2">
                  <div className="rounded-2xl border border-white/50 bg-white/80 p-8 shadow-lg backdrop-blur-xl">
                    {/* Quote Header */}
                    <div className="mb-8 flex items-start justify-between border-b border-neutral-200 pb-6">
                      <div>
                        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                          Project Quote
                        </h1>
                        <p className="text-sm text-neutral-600">{project.name}</p>
                        {addressData && (
                          <p className="text-sm text-neutral-600">
                            {addressData.formatted_address}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-neutral-600">Quote Date</p>
                        <p className="text-sm font-medium text-neutral-900">
                          {new Date().toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Line Items */}
                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between py-3 border-b border-neutral-100">
                        <div>
                          <p className="font-medium text-neutral-900">Materials</p>
                          <p className="text-sm text-neutral-600">
                            Standing seam panels, synthetic underlayment
                          </p>
                        </div>
                        <p className="font-medium text-neutral-900">
                          ${quote.materialsCost.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex justify-between py-3 border-b border-neutral-100">
                        <div>
                          <p className="font-medium text-neutral-900">Labor</p>
                          <p className="text-sm text-neutral-600">
                            Installation and removal ({project.square_footage} SF)
                          </p>
                        </div>
                        <p className="font-medium text-neutral-900">
                          ${quote.laborCost.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex justify-between py-3 border-b border-neutral-100">
                        <div>
                          <p className="font-medium text-neutral-900">Permits & Fees</p>
                          <p className="text-sm text-neutral-600">Building permits and inspections</p>
                        </div>
                        <p className="font-medium text-neutral-900">
                          ${quote.permitsFees.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex justify-between py-3 border-b border-neutral-100">
                        <div>
                          <p className="font-medium text-neutral-900">Contingency (5%)</p>
                          <p className="text-sm text-neutral-600">Unforeseen conditions</p>
                        </div>
                        <p className="font-medium text-neutral-900">
                          ${quote.contingency.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm opacity-90">Total Project Cost</p>
                          <p className="text-xs opacity-75 mt-1">Valid for 30 days</p>
                        </div>
                        <p className="text-4xl font-bold">
                          ${totalQuote.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Terms */}
                    <div className="mt-8 rounded-xl bg-neutral-50 p-4">
                      <p className="text-xs font-medium text-neutral-700 mb-2">Terms & Conditions</p>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        50% deposit required to begin work. Final payment due upon completion.
                        Warranty: 20-year manufacturer warranty on materials, 5-year workmanship guarantee.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right - Actions */}
                <div className="space-y-6">
                  <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                      Quote Actions
                    </h3>
                    <div className="space-y-3">
                      <Button className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Send className="mr-2 h-4 w-4" />
                        Send to Client
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Clock className="mr-2 h-4 w-4" />
                        View History
                      </Button>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                      Payment Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-600">Deposit (50%)</span>
                        <Badge variant={project.payment_completed ? "default" : "secondary"}>
                          {project.payment_completed ? "Paid" : "Pending"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-neutral-600">Final Payment</span>
                        <Badge variant="secondary">Pending</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>

          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  );
}
