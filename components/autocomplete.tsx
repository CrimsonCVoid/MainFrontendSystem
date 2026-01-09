"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandItem, CommandEmpty } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";

type Suggestion = {
  id: string;
  label: string;      // street
  secondary?: string; // city, state, etc.
  city?: string;
  state?: string;
  lon?: number;
  lat?: number;
};

const CACHE = new Map<string, Suggestion[]>();

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter address",
  className,
  minChars = 3,
  debounceMs = 250,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (v: string, extra?: { lon?: number; lat?: number; city?: string; state?: string }) => void;
  placeholder?: string;
  className?: string;
  minChars?: number;
  debounceMs?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);

  // Keep track of last committed (selected) value to suppress popover until changed
  const [selectedValue, setSelectedValue] = React.useState<string>("");

  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const debounceRef = React.useRef<number | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const lastIssuedQuery = React.useRef<string>("");

  const q = value.trim();
  const dirty = q !== selectedValue.trim();
  const canSearch = q.length >= minChars && dirty; // only search if user altered the selected value
  const show = open && q.length > 0 && dirty;      // keep popover hidden after selection until edited

  // Open while typing (but only when "dirty")
  const ensureOpenWhileTyping = React.useCallback(() => {
    if (dirty && q.length > 0 && !open) setOpen(true);
    if (!dirty && open) setOpen(false);
  }, [dirty, q.length, open]);

  React.useEffect(() => {
    ensureOpenWhileTyping();

    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    if (!canSearch) {
      setLoading(false);
      setItems([]);
      setActiveIndex(-1);
      return;
    }

    if (CACHE.has(q)) {
      const cached = CACHE.get(q)!;
      setItems(cached);
      setActiveIndex(cached.length ? 0 : -1);
      setLoading(false);
    } else {
      setLoading(true);
    }

    debounceRef.current = window.setTimeout(async () => {
      try { abortRef.current?.abort(); } catch {}
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      lastIssuedQuery.current = q;
      try {
        const r = await fetch(`/api/geocode?s=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (lastIssuedQuery.current !== q) return;
        if (!r.ok) throw new Error("geocode error");

        const data = (await r.json()) as { suggestions: Suggestion[] };
        const s = data?.suggestions ?? [];
        CACHE.set(q, s);
        setItems(s);
        setActiveIndex(s.length ? 0 : -1);
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
      } finally {
        if (lastIssuedQuery.current === q) setLoading(false);
      }
    }, debounceMs);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q, canSearch, debounceMs, ensureOpenWhileTyping]);

  const composeDisplay = (s: Suggestion) => {
    const cityState = [s.city, s.state].filter(Boolean).join(", ");
    return cityState ? `${s.label}, ${cityState}` : s.label;
  };

  const commitBySuggestion = (s: Suggestion | undefined) => {
    if (!s) return;
    const display = composeDisplay(s);

    // Update the input, record as selected, fire parent onSelect
    onChange(display);
    setSelectedValue(display);

    onSelect(display, { lon: s.lon, lat: s.lat, city: s.city, state: s.state });

    // Close and blur; popover stays hidden until user edits value
    setOpen(false);
    inputRef.current?.blur();
  };

  const commitByValue = (val: string) => {
    const s = items.find((x) => composeDisplay(x) === val) ?? items[activeIndex] ?? items[0];
    commitBySuggestion(s);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commitBySuggestion(items[activeIndex] ?? items[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.focus();
    }
  };

  React.useEffect(() => {
    if (!listRef.current || activeIndex < 0) return;
    const el = listRef.current.querySelectorAll("[role='option']")[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <Popover open={show} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              // Only reopen if the user has altered the selected text
              if (dirty && q.length > 0) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            type="text"
            placeholder={placeholder}
            autoComplete="street-address"
            className={cn(
              "w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
          />
          <MapPin className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          {!q && <CommandEmpty>Start typing an address</CommandEmpty>}
          {q && q.length < minChars && <CommandEmpty>Keep typing… ({minChars - q.length} more)</CommandEmpty>}
          {q && q.length >= minChars && loading && <CommandEmpty>Searching…</CommandEmpty>}
          {q && q.length >= minChars && !loading && items.length === 0 && <CommandEmpty>No results</CommandEmpty>}

          {items.length > 0 && (
            <div ref={listRef} className="max-h-72 overflow-auto">
              <CommandGroup>
                {items.map((s, idx) => {
                  const display = composeDisplay(s);
                  return (
                    <CommandItem
                      key={s.id}
                      value={display}
                      role="option"
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onSelect={(val) => commitByValue(val)}
                      className={cn(
                        "cursor-pointer items-start",
                        idx === activeIndex && "bg-accent text-accent-foreground"
                      )}
                    >
                      <div className="flex flex-col">
                        <span>{display}</span>
                        {s.secondary && (
                          <span className="text-[12px] text-muted-foreground">{s.secondary}</span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
