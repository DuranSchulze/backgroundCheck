import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAdminTrackingDetail } from "@/lib/tracking/admin";
import GoogleSheetDataDialog from "@/components/admin/GoogleSheetDataDialog";
import ServiceCheckList from "@/components/admin/ServiceCheckList";

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
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
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
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
            Back to Orders
          </Link>

          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-outline">
              Order Detail
            </p>
            <h1 className="mt-1 font-headline text-4xl font-extrabold text-on-surface">
              {detail.order.trackingNumber}
            </h1>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <li className="flex items-center gap-2 text-on-surface-variant">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-outline">Status</span>
                <span className="font-semibold text-on-surface">
                  {detail.progress
                    ? formatStatus(detail.progress.overallStatus)
                    : "Queued"}
                </span>
              </li>
              <li className="flex items-center gap-2 text-on-surface-variant">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-outline">Checks</span>
                <span className="font-semibold text-on-surface">
                  {detail.order.selectedCheckCategories.length}
                </span>
              </li>
              <li className="flex items-center gap-2 text-on-surface-variant">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-outline">Requestor</span>
                <span className="font-semibold text-on-surface">
                  {detail.order.submitterEmail || "Not provided"}
                </span>
              </li>
              <li className="flex items-center gap-2 text-on-surface-variant">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-outline">Subject</span>
                <span className="font-semibold text-on-surface">
                  {detail.order.subjectEmail || "Not provided"}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section>
            <div className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-[0_18px_60px_rgba(66,44,0,0.06)]">
              <h2 className="font-headline text-xl font-bold text-on-surface">
                Service Checks
              </h2>
              <p className="mt-2 text-sm text-on-surface-variant">
                Manage the status and notes for each service check on this
                order.
              </p>
              <ServiceCheckList
                key={detail.checks.map((c) => c.id).join(",")}
                trackingNumber={detail.order.trackingNumber}
                initialChecks={detail.checks}
                rawFields={detail.order.rawFields}
              />
            </div>
          </section>

          <section className="rounded-[2rem] border border-amber-200 bg-white p-6 shadow-[0_18px_60px_rgba(66,44,0,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-headline text-xl font-bold text-on-surface">
                  Our Data
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Progress snapshot for this order.
                </p>
              </div>
              <GoogleSheetDataDialog entries={rawEntries} iconOnly />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-amber-100 bg-[#fffaf0] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                  Summary
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {detail.progress?.summary || "—"}
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-amber-100 bg-[#fffaf0] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                  ETA
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {detail.progress?.etaLabel || "—"}
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-amber-100 bg-[#fffaf0] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                  Admin Notes
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {detail.progress?.adminNotes || "—"}
                </p>
              </div>

              <div className="rounded-[1.2rem] border border-amber-100 bg-[#fffaf0] p-4">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                  Last Updated
                </div>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {detail.progress
                    ? formatDateTime(detail.progress.updatedAt)
                    : "—"}
                </p>
              </div>
            </div>

            {detail.checks.length > 0 ? (
              <div className="mt-5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                  Checks
                </p>
                {detail.checks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-amber-100 bg-white px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-on-surface">
                      {check.checkName}
                    </p>
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-outline">
                      {formatStatus(check.status)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
