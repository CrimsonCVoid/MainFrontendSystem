import { z } from "zod";

/**
 * Zod v3 schemas for labeler API payloads.
 * Mirrors roof_pipeline/api/schemas.py + roof_pipeline/panel_snap_v2/schema.py.
 */

export const PanelCornersSchema = z.object({
  id: z.number().int(),
  corners_pix: z.array(z.array(z.number()).length(2)).min(3),
});

export const PanelsInputSchema = z.object({
  panels: z.array(PanelCornersSchema),
  res_m: z.number().nullable().optional(),
  shape: z.array(z.number().int()).nullable().optional(),
  panel_count: z.number().int().nullable().optional(),
  panel_pixel_counts: z.record(z.number().int()).nullable().optional(),
});

export const FeatureNodeSchema = z.object({
  id: z.number().int(),
  valence: z.number().int(),
  position_xyz: z.array(z.number()).length(3).nullable(),
  panel_ids: z.array(z.number().int()),
});

export const FeatureEdgeSchema = z.object({
  panel_a: z.number().int(),
  panel_b: z.number().int(),
  feature_ids: z.array(z.number().int()),
});

export const SnapPreviewResponseSchema = z.object({
  feature_graph: z.object({
    features: z.array(FeatureNodeSchema),
    edges: z.array(FeatureEdgeSchema),
  }),
  snapped_polygons: z.record(z.array(z.array(z.number()))),
});

export const LabelDataSchema = z.object({
  sample_id: z.string(),
  panels: z.array(PanelCornersSchema),
});

export const SaveLabelResponseSchema = z.object({
  status: z.string(),
  sample_id: z.string(),
  panel_count: z.number().int(),
});

export const BrowserErrorSchema = z.object({
  timestamp: z.string(),
  page: z.string(),
  error_type: z.string(),
  message: z.string(),
  stack: z.string().nullable(),
  user_agent: z.string(),
  sample_id: z.string().nullable(),
});

export type PanelCorners = z.infer<typeof PanelCornersSchema>;
export type PanelsInput = z.infer<typeof PanelsInputSchema>;
export type SnapPreviewResponse = z.infer<typeof SnapPreviewResponseSchema>;
export type LabelData = z.infer<typeof LabelDataSchema>;
export type BrowserError = z.infer<typeof BrowserErrorSchema>;
