import { z } from "zod";
import {
  SnapPreviewResponseSchema,
  LabelDataSchema,
  SaveLabelResponseSchema,
} from "./labeler-schemas";
import type {
  PanelsInput,
  LabelData,
  SnapPreviewResponse,
  PanelCorners,
  BrowserError,
} from "./labeler-schemas";
import { getSupabaseBrowserClient } from "./supabaseClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  public status: number;
  public traceId?: string;

  constructor(status: number, message: string, traceId?: string) {
    super(message);
    this.status = status;
    this.traceId = traceId;
    this.name = "ApiError";
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const extra = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...extra,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const traceId = res.headers.get("X-Trace-ID") ?? undefined;
    const body = await res
      .json()
      .catch(() => ({ message: res.statusText }));
    throw new ApiError(
      res.status,
      body.message || body.detail || res.statusText,
      traceId,
    );
  }
  const data = await res.json();
  return schema.parse(data);
}

export async function getLabels(sampleId: string): Promise<LabelData> {
  return apiFetch(`/api/labels/${sampleId}`, LabelDataSchema);
}

export async function saveLabels(
  sampleId: string,
  panels: PanelCorners[],
): Promise<{ status: string; sample_id: string; panel_count: number }> {
  return apiFetch(`/api/labels/${sampleId}`, SaveLabelResponseSchema, {
    method: "POST",
    body: JSON.stringify({ sample_id: sampleId, panels }),
  });
}

export async function snapPreview(
  input: PanelsInput,
): Promise<SnapPreviewResponse> {
  return apiFetch("/api/snap/preview", SnapPreviewResponseSchema, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function reportError(error: BrowserError): void {
  authHeaders().then((extra) => {
    fetch(`${API_BASE}/api/errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...extra },
      body: JSON.stringify(error),
      keepalive: true,
    }).catch(() => {
      // fire-and-forget
    });
  });
}
