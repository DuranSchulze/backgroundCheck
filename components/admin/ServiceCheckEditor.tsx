"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge";
import {
  actionReorderServiceChecks,
  actionUpdateServiceCheck,
} from "@/app/actions/service-checks";
import type { CheckProgressStatus } from "@/lib/tracking/types";

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

interface ServiceCheckEditorProps {
  checkId: string;
  serviceLabel: string;
  initialStatus: CheckProgressStatus;
  initialNotes: string | null;
  initialTimelineLabel: string | null;
  trackingNumber: string;
  allCheckIds: string[];
  currentIndex: number;
}

export default function ServiceCheckEditor({
  checkId,
  serviceLabel,
  initialStatus,
  initialNotes,
  initialTimelineLabel,
  trackingNumber,
  allCheckIds,
  currentIndex,
}: ServiceCheckEditorProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [timelineLabel, setTimelineLabel] = useState(
    initialTimelineLabel ?? "",
  );
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await actionUpdateServiceCheck(trackingNumber, checkId, {
        notes,
        timelineLabel,
      });
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  function handleMove(direction: -1 | 1) {
    const next = [...allCheckIds];
    const target = currentIndex + direction;
    if (target < 0 || target >= next.length) return;
    [next[currentIndex], next[target]] = [next[target], next[currentIndex]];
    startTransition(async () => {
      await actionReorderServiceChecks(trackingNumber, next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Badge status={statusToBadge(initialStatus)} />
        <span className="text-xs uppercase tracking-[0.18em] text-outline">
          Rolled up from tasks
        </span>
        {saved ? (
          <span className="text-xs font-semibold text-green-600">Saved ✓</span>
        ) : null}
        {error ? (
          <span className="text-xs font-semibold text-red-600">{error}</span>
        ) : null}
      </div>

      <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
          Service
        </div>
        <p className="mt-2 text-base font-semibold text-on-surface">
          {serviceLabel}
        </p>
        <p className="mt-1 text-sm text-on-surface-variant">
          This status is now driven by the tasks under this service check.
        </p>
      </div>

      <div>
        <label
          htmlFor="timelineLabel"
          className="block text-[11px] font-bold uppercase tracking-[0.2em] text-outline"
        >
          Timeline Label
        </label>
        <input
          id="timelineLabel"
          type="text"
          value={timelineLabel}
          onChange={(event) => {
            setTimelineLabel(event.target.value);
            setSaved(false);
          }}
          placeholder="Example: Waiting on employer callback"
          className="mt-3 w-full rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:border-on-surface focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-[11px] font-bold uppercase tracking-[0.2em] text-outline"
        >
          Service Notes
        </label>
        <textarea
          id="notes"
          rows={6}
          value={notes}
          onChange={(event) => {
            setNotes(event.target.value);
            setSaved(false);
          }}
          placeholder="Add context, blockers, or summary notes for this service…"
          className="mt-3 w-full resize-y rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:border-on-surface focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md border border-on-surface bg-on-surface px-6 py-2.5 text-sm font-bold uppercase tracking-[0.18em] text-white transition hover:bg-on-surface/85 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Service Notes"}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMove(-1)}
            disabled={isPending || currentIndex === 0}
            title="Move up in order"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant/30 bg-white text-outline transition hover:border-on-surface hover:text-on-surface disabled:opacity-30"
          >
            ▲
          </button>
          <button
            onClick={() => handleMove(1)}
            disabled={isPending || currentIndex === allCheckIds.length - 1}
            title="Move down in order"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-outline-variant/30 bg-white text-outline transition hover:border-on-surface hover:text-on-surface disabled:opacity-30"
          >
            ▼
          </button>
          <span className="text-xs text-outline">Reorder service</span>
        </div>
      </div>
    </div>
  );
}
