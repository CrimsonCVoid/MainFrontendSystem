"use client";

import { ArrowLeft, FileText, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface LabelingHeaderProps {
  projectId: string;
  projectName?: string | null;
  onSave?: () => void;
  isSaving?: boolean;
  onGeneratePdf?: () => void;
  isGeneratingPdf?: boolean;
}

export function LabelingHeader({
  projectId,
  projectName,
  onSave,
  isSaving,
  onGeneratePdf,
  isGeneratingPdf,
}: LabelingHeaderProps) {
  const router = useRouter();

  return (
    <header className="h-14 sticky top-0 z-40 bg-white border-b border-neutral-200 flex items-center px-6 gap-4 shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push(`/projects/${projectId}`)}
        aria-label="Back to project"
        className="text-neutral-600 hover:text-neutral-900"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <div className="flex flex-col leading-tight">
        <span className="text-xs uppercase tracking-wider text-neutral-500 font-medium">
          Labeler
        </span>
        <h1 className="text-base font-semibold text-neutral-900 truncate max-w-[28rem]">
          {projectName || projectId}
        </h1>
      </div>
      <div className="flex-1" />
      <Button
        onClick={onGeneratePdf}
        disabled={isGeneratingPdf}
        variant="outline"
        className="h-9 border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50"
      >
        {isGeneratingPdf ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </>
        )}
      </Button>
      <Button
        onClick={onSave}
        disabled={isSaving}
        className="h-9 bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
      >
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? "Saving…" : "Save Labels"}
      </Button>
    </header>
  );
}
