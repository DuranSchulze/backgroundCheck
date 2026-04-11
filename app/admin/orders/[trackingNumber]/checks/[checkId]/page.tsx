import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import AdminShell from "@/components/admin/AdminShell";
import {
  getServiceCheckById,
  getAdminTrackingDetail,
  AdminTrackingError,
} from "@/lib/tracking/admin";
import { listStaffUsers } from "@/lib/tracking/staff";
import type { StaffUserView } from "@/lib/tracking/types";
import ServiceCheckEditor from "@/components/admin/ServiceCheckEditor";

export const dynamic = "force-dynamic";

type CheckDetailPageProps = {
  params: Promise<{
    trackingNumber: string;
    checkId: string;
  }>;
};

export default async function CheckDetailPage({
  params,
}: CheckDetailPageProps) {
  const isAuthenticated = await isAdminAuthenticated();
  if (!isAuthenticated) redirect("/admin/login");

  const { trackingNumber, checkId } = await params;

  let check: Awaited<ReturnType<typeof getServiceCheckById>>;
  let allCheckIds: string[] = [];
  let currentIndex = 0;
  let staff: StaffUserView[] = [];

  try {
    staff = await listStaffUsers();
  } catch {
    staff = [];
  }

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
  const boardHref = `${orderHref}/checks/${check.id}/board`;
  const activeStaffCount = staff.filter((member) => member.isActive).length;

  return (
    <AdminShell
      eyebrow="Operations Console"
      title={check.serviceLabel}
      description={`Focused workflow view for the ${check.serviceLabel} service under order ${trackingNumber}. Open the dedicated task board to manage work across the full screen.`}
      maxWidthClassName="max-w-5xl"
    >
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
          <h1 className="mt-1 font-headline text-2xl font-extrabold text-on-surface md:text-3xl">
            {check.serviceLabel}
          </h1>
          {currentIndex >= 0 ? (
            <p className="mt-2 text-sm leading-6 text-outline">
              Check {currentIndex + 1} of {allCheckIds.length}
            </p>
          ) : null}
        </div>
      </div>

      <section className="rounded-lg border border-outline-variant/20 bg-white p-6 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
              Workflow Board
            </p>
            <h2 className="mt-2 font-headline text-xl font-bold text-on-surface">
              Open Full-Screen Task Board
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Launch the dedicated kanban board to create, drag, reorder, and
              edit this check&apos;s tasks with more room on screen.
            </p>
          </div>
          <Link
            href={boardHref}
            className="inline-flex items-center justify-center rounded-md border border-on-surface bg-on-surface px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-on-surface/85"
          >
            Open Task Board
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
              Tasks
            </p>
            <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
              {check.tasks.length}
            </p>
          </div>
          <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
              Active Assignees
            </p>
            <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
              {activeStaffCount}
            </p>
          </div>
          <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
              Current Status
            </p>
            <p className="mt-2 text-sm font-semibold text-on-surface">
              {check.status
                .replaceAll("_", " ")
                .toLowerCase()
                .replace(/\b\w/g, (letter) => letter.toUpperCase())}
            </p>
          </div>
        </div>
      </section>

      <div className="rounded-lg border border-outline-variant/20 bg-white p-6 md:p-7">
        <ServiceCheckEditor
          checkId={check.id}
          serviceLabel={check.serviceLabel}
          initialStatus={check.status}
          initialNotes={check.notes}
          initialTimelineLabel={check.timelineLabel}
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </AdminShell>
  );
}
