/**
 * Server-side PDF generation client.
 *
 * Replaces the former `lib/pdf-generator.ts` (jsPDF) + `lib/pdf-export.ts` (pdf-lib).
 * All PDF layout now runs in the FastAPI sidecar; the browser only POSTs data and
 * downloads the signed URL.
 *
 * Endpoints are stubbed until Phase 4 ships the sidecar — callsites will
 * surface a clear error until then.
 */

export interface ProposalData {
  companyName: string;
  companyLogoUrl: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  companyEmail?: string;
  companyWebsite?: string;

  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;

  projectName: string;
  projectAddress: string;
  squareFootage: number;

  estimateName: string;
  estimateNumber?: string;
  materialsCost: number;
  laborCost: number;
  permitsFees: number;
  contingency: number;
  totalCost: number;
  notes: string;

  lineItems?: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }>;

  depositPercent?: number;
  discountAmount?: number;
  discountPercent?: number;
  taxRate?: number;

  roofImageDataUrl: string | null;

  estimateDate: string;
  validUntil: string;

  accentColor?: { r: number; g: number; b: number };
  showTerms?: boolean;
  customTerms?: string[];
}

/**
 * Proposal Builder payloads are richer than the standard ProposalData —
 * they carry custom sections, accent colors, and drag-ordered state.
 * Shape is intentionally permissive (extends Record<string, unknown>) so
 * UI state can be forwarded wholesale; the sidecar extracts only what
 * its ReportLab layout needs.
 */
export interface ProposalBuilderRequest extends Record<string, unknown> {
  proposalNumber: string;
  projectName: string;
}

interface PdfGenerationResponse {
  url: string;
  expiresAt: string;
}

async function postForPdfUrl(
  endpoint: string,
  body: unknown,
  filename: string,
): Promise<void> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let message = `PDF service returned ${res.status}`;
    try {
      const err = await res.json();
      if (err?.error) message = err.error;
    } catch {
      // fall through to default message
    }
    throw new Error(message);
  }

  const data = (await res.json()) as PdfGenerationResponse;
  if (!data?.url) {
    throw new Error("PDF service response missing signed URL");
  }

  // Trigger browser download without navigating away.
  const a = document.createElement("a");
  a.href = data.url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function generateAndDownloadProposal(
  data: ProposalData,
): Promise<void> {
  const filename = `${(data.projectName || "proposal").replace(/\s+/g, "-")}-estimate.pdf`;
  await postForPdfUrl("/api/pdf/proposal", data, filename);
}

export async function generateAndDownloadProposalBuilder(
  data: ProposalBuilderRequest,
): Promise<void> {
  const filename = `Proposal_${(data.projectName || "draft").replace(/\s+/g, "_")}.pdf`;
  await postForPdfUrl("/api/pdf/proposal-builder", data, filename);
}
