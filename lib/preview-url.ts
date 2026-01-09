// /lib/preview-url.ts
export function openFullTabPreview(address: string) {
    if (!address.trim()) return;
    const url = `/preview?address=${encodeURIComponent(address.trim())}`;
    // open in a new tab; 'noopener' for security
    window.open(url, "_blank", "noopener,noreferrer");
  }
  