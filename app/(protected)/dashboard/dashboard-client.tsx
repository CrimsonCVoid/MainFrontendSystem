"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  Loader2,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  LogOut,
  User,
  Settings,
  SortAsc,
  Filter,
  CreditCard,
} from "lucide-react";
import {
  createProject,
  deleteProject,
  listProjects,
  type ProjectInput,
  type ProjectRow,
} from "@/lib/projects";
import { getCurrentSession, getCurrentUser, onAuthStateChange, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import AddressInput, { type AddressData } from "@/components/project/AddressInput";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

type FormState = {
  name: string;
  description: string;
  address: AddressData | null;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  address: null,
};

/**
 * REDESIGNED DASHBOARD CLIENT
 *
 * Apple-level polish with address-first project creation flow.
 * Complements the project page design with consistent blue theme.
 *
 * Key Features:
 * - Address-first project creation (required field)
 * - Visual project cards with stats
 * - Search and filter functionality
 * - Smooth Framer Motion animations
 * - Empty states and loading skeletons
 * - Responsive grid layout
 */
export default function DashboardClient() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(emptyForm);
  const [createBusy, setCreateBusy] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLabel, setUserLabel] = useState<string>("there");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending">("all");

  const canSubmitCreate = useMemo(
    () => createForm.name.trim().length > 0 && createForm.address !== null,
    [createForm.name, createForm.address]
  );

  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((p) =>
        filterStatus === "paid" ? p.payment_completed : !p.payment_completed
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.address?.toLowerCase().includes(query) ||
          p.city?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "size":
          return (b.square_footage || 0) - (a.square_footage || 0);
        case "date":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filtered;
  }, [projects, searchQuery, sortBy, filterStatus]);

  const hydrateUser = useCallback(async () => {
    const session = await getCurrentSession();
    let user = session?.user ?? null;

    if (!user) {
      try {
        user = await getCurrentUser();
      } catch (err) {
        console.warn("Unable to resolve current user:", err);
      }
    }

    if (!user) {
      return false;
    }

    const name =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email ||
      "there";
    setUserLabel(name);
    return true;
  }, [router]);

  const refreshProjects = useCallback(
    async (opts: { background?: boolean } = {}) => {
      if (opts.background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await listProjects();
        setProjects(data);
        setError(null);
      } catch (err: any) {
        setError(err?.message || "Unable to load projects.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;

    const boot = async () => {
      const ready = await hydrateUser();
      if (!active || !ready) return;
      await refreshProjects();
    };

    boot();

    const unsubscribe = onAuthStateChange(async ({ event, session }) => {
      if (!active) return;

      if (event === "SIGNED_OUT") {
        setProjects([]);
        router.replace("/signin");
        return;
      }

      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION")) {
        await hydrateUser();
        await refreshProjects({ background: event !== "INITIAL_SESSION" });
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [hydrateUser, refreshProjects, router]);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmitCreate || createBusy) return;

    setCreateBusy(true);
    setError(null);

    try {
      const input: ProjectInput = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || null,
      };
      const project = await createProject(input);

      // Update project with address data
      if (createForm.address) {
        await (supabase
          .from("projects")
          .update as any)({
            address: createForm.address.address,
            address_line2: createForm.address.address_line2 || null,
            city: createForm.address.city,
            state: createForm.address.state,
            postal_code: createForm.address.postal_code,
            country: createForm.address.country,
            latitude: createForm.address.latitude,
            longitude: createForm.address.longitude,
            google_place_id: createForm.address.google_place_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", project.id);

        // KY - INTEGRATION POINT:
        // Trigger roof rendering algorithm after address is saved
        // Call your endpoint to generate roof geometry and measurements
        // Store results in project.roof_data (add JSONB column to projects table)
        // Example: await fetch('/api/roof-generate', {
        //   method: 'POST',
        //   body: JSON.stringify({
        //     projectId: project.id,
        //     latitude: createForm.address.latitude,
        //     longitude: createForm.address.longitude
        //   })
        // })
      }

      setProjects((current) => [project, ...current]);
      setCreateForm(emptyForm);
      setShowCreateModal(false);

      // Navigate to the new project
      router.push(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err?.message || "Unable to create project.");
    } finally {
      setCreateBusy(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setError(null);

    try {
      await deleteProject(projectId);
      setProjects((current) => current.filter((project) => project.id !== projectId));
    } catch (err: any) {
      setError(err?.message || "Unable to delete project.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      if (typeof window !== "undefined") {
        window.localStorage?.clear?.();
        window.sessionStorage?.clear?.();
      }
      router.replace("/signin");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-neutral-50 to-stone-50">
      {/* Enhanced Header */}
      <header className="sticky top-0 z-40 border-b border-white/20 bg-white/70 backdrop-blur-xl shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo/Title */}
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">My Metal Roofer</h1>
              <p className="text-sm text-neutral-600">Welcome back, {userLabel}</p>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              {/* Quick Nav Links */}
              <Link href="/billing">
                <Button variant="ghost" size="sm" className="hidden md:flex">
                  Billing
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="hidden md:flex">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>

              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">New Project</span>
              </Button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md transition-all hover:shadow-lg hover:scale-105"
                >
                  <User className="h-5 w-5" />
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 top-14 w-56 rounded-xl border border-neutral-200 bg-white/95 backdrop-blur-xl shadow-xl"
                    >
                      <div className="p-3 border-b border-neutral-100">
                        <p className="text-sm font-medium text-neutral-900">{userLabel}</p>
                        <p className="text-xs text-neutral-500">Roofing Professional</p>
                      </div>
                      <div className="p-2">
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-blue-100 p-2">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="text-sm font-medium text-neutral-600">Total Projects</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-900">{projects.length}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-emerald-100 p-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <h3 className="text-sm font-medium text-neutral-600">Completed</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-900">
              {projects.filter((p) => p.payment_completed).length}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-amber-100 p-2">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-sm font-medium text-neutral-600">In Progress</h3>
            </div>
            <p className="text-3xl font-bold text-neutral-900">
              {projects.filter((p) => !p.payment_completed).length}
            </p>
          </motion.div>
        </div>

        {/* Search Bar with Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          {/* Search Input */}
          <div className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-lg backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-neutral-400" />
              <Input
                placeholder="Search projects by name, address, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          {/* Sort and Filter Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <SortAsc className="h-4 w-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="date">Latest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="size">Size (Largest)</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-neutral-500" />
              <span className="text-sm font-medium text-neutral-700">Status:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filterStatus === "all"
                      ? "bg-orange-500 text-white"
                      : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus("paid")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filterStatus === "paid"
                      ? "bg-green-500 text-white"
                      : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  Paid
                </button>
                <button
                  onClick={() => setFilterStatus("pending")}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    filterStatus === "pending"
                      ? "bg-amber-500 text-white"
                      : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Projects Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">Your Projects</h2>
            <span className="text-sm text-neutral-600">{filteredProjects.length} results</span>
          </div>

          {loading ? (
            // Loading Skeleton
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-64 animate-pulse rounded-2xl bg-neutral-100"
                />
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            // Empty State
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-white/50 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/20 p-12 shadow-lg backdrop-blur-xl text-center"
            >
              <div className="rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 p-6 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900 mb-3">
                {searchQuery ? "No projects found" : "No projects yet"}
              </h3>
              <p className="text-neutral-600 mb-6">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Create your first roofing project to get started"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              )}
            </motion.div>
          ) : (
            // Projects Grid
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className="group rounded-2xl border border-white/50 bg-white/80 p-6 shadow-lg backdrop-blur-xl hover:shadow-xl transition-all"
                >
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <Link href={`/projects/${project.id}`}>
                        <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {project.name}
                        </h3>
                      </Link>
                      {project.description && (
                        <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <Badge variant={project.payment_completed ? "default" : "secondary"}>
                      {project.payment_completed ? "Paid" : "Pending"}
                    </Badge>
                  </div>

                  {/* Project Details */}
                  <div className="space-y-2 mb-4">
                    {project.address && (
                      <div className="flex items-start gap-2 text-sm text-neutral-600">
                        <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5 text-teal-500" />
                        <span className="line-clamp-1">
                          {project.address}, {project.city}, {project.state}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Calendar className="h-4 w-4 text-neutral-400" />
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                    {project.square_footage && (
                      <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                        <span className="text-blue-600">{project.square_footage.toLocaleString()} SF</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link href={`/projects/${project.id}`} className="flex-1">
                      <Button
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
                      >
                        View Project
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    {!project.payment_completed && (
                      <Link href="/billing">
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-orange-200 hover:bg-orange-50"
                          title="View Pricing"
                        >
                          <CreditCard className="h-4 w-4 text-orange-600" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-2xl border border-white/50 bg-white p-8 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neutral-900">Create New Project</h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Start by entering the property address — this is required to create a project.
                </p>
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                {/* Address Input (Required & First) */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    Property Address <span className="text-red-500">*</span>
                  </label>
                  <AddressInput
                    value={createForm.address}
                    onChange={(address) => setCreateForm((form) => ({ ...form, address }))}
                    placeholder="Start typing to search for an address..."
                  />
                  <p className="text-xs text-neutral-500 mt-2">
                    Search and select a valid address using Google Places
                  </p>
                </div>

                {/* Project Name */}
                <div>
                  <label htmlFor="project-name" className="block text-sm font-semibold text-neutral-900 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="project-name"
                    value={createForm.name}
                    onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))}
                    placeholder="e.g., Residential Metal Roof - Smith Property"
                    required
                    className="rounded-xl"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="project-description" className="block text-sm font-semibold text-neutral-900 mb-2">
                    Description <span className="text-neutral-400">(Optional)</span>
                  </label>
                  <Textarea
                    id="project-description"
                    value={createForm.description}
                    onChange={(event) => setCreateForm((form) => ({ ...form, description: event.target.value }))}
                    placeholder="Add notes about the project, client requirements, or special considerations..."
                    rows={4}
                    className="rounded-xl"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateForm(emptyForm);
                    }}
                    className="flex-1"
                    disabled={createBusy}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!canSubmitCreate || createBusy}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    {createBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
