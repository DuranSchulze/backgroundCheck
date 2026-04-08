import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminTrackingDetail } from "@/lib/tracking/admin";
import { getCheckCategoryLabel } from "@/lib/tracking/format";

export const dynamic = "force-dynamic";

type OrderDetailPageProps = {
  params: Promise<{
    trackingNumber: string;
  }>;
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  const { trackingNumber } = await params;

  let detail: Awaited<ReturnType<typeof getAdminTrackingDetail>>;

  try {
    detail = await getAdminTrackingDetail(trackingNumber);
  } catch {
    notFound();
  }

  const rawEntries = Object.entries(detail.order.rawFields).filter(
    ([, value]) => value.trim().length > 0,
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,192,0,0.18),_transparent_45%),linear-gradient(180deg,#fffdf6_0%,#fffbef_100%)] px-6 py-10 md:px-10">
      <section className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-amber-200 bg-white/90 p-6 shadow-[0_18px_60px_rgba(66,44,0,0.08)] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-outline">
              Order Detail
            </p>
            <h1 className="mt-2 font-headline text-3xl font-extrabold text-on-surface md:text-4xl">
              {detail.order.trackingNumber}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-on-surface-variant">
              This page shows the selected checks from Google Sheets, the full raw
              intake data, and the Prisma progress records initialized for this
              order.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex rounded-full border border-[#f0ca52] bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--color-on-primary)] transition-colors hover:bg-primary-container"
          >
            Back to Admin
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.6rem] border border-amber-200 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
              Overall Status
            </p>
            <p className="mt-3 text-lg font-headline font-bold text-on-surface">
              {detail.progress
                ? formatStatus(detail.progress.overallStatus)
                : "Queued"}
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-amber-200 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
              Selected Checks
            </p>
            <p className="mt-3 text-lg font-headline font-bold text-on-surface">
              {detail.order.selectedCheckCategories.length}
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-amber-200 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
              Requestor Email
            </p>
            <p className="mt-3 text-sm font-semibold text-on-surface">
              {detail.order.submitterEmail || "Not provided"}
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-amber-200 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
              Subject Email
            </p>
            <p className="mt-3 text-sm font-semibold text-on-surface">
              {detail.order.subjectEmail || "Not provided"}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-6">
            <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-[0_18px_60px_rgba(66,44,0,0.06)]">
              <h2 className="font-headline text-xl font-bold text-on-surface">
                Checks Needed
              </h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Derived from the checkbox columns in the Google Sheet.
              </p>

              <div className="mt-5 space-y-3">
                {detail.order.selectedCheckCategories.length > 0 ? (
                  detail.order.selectedCheckCategories.map((checkType) => {
                    const progress = detail.checks.find(
                      (check) => check.checkType === checkType,
                    );

                    return (
                      <div
                        key={checkType}
                        className="rounded-[1.4rem] border border-amber-100 bg-[#fffaf0] p-4"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-headline text-lg font-bold text-on-surface">
                              {getCheckCategoryLabel(checkType)}
                            </p>
                            <p className="mt-1 text-sm text-on-surface-variant">
                              {progress?.notes ||
                                progress?.timelineLabel ||
                                "No admin notes yet for this check."}
                            </p>
                          </div>
                          <span className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                            {formatStatus(progress?.status ?? "QUEUED")}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[1.4rem] border border-amber-100 bg-[#fffaf0] p-4 text-sm text-on-surface-variant">
                    No checkbox-based checks were selected on the Google Sheet row.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-[0_18px_60px_rgba(66,44,0,0.06)]">
              <h2 className="font-headline text-xl font-bold text-on-surface">
                Database Progress Snapshot
              </h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                These records come from Prisma and are initialized when this page
                is opened.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.2rem] border border-amber-100 bg-[#fffaf0] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                    Summary
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {detail.progress?.summary || "No summary saved yet."}
                  </p>
                </div>

                <div className="rounded-[1.2rem] border border-amber-100 bg-[#fffaf0] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                    ETA
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {detail.progress?.etaLabel || "No ETA set yet."}
                  </p>
                </div>

                <div className="rounded-[1.2rem] border border-amber-100 bg-[#fffaf0] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                    Admin Notes
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {detail.progress?.adminNotes || "No admin notes yet."}
                  </p>
                </div>

                <div className="rounded-[1.2rem] border border-amber-100 bg-[#fffaf0] p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                    Last Updated
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {detail.progress
                      ? formatDateTime(detail.progress.updatedAt)
                      : "Not updated yet."}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {detail.checks.map((check) => (
                  <div
                    key={check.id}
                    className="rounded-[1.2rem] border border-amber-100 bg-white p-4"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="font-semibold text-on-surface">
                        {getCheckCategoryLabel(check.checkType)}
                      </p>
                      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">
                        {formatStatus(check.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      {check.notes || check.timelineLabel || "No saved details yet."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-[0_18px_60px_rgba(66,44,0,0.06)]">
            <h2 className="font-headline text-xl font-bold text-on-surface">
              Full Google Sheet Data
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              Raw field values from the matched Google Sheet row.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {rawEntries.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[1.2rem] border border-amber-100 bg-[#fffaf0] p-4"
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-outline">
                    {label}
                  </div>
                  <div className="mt-2 break-words text-sm leading-6 text-on-surface-variant">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-amber-100 bg-[#fffaf0] p-5">
              <h3 className="font-headline text-lg font-bold text-on-surface">
                Activity Feed
              </h3>
              <div className="mt-4 space-y-3">
                {detail.activities.length > 0 ? (
                  detail.activities.map((activity) => (
                    <div key={activity.id} className="text-sm text-on-surface-variant">
                      <span className="font-semibold text-on-surface">
                        {formatDateTime(activity.createdAt)}
                      </span>
                      {" - "}
                      {activity.message}
                      {activity.highlight ? (
                        <span className="font-semibold text-on-surface">
                          {" "}
                          {activity.highlight}
                        </span>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-on-surface-variant">
                    No activity has been recorded yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
