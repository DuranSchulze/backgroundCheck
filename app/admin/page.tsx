import { redirect } from "next/navigation";
import { clearAdminSession, isAdminAuthenticated } from "@/lib/admin-auth";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { listSheetOrderSnapshots } from "@/lib/tracking/google-sheets";

export const dynamic = "force-dynamic";

async function logout() {
  "use server";

  await clearAdminSession();
  redirect("/admin/login");
}

export default async function AdminPage() {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  let rows: Awaited<ReturnType<typeof listSheetOrderSnapshots>> = [];
  let loadError: string | null = null;

  try {
    rows = await listSheetOrderSnapshots();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load Google Sheets rows.";
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,192,0,0.18),_transparent_45%),linear-gradient(180deg,#fffdf6_0%,#fffbef_100%)] px-6 py-10 md:px-10">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-amber-200 bg-white/90 p-6 shadow-[0_18px_60px_rgba(66,44,0,0.08)] md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-outline">
              Operations Console
            </p>
            <h1 className="mt-2 font-headline text-3xl font-extrabold text-on-surface md:text-4xl">
              Background Check Project Tracker
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
              Manage the live case queue, inspect project intake, and move into
              each order&apos;s tracking workspace from a single admin surface.
            </p>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="rounded-full border border-[#f0ca52] bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--color-on-primary)] transition-colors hover:bg-primary-container"
            >
              Logout
            </button>
          </form>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[1.6rem] border border-amber-200 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
              Source
            </p>
            <p className="mt-3 text-lg font-headline font-bold text-on-surface">
              Google Sheets
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Using the local service-account JSON file on the server.
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-amber-200 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
              Rows Loaded
            </p>
            <p className="mt-3 text-lg font-headline font-bold text-on-surface">
              {loadError ? "Unavailable" : rows.length}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Active order rows currently visible from the configured sheet range.
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-amber-200 bg-white p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
              Columns Verified
            </p>
            <p className="mt-3 text-lg font-headline font-bold text-on-surface">
              Order Tracking Number, Email
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Queue browsing is optimized with search, filters, views, and pagination.
            </p>
          </div>
        </div>

        {loadError ? (
          <section className="rounded-[2rem] border border-amber-200 bg-white p-6 text-sm text-error shadow-[0_18px_60px_rgba(66,44,0,0.06)]">
            {loadError}
          </section>
        ) : rows.length === 0 ? (
          <section className="rounded-[2rem] border border-amber-200 bg-white p-6 text-sm text-on-surface-variant shadow-[0_18px_60px_rgba(66,44,0,0.06)]">
            No rows were returned from the configured Google Sheet range.
          </section>
        ) : (
          <AdminDashboard rows={rows} />
        )}
      </section>
    </main>
  );
}
