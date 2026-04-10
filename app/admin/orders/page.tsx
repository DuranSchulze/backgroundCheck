import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import AdminShell from "@/components/admin/AdminShell";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { listSheetOrderSnapshots } from "@/lib/tracking/google-sheets";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
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
    <AdminShell
      eyebrow="Operations Console"
      title="Order List"
      description="Browse the live intake queue, search by tracking number or requestor details, and open any case for workflow updates."
      maxWidthClassName="max-w-6xl"
    >
      {loadError ? (
        <section className="border border-error/30 bg-error-container p-4 text-sm text-error">
          {loadError}
        </section>
      ) : rows.length === 0 ? (
        <section className="border border-outline-variant/20 bg-white p-6 text-sm text-on-surface-variant">
          No rows were returned from the configured Google Sheet range.
        </section>
      ) : (
        <AdminDashboard rows={rows} />
      )}
    </AdminShell>
  );
}
