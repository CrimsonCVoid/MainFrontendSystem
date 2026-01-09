"use client";

type PreviewFrameProps = {
  title?: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
};

export default function PreviewFrame({
  title = "Roof Preview",
  subtitle = "A visual model will appear here.",
  rightSlot,
  children,
}: PreviewFrameProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2">{rightSlot}</div>
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-b-xl bg-muted">
        {!children ? (
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center text-sm text-muted-foreground">
              <div className="mb-1 font-medium">Preview coming soon</div>
              <div>Connect your 3D viewer/CAD renderer when ready.</div>
            </div>
          </div>
        ) : children}
      </div>
    </div>
  );
}