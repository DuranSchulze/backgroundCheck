import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import AdminShell from "@/components/admin/AdminShell";
import CheckTaskList from "@/components/admin/CheckTaskList";
import {
  AdminTrackingError,
  getAdminTrackingDetail,
  getServiceCheckById,
} from "@/lib/tracking/admin";
import { listStaffUsers } from "@/lib/tracking/staff";
import type { StaffUserView } from "@/lib/tracking/types";

export const dynamic = "force-dynamic";

type CheckBoardPageProps = {
  params: Promise<{
    trackingNumber: string;
    checkId: string;
  }>;
};

export default async function CheckBoardPage({ params }: CheckBoardPageProps) {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  const { trackingNumber, checkId } = await params;

  let check: Awaited<ReturnType<typeof getServiceCheckById>>;
  let detail: Awaited<ReturnType<typeof getAdminTrackingDetail>>;
  let staff: StaffUserView[] = [];

  try {
    staff = await listStaffUsers();
  } catch {
    staff = [];
  }

  try {
    check = await getServiceCheckById(trackingNumber, checkId);
    detail = await getAdminTrackingDetail(trackingNumber);
  } catch (error) {
    if (error instanceof AdminTrackingError) {
      notFound();
    }

    throw error;
  }

  const orderHref = `/admin/orders/${encodeURIComponent(trackingNumber)}`;
  const checkHref = `${orderHref}/checks/${check.id}`;
  const activeCount = check.tasks.filter(
    (task) =>
      task.status === "IN_PROGRESS" || task.status === "ACTIVE_INVESTIGATION",
  ).length;
  const numberedCount = check.tasks.filter(
    (task) => task.publicStepNumber !== null,
  ).length;
  const checkPosition =
    detail.checks.findIndex((candidate) => candidate.id === check.id) + 1;

  return (
    <AdminShell
      eyebrow="Task Board"
      title={`${check.serviceLabel} Board`}
      description={`Full-screen kanban board for order ${trackingNumber}. Create, assign, sequence, and move tasks for this service check from one dedicated workspace.`}
      maxWidthClassName="max-w-[1800px]"
      hideSidebar
    >
      <div className="rounded-lg border border-outline-variant/20 bg-white p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link
                href={checkHref}
                className="inline-flex items-center gap-1.5 font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
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
                Back to Check Overview
              </Link>
              <span className="text-outline">Order {trackingNumber}</span>
              {checkPosition > 0 ? (
                <span className="text-outline">
                  Check {checkPosition} of {detail.checks.length}
                </span>
              ) : null}
            </div>

            <h2 className="mt-4 font-headline text-2xl font-extrabold text-on-surface md:text-[2rem]">
              {check.serviceLabel}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">
              This board is optimized for day-to-day operations. Drag cards
              across statuses, set requestor-facing steps, and manage the full
              task flow without the extra overview content from the check page.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
            <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                Total Tasks
              </p>
              <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
                {check.tasks.length}
              </p>
            </div>
            <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                Active Work
              </p>
              <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
                {activeCount}
              </p>
            </div>
            <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-outline">
                Public Steps
              </p>
              <p className="mt-2 font-headline text-2xl font-bold text-on-surface">
                {numberedCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <CheckTaskList
        key={check.tasks.map((task) => task.id).join(",")}
        trackingNumber={trackingNumber}
        checkId={check.id}
        initialTasks={check.tasks}
        staff={staff}
        fullScreen
      />
    </AdminShell>
  );
}
