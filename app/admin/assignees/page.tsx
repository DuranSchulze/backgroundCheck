import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import AdminShell from "@/components/admin/AdminShell";
import StaffDirectory from "@/components/admin/StaffDirectory";
import { listStaffUsers } from "@/lib/tracking/staff";
import type { StaffUserView } from "@/lib/tracking/types";

export const dynamic = "force-dynamic";

export default async function AdminAssigneesPage() {
  const isAuthenticated = await isAdminAuthenticated();

  if (!isAuthenticated) {
    redirect("/admin/login");
  }

  let staff: StaffUserView[] = [];

  try {
    staff = await listStaffUsers();
  } catch {
    staff = [];
  }

  return (
    <AdminShell
      eyebrow="Operations Console"
      title="Assignees"
      description="Manage the staff directory used for assigning workflow tasks across service checks and order boards."
      maxWidthClassName="max-w-6xl"
    >
      <StaffDirectory staff={staff} />
    </AdminShell>
  );
}
