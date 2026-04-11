"use client";

import { useState } from "react";
import { Search, BarChart2 } from "lucide-react";

interface TrackingSearchProps {
  onSearch?: (referenceNumber: string) => void;
  initialValue?: string;
}

function formatReferenceValue(value: string) {
  const suffix = value
    .replace(/\s+/g, "")
    .replace(/^ORD-?/i, "")
    .replace(/-/g, "");

  return `ORD-${suffix}`;
}

export default function TrackingSearch({
  onSearch,
  initialValue = "",
}: TrackingSearchProps) {
  const [referenceNumber, setReferenceNumber] = useState(() =>
    formatReferenceValue(initialValue),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanedValue = referenceNumber.replace(/^ORD-/i, "").trim();

    if (!cleanedValue) {
      onSearch?.("");
      return;
    }

    onSearch?.(`ORD-${cleanedValue}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="relative group">
        <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center text-outline transition-colors group-focus-within:text-on-surface">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={referenceNumber}
          onChange={(event) =>
            setReferenceNumber(formatReferenceValue(event.target.value))
          }
          placeholder="Reference Number (e.g. ORD-307)"
          className="h-14 w-full rounded-md border border-outline-variant bg-surface-container-low pl-14 pr-5 text-base font-medium text-on-surface outline-none transition-all placeholder:text-outline/60 focus:border-on-surface focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <button
        type="submit"
        className="flex h-14 w-full items-center justify-center gap-2.5 rounded-md bg-on-surface font-headline text-sm font-bold uppercase tracking-[0.14em] text-white transition-all hover:bg-on-surface/85 active:scale-[0.98]"
      >
        <BarChart2 className="h-5 w-5" />
        Track Progress
      </button>

      <div className="flex flex-wrap justify-center gap-3 pt-1">
        <div className="flex items-center gap-2 rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-on-surface" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Filepino Certified
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-outline-variant/30 bg-surface-container-low px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            24h Response
          </span>
        </div>
      </div>
    </form>
  );
}
