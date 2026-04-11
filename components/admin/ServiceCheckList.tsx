"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/badge";
import { actionInitializeChecks } from "@/app/actions/service-checks";
import type { CheckProgressView } from "@/lib/tracking/types";

function statusToBadge(
  status: string,
): React.ComponentProps<typeof Badge>["status"] {
  switch (status) {
    case "COMPLETED":
      return "completed";
    case "IN_PROGRESS":
      return "in-progress";
    case "ACTIVE_INVESTIGATION":
      return "active-investigation";
    case "ON_HOLD":
      return "pending";
    default:
      return "queued";
  }
}

interface ServiceCheckListProps {
  trackingNumber: string;
  initialChecks: CheckProgressView[];
  rawFields: Record<string, string>;
}

export default function ServiceCheckList({
  trackingNumber,
  initialChecks,
  rawFields,
}: ServiceCheckListProps) {
  const sorted = [...initialChecks].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasChecksInSheet = Object.keys(rawFields).some(
    (k) => /\|checkbox-/i.test(k) && rawFields[k].trim().length > 0,
  );

  function handleSync() {
    setError(null);
    startTransition(async () => {
      const result = await actionInitializeChecks(trackingNumber);
      if (result?.error) setError(result.error);
    });
  }

  if (sorted.length === 0) {
    return (
      <div className="mt-5 space-y-4">
        <p className="text-sm text-on-surface-variant">
          {hasChecksInSheet
            ? "Service checks could not be loaded automatically. Try syncing from the sheet."
            : "No checkbox columns with selected values were found in the Google Sheet row for this order."}
        </p>
        {hasChecksInSheet ? (
          <button
            onClick={handleSync}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md border border-on-surface bg-on-surface px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-on-surface/85 disabled:opacity-50"
          >
            {isPending ? "Syncing…" : "Sync Checks from Sheet"}
          </button>
        ) : null}
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-2">
      {error ? (
        <p className="border border-error/30 bg-error-container px-4 py-2 text-xs text-error">
          {error}
        </p>
      ) : null}

      {sorted.map((check) => (
        <Link
          key={check.id}
          href={`/admin/orders/${encodeURIComponent(trackingNumber)}/checks/${check.id}`}
          className="group flex items-center justify-between gap-4 rounded-lg border border-outline-variant/20 bg-surface-container-low px-5 py-4 transition hover:border-on-surface hover:bg-white"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-on-surface">
              {check.serviceLabel}
            </p>
            {check.notes ? (
              <p className="mt-0.5 truncate text-xs text-outline">
                {check.notes}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-outline/50 italic">
                No notes yet
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Badge status={statusToBadge(check.status)} />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 text-outline transition group-hover:text-on-surface"
            >
              <path
                fillRule="evenodd"
                d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </Link>
      ))}

      <div className="pt-2">
        <button
          onClick={handleSync}
          disabled={isPending}
          className="text-xs font-semibold text-outline transition hover:text-on-surface disabled:opacity-50"
        >
          {isPending ? "Syncing…" : "Re-sync from Sheet"}
        </button>
      </div>
    </div>
  );
}
