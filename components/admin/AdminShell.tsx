import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { clearAdminSession } from "@/lib/admin-auth";
import AdminNav from "@/components/admin/AdminNav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type AdminShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  maxWidthClassName?: string;
  hideSidebar?: boolean;
};

async function logout() {
  "use server";

  await clearAdminSession();
  redirect("/admin/login");
}

export default function AdminShell({
  eyebrow,
  title,
  description,
  children,
  maxWidthClassName = "max-w-none",
  hideSidebar = false,
}: AdminShellProps) {
  if (hideSidebar) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="px-4 py-4 md:px-6 md:py-6">
          <div className={`mx-auto space-y-8 ${maxWidthClassName}`}>
            <div className="border border-outline-variant/30 bg-white p-5">
              <div className="flex flex-col gap-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-outline">
                  {eyebrow}
                </p>
                <div>
                  <h1 className="font-headline text-2xl font-extrabold text-on-surface md:text-3xl">
                    {title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant">
                    {description}
                  </p>
                </div>
              </div>
            </div>

            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar
        collapsible="offcanvas"
        variant="inset"
        className="border-r border-outline-variant/20"
      >
        <SidebarHeader className="gap-3 p-4">
          <div className="border border-outline-variant/30 bg-white px-4 py-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-outline">
              Operations Console
            </p>
            <h2 className="mt-2 font-headline text-base font-extrabold text-on-surface md:text-lg">
              Background Check Tracker
            </h2>
            <p className="mt-2 text-[11px] leading-6 text-on-surface-variant">
              Navigate the admin workspace by section.
            </p>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-2 pb-2">
          <AdminNav />
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="p-4">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 border border-outline-variant/40 bg-surface-container-low px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-on-surface transition-colors hover:border-primary hover:bg-primary hover:text-on-primary"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </form>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-surface">
        <div className="px-4 py-4 md:px-6 md:py-6">
          <div className={`mx-auto space-y-8 ${maxWidthClassName}`}>
            <div className="border border-outline-variant/30 bg-white p-5">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="shrink-0 border border-outline-variant/30 bg-white hover:bg-surface-container-low" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-outline">
                    {eyebrow}
                  </p>
                </div>
                <div>
                  <h1 className="font-headline text-2xl font-extrabold text-on-surface md:text-3xl">
                    {title}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-on-surface-variant">
                    {description}
                  </p>
                </div>
              </div>
            </div>

            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
