"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { actionCreateStaff, actionUpdateStaff } from "@/app/actions/staff";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StaffUserView } from "@/lib/tracking/types";

type StaffDirectoryProps = {
  staff: StaffUserView[];
};

type DialogMode = "create" | "edit";

type DialogState =
  | {
      open: false;
      mode: DialogMode;
      staffId: null;
    }
  | {
      open: true;
      mode: DialogMode;
      staffId: string | null;
    };

type FormState = {
  name: string;
  email: string;
};

function getInitialForm(staff?: StaffUserView | null): FormState {
  return {
    name: staff?.name ?? "",
    email: staff?.email ?? "",
  };
}

export default function StaffDirectory({ staff }: StaffDirectoryProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>({
    open: false,
    mode: "create",
    staffId: null,
  });
  const [form, setForm] = useState<FormState>(() => getInitialForm());

  const activeStaffCount = useMemo(
    () => staff.filter((member) => member.isActive).length,
    [staff],
  );

  function openCreateDialog() {
    setError(null);
    setForm(getInitialForm());
    setDialogState({ open: true, mode: "create", staffId: null });
  }

  function openEditDialog(member: StaffUserView) {
    setError(null);
    setForm(getInitialForm(member));
    setDialogState({ open: true, mode: "edit", staffId: member.id });
  }

  function closeDialog(nextOpen: boolean) {
    if (isPending) {
      return;
    }

    if (!nextOpen) {
      setDialogState((current) => ({
        open: false,
        mode: current.mode,
        staffId: null,
      }));
      setError(null);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      if (dialogState.mode === "create") {
        const result = await actionCreateStaff({
          name: form.name,
          email: form.email,
        });

        if (result?.error) {
          setError(result.error);
          return;
        }
      } else if (dialogState.staffId) {
        const result = await actionUpdateStaff(dialogState.staffId, {
          name: form.name,
          email: form.email,
        });

        if (result?.error) {
          setError(result.error);
          return;
        }
      }

      setDialogState((current) => ({
        open: false,
        mode: current.mode,
        staffId: null,
      }));
      setError(null);
      router.refresh();
    });
  }

  function handleToggle(staffId: string, isActive: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await actionUpdateStaff(staffId, { isActive: !isActive });
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  const dialogTitle =
    dialogState.mode === "create" ? "Add Assignee" : "Edit Assignee";
  const dialogDescription =
    dialogState.mode === "create"
      ? "Create a new person who can be assigned to workflow tasks."
      : "Update this assignee's contact details.";
  const submitLabel =
    dialogState.mode === "create"
      ? isPending
        ? "Adding..."
        : "Add Person"
      : isPending
        ? "Saving..."
        : "Save Changes";

  return (
    <section className="rounded-lg border border-outline-variant/20 bg-white p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
            Staff Directory
          </p>
          <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface">
            Assignees
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Manage the people who can own workflow tasks across background-check
            services.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs uppercase tracking-[0.18em] text-outline">
            {activeStaffCount} active
          </div>
          <button
            type="button"
            onClick={openCreateDialog}
            className="inline-flex items-center gap-2 rounded-md border border-on-surface bg-on-surface px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-on-surface/85"
          >
            <Plus className="h-4 w-4" />
            Add Person
          </button>
        </div>
      </div>

      {error && !dialogState.open ? (
        <p className="mt-4 border border-error/30 bg-error-container px-4 py-2 text-xs text-error">
          {error}
        </p>
      ) : null}

      <div className="mt-5 space-y-3">
        {staff.length === 0 ? (
          <div className="border border-dashed border-outline-variant/30 px-4 py-8 text-center text-sm text-on-surface-variant">
            No staff members yet. Use{" "}
            <span className="font-semibold text-on-surface">Add Person</span> to
            create your first assignee.
          </div>
        ) : (
          staff.map((member) => (
            <div
              key={member.id}
              className="grid gap-4 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4 md:grid-cols-[1.2fr_1fr_auto_auto]"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">
                  {member.name}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {member.email}
                </p>
              </div>

              <div className="flex items-center md:justify-center">
                <span
                  className={[
                    "px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
                    member.isActive
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border border-outline-variant/30 bg-white text-outline",
                  ].join(" ")}
                >
                  {member.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => openEditDialog(member)}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant/30 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-on-surface transition hover:border-on-surface disabled:opacity-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>

              <button
                type="button"
                onClick={() => handleToggle(member.id, member.isActive)}
                disabled={isPending}
                className={[
                  "px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] transition disabled:opacity-50",
                  member.isActive
                    ? "border border-red-200 bg-white text-red-600 hover:border-red-400"
                    : "border border-outline-variant/30 bg-white text-on-surface hover:border-on-surface",
                ].join(" ")}
              >
                {member.isActive ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogState.open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl text-on-surface">
              {dialogTitle}
            </DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <fieldset
              disabled={isPending}
              className="space-y-4 disabled:opacity-100"
            >
              <div>
                <label
                  htmlFor="assignee-name"
                  className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-outline"
                >
                  Full Name
                </label>
                <input
                  id="assignee-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Maria Santos"
                  className="w-full rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-on-surface disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-outline"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="assignee-email"
                  className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-outline"
                >
                  Email Address
                </label>
                <input
                  id="assignee-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="name@example.com"
                  className="w-full rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-on-surface disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-outline"
                  required
                />
              </div>
            </fieldset>

            {error ? (
              <p className="border border-error/30 bg-error-container px-4 py-3 text-sm text-error">
                {error}
              </p>
            ) : null}

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => closeDialog(false)}
                disabled={isPending}
                className="rounded-md border border-outline-variant/30 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-on-surface transition hover:border-on-surface disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || !form.name.trim() || !form.email.trim()}
                className="rounded-md border border-on-surface bg-on-surface px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-on-surface/85 disabled:opacity-50"
              >
                {submitLabel}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
