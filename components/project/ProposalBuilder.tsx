"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Download,
  GripVertical,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  Palette,
  Building2,
  User,
  MapPin,
  DollarSign,
  Ruler,
  Shield,
  PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";

// Section types available in the proposal
type SectionType =
  | "header"
  | "company"
  | "client"
  | "project"
  | "scope"
  | "line-items"
  | "measurements"
  | "totals"
  | "notes"
  | "terms"
  | "signature"
  | "image";

interface Section {
  id: string;
  type: SectionType;
  enabled: boolean;
  title: string;
}

const SECTION_ICONS: Record<SectionType, any> = {
  header: FileText,
  company: Building2,
  client: User,
  project: MapPin,
  scope: PenLine,
  "line-items": DollarSign,
  measurements: Ruler,
  totals: DollarSign,
  notes: PenLine,
  terms: Shield,
  signature: PenLine,
  image: ImageIcon,
};

const DEFAULT_SECTIONS: Section[] = [
  { id: "1", type: "header", enabled: true, title: "Proposal Header" },
  { id: "2", type: "company", enabled: true, title: "Company Information" },
  { id: "3", type: "client", enabled: true, title: "Client Information" },
  { id: "4", type: "project", enabled: true, title: "Project Details" },
  { id: "5", type: "scope", enabled: true, title: "Scope of Work" },
  { id: "6", type: "line-items", enabled: true, title: "Pricing Breakdown" },
  { id: "7", type: "measurements", enabled: true, title: "Roof Measurements" },
  { id: "8", type: "totals", enabled: true, title: "Total & Payment" },
  { id: "9", type: "notes", enabled: true, title: "Notes" },
  { id: "10", type: "terms", enabled: true, title: "Terms & Conditions" },
  { id: "11", type: "signature", enabled: true, title: "Signature Block" },
];

interface LineItem {
  id: string;
  name: string;
  description: string;
  qty: number;
  unitPrice: number;
}

interface ProposalBuilderProps {
  project: any;
  user: any;
  roofData: any;
}

