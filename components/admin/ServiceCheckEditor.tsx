"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/badge";
import {
  actionUpdateServiceCheck,
  actionReorderServiceChecks,
} from "@/app/actions/service-checks";
import type { CheckProgressStatus } from "@/lib/tracking/types";

const STATUS_OPTIONS: { value: CheckProgressStatus; label: string; description: string }[] = [
  { value: "QUEUED", label: "Queued", description: "Not yet started" },
  { value: "IN_PROGRESS", label: "Ongoing", description: "Actively being processed" },
  { value: "ACTIVE_INVESTIGATION", label: "Investigating", description: "Under active investigation" },
  { value: "COMPLETED", label: "Done", description: "Fully completed" },
  { value: "ON_HOLD", label: "On Hold", description: "Paused, awaiting action" },
];

function statusToBadge(status: string): React.ComponentProps<typeof Badge>["status"] {
  switch (status) {
    case "COMPLETED": return "completed";
    case "IN_PROGRESS": return "in-progress";
    case "ACTIVE_INVESTIGATION": return "active-investigation";
    case "ON_HOLD": return "pending";
    default: return "queued";
  }
}

interface ServiceCheckEditorProps {
  checkId: string;
  checkName: string;
  initialStatus: CheckProgressStatus;
  initialNotes: string | null;
  trackingNumber: string;
  allCheckIds: string[];
  currentIndex: number;
}

export default function ServiceCheckEditor({
  checkId,
  checkName,
  initialStatus,
  initialNotes,
  trackingNumber,
  allCheckIds,
  currentIndex,
}: ServiceCheckEditorProps) {
  const router = useRouter();
  const [status, setStatus] = useState<CheckProgressStatus>(initialStatus);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange(next: CheckProgressStatus) {
    setStatus(next);
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await actionUpdateServiceCheck(trackingNumber, checkId, {
        status,
        notes,
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
      <div className="flex items-center gap-3">
        <Badge status={statusToBadge(status)} />
        {saved ? (
          <span className="text-xs font-semibold text-green-600">Saved ✓</span>
        ) : null}
        {error ? (
          <span className="text-xs font-semibold text-red-600">{error}</span>
        ) : null}
      </div>

      <div>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
          Status
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              disabled={isPending}
              className={[
                "flex flex-col items-start gap-0.5 rounded-2xl border px-4 py-3 text-left transition",
                status === opt.value
                  ? "border-primary bg-primary text-[color:var(--color-on-primary)]"
                  : "border-amber-100 bg-[#fffaf0] text-on-surface hover:border-primary hover:bg-white",
              ].join(" ")}
            >
              <span className="text-sm font-bold">{opt.label}</span>
              <span
                className={[
                  "text-[11px]",
                  status === opt.value
                    ? "text-[color:var(--color-on-primary)]/70"
                    : "text-outline",
                ].join(" ")}
              >
                {opt.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-[11px] font-bold uppercase tracking-[0.2em] text-outline"
        >
          Remark / Notes
        </label>
        <textarea
          id="notes"
          rows={6}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Add your remarks, progress notes, or any relevant details for this check…"
          className="mt-3 w-full resize-y rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full border border-[#f0ca52] bg-primary px-6 py-2.5 text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--color-on-primary)] transition hover:bg-primary-container disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save Changes"}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleMove(-1)}
            disabled={isPending || currentIndex === 0}
            title="Move up in order"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-white text-outline transition hover:border-primary hover:text-on-surface disabled:opacity-30"
          >
            ▲
          </button>
          <button
            onClick={() => handleMove(1)}
            disabled={isPending || currentIndex === allCheckIds.length - 1}
            title="Move down in order"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-white text-outline transition hover:border-primary hover:text-on-surface disabled:opacity-30"
          >
            ▼
          </button>
          <span className="text-xs text-outline">Reorder</span>
        </div>
      </div>
    </div>
  );
}
