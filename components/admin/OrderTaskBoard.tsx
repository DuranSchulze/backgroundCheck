"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  actionCreateCheckTask,
  actionUpdateCheckTask,
} from "@/app/actions/service-checks";
import type {
  CheckProgressStatus,
  CheckProgressView,
  CheckTaskView,
  StaffUserView,
  TaskPriority,
} from "@/lib/tracking/types";

const STATUS_COLUMNS: Array<{ value: CheckProgressStatus; label: string }> = [
  { value: "QUEUED", label: "Queued" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ACTIVE_INVESTIGATION", label: "Investigating" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
];

const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type DraftState = Record<
  string,
  {
    title: string;
    description: string;
    notes: string;
    fileUrl: string;
    assigneeId: string;
    priority: TaskPriority;
    dueDate: string;
  }
>;

type OrderTaskBoardProps = {
  trackingNumber: string;
  checks: CheckProgressView[];
  tasks: CheckTaskView[];
  staff: StaffUserView[];
};

function formatDateLabel(value: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDateInputValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export default function OrderTaskBoard({
  trackingNumber,
  checks,
  tasks,
  staff,
}: OrderTaskBoardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newCheckId, setNewCheckId] = useState(checks[0]?.id ?? "");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("MEDIUM");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [drafts, setDrafts] = useState<DraftState>(
    Object.fromEntries(
      tasks.map((task) => [
        task.id,
        {
          title: task.title,
          description: task.description ?? "",
          notes: task.notes ?? "",
          fileUrl: task.fileUrl ?? "",
          assigneeId: task.assignee?.id ?? "",
          priority: task.priority,
          dueDate: toDateInputValue(task.dueDate),
        },
      ]),
    ),
  );

  const activeStaff = useMemo(
    () => staff.filter((member) => member.isActive),
    [staff],
  );

  function refresh() {
    router.refresh();
  }

  function updateDraft(
    taskId: string,
    field: keyof DraftState[string],
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [taskId]: {
        title: current[taskId]?.title ?? "",
        description: current[taskId]?.description ?? "",
        notes: current[taskId]?.notes ?? "",
        fileUrl: current[taskId]?.fileUrl ?? "",
        assigneeId: current[taskId]?.assigneeId ?? "",
        priority: current[taskId]?.priority ?? "MEDIUM",
        dueDate: current[taskId]?.dueDate ?? "",
        [field]: value,
      },
    }));
  }

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newCheckId || !newTitle.trim()) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await actionCreateCheckTask(trackingNumber, newCheckId, {
        title: newTitle,
        priority: newPriority,
        assigneeId: newAssigneeId || null,
        dueDate: newDueDate || null,
        fileUrl: newFileUrl,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setNewTitle("");
      setNewPriority("MEDIUM");
      setNewAssigneeId("");
      setNewDueDate("");
      setNewFileUrl("");
      refresh();
    });
  }

  function handleStatusChange(
    task: CheckTaskView,
    status: CheckProgressStatus,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await actionUpdateCheckTask(
        trackingNumber,
        task.checkId,
        task.id,
        { status },
      );
      if (result?.error) {
        setError(result.error);
      } else {
        refresh();
      }
    });
  }

  function handleSave(task: CheckTaskView) {
    const draft = drafts[task.id];
    if (!draft) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await actionUpdateCheckTask(
        trackingNumber,
        task.checkId,
        task.id,
        {
          title: draft.title,
          description: draft.description,
          notes: draft.notes,
          assigneeId: draft.assigneeId || null,
          priority: draft.priority,
          dueDate: draft.dueDate || null,
          fileUrl: draft.fileUrl,
        },
      );
      if (result?.error) {
        setError(result.error);
      } else {
        setExpandedId(null);
        refresh();
      }
    });
  }

  return (
    <section className="rounded-lg border border-outline-variant/20 bg-white p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
            Order Workflow
          </p>
          <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface">
            Task Board
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Track all service tasks for this order in one board view.
          </p>
        </div>
        <div className="text-xs uppercase tracking-[0.18em] text-outline">
          {tasks.length} total tasks
        </div>
      </div>

      <form
        onSubmit={handleCreateTask}
        className="mt-5 grid gap-3 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4 md:grid-cols-2 xl:grid-cols-[1fr_1.15fr_0.75fr_0.85fr_0.85fr_1fr_auto]"
      >
        <select
          value={newCheckId}
          onChange={(event) => setNewCheckId(event.target.value)}
          className="rounded-md border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface focus:border-on-surface focus:outline-none"
        >
          <option value="">Select service</option>
          {checks.map((check) => (
            <option key={check.id} value={check.id}>
              {check.serviceLabel}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Add a task title"
          className="rounded-md border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:border-on-surface focus:outline-none"
        />
        <select
          value={newPriority}
          onChange={(event) =>
            setNewPriority(event.target.value as TaskPriority)
          }
          className="rounded-md border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface focus:border-on-surface focus:outline-none"
          disabled={isPending}
        >
          {PRIORITY_OPTIONS.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <select
          value={newAssigneeId}
          onChange={(event) => setNewAssigneeId(event.target.value)}
          className="rounded-md border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface focus:border-on-surface focus:outline-none"
          disabled={isPending}
        >
          <option value="">Unassigned</option>
          {activeStaff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={newDueDate}
          onChange={(event) => setNewDueDate(event.target.value)}
          className="rounded-md border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface focus:border-on-surface focus:outline-none"
        />
        <input
          type="url"
          value={newFileUrl}
          onChange={(event) => setNewFileUrl(event.target.value)}
          placeholder="File link"
          className="rounded-md border border-outline-variant bg-white px-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:border-on-surface focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending || !newCheckId || !newTitle.trim()}
          className="rounded-md border border-on-surface bg-on-surface px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-on-surface/85 disabled:opacity-40"
        >
          Add Task
        </button>
      </form>

      {error ? (
        <p className="mt-3 border border-error/30 bg-error-container px-4 py-2 text-xs text-error">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-5">
        {STATUS_COLUMNS.map((column) => {
          const columnTasks = tasks.filter(
            (task) => task.status === column.value,
          );

          return (
            <div
              key={column.value}
              className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-on-surface">
                  {column.label}
                </h3>
                <span className="border border-outline-variant/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                  {columnTasks.length}
                </span>
              </div>

              <div className="space-y-3">
                {columnTasks.length === 0 ? (
                  <div className="border border-dashed border-outline-variant/30 bg-white px-3 py-4 text-xs text-outline">
                    No tasks here yet.
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const draft = drafts[task.id] ?? {
                      title: task.title,
                      description: task.description ?? "",
                      notes: task.notes ?? "",
                      fileUrl: task.fileUrl ?? "",
                      assigneeId: task.assignee?.id ?? "",
                      priority: task.priority,
                      dueDate: toDateInputValue(task.dueDate),
                    };
                    const assigneeOptions = task.assignee?.isActive
                      ? activeStaff
                      : [
                          ...activeStaff,
                          ...(task.assignee ? [task.assignee] : []),
                        ];
                    const isExpanded = expandedId === task.id;

                    return (
                      <div
                        key={task.id}
                        className="rounded-lg border border-outline-variant/20 bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-on-surface">
                              {task.title}
                            </p>
                            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface">
                              {task.serviceLabel}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : task.id)
                            }
                            className="rounded-md border border-outline-variant/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-outline transition hover:border-on-surface hover:text-on-surface"
                          >
                            {isExpanded ? "Close" : "Edit"}
                          </button>
                        </div>

                        <div className="mt-3 space-y-2 text-xs text-on-surface-variant">
                          <div className="flex items-center justify-between gap-2">
                            <span>Priority</span>
                            <span className="font-semibold text-on-surface">
                              {task.priority}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>Assignee</span>
                            <span className="font-semibold text-on-surface">
                              {task.assignee?.name ?? "Unassigned"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span>Due</span>
                            <span className="font-semibold text-on-surface">
                              {formatDateLabel(task.dueDate)}
                            </span>
                          </div>
                          {task.fileUrl ? (
                            <div className="flex items-center justify-between gap-2">
                              <span>File</span>
                              <a
                                href={task.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-on-surface underline decoration-outline/40 underline-offset-4 transition hover:text-outline"
                              >
                                View file
                              </a>
                            </div>
                          ) : null}
                        </div>

                        <select
                          value={task.status}
                          onChange={(event) =>
                            handleStatusChange(
                              task,
                              event.target.value as CheckProgressStatus,
                            )
                          }
                          disabled={isPending}
                          className="mt-3 w-full rounded-md border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-on-surface focus:border-on-surface focus:outline-none"
                        >
                          {STATUS_COLUMNS.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>

                        {isExpanded ? (
                          <div className="mt-3 space-y-3 border-t border-outline-variant/20 pt-3">
                            <input
                              type="text"
                              value={draft.title}
                              onChange={(event) =>
                                updateDraft(
                                  task.id,
                                  "title",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-on-surface focus:outline-none"
                            />
                            <textarea
                              rows={3}
                              value={draft.description}
                              onChange={(event) =>
                                updateDraft(
                                  task.id,
                                  "description",
                                  event.target.value,
                                )
                              }
                              placeholder="Task description"
                              className="w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:border-on-surface focus:outline-none"
                            />
                            <textarea
                              rows={3}
                              value={draft.notes}
                              onChange={(event) =>
                                updateDraft(
                                  task.id,
                                  "notes",
                                  event.target.value,
                                )
                              }
                              placeholder="Working notes"
                              className="w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:border-on-surface focus:outline-none"
                            />
                            <input
                              type="url"
                              value={draft.fileUrl}
                              onChange={(event) =>
                                updateDraft(
                                  task.id,
                                  "fileUrl",
                                  event.target.value,
                                )
                              }
                              placeholder="File link"
                              className="w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:border-on-surface focus:outline-none"
                            />
                            <div className="grid gap-3">
                              <select
                                value={draft.assigneeId}
                                onChange={(event) =>
                                  updateDraft(
                                    task.id,
                                    "assigneeId",
                                    event.target.value,
                                  )
                                }
                                className="rounded-md border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-on-surface focus:outline-none"
                              >
                                <option value="">Unassigned</option>
                                {assigneeOptions.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name}
                                    {!member.isActive ? " (Inactive)" : ""}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={draft.priority}
                                onChange={(event) =>
                                  updateDraft(
                                    task.id,
                                    "priority",
                                    event.target.value,
                                  )
                                }
                                className="rounded-md border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-on-surface focus:outline-none"
                              >
                                {PRIORITY_OPTIONS.map((priority) => (
                                  <option key={priority} value={priority}>
                                    {priority}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="date"
                                value={draft.dueDate}
                                onChange={(event) =>
                                  updateDraft(
                                    task.id,
                                    "dueDate",
                                    event.target.value,
                                  )
                                }
                                className="rounded-md border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface focus:border-on-surface focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSave(task)}
                              disabled={isPending}
                              className="w-full rounded-md border border-on-surface bg-on-surface px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-on-surface/85 disabled:opacity-50"
                            >
                              Save Task
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
