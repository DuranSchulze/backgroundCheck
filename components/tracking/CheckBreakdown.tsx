import type { TrackingCheckDetail } from "@/lib/tracking/types";

interface CheckBreakdownProps {
  checks?: TrackingCheckDetail[];
}

export default function CheckBreakdown({ checks }: CheckBreakdownProps) {
  const safeChecks = checks ?? [];

  if (safeChecks.length === 0) {
    return (
      <div className="rounded-lg border border-outline-variant/20 bg-white p-4">
        <p className="text-sm leading-6 text-on-surface-variant">
          No check breakdown is available for this order yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-outline-variant/20 bg-white p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-2">
        <div className="rounded-md border border-outline-variant/30 bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
          Checks
        </div>
      </div>

      <div className="mb-5">
        <h3 className="font-headline text-xl font-bold text-on-surface">
          Check and Task Breakdown
        </h3>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          Review each check, its tasks, current statuses, and the latest
          remarks.
        </p>
      </div>

      <div className="space-y-4">
        {safeChecks.map((check) => (
          <section
            key={check.id}
            className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <h4 className="font-headline text-lg font-bold text-on-surface">
                {check.label}
              </h4>
              <span className="shrink-0 rounded-md border border-outline-variant/30 bg-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                Overall {check.overall}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {check.tasks.length > 0 ? (
                check.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-lg border border-outline-variant/20 bg-white px-4 py-3"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-on-surface">
                          <span className="mr-2 inline-flex rounded-md border border-outline-variant/30 bg-surface-container-low px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                            {task.label}
                          </span>
                          {task.title}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
                          <span className="font-semibold text-on-surface">
                            Remarks:
                          </span>{" "}
                          {task.remarks || "—"}
                        </p>
                        {task.fileUrl ? (
                          <a
                            href={task.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex text-sm font-semibold text-on-surface underline decoration-outline/40 underline-offset-4 transition hover:text-outline"
                          >
                            View file
                          </a>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-md border border-outline-variant/30 bg-surface-container-low px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-outline-variant/30 bg-white px-4 py-4 text-sm leading-6 text-on-surface-variant">
                  No tasks have been added for this check yet.
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-outline-variant/20 bg-white px-4 py-4">
              <p className="text-sm font-semibold text-on-surface">
                Overall: <span className="font-bold">{check.overall}</span>
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-on-surface-variant">
                <span className="font-semibold text-on-surface">Remarks:</span>{" "}
                {check.remarks || "—"}
              </p>
              {check.fileUrl ? (
                <a
                  href={check.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-sm font-semibold text-on-surface underline decoration-outline/40 underline-offset-4 transition hover:text-outline"
                >
                  View file
                </a>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
