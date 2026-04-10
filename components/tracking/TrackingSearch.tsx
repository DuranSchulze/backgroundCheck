"use client";

import { useRef } from "react";
import { Search, BarChart2 } from "lucide-react";

interface TrackingSearchProps {
  onSearch?: (referenceNumber: string) => void;
  initialValue?: string;
}

export default function TrackingSearch({
  onSearch,
  initialValue = "",
}: TrackingSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rawValue = inputRef.current?.value ?? "";
    const cleanedValue = rawValue.replace(/^ORD-/i, "").trim();

    if (!cleanedValue) {
      onSearch?.("");
      return;
    }

    onSearch?.(`ORD-${cleanedValue}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="relative group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-outline transition-colors group-focus-within:text-primary">
          <Search className="h-5 w-5" />
        </div>
        <input
          ref={inputRef}
          type="text"
          defaultValue={initialValue}
          onChange={(e) => {
            const cleaned = e.target.value.replace(/\s+/g, "");
            if (cleaned !== e.target.value) e.target.value = cleaned;
          }}
          placeholder="Reference Number (e.g. ORD-307)"
          className="w-full h-14 pl-14 pr-5 bg-surface-container-low rounded border border-outline-variant focus:border-primary focus:ring-0 outline-none transition-all text-base font-medium placeholder:text-outline/60 text-on-surface"
        />
      </div>

      <button
        type="submit"
        className="w-full h-14 bg-primary text-on-primary rounded font-headline font-bold text-sm uppercase tracking-[0.14em] hover:bg-primary-container hover:text-on-primary-container active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 shadow-md shadow-primary/20"
      >
        <BarChart2 className="h-5 w-5" />
        Track Progress
      </button>

      <div className="flex flex-wrap justify-center gap-3 pt-1">
        <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded border border-outline-variant/30">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Filepino Certified
          </span>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded border border-outline-variant/30">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            24h Response
          </span>
        </div>
      </div>
    </form>
  );
}
