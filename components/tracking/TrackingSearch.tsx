"use client";

import { useRef } from "react";

interface TrackingSearchProps {
  onSearch?: (referenceNumber: string) => void;
  initialValue?: string;
}

const SearchIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-6 w-6"
  >
    <path
      fillRule="evenodd"
      d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
      clipRule="evenodd"
    />
  </svg>
);

const FingerprintIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="h-6 w-6"
  >
    <path
      fillRule="evenodd"
      d="M12 4a8 8 0 00-8 8c0 1.189.27 2.315.756 3.324l-1.4 1.4A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10c0 1.57-.365 3.053-1.016 4.375l-1.4-1.4C19.73 14.315 20 13.189 20 12a8 8 0 00-8-8zm0 3a5 5 0 00-5 5c0 .573.096 1.123.272 1.636l-1.44.48A6.5 6.5 0 016.5 12a5.5 5.5 0 1111 0c0 .45-.054.888-.156 1.308l-1.488-.496c.063-.264.094-.536.094-.812a3.5 3.5 0 10-7 0c0 .79.127 1.55.363 2.26l-1.416.472A6.48 6.48 0 016.5 12 5.5 5.5 0 0112 6.5zm0 3a2.5 2.5 0 00-2.5 2.5c0 .468.128.907.35 1.283l-1.3.867A4.49 4.49 0 017.5 12a4.5 4.5 0 119 0 4.49 4.49 0 01-.95 2.783l-1.3-.867c.222-.376.35-.815.35-1.283A2.5 2.5 0 0012 9.5z"
      clipRule="evenodd"
    />
  </svg>
);

export default function TrackingSearch({
  onSearch,
  initialValue = "",
}: TrackingSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch?.(inputRef.current?.value ?? "");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary">
            {FingerprintIcon}
          </div>
          <input
            ref={inputRef}
            type="text"
            defaultValue={initialValue}
            placeholder="Reference Number (e.g. BG-7742)"
            className="w-full rounded-[1.6rem] border border-amber-200 bg-white py-5 pl-16 pr-6 text-base font-medium tracking-[-0.015em] text-on-surface outline-none transition-colors placeholder:font-normal placeholder:text-outline-variant focus:border-primary focus:ring-0 md:text-lg"
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-[1.6rem] border border-[#f0ca52] bg-primary px-7 py-5 font-headline text-sm font-bold uppercase tracking-[0.16em] text-[color:var(--color-on-primary)] transition-colors hover:bg-primary-container md:px-8"
        >
          {SearchIcon}
          <span>Track Progress</span>
        </button>
      </div>
    </form>
  );
}
