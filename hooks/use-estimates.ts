"use client";

/**
 * USE ESTIMATES HOOK
 *
 * CRUD operations for project estimates with database persistence.
 */

import { useState, useCallback, useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import type { EstimateFormData } from "@/lib/estimate-types";

interface ProjectEstimate {
  id: string;
  project_id: string;
  user_id: string;
  name: string | null;
  materials_cost: number | null;
  labor_cost: number | null;
  permits_fees: number | null;
  contingency: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useEstimates(projectId: string, userId: string) {
  const supabase = getSupabaseBrowserClient();
  const [estimates, setEstimates] = useState<ProjectEstimate[]>([]);
  const [activeEstimate, setActiveEstimate] = useState<ProjectEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all estimates for project
  const fetchEstimates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("project_estimates")
        .select("*")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setEstimates(data || []);

      // Set active estimate (most recent one)
      if (data && data.length > 0) {
        setActiveEstimate(data[0]);
      } else {
        setActiveEstimate(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch estimates:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, userId, supabase]);

  useEffect(() => {
    if (projectId && userId) {
      fetchEstimates();
    }
  }, [fetchEstimates, projectId, userId]);

  // Create new estimate
  const createEstimate = useCallback(
    async (data: EstimateFormData): Promise<ProjectEstimate | null> => {
      setSaving(true);
      setError(null);
      try {
        const { data: newEstimate, error: insertError } = await (supabase
          .from("project_estimates") as any)
          .insert({
            project_id: projectId,
            user_id: userId,
            name: data.name,
            materials_cost: data.materials_cost,
            labor_cost: data.labor_cost,
            permits_fees: data.permits_fees,
            contingency: data.contingency,
            notes: data.notes,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setEstimates((prev) => [newEstimate, ...prev]);
        setActiveEstimate(newEstimate);
        return newEstimate;
      } catch (err: any) {
        console.error("Failed to create estimate:", err);
        setError(err.message);
        return null;
      } finally {
        setSaving(false);
      }
    },
    [projectId, userId, supabase]
  );

  // Update existing estimate
  const updateEstimate = useCallback(
    async (estimateId: string, data: Partial<EstimateFormData>): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const { data: updated, error: updateError } = await (supabase
          .from("project_estimates") as any)
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", estimateId)
          .eq("user_id", userId)
          .select()
          .single();

        if (updateError) throw updateError;

        setEstimates((prev) =>
          prev.map((e) => (e.id === estimateId ? updated : e))
        );
        if (activeEstimate?.id === estimateId) {
          setActiveEstimate(updated);
        }
        return true;
      } catch (err: any) {
        console.error("Failed to update estimate:", err);
        setError(err.message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [userId, supabase, activeEstimate]
  );

  // Delete estimate
  const deleteEstimate = useCallback(
    async (estimateId: string): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const { error: deleteError } = await supabase
          .from("project_estimates")
          .delete()
          .eq("id", estimateId)
          .eq("user_id", userId);

        if (deleteError) throw deleteError;

        const remaining = estimates.filter((e) => e.id !== estimateId);
        setEstimates(remaining);

        if (activeEstimate?.id === estimateId) {
          setActiveEstimate(remaining[0] || null);
        }
        return true;
      } catch (err: any) {
        console.error("Failed to delete estimate:", err);
        setError(err.message);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [userId, supabase, activeEstimate, estimates]
  );

  // Select active estimate
  const selectEstimate = useCallback(
    (estimateId: string) => {
      const selected = estimates.find((e) => e.id === estimateId);
      if (selected) {
        setActiveEstimate(selected);
      }
    },
    [estimates]
  );

  return {
    estimates,
    activeEstimate,
    loading,
    saving,
    error,
    createEstimate,
    updateEstimate,
    deleteEstimate,
    selectEstimate,
    refetch: fetchEstimates,
  };
}
