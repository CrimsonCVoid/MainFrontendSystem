"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Download,
  Plus,
  Trash2,
  Image as ImageIcon,
  FileText,
  Palette,
  Building2,
  User,
  MapPin,
  DollarSign,
  Ruler,
  Shield,
  PenLine,
  X,
  Loader2,
  ChevronUp,
  ChevronDown,
  Layers,
  Send,
} from "lucide-react";
import SendForSignatureDialog from "@/components/project/SendForSignatureDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { generateAndDownloadProposalBuilder } from "@/lib/pdf-api-client";

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

// Company contact info is now embedded in the Proposal Header section, so
// the standalone "company" section defaults to off. It's still available
// in the Sections menu for users who want a separate contact strip (for
// example, on proposals where the header logo is company-branded without
// the contact row).
const DEFAULT_SECTIONS: Section[] = [
  { id: "1", type: "header", enabled: true, title: "Proposal Header" },
  { id: "2", type: "company", enabled: false, title: "Extra Company Contact" },
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
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
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
      await generateAndDownloadProposalBuilder({
        projectId: project.id,
        projectName: project.name,
        proposalNumber,
        proposalTitle,
        validDays,
        accentColor,
        sections: sections.filter((s) => s.enabled),
        company: {
          name: companyName,
          phone: companyPhone,
          email: companyEmail,
          address: companyAddress,
          website: companyWebsite,
          logoUrl,
        },
        client: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          address: clientAddress,
        },
        projectMeta: {
          address: [project.address, project.city, project.state, project.postal_code].filter(Boolean).join(", "),
          squareFootage: sqft,
          planeCount: roofData?.planes?.length || 0,
          measurements,
        },
        scopeText,
        lineItems,
        totals: {
          subtotal,
          discount,
          discountPercent,
          tax,
          taxRate,
          total,
          deposit,
          depositPercent,
        },
        notesText,
      });
    } finally {
      setGenerating(false);
    }
  }, [sections, companyName, companyPhone, companyEmail, companyAddress, companyWebsite, logoUrl, clientName, clientEmail, clientPhone, clientAddress, proposalNumber, proposalTitle, validDays, scopeText, lineItems, taxRate, depositPercent, discountPercent, notesText, accentColor, subtotal, discount, tax, total, deposit, sqft, measurements, roofData, project]);

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const validDate = new Date(Date.now() + validDays * 86400000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const money = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const projectAddr = [project.address, project.city, project.state, project.postal_code].filter(Boolean).join(", ");

  // Live preview renderer for a section
  const PreviewSection = ({ type }: { type: SectionType }) => {
    switch (type) {
      case "header": return (
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-neutral-100">
          <div>
            {logoUrl ? <img src={logoUrl} alt="" className="h-10 object-contain mb-2" /> : null}
            <p className="text-[22px] font-bold" style={{ color: accentColor }}>{companyName || "Company Name"}</p>
            {/* Company contact info merged into the header so it reads like
                a letterhead. The standalone "company" section defaults off. */}
            <div className="text-[8px] text-neutral-400 mt-1.5 space-y-0.5 leading-tight">
              {companyPhone && <p>{companyPhone}</p>}
              {companyEmail && <p>{companyEmail}</p>}
              {companyAddress && <p>{companyAddress}</p>}
              {companyWebsite && <p>{companyWebsite}</p>}
            </div>
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

  const moveSection = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const copy = [...sections];
    const [m] = copy.splice(index, 1);
    copy.splice(target, 0, m);
    setSections(copy);
  };

  const activeSection = sections.find((s) => s.type === activePanel);
  const ActiveIcon = activeSection ? SECTION_ICONS[activeSection.type] : FileText;

  // Sections with long-text editors (textareas, multi-column tables) get
  // a wider drawer so the user isn't wrapping in a 420px rail. Preview
  // shift matches half the drawer width so both stay centered.
  const WIDE_PANELS: SectionType[] = ["scope", "notes", "line-items", "header"];
  const isWidePanel = activePanel
    ? WIDE_PANELS.includes(activePanel as SectionType)
    : false;
  const drawerWidthClass = isWidePanel ? "sm:w-[580px]" : "sm:w-[420px]";
  const previewShiftClass = activePanel
    ? isWidePanel
      ? "sm:-translate-x-[290px]"
      : "sm:-translate-x-[210px]"
    : "";

  return (
    <div className="relative min-h-[700px]">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 py-3 mb-6 bg-white/90 backdrop-blur border-b border-neutral-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-neutral-900 truncate">
              Proposal
            </h2>
            <p className="hidden sm:block text-xs text-neutral-500">
              Click any section in the preview to edit it
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sections: toggle + reorder */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Sections</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end">
                <div className="px-3 py-2 border-b border-neutral-100 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
                  Sections
                </div>
                <div className="max-h-80 overflow-y-auto p-1">
                  {sections.map((s, i) => {
                    const Icon = SECTION_ICONS[s.type];
                    return (
                      <div
                        key={s.id}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-neutral-50"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSection(s.id)}
                          className={`w-8 h-4 rounded-full flex-shrink-0 transition-colors ${
                            s.enabled ? "bg-blue-500" : "bg-neutral-200"
                          }`}
                          aria-label={s.enabled ? "Disable" : "Enable"}
                        >
                          <div
                            className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
                              s.enabled ? "ml-[18px]" : "ml-0.5"
                            }`}
                          />
                        </button>
                        <Icon className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                        <span
                          className={`flex-1 truncate text-xs ${
                            s.enabled ? "text-neutral-800" : "text-neutral-400"
                          }`}
                        >
                          {s.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => moveSection(i, -1)}
                          disabled={i === 0}
                          className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-400 disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label="Move up"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(i, 1)}
                          disabled={i === sections.length - 1}
                          className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-400 disabled:opacity-30 disabled:hover:bg-transparent"
                          aria-label="Move down"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* Brand color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <div
                    className="w-3.5 h-3.5 rounded-full border border-white shadow-inner"
                    style={{ backgroundColor: accentColor }}
                  />
                  <Palette className="w-3.5 h-3.5 hidden sm:block" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="end">
                <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Brand Color
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-9 h-9 rounded border border-neutral-200 cursor-pointer"
                  />
                  <Input
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 text-xs font-mono h-9"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {[
                    "#f97316",
                    "#dc2626",
                    "#2563eb",
                    "#059669",
                    "#7c3aed",
                    "#0891b2",
                    "#475569",
                    "#111827",
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccentColor(c)}
                      className="w-6 h-6 rounded-full border-2 border-white shadow hover:scale-110 transition"
                      style={{ backgroundColor: c }}
                      aria-label={`Set brand color ${c}`}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Download PDF (draft) */}
            <Button
              variant="outline"
              onClick={generatePDF}
              disabled={generating}
              size="sm"
              className="gap-1.5 h-9"
            >
              {generating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline text-xs font-medium">
                {generating ? "Generating…" : "PDF"}
              </span>
            </Button>

            {/* Send for Signature */}
            <Button
              onClick={() => setSendDialogOpen(true)}
              size="sm"
              className="gap-1.5 h-9 text-white"
              style={{ backgroundColor: accentColor }}
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-medium">
                Send for Signature
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Paper preview — shifts left when drawer opens so both stay visible */}
      <div
        className={`flex justify-center pb-16 px-4 transition-transform duration-300 ease-out will-change-transform ${previewShiftClass}`}
      >
        <div
          className="bg-white shadow-2xl rounded-sm w-full max-w-[820px] relative text-[14px]"
          style={{
            borderTop: `5px solid ${accentColor}`,
            padding: "56px 64px",
            minHeight: "1060px",
          }}
        >
          {/* CSS zoom scales the absolute-px sizes inside PreviewSection
              proportionally with the larger paper, without needing to
              rewrite every text-[Npx] class. Preserves layout + hit
              targets (zoom scales both). */}
          <div style={{ zoom: 1.6 }}>
            {sections.filter((s) => s.enabled).map((s) => {
              const Icon = SECTION_ICONS[s.type];
              const isActive = activePanel === s.type;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActivePanel(s.type)}
                  className={`group relative block w-full text-left rounded transition-all -mx-1.5 px-1.5 py-0.5 ${
                    isActive
                      ? "ring-1 ring-blue-400 bg-blue-50/40"
                      : "hover:ring-1 hover:ring-blue-200 hover:bg-blue-50/20"
                  }`}
                >
                  <PreviewSection type={s.type} />
                  <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5 text-[9px] font-medium text-blue-600 bg-white rounded-full px-1.5 py-0.5 shadow-sm border border-blue-100">
                    <Icon className="w-2.5 h-2.5" /> Edit
                  </span>
                </button>
              );
            })}
            <div
              className="mt-6 h-1 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
          </div>
        </div>
      </div>

      {/* Slide-in editor drawer. No dim backdrop: the preview slides left
          to stay visible, so the user can click another section directly. */}
      {activePanel && (
        <>
          <div
            className={`fixed inset-y-0 right-0 z-40 w-full ${drawerWidthClass} bg-white shadow-2xl border-l border-neutral-200 flex flex-col animate-in slide-in-from-right duration-200 transition-[width] ease-out`}
          >
            <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/60">
              <div className="flex items-center gap-2 min-w-0">
                <ActiveIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-neutral-900 truncate">
                  {activeSection?.title}
                </h3>
              </div>
              <button
                onClick={() => setActivePanel(null)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-500"
                aria-label="Close editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Proposal</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label className="text-[10px]">Title</Label><Input value={proposalTitle} onChange={(e) => setProposalTitle(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-[10px]">Number</Label><Input value={proposalNumber} onChange={(e) => setProposalNumber(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-[10px]">Valid (days)</Label><Input type="number" value={validDays} onChange={(e) => setValidDays(Number(e.target.value))} className="mt-1 h-8 text-sm" /></div>
                  </div>
                </div>
                <div className="pt-4 border-t border-neutral-100">
                  <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-2">Your Company</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><Label className="text-[10px]">Company Name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-[10px]">Phone</Label><Input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-[10px]">Email</Label><Input value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-[10px]">Website</Label><Input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-[10px]">Address</Label><Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} className="mt-1 h-8 text-sm" /></div>
                  </div>
                  <div className="mt-3">
                    <Label className="text-[10px]">Logo</Label>
                    <div className="mt-1 flex items-center gap-2">
                      {logoUrl ? <img src={logoUrl} alt="" className="w-10 h-10 object-contain rounded border" /> : <div className="w-10 h-10 rounded border-2 border-dashed border-neutral-200 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-neutral-300" /></div>}
                      <label className="cursor-pointer text-[10px] font-medium text-blue-600 hover:text-blue-700">
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
                            // @ts-expect-error generated Supabase types may not include users table typing
                            await sb.from("users").update({ company_logo_url: url }).eq("id", user?.id);
                          } catch (err) { console.error("Upload failed:", err instanceof Error ? err.message : err); }
                        }} />
                      </label>
                      {logoUrl && <button type="button" onClick={() => setLogoUrl("")} className="text-[10px] text-red-400">Remove</button>}
                    </div>
                  </div>
                </div>
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
                {activePanel === "terms"
                  ? "Standard terms auto-generated from your deposit and validity settings."
                  : "Signature block with customer and contractor lines."}
              </p>
            )}
            </div>
          </div>
        </>
      )}

      {/* Send for Signature dialog. Serializes the current proposal
          state into the server's content_json; the server freezes it
          + hashes it so the signer agrees to exactly this content. */}
      <SendForSignatureDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        projectId={project.id}
        projectName={project.name}
        companyName={companyName}
        brandColor={accentColor}
        content={{
          companyName,
          projectName: project.name,
          brandColor: accentColor,
          proposalTitle,
          proposalNumber,
          validDays,
          sections: sections.filter((s) => s.enabled),
          company: {
            name: companyName,
            phone: companyPhone,
            email: companyEmail,
            address: companyAddress,
            website: companyWebsite,
            logoUrl,
          },
          client: {
            name: clientName,
            email: clientEmail,
            phone: clientPhone,
            address: clientAddress,
          },
          projectMeta: {
            address: projectAddr,
            squareFootage: sqft,
            planeCount: roofData?.planes?.length || 0,
            measurements,
          },
          scopeText,
          lineItems,
          totals: {
            subtotal,
            discount,
            discountPercent,
            tax,
            taxRate,
            total,
            deposit,
            depositPercent,
          },
          notesText,
        }}
      />
    </div>
  );
}