export default function ProposalBuilder({ project, user, roofData }: ProposalBuilderProps) {
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [generating, setGenerating] = useState(false);
  const [activePanel, setActivePanel] = useState<string | null>("company");
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState(user?.company_name || "My Metal Roofer");
  const [companyPhone, setCompanyPhone] = useState(user?.company_phone || "");
  const [companyEmail, setCompanyEmail] = useState(user?.company_email || user?.email || "");
  const [companyAddress, setCompanyAddress] = useState(user?.company_address || "");
  const [companyWebsite, setCompanyWebsite] = useState(user?.company_website || "");
  const [logoUrl, setLogoUrl] = useState(user?.company_logo_url || "");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState(
    [project.address, project.city, project.state, project.postal_code].filter(Boolean).join(", ")
  );

  const [proposalTitle, setProposalTitle] = useState(`Metal Roof Proposal — ${project.name}`);
  const [proposalNumber, setProposalNumber] = useState(`P-${Date.now().toString().slice(-6)}`);
  const [validDays, setValidDays] = useState(30);

  const [scopeText, setScopeText] = useState(
    "Complete removal of existing roofing materials and installation of new standing seam metal roof system. " +
    "Includes underlayment, ice & water shield at eaves and valleys, all trim and flashing, ridge venting, " +
    "and debris cleanup. All work performed to manufacturer specifications and local building code requirements."
  );

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: "1", name: "Metal Roofing Panels", description: "Standing seam panels, underlayment, closures", qty: 1, unitPrice: 0 },
    { id: "2", name: "Trim & Flashing", description: "Ridge cap, eave drip, rake, valley flashing", qty: 1, unitPrice: 0 },
    { id: "3", name: "Labor — Tear Off", description: "Remove existing roof, disposal", qty: 1, unitPrice: 0 },
    { id: "4", name: "Labor — Installation", description: "Metal roof installation, all details", qty: 1, unitPrice: 0 },
    { id: "5", name: "Permits & Inspection", description: "Building permits, code inspections", qty: 1, unitPrice: 0 },
  ]);

  const [taxRateStr, setTaxRateStr] = useState("0");
  const [depositPercentStr, setDepositPercentStr] = useState("50");
  const [discountPercentStr, setDiscountPercentStr] = useState("0");
  const [notesText, setNotesText] = useState("");
  const [accentColor, setAccentColor] = useState("#f97316");

  const taxRate = parseFloat(taxRateStr) || 0;
  const depositPercent = parseFloat(depositPercentStr) || 0;
  const discountPercent = parseFloat(discountPercentStr) || 0;

  const subtotal = lineItems.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const discount = subtotal * discountPercent / 100;
  const taxable = subtotal - discount;
  const tax = taxable * taxRate / 100;
  const total = taxable + tax;
  const deposit = total * depositPercent / 100;

  const sqft = roofData?.total_area_sf || Number(project.square_footage) || 0;
  const measurements = roofData?.measurements || {};

  // Drag and drop reorder
  const onDragStart = (index: number) => { dragItem.current = index; };
  const onDragEnter = (index: number) => { dragOverItem.current = index; };
  const onDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copy = [...sections];
    const [moved] = copy.splice(dragItem.current, 1);
    copy.splice(dragOverItem.current, 0, moved);
    setSections(copy);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const toggleSection = (id: string) => {
    setSections((s) => s.map((sec) => sec.id === id ? { ...sec, enabled: !sec.enabled } : sec));
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { id: Date.now().toString(), name: "", description: "", qty: 1, unitPrice: 0 }]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((i) => i.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map((i) => {
      if (i.id !== id) return i;
      if (field === "qty" || field === "unitPrice") {
        return { ...i, [field]: value === "" ? 0 : parseFloat(value) || 0 };
      }
      return { ...i, [field]: value };
    }));
  };

  // Generate PDF
  const generatePDF = useCallback(async () => {
    setGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ml = 18, mr = 18;
      const cw = pw - ml - mr;
      let y = 16;

      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
      };
      const accent = hexToRgb(accentColor);

      const addPageIfNeeded = (needed: number) => {
        if (y + needed > ph - 20) {
          // Footer
          pdf.setFontSize(7);
          pdf.setTextColor(150, 150, 150);
          pdf.text(companyName, ml, ph - 8);
          pdf.text(`Page ${pdf.getNumberOfPages()}`, pw - mr, ph - 8, { align: "right" });
          pdf.addPage();
          y = 16;
        }
      };

      const money = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const enabledSections = sections.filter((s) => s.enabled);

      for (const section of enabledSections) {
        switch (section.type) {
          case "header": {
            // Accent bar
            pdf.setFillColor(accent.r, accent.g, accent.b);
            pdf.rect(0, 0, pw, 4, "F");

            pdf.setFontSize(22);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(30, 30, 30);
            pdf.text("PROPOSAL", pw - mr, y + 8, { align: "right" });

            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(100, 100, 100);
            pdf.text(`#${proposalNumber}`, pw - mr, y + 14, { align: "right" });

            const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
            const validDate = new Date(Date.now() + validDays * 86400000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
            pdf.setFontSize(8);
            pdf.text(`Date: ${today}`, pw - mr, y + 20, { align: "right" });
            pdf.text(`Valid until: ${validDate}`, pw - mr, y + 24, { align: "right" });

            y += 30;
            break;
          }

          case "company": {
            addPageIfNeeded(25);
            pdf.setFontSize(14);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(accent.r, accent.g, accent.b);
            pdf.text(companyName, ml, y);
            y += 5;
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(100, 100, 100);
            if (companyPhone) { pdf.text(companyPhone, ml, y); y += 3.5; }
            if (companyEmail) { pdf.text(companyEmail, ml, y); y += 3.5; }
            if (companyAddress) { pdf.text(companyAddress, ml, y); y += 3.5; }
            if (companyWebsite) { pdf.text(companyWebsite, ml, y); y += 3.5; }
            y += 4;
            pdf.setDrawColor(220, 220, 220);
            pdf.setLineWidth(0.2);
            pdf.line(ml, y, pw - mr, y);
            y += 8;
            break;
          }

          case "client": {
            addPageIfNeeded(25);
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(140, 140, 140);
            pdf.text("PREPARED FOR", ml, y);
            y += 5;
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(30, 30, 30);
            pdf.text(clientName || "Property Owner", ml, y);
            y += 5;
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(80, 80, 80);
            if (clientAddress) { pdf.text(clientAddress, ml, y); y += 4; }
            if (clientPhone) { pdf.text(clientPhone, ml, y); y += 4; }
            if (clientEmail) { pdf.text(clientEmail, ml, y); y += 4; }
            y += 6;
            break;
          }

          case "project": {
            addPageIfNeeded(20);
            pdf.setFontSize(7);
            pdf.setTextColor(140, 140, 140);
            pdf.text("PROJECT", ml, y);
            y += 5;
            pdf.setFontSize(11);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(30, 30, 30);
            pdf.text(project.name, ml, y);
            y += 5;
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(80, 80, 80);
            const addr = [project.address, project.city, project.state, project.postal_code].filter(Boolean).join(", ");
            if (addr) { pdf.text(addr, ml, y); y += 4; }
            if (sqft) { pdf.setTextColor(140, 140, 140); pdf.text(`${sqft.toLocaleString()} sq ft | ${roofData?.planes?.length || 0} roof planes`, ml, y); y += 4; }
            y += 6;
            pdf.setDrawColor(220, 220, 220);
            pdf.line(ml, y, pw - mr, y);
            y += 8;
            break;
          }

          case "scope": {
            addPageIfNeeded(25);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(30, 30, 30);
            pdf.text("Scope of Work", ml, y);
            y += 6;
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(60, 60, 60);
            const lines = pdf.splitTextToSize(scopeText, cw);
            pdf.text(lines, ml, y);
            y += lines.length * 4 + 8;
            break;
          }

          case "line-items": {
            addPageIfNeeded(40);
            // Table header
            pdf.setFillColor(245, 245, 245);
            pdf.rect(ml, y - 2, cw, 7, "F");
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(100, 100, 100);
            pdf.text("ITEM", ml + 2, y + 3);
            pdf.text("QTY", pw - mr - 50, y + 3, { align: "right" });
            pdf.text("RATE", pw - mr - 25, y + 3, { align: "right" });
            pdf.text("AMOUNT", pw - mr, y + 3, { align: "right" });
            y += 9;

            for (let i = 0; i < lineItems.length; i++) {
              addPageIfNeeded(14);
              const item = lineItems[i];
              if (i % 2 === 1) {
                pdf.setFillColor(250, 250, 250);
                pdf.rect(ml, y - 3, cw, 12, "F");
              }
              pdf.setFontSize(9);
              pdf.setFont("helvetica", "bold");
              pdf.setTextColor(30, 30, 30);
              pdf.text(item.name || "Item", ml + 2, y + 1);
              if (item.description) {
                pdf.setFontSize(7);
                pdf.setFont("helvetica", "normal");
                pdf.setTextColor(140, 140, 140);
                pdf.text(item.description, ml + 2, y + 5);
              }
              pdf.setFontSize(9);
              pdf.setFont("helvetica", "normal");
              pdf.setTextColor(60, 60, 60);
              pdf.text(item.qty.toString(), pw - mr - 50, y + 2, { align: "right" });
              pdf.text(money(item.unitPrice), pw - mr - 25, y + 2, { align: "right" });
              pdf.setFont("helvetica", "bold");
              pdf.setTextColor(30, 30, 30);
              pdf.text(money(item.qty * item.unitPrice), pw - mr, y + 2, { align: "right" });
              y += 12;
            }
            pdf.setDrawColor(200, 200, 200);
            pdf.line(ml, y - 2, pw - mr, y - 2);
            y += 6;
            break;
          }

          case "measurements": {
            addPageIfNeeded(30);
            pdf.setFontSize(10);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(30, 30, 30);
            pdf.text("Roof Measurements", ml, y);
            y += 7;
            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            const meas = [
              ["Total Area", `${sqft.toLocaleString()} SF`],
              ["Ridge", `${measurements.ridge_length_ft || 0} LF`],
              ["Eave", `${measurements.eave_length_ft || 0} LF`],
              ["Valley", `${measurements.valley_length_ft || 0} LF`],
              ["Hip", `${measurements.hip_length_ft || 0} LF`],
              ["Perimeter", `${measurements.total_perimeter_ft || 0} LF`],
              ["Roof Planes", `${roofData?.planes?.length || 0}`],
            ];
            for (const [label, val] of meas) {
              pdf.setTextColor(100, 100, 100);
              pdf.text(label, ml + 2, y);
              pdf.setTextColor(30, 30, 30);
              pdf.setFont("helvetica", "bold");
              pdf.text(val, ml + 50, y);
              pdf.setFont("helvetica", "normal");
              y += 4.5;
            }
            y += 6;
            break;
          }

          case "totals": {
            addPageIfNeeded(40);
            const right = pw - mr;
            const labelX = right - 55;
            pdf.setFontSize(9);

            pdf.setTextColor(100, 100, 100);
            pdf.text("Subtotal", labelX, y, { align: "right" });
            pdf.setTextColor(60, 60, 60);
            pdf.text(money(subtotal), right, y, { align: "right" });
            y += 5;

            if (discount > 0) {
              pdf.setTextColor(100, 100, 100);
              pdf.text(`Discount (${discountPercent}%)`, labelX, y, { align: "right" });
              pdf.setTextColor(34, 197, 94);
              pdf.text(`-${money(discount)}`, right, y, { align: "right" });
              y += 5;
            }

            if (tax > 0) {
              pdf.setTextColor(100, 100, 100);
              pdf.text(`Tax (${taxRate}%)`, labelX, y, { align: "right" });
              pdf.setTextColor(60, 60, 60);
              pdf.text(money(tax), right, y, { align: "right" });
              y += 5;
            }

            y += 2;
            pdf.setDrawColor(200, 200, 200);
            pdf.line(labelX - 10, y, right, y);
            y += 6;
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(30, 30, 30);
            pdf.text("Total", labelX, y, { align: "right" });
            pdf.text(money(total), right, y, { align: "right" });
            y += 8;

            pdf.setFontSize(8);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Deposit (${depositPercent}%)`, labelX, y, { align: "right" });
            pdf.text(money(deposit), right, y, { align: "right" });
            y += 4;
            pdf.text("Balance Due", labelX, y, { align: "right" });
            pdf.text(money(total - deposit), right, y, { align: "right" });
            y += 10;
            break;
          }

          case "notes": {
            if (!notesText.trim()) break;
            addPageIfNeeded(20);
            pdf.setFontSize(7);
            pdf.setTextColor(140, 140, 140);
            pdf.text("NOTES", ml, y);
            y += 4;
            pdf.setFontSize(8);
            pdf.setTextColor(60, 60, 60);
            const nLines = pdf.splitTextToSize(notesText, cw);
            pdf.text(nLines, ml, y);
            y += nLines.length * 3.5 + 8;
            break;
          }

          case "terms": {
            addPageIfNeeded(60);
            pdf.setFontSize(9);
            pdf.setFont("helvetica", "bold");
            pdf.setTextColor(30, 30, 30);
            pdf.text("Terms & Conditions", ml, y);
            y += 6;
            pdf.setFontSize(7);
            pdf.setFont("helvetica", "normal");
            pdf.setTextColor(80, 80, 80);
            const terms = [
              `1. Payment: ${depositPercent}% deposit required to schedule. Balance due upon completion.`,
              "2. Materials covered by manufacturer warranty (20-40 years). Workmanship guaranteed 5 years.",
              "3. Price valid for " + validDays + " days from proposal date.",
              "4. Additional charges may apply for unforeseen structural conditions.",
              "5. Customer may cancel within 3 business days for full deposit refund.",
            ];
            for (const t of terms) {
              const tl = pdf.splitTextToSize(t, cw);
              pdf.text(tl, ml, y);
              y += tl.length * 3 + 3;
            }
            y += 6;
            break;
          }

          case "signature": {
            addPageIfNeeded(35);
            pdf.setDrawColor(180, 180, 180);
            pdf.setLineWidth(0.3);

            pdf.setFontSize(8);
            pdf.setTextColor(140, 140, 140);
            pdf.text("ACCEPTANCE", ml, y);
            y += 6;

            pdf.setFontSize(7);
            pdf.text("Customer Signature", ml, y);
            pdf.text("Contractor Signature", ml + cw / 2 + 10, y);
            y += 12;
            pdf.line(ml, y, ml + cw / 2 - 5, y);
            pdf.line(ml + cw / 2 + 10, y, pw - mr, y);
            y += 4;
            pdf.text("Name / Date", ml, y);
            pdf.text("Name / Date", ml + cw / 2 + 10, y);
            y += 10;
            break;
          }
        }
      }

      // Final footer
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text(companyName, ml, ph - 8);
      if (companyWebsite) pdf.text(companyWebsite, pw / 2, ph - 8, { align: "center" });
      pdf.text(`Page ${pdf.getNumberOfPages()}`, pw - mr, ph - 8, { align: "right" });

      // Accent bar bottom
      pdf.setFillColor(accent.r, accent.g, accent.b);
      pdf.rect(0, ph - 3, pw, 3, "F");

      // Download
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Proposal_${project.name.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }, [sections, companyName, companyPhone, companyEmail, companyAddress, companyWebsite, clientName, clientEmail, clientPhone, clientAddress, proposalNumber, proposalTitle, validDays, scopeText, lineItems, taxRate, depositPercent, discountPercent, notesText, accentColor, subtotal, discount, tax, total, deposit, sqft, measurements, roofData, project]);

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const validDate = new Date(Date.now() + validDays * 86400000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const money = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const projectAddr = [project.address, project.city, project.state, project.postal_code].filter(Boolean).join(", ");

  // Live preview renderer for a section
  const PreviewSection = ({ type }: { type: SectionType }) => {
    switch (type) {
      case "header": return (
        <div className="flex justify-between items-start mb-6">
          <div>
            {logoUrl ? <img src={logoUrl} alt="" className="h-10 object-contain mb-2" /> : null}
            <p className="text-[22px] font-bold" style={{ color: accentColor }}>{companyName || "Company Name"}</p>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-bold text-neutral-800">PROPOSAL</p>
            <p className="text-[9px] text-neutral-400">#{proposalNumber}</p>
            <p className="text-[8px] text-neutral-400 mt-1">{today}</p>
            <p className="text-[8px] text-neutral-400">Valid until {validDate}</p>
          </div>
        </div>
      );
      case "company": return (
        <div className="text-[8px] text-neutral-400 space-y-0.5 mb-4 pb-4 border-b border-neutral-100">
          {companyPhone && <p>{companyPhone}</p>}
          {companyEmail && <p>{companyEmail}</p>}
          {companyAddress && <p>{companyAddress}</p>}
          {companyWebsite && <p>{companyWebsite}</p>}
        </div>
      );
      case "client": return (
        <div className="mb-4">
          <p className="text-[7px] text-neutral-400 uppercase tracking-wider">Prepared For</p>
          <p className="text-[11px] font-bold text-neutral-800 mt-1">{clientName || "Property Owner"}</p>
          {clientAddress && <p className="text-[9px] text-neutral-500">{clientAddress}</p>}
          {clientPhone && <p className="text-[9px] text-neutral-500">{clientPhone}</p>}
          {clientEmail && <p className="text-[9px] text-neutral-500">{clientEmail}</p>}
        </div>
      );
      case "project": return (
        <div className="mb-4 pb-4 border-b border-neutral-100">
          <p className="text-[7px] text-neutral-400 uppercase tracking-wider">Project</p>
          <p className="text-[11px] font-bold text-neutral-800 mt-1">{project.name}</p>
          <p className="text-[9px] text-neutral-500">{projectAddr}</p>
          {sqft > 0 && <p className="text-[8px] text-neutral-400 mt-1">{sqft.toLocaleString()} sq ft | {roofData?.planes?.length || 0} planes</p>}
        </div>
      );
      case "scope": return (
        <div className="mb-4">
          <p className="text-[10px] font-bold text-neutral-800 mb-1">Scope of Work</p>
          <p className="text-[8px] text-neutral-500 leading-relaxed">{scopeText || "..."}</p>
        </div>
      );
      case "line-items": return (
        <div className="mb-4">
          <div className="bg-neutral-50 rounded px-2 py-1 flex text-[7px] font-bold text-neutral-400 uppercase mb-1">
            <span className="flex-1">Item</span><span className="w-10 text-right">Qty</span><span className="w-16 text-right">Rate</span><span className="w-16 text-right">Amount</span>
          </div>
          {lineItems.map((item, i) => (
            <div key={item.id} className={`px-2 py-1.5 flex items-start text-[8px] ${i % 2 === 1 ? "bg-neutral-50/50" : ""}`}>
              <div className="flex-1">
                <p className="font-semibold text-neutral-800">{item.name || "Item"}</p>
                {item.description && <p className="text-neutral-400 text-[7px]">{item.description}</p>}
              </div>
              <span className="w-10 text-right text-neutral-500">{item.qty}</span>
              <span className="w-16 text-right text-neutral-500">{money(item.unitPrice)}</span>
              <span className="w-16 text-right font-semibold text-neutral-800">{money(item.qty * item.unitPrice)}</span>
            </div>
          ))}
        </div>
      );
      case "measurements": return (
        <div className="mb-4 grid grid-cols-3 gap-x-4 gap-y-1 text-[8px]">
          <p className="text-[10px] font-bold text-neutral-800 col-span-3 mb-1">Measurements</p>
          {[["Area", `${sqft.toLocaleString()} SF`],["Ridge", `${measurements.ridge_length_ft||0} LF`],["Eave", `${measurements.eave_length_ft||0} LF`],
            ["Valley", `${measurements.valley_length_ft||0} LF`],["Hip", `${measurements.hip_length_ft||0} LF`],["Perimeter", `${measurements.total_perimeter_ft||0} LF`]
          ].map(([l,v]) => <div key={l}><span className="text-neutral-400">{l}: </span><span className="font-semibold text-neutral-700">{v}</span></div>)}
        </div>
      );
      case "totals": return (
        <div className="mb-4 border-t border-neutral-200 pt-3">
          <div className="flex justify-end">
            <div className="w-48 space-y-1 text-[9px]">
              <div className="flex justify-between"><span className="text-neutral-400">Subtotal</span><span>{money(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between"><span className="text-neutral-400">Discount ({discountPercent}%)</span><span className="text-green-600">-{money(discount)}</span></div>}
              {tax > 0 && <div className="flex justify-between"><span className="text-neutral-400">Tax ({taxRate}%)</span><span>{money(tax)}</span></div>}
              <div className="flex justify-between border-t border-neutral-200 pt-1 text-[12px] font-bold"><span>Total</span><span>{money(total)}</span></div>
              <div className="flex justify-between text-[8px] text-neutral-400"><span>Deposit ({depositPercent}%)</span><span>{money(deposit)}</span></div>
              <div className="flex justify-between text-[8px] text-neutral-400"><span>Balance</span><span>{money(total - deposit)}</span></div>
            </div>
          </div>
        </div>
      );
      case "notes": return notesText ? (
        <div className="mb-4"><p className="text-[7px] text-neutral-400 uppercase">Notes</p><p className="text-[8px] text-neutral-500 mt-1">{notesText}</p></div>
      ) : null;
      case "terms": return (
        <div className="mb-4 text-[7px] text-neutral-400 space-y-1">
          <p className="text-[9px] font-bold text-neutral-700">Terms & Conditions</p>
          <p>1. {depositPercent}% deposit required. Balance due on completion.</p>
          <p>2. Manufacturer warranty 20-40 years. Workmanship 5 years.</p>
          <p>3. Price valid {validDays} days. 4. Unforeseen conditions may adjust price.</p>
        </div>
      );
      case "signature": return (
        <div className="mt-6 grid grid-cols-2 gap-8">
          {["Customer", "Contractor"].map((r) => (
            <div key={r}><p className="text-[7px] text-neutral-400 mb-6">{r} Signature</p><div className="border-b border-neutral-300 mb-1" /><p className="text-[7px] text-neutral-400">Name / Date</p></div>
          ))}
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Proposal Builder</h2>
          <p className="text-sm text-neutral-500">Edit on the left, preview updates live on the right</p>
        </div>
        <Button onClick={generatePDF} disabled={generating} className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 gap-2 shadow-md">
          {generating ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Download className="w-4 h-4" />}
          {generating ? "Generating..." : "Download PDF"}
        </Button>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr_340px] gap-4" style={{ minHeight: "700px" }}>
        {/* Col 1: Section list */}
        <div className="space-y-3">
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-3 py-2 border-b border-neutral-100 bg-neutral-50">
              <p className="text-[10px] font-semibold text-neutral-500 uppercase">Sections — drag to reorder</p>
            </div>
            <div className="p-1.5 space-y-0.5">
              {sections.map((section, index) => {
                const Icon = SECTION_ICONS[section.type];
                return (
                  <div key={section.id} draggable onDragStart={() => onDragStart(index)} onDragEnter={() => onDragEnter(index)} onDragEnd={onDragEnd} onDragOver={(e) => e.preventDefault()}
                    onClick={() => section.enabled && setActivePanel(section.type)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg cursor-pointer select-none text-[11px] ${
                      activePanel === section.type && section.enabled ? "bg-orange-50 border border-orange-200 font-semibold" : "hover:bg-neutral-50 border border-transparent"
                    } ${!section.enabled ? "opacity-30" : ""}`}>
                    <GripVertical className="w-2.5 h-2.5 text-neutral-300 cursor-grab" />
                    <Icon className="w-3 h-3 text-neutral-400" />
                    <span className="flex-1 truncate text-neutral-700">{section.title}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); toggleSection(section.id); }}
                      className={`w-7 h-3.5 rounded-full flex-shrink-0 ${section.enabled ? "bg-orange-500" : "bg-neutral-200"}`}>
                      <div className={`w-2.5 h-2.5 rounded-full bg-white shadow-sm ${section.enabled ? "ml-[16px]" : "ml-0.5"}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-3">
            <p className="text-[10px] font-semibold text-neutral-500 uppercase mb-2">Brand Color</p>
            <div className="flex items-center gap-2">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-8 h-8 rounded border border-neutral-200 cursor-pointer" />
              <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1 text-[10px] font-mono h-7" />
            </div>
          </div>
        </div>

        {/* Col 2: Editor */}
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-neutral-100 bg-gradient-to-r from-neutral-50 to-white flex items-center gap-2">
            {(() => { const Icon = SECTION_ICONS[activePanel as SectionType] || FileText; return <Icon className="w-4 h-4 text-orange-500" />; })()}
            <h3 className="text-sm font-semibold text-neutral-900">{sections.find((s) => s.type === activePanel)?.title || "Select a section"}</h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            {activePanel === "company" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-[10px]">Company Name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  <div><Label className="text-[10px]">Phone</Label><Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  <div><Label className="text-[10px]">Email</Label><Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  <div><Label className="text-[10px]">Website</Label><Input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                </div>
                <div><Label className="text-[10px]">Address</Label><Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                <div>
                  <Label className="text-[10px]">Logo</Label>
                  <div className="mt-1 flex items-center gap-2">
                    {logoUrl ? <img src={logoUrl} alt="" className="w-10 h-10 object-contain rounded border" /> : <div className="w-10 h-10 rounded border-2 border-dashed border-neutral-200 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-neutral-300" /></div>}
                    <label className="cursor-pointer text-[10px] font-medium text-orange-600 hover:text-orange-700">
                      {logoUrl ? "Change" : "Upload"}
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        try {
                          const { getSupabaseBrowserClient } = await import("@/lib/supabaseClient");
                          const sb = getSupabaseBrowserClient();
                          const path = `logos/${Date.now()}.${file.name.split(".").pop()||"png"}`;
                          await sb.storage.from("public").upload(path, file, { upsert: true });
                          const url = sb.storage.from("public").getPublicUrl(path).data.publicUrl;
                          setLogoUrl(url);
                          await (sb.from("users") as any).update({ company_logo_url: url }).eq("id", user?.id);
                        } catch (err: any) { console.error("Upload failed:", err.message); }
                      }} />
                    </label>
                    {logoUrl && <button type="button" onClick={() => setLogoUrl("")} className="text-[10px] text-red-400">Remove</button>}
                  </div>
                </div>
              </>
            )}
            {activePanel === "client" && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[10px]">Client Name</Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-1 h-8 text-sm" placeholder="Property owner" /></div>
                <div><Label className="text-[10px]">Phone</Label><Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-[10px]">Email</Label><Input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-[10px]">Address</Label><Input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} className="mt-1 h-8 text-sm" /></div>
              </div>
            )}
            {activePanel === "header" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label className="text-[10px]">Proposal Title</Label><Input value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-[10px]">Number</Label><Input value={proposalNumber} onChange={(e) => setProposalNumber(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                <div><Label className="text-[10px]">Valid (days)</Label><Input type="number" value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} className="mt-1 h-8 text-sm" /></div>
              </div>
            )}
            {activePanel === "scope" && (<div><Label className="text-[10px]">Scope of Work</Label><Textarea value={scopeText} onChange={(e) => setScopeText(e.target.value)} rows={5} className="mt-1 text-sm" /></div>)}
            {activePanel === "project" && (
              <div className="bg-neutral-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-neutral-400 text-[10px]">Project</span><p className="font-semibold text-sm">{project.name}</p></div>
                <div><span className="text-neutral-400 text-[10px]">Address</span><p className="font-semibold text-sm">{project.address}</p></div>
                <div><span className="text-neutral-400 text-[10px]">Area</span><p className="font-semibold">{sqft.toLocaleString()} SF</p></div>
                <div><span className="text-neutral-400 text-[10px]">Planes</span><p className="font-semibold">{roofData?.planes?.length || 0}</p></div>
              </div>
            )}
            {activePanel === "measurements" && (
              <div className="bg-neutral-50 rounded-lg p-3 grid grid-cols-3 gap-2 text-sm">
                {[["Area", `${sqft.toLocaleString()} SF`],["Ridge", `${measurements.ridge_length_ft||0} LF`],["Eave", `${measurements.eave_length_ft||0} LF`],
                  ["Valley", `${measurements.valley_length_ft||0} LF`],["Hip", `${measurements.hip_length_ft||0} LF`],["Perimeter", `${measurements.total_perimeter_ft||0} LF`]
                ].map(([l,v]) => <div key={l}><span className="text-neutral-400 text-[10px]">{l}</span><p className="font-bold">{v}</p></div>)}
              </div>
            )}
            {activePanel === "line-items" && (
              <div className="space-y-2">
                {lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-[1fr_1fr_50px_80px_28px] gap-1.5 items-end">
                    <div><Label className="text-[9px]">Item</Label><Input value={item.name} onChange={(e) => updateLineItem(item.id, "name", e.target.value)} className="h-7 text-xs" /></div>
                    <div><Label className="text-[9px]">Desc</Label><Input value={item.description} onChange={(e) => updateLineItem(item.id, "description", e.target.value)} className="h-7 text-xs" /></div>
                    <div><Label className="text-[9px]">Qty</Label><Input inputMode="numeric" value={item.qty || ""} onChange={(e) => updateLineItem(item.id, "qty", e.target.value)} className="h-7 text-xs" /></div>
                    <div><Label className="text-[9px]">Price</Label><Input inputMode="decimal" value={item.unitPrice || ""} onChange={(e) => updateLineItem(item.id, "unitPrice", e.target.value)} className="h-7 text-xs" /></div>
                    <button type="button" onClick={() => removeLineItem(item.id)} className="h-7 w-7 flex items-center justify-center text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addLineItem} className="gap-1 text-[10px] h-7"><Plus className="w-3 h-3" />Add Item</Button>
              </div>
            )}
            {activePanel === "totals" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div><Label className="text-[10px]">Tax %</Label><Input inputMode="decimal" value={taxRateStr} onChange={(e) => setTaxRateStr(e.target.value)} className="mt-1 h-8" /></div>
                  <div><Label className="text-[10px]">Deposit %</Label><Input inputMode="decimal" value={depositPercentStr} onChange={(e) => setDepositPercentStr(e.target.value)} className="mt-1 h-8" /></div>
                  <div><Label className="text-[10px]">Discount %</Label><Input inputMode="decimal" value={discountPercentStr} onChange={(e) => setDiscountPercentStr(e.target.value)} className="mt-1 h-8" /></div>
                </div>
                <div className="bg-slate-900 text-white rounded-lg p-3 flex items-center justify-between">
                  <span className="text-xs">Total</span><span className="text-xl font-bold">{money(total)}</span>
                </div>
              </div>
            )}
            {activePanel === "notes" && (<div><Label className="text-[10px]">Notes</Label><Textarea value={notesText} onChange={(e) => setNotesText(e.target.value)} rows={3} className="mt-1 text-sm" placeholder="Special instructions..." /></div>)}
            {(activePanel === "terms" || activePanel === "signature") && (
              <p className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3">
                {activePanel === "terms" ? "Standard terms auto-generated from your deposit and validity settings." : "Signature block with customer and contractor lines."}
              </p>
            )}
          </div>
        </div>

        {/* Col 3: Live Preview */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-100 overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b border-neutral-200 bg-white flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[10px] font-semibold text-neutral-500 uppercase">Live Preview</span>
            </div>
            <div className="flex gap-0.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <div className="w-2 h-2 rounded-full bg-green-400" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex justify-center">
            <div className="bg-white rounded shadow-lg w-full max-w-[300px] p-6 text-neutral-900" style={{ fontSize: "10px", minHeight: "420px", borderTop: `3px solid ${accentColor}` }}>
              {sections.filter((s) => s.enabled).map((s) => (
                <div key={s.id} className={activePanel === s.type ? "ring-1 ring-orange-300 rounded -mx-1 px-1 py-0.5 bg-orange-50/30" : ""}>
                  <PreviewSection type={s.type} />
                </div>
              ))}
              {/* Bottom accent */}
              <div className="mt-6 h-1 rounded-full" style={{ backgroundColor: accentColor }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
