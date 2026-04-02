/**
 * PROFESSIONAL ESTIMATE PDF GENERATOR
 *
 * Clean, invoice-style estimate document.
 * Minimal color, professional typography, proper spacing.
 */

import jsPDF from "jspdf";

export interface ProposalData {
  // Company branding
  companyName: string;
  companyLogoUrl: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  companyEmail?: string;
  companyWebsite?: string;

  // Client info
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;

  // Project details
  projectName: string;
  projectAddress: string;
  squareFootage: number;

  // Estimate data
  estimateName: string;
  estimateNumber?: string;
  materialsCost: number;
  laborCost: number;
  permitsFees: number;
  contingency: number;
  totalCost: number;
  notes: string;

  // Custom line items (optional)
  lineItems?: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }>;

  // Financial options
  depositPercent?: number;
  discountAmount?: number;
  discountPercent?: number;
  taxRate?: number;

  // 3D visualization (preserved for future use)
  roofImageDataUrl: string | null;

  // Dates
  estimateDate: string;
  validUntil: string;

  // Customization options
  accentColor?: { r: number; g: number; b: number };
  showTerms?: boolean;
  customTerms?: string[];
}

// Minimal grayscale palette
const C = {
  black: { r: 0, g: 0, b: 0 },
  heading: { r: 28, g: 28, b: 28 },
  text: { r: 55, g: 55, b: 55 },
  label: { r: 100, g: 100, b: 100 },
  muted: { r: 140, g: 140, b: 140 },
  line: { r: 200, g: 200, b: 200 },
  lightLine: { r: 230, g: 230, b: 230 },
  tableRow: { r: 248, g: 248, b: 248 },
  white: { r: 255, g: 255, b: 255 },
};

export class PDFGenerator {
  private pdf: jsPDF;
  private pw: number;  // page width
  private ph: number;  // page height
  private ml: number = 18; // margin left
  private mr: number = 18; // margin right
  private cw: number;  // content width
  private y: number = 0;

  constructor() {
    this.pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    this.pw = this.pdf.internal.pageSize.getWidth();
    this.ph = this.pdf.internal.pageSize.getHeight();
    this.cw = this.pw - this.ml - this.mr;
  }

