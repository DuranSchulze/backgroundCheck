import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  getServiceCheckById,
  getAdminTrackingDetail,
  AdminTrackingError,
} from "@/lib/tracking/admin";
import ServiceCheckEditor from "@/components/admin/ServiceCheckEditor";

export const dynamic = "force-dynamic";

type CheckDetailPageProps = {
  params: Promise<{
    trackingNumber: string;
    checkId: string;
  }>;
};

export default async function CheckDetailPage({ params }: CheckDetailPageProps) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) redirect("/admin/login");

  const { trackingNumber, checkId } = await params;

  let check: Awaited<ReturnType<typeof getServiceCheckById>>;
  let allCheckIds: string[] = [];
  let currentIndex = 0;

  try {
    check = await getServiceCheckById(trackingNumber, checkId);

    const detail = await getAdminTrackingDetail(trackingNumber);
    const sorted = [...detail.checks].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    allCheckIds = sorted.map((c) => c.id);
    currentIndex = allCheckIds.indexOf(checkId);
  } catch (err) {
    if (err instanceof AdminTrackingError) notFound();
    throw err;
  }

  const orderHref = `/admin/orders/${encodeURIComponent(trackingNumber)}`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,192,0,0.18),_transparent_45%),linear-gradient(180deg,#fffdf6_0%,#fffbef_100%)] px-6 py-10 md:px-10">
      <section className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link
            href={orderHref}
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
            Back to Order {trackingNumber}
          </Link>

          <div className="mt-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-outline">
              Service Check · Order {trackingNumber}
            </p>
            <h1 className="mt-1 font-headline text-3xl font-extrabold text-on-surface">
              {check.checkName}
            </h1>
            {currentIndex >= 0 ? (
              <p className="mt-2 text-sm text-outline">
                Check {currentIndex + 1} of {allCheckIds.length}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-amber-200 bg-white p-8 shadow-[0_18px_60px_rgba(66,44,0,0.06)]">
          <ServiceCheckEditor
            checkId={check.id}
            checkName={check.checkName}
            initialStatus={check.status}
            initialNotes={check.notes}
            trackingNumber={trackingNumber}
            allCheckIds={allCheckIds}
            currentIndex={currentIndex}
          />
        </div>

        {allCheckIds.length > 1 ? (
          <div className="flex items-center justify-between">
            {currentIndex > 0 ? (
              <Link
                href={`${orderHref}/checks/${allCheckIds[currentIndex - 1]}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-outline transition hover:text-on-surface"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
                </svg>
                Previous check
              </Link>
            ) : (
              <span />
            )}
            {currentIndex < allCheckIds.length - 1 ? (
              <Link
                href={`${orderHref}/checks/${allCheckIds[currentIndex + 1]}`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-outline transition hover:text-on-surface"
              >
                Next check
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                </svg>
              </Link>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
