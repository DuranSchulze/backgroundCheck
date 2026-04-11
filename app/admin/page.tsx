import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  Database,
  Rows3,
  TableProperties,
  UserCog,
} from "lucide-react";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import AdminShell from "@/components/admin/AdminShell";
import { listSheetOrderSnapshots } from "@/lib/tracking/google-sheets";
import { listStaffUsers } from "@/lib/tracking/staff";
import type { StaffUserView } from "@/lib/tracking/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  let rows: Awaited<ReturnType<typeof listSheetOrderSnapshots>> = [];
  let loadError: string | null = null;
  let staff: StaffUserView[] = [];

  try {
    rows = await listSheetOrderSnapshots();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load Google Sheets rows.";
  }

  try {
    staff = await listStaffUsers();
  } catch {
    staff = [];
  }

  return (
    <AdminShell
      eyebrow="Operations Console"
      title="Dashboard"
      description="This dashboard is being prepared as the future control center for operations insights, workflow summaries, and system-wide tracking."
      maxWidthClassName="max-w-6xl"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-outline-variant/20 bg-white p-5">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
            <Database className="h-3.5 w-3.5 text-on-surface" />
            Source
          </div>
          <p className="text-lg font-headline font-bold text-on-surface">
            Google Sheets
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Using the local service-account JSON file on the server.
          </p>
        </div>

        <div className="rounded-lg border border-outline-variant/20 bg-white p-5">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
            <Rows3 className="h-3.5 w-3.5 text-on-surface" />
            Rows Loaded
          </div>
          <p className="text-lg font-headline font-bold text-on-surface">
            {loadError ? "Unavailable" : rows.length}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Active order rows currently visible from the configured sheet range.
          </p>
        </div>

        <div className="rounded-lg border border-outline-variant/20 bg-white p-5">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
            <TableProperties className="h-3.5 w-3.5 text-on-surface" />
            Columns Verified
          </div>
          <p className="text-lg font-headline font-bold text-on-surface">
            Order Tracking Number, Email
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Queue browsing is optimized with search, filters, views, and
            pagination.
          </p>
        </div>
      </div>

      {loadError ? (
        <section className="border border-error/30 bg-error-container p-4 text-sm text-error">
          {loadError}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-outline-variant/20 bg-white p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
            Dashboard Placeholder
          </p>
          <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface">
            Future admin overview goes here
          </h2>
          <p className="mt-3 text-sm leading-7 text-on-surface-variant">
            This page is reserved for the upcoming dashboard feature. For now,
            use the navigation to jump straight to the live order queue and
            assignee directory.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-2 rounded-md border border-on-surface bg-on-surface px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-on-surface/85"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Open Order List
            </Link>
            <Link
              href="/admin/assignees"
              className="inline-flex items-center gap-2 rounded-md border border-outline-variant/40 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-on-surface transition-colors hover:border-on-surface"
            >
              <UserCog className="h-3.5 w-3.5" />
              Manage Assignees
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-outline-variant/20 bg-white p-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-outline">
            Quick Status
          </p>
          <div className="mt-5 space-y-3 text-sm text-on-surface-variant">
            <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                Orders Available
              </div>
              <div className="mt-2 text-2xl font-headline font-extrabold text-on-surface">
                {loadError ? "—" : rows.length}
              </div>
            </div>
            <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                Active Assignees
              </div>
              <div className="mt-2 text-2xl font-headline font-extrabold text-on-surface">
                {staff.filter((member) => member.isActive).length}
              </div>
            </div>
            <div className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                Next Step
              </div>
              <p className="mt-2 leading-6">
                Build the future dashboard widgets here without crowding the
                live order queue.
              </p>
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