  // === Helpers ===
  private fill(c: typeof C.black) { this.pdf.setFillColor(c.r, c.g, c.b); }
  private stroke(c: typeof C.black) { this.pdf.setDrawColor(c.r, c.g, c.b); }
  private color(c: typeof C.black) { this.pdf.setTextColor(c.r, c.g, c.b); }
  private font(size: number, style: "normal" | "bold" = "normal") {
    this.pdf.setFontSize(size);
    this.pdf.setFont("helvetica", style);
  }
  private line(y: number, c = C.line) {
    this.stroke(c);
    this.pdf.setLineWidth(0.2);
    this.pdf.line(this.ml, y, this.pw - this.mr, y);
  }
  private money(n: number): string {
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // === Main ===
  async generateProposal(data: ProposalData): Promise<Blob> {
    await this.page1(data);
    this.pdf.addPage();
    this.page2(data);
    return this.pdf.output("blob");
  }

  // === PAGE 1: ESTIMATE ===
  private async page1(data: ProposalData): Promise<void> {
    this.y = 16;
    await this.header(data);
    this.addresses(data);
    this.lineItems(data);
    this.totals(data);
    if (data.notes?.trim()) this.notes(data);
    this.footer(data, 1);
  }

  private async header(data: ProposalData): Promise<void> {
    const top = this.y;
    const right = this.pw - this.mr;

    // Logo or company name
    if (data.companyLogoUrl) {
      try {
        const img = await this.loadImage(data.companyLogoUrl);
        this.pdf.addImage(img, "PNG", this.ml, top, 38, 19);
        this.y = top + 22;
      } catch {
        this.companyNameFallback(data.companyName, top);
      }
    } else {
      this.companyNameFallback(data.companyName, top);
    }

    // Company contact below logo
    this.font(8);
    this.color(C.muted);
    let cy = this.y + 2;
    if (data.companyPhone) { this.pdf.text(data.companyPhone, this.ml, cy); cy += 3.5; }
    if (data.companyEmail) { this.pdf.text(data.companyEmail, this.ml, cy); cy += 3.5; }
    if (data.companyAddress) {
      const lines = this.pdf.splitTextToSize(data.companyAddress, 75);
      this.pdf.text(lines, this.ml, cy);
      cy += lines.length * 3.5;
    }

    // ESTIMATE title (right aligned)
    this.font(26, "bold");
    this.color(C.heading);
    this.pdf.text("ESTIMATE", right, top + 8, { align: "right" });

    // Estimate number
    this.font(10);
    this.color(C.text);
    const num = data.estimateNumber || `EST-${Date.now().toString().slice(-6)}`;
    this.pdf.text(`#${num}`, right, top + 16, { align: "right" });

    // Dates
    this.font(8);
    this.color(C.muted);
    this.pdf.text(`Date: ${data.estimateDate}`, right, top + 23, { align: "right" });
    this.pdf.text(`Valid: ${data.validUntil}`, right, top + 28, { align: "right" });

    this.y = Math.max(cy, top + 33) + 6;
    this.line(this.y);
    this.y += 8;
  }

  private companyNameFallback(name: string, y: number): void {
    this.font(15, "bold");
    this.color(C.heading);
    this.pdf.text(name, this.ml, y + 8);
    this.y = y + 14;
  }

  private addresses(data: ProposalData): void {
    const top = this.y;
    const mid = this.ml + this.cw / 2 + 5;

    // BILL TO
    this.font(7);
    this.color(C.label);
    this.pdf.text("BILL TO", this.ml, top);

    this.font(10, "bold");
    this.color(C.heading);
    this.pdf.text(data.clientName || "Property Owner", this.ml, top + 6);

    this.font(9);
    this.color(C.text);
    let by = top + 12;
    if (data.clientAddress) {
      const lines = this.pdf.splitTextToSize(data.clientAddress, 75);
      this.pdf.text(lines, this.ml, by);
      by += lines.length * 4;
    }
    if (data.clientPhone) { this.pdf.text(data.clientPhone, this.ml, by); by += 4; }
    if (data.clientEmail) { this.pdf.text(data.clientEmail, this.ml, by); }

    // PROJECT
    this.font(7);
    this.color(C.label);
    this.pdf.text("PROJECT", mid, top);

    this.font(10, "bold");
    this.color(C.heading);
    this.pdf.text(data.projectName, mid, top + 6);

    this.font(9);
    this.color(C.text);
    const projLines = this.pdf.splitTextToSize(data.projectAddress, 75);
    this.pdf.text(projLines, mid, top + 12);

    this.font(8);
    this.color(C.muted);
    this.pdf.text(`${data.squareFootage.toLocaleString()} sq ft`, mid, top + 12 + projLines.length * 4 + 2);

    this.y = top + 32;
    this.line(this.y);
    this.y += 8;
  }

  private lineItems(data: ProposalData): void {
    const cols = {
      desc: this.ml,
      qty: this.pw - this.mr - 58,
      rate: this.pw - this.mr - 30,
      amt: this.pw - this.mr,
    };

    // Header row
    this.fill(C.tableRow);
    this.pdf.rect(this.ml, this.y - 2, this.cw, 7, "F");

    this.font(7, "bold");
    this.color(C.label);
    this.pdf.text("DESCRIPTION", cols.desc + 2, this.y + 3);
    this.pdf.text("QTY", cols.qty, this.y + 3, { align: "right" });
    this.pdf.text("RATE", cols.rate, this.y + 3, { align: "right" });
    this.pdf.text("AMOUNT", cols.amt, this.y + 3, { align: "right" });

    this.y += 9;

    // Items
    const items = data.lineItems || [
      { name: "Metal Roofing Materials", description: "Standing seam panels, underlayment, fasteners, ridge caps, trim", quantity: 1, unitPrice: data.materialsCost },
      { name: "Professional Installation", description: "Labor for removal (if applicable) and new roof installation", quantity: 1, unitPrice: data.laborCost },
      { name: "Permits & Inspections", description: "Building permits and required code inspections", quantity: 1, unitPrice: data.permitsFees },
      { name: "Contingency Reserve", description: "Reserve for unforeseen conditions", quantity: 1, unitPrice: data.contingency },
    ];

    items.forEach((item, i) => {
      // Alternating row bg
      if (i % 2 === 1) {
        this.fill(C.tableRow);
        this.pdf.rect(this.ml, this.y - 3, this.cw, 12, "F");
      }

      // Name
      this.font(9, "bold");
      this.color(C.heading);
      this.pdf.text(item.name, cols.desc + 2, this.y + 1);

      // Description
      if (item.description) {
        this.font(8);
        this.color(C.muted);
        const descLines = this.pdf.splitTextToSize(item.description, cols.qty - cols.desc - 12);
        this.pdf.text(descLines[0] || "", cols.desc + 2, this.y + 5.5);
      }

      // Numbers
      this.font(9);
      this.color(C.text);
      this.pdf.text(item.quantity.toString(), cols.qty, this.y + 2, { align: "right" });
      this.pdf.text(this.money(item.unitPrice), cols.rate, this.y + 2, { align: "right" });

      this.color(C.heading);
      this.pdf.text(this.money(item.quantity * item.unitPrice), cols.amt, this.y + 2, { align: "right" });

      this.y += 12;
    });

    this.line(this.y - 2);
    this.y += 4;
  }

  private totals(data: ProposalData): void {
    const right = this.pw - this.mr;
    const labelX = right - 55;

    const subtotal = data.materialsCost + data.laborCost + data.permitsFees + data.contingency;
    let discount = data.discountAmount || (data.discountPercent ? subtotal * data.discountPercent / 100 : 0);
    const taxable = subtotal - discount;
    const tax = data.taxRate ? taxable * data.taxRate / 100 : 0;
    const total = taxable + tax;
    const depPct = data.depositPercent ?? 50;
    const deposit = total * depPct / 100;
    const balance = total - deposit;

    // Subtotal
    this.font(9);
    this.color(C.label);
    this.pdf.text("Subtotal", labelX, this.y, { align: "right" });
    this.color(C.text);
    this.pdf.text(this.money(subtotal), right, this.y, { align: "right" });
    this.y += 5;

    // Discount
    if (discount > 0) {
      this.color(C.label);
      this.pdf.text(data.discountPercent ? `Discount (${data.discountPercent}%)` : "Discount", labelX, this.y, { align: "right" });
      this.color(C.muted);
      this.pdf.text(`-${this.money(discount)}`, right, this.y, { align: "right" });
      this.y += 5;
    }

    // Tax
    if (tax > 0) {
      this.color(C.label);
      this.pdf.text(`Tax (${data.taxRate}%)`, labelX, this.y, { align: "right" });
      this.color(C.text);
      this.pdf.text(this.money(tax), right, this.y, { align: "right" });
      this.y += 5;
    }

    // Total
    this.y += 2;
    this.line(this.y, C.lightLine);
    this.y += 6;

    this.font(11, "bold");
    this.color(C.heading);
    this.pdf.text("Total", labelX, this.y, { align: "right" });
    this.pdf.text(this.money(total), right, this.y, { align: "right" });
    this.y += 8;

    // Deposit / Balance
    this.font(8);
    this.color(C.label);
    this.pdf.text(`Deposit (${depPct}%)`, labelX, this.y, { align: "right" });
    this.color(C.text);
    this.pdf.text(this.money(deposit), right, this.y, { align: "right" });
    this.y += 4;

    this.color(C.label);
    this.pdf.text("Balance Due", labelX, this.y, { align: "right" });
    this.color(C.text);
    this.pdf.text(this.money(balance), right, this.y, { align: "right" });

    this.y += 12;
  }

  private notes(data: ProposalData): void {
    this.font(7);
    this.color(C.label);
    this.pdf.text("NOTES", this.ml, this.y);
    this.y += 4;

    this.font(8);
    this.color(C.text);
    const lines = this.pdf.splitTextToSize(data.notes, this.cw);
    this.pdf.text(lines, this.ml, this.y);
    this.y += lines.length * 3.5 + 6;
  }

  private footer(data: ProposalData, page: number): void {
    const fy = this.ph - 10;
    this.line(fy - 4, C.lightLine);

    this.font(7);
    this.color(C.muted);
    this.pdf.text(data.companyName, this.ml, fy);
    if (data.companyWebsite) {
      this.pdf.text(data.companyWebsite, this.pw / 2, fy, { align: "center" });
    }
    this.pdf.text(`Page ${page} of 2`, this.pw - this.mr, fy, { align: "right" });
  }

  // === PAGE 2: TERMS & SIGNATURES ===
  private page2(data: ProposalData): void {
    this.y = 18;

    // Header
    this.font(8);
    this.color(C.label);
    this.pdf.text("TERMS & CONDITIONS", this.pw / 2, this.y, { align: "center" });

    this.font(18, "bold");
    this.color(C.heading);
    this.pdf.text("Agreement", this.pw / 2, this.y + 10, { align: "center" });
    this.y += 22;

    // Sections
    this.legalSection("1. SCOPE OF WORK",
      "Contractor agrees to furnish all labor, materials, equipment, and services necessary to complete the roofing work as described in this estimate. Work includes removal of existing roofing (if applicable), installation of new metal roofing system, and cleanup upon completion."
    );

    this.legalSection("2. PAYMENT TERMS", null, [
      `A deposit of ${data.depositPercent || 50}% is required to schedule work and order materials.`,
      "Balance is due upon satisfactory completion of the project.",
      "Accepted payment methods: Check, Credit Card, ACH Transfer.",
      "Late payments may be subject to a 1.5% monthly finance charge.",
    ]);

    this.legalSection("3. WARRANTY",
      "Materials are covered by manufacturer warranty (typically 20-40 years). Workmanship is guaranteed for 5 years from installation. Warranty does not cover damage from acts of nature, improper maintenance, or unauthorized modifications."
    );

    this.legalSection("4. LIMITATIONS", null, [
      "Measurements are estimates based on available data. Final quantities may vary.",
      "Price valid for 30 days from estimate date.",
      "Additional charges may apply for unforeseen conditions discovered during work.",
      "Contractor not responsible for pre-existing structural defects.",
    ]);

    this.legalSection("5. CANCELLATION",
      "Customer may cancel within 3 business days of signing for full deposit refund. Cancellations after materials ordered may be subject to restocking fees."
    );

    // Acceptance
    this.y += 4;
    this.line(this.y);
    this.y += 8;

    this.font(10, "bold");
    this.color(C.heading);
    this.pdf.text("ACCEPTANCE & AUTHORIZATION", this.ml, this.y);
    this.y += 6;

    this.font(8);
    this.color(C.text);
    const acceptText = "By signing below, I acknowledge that I have read and agree to the terms above. I authorize the contractor to perform the work described in this estimate and agree to the payment terms.";
    const acceptLines = this.pdf.splitTextToSize(acceptText, this.cw);
    this.pdf.text(acceptLines, this.ml, this.y);
    this.y += acceptLines.length * 3.5 + 10;

    // Signatures
    this.signatures();

    // Footer
    this.footer(data, 2);
  }

  private legalSection(title: string, paragraph: string | null, bullets?: string[]): void {
    this.font(9, "bold");
    this.color(C.heading);
    this.pdf.text(title, this.ml, this.y);
    this.y += 5;

    this.font(8);
    this.color(C.text);

    if (paragraph) {
      const lines = this.pdf.splitTextToSize(paragraph, this.cw);
      this.pdf.text(lines, this.ml, this.y);
      this.y += lines.length * 3.5 + 5;
    }

    if (bullets) {
      bullets.forEach((b) => {
        this.pdf.text(`•  ${b}`, this.ml + 2, this.y);
        this.y += 4;
      });
      this.y += 3;
    }
  }

  private signatures(): void {
    const lw = 72;
    const gap = 24;

    this.stroke(C.line);
    this.pdf.setLineWidth(0.3);

    // Left: Customer
    this.pdf.line(this.ml, this.y + 10, this.ml + lw, this.y + 10);
    this.font(7);
    this.color(C.muted);
    this.pdf.text("Customer Name (Print)", this.ml, this.y);
    this.pdf.text("Customer Signature", this.ml, this.y + 15);
    this.pdf.text("Date: ______________", this.ml, this.y + 20);

    // Right: Contractor
    const rx = this.ml + lw + gap;
    this.pdf.line(rx, this.y + 10, rx + lw, this.y + 10);
    this.pdf.text("Contractor Name (Print)", rx, this.y);
    this.pdf.text("Contractor Signature", rx, this.y + 15);
    this.pdf.text("Date: ______________", rx, this.y + 20);
  }

  // === Utilities ===
  private loadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("No canvas context"));
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Image load failed"));
      img.src = url;
    });
  }
}

/**
 * Generate and download estimate PDF
 */
export async function generateAndDownloadProposal(
  data: ProposalData,
  filename?: string
): Promise<void> {
  const gen = new PDFGenerator();
  const blob = await gen.generateProposal(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `Estimate_${data.projectName.replace(/\s+/g, "_")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
