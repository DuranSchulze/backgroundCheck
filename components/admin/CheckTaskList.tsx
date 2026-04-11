"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  GripVertical,
  Pencil,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  actionCreateCheckTask,
  actionDeleteCheckTask,
  actionReorderCheckTasks,
  actionUpdateCheckTask,
} from "@/app/actions/service-checks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  CheckProgressStatus,
  CheckTaskView,
  StaffUserView,
  TaskPriority,
} from "@/lib/tracking/types";

const STATUS_COLUMNS: Array<{
  value: CheckProgressStatus;
  label: string;
  tone: string;
  accent: string;
}> = [
  {
    value: "QUEUED",
    label: "Backlog",
    tone: "border-slate-200 bg-slate-50/90",
    accent: "bg-slate-500",
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
    tone: "border-slate-300 bg-white",
    accent: "bg-slate-900",
  },
  {
    value: "ACTIVE_INVESTIGATION",
    label: "Investigating",
    tone: "border-slate-300 bg-slate-50/90",
    accent: "bg-slate-700",
  },
  {
    value: "ON_HOLD",
    label: "Blocked",
    tone: "border-slate-300 bg-slate-100/90",
    accent: "bg-slate-600",
  },
  {
    value: "COMPLETED",
    label: "Done",
    tone: "border-emerald-200 bg-emerald-50/90",
    accent: "bg-emerald-500",
  },
];

const PRIORITY_OPTIONS: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type CheckTaskListProps = {
  trackingNumber: string;
  checkId: string;
  initialTasks: CheckTaskView[];
  staff: StaffUserView[];
  fullScreen?: boolean;
};

type TaskDraft = Record<
  string,
  {
    title: string;
    description: string;
    notes: string;
    assigneeId: string;
    priority: TaskPriority;
    publicStepNumber: string;
    dueDate: string;
  }
>;

type DragState = {
  taskId: string;
  overStatus: CheckProgressStatus | null;
  beforeTaskId: string | null;
} | null;

function sortTasks(tasks: CheckTaskView[]) {
  return [...tasks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function createDraft(task: CheckTaskView) {
  return {
    title: task.title,
    description: task.description ?? "",
    notes: task.notes ?? "",
    assigneeId: task.assignee?.id ?? "",
    priority: task.priority,
    publicStepNumber:
      task.publicStepNumber !== null ? String(task.publicStepNumber) : "",
    dueDate: task.dueDate?.slice(0, 10) ?? "",
  };
}

function createDraftMap(tasks: CheckTaskView[]): TaskDraft {
  return Object.fromEntries(tasks.map((task) => [task.id, createDraft(task)]));
}

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

function formatBoardPosition(sortOrder: number | null) {
  if (sortOrder === null) {
    return "Unsorted";
  }

  return `#${sortOrder + 1}`;
}

function priorityTone(priority: TaskPriority) {
  switch (priority) {
    case "URGENT":
      return "border-red-200 bg-red-50 text-red-700";
    case "HIGH":
      return "border-red-100 bg-white text-red-600";
    case "MEDIUM":
      return "border-slate-300 bg-slate-100 text-slate-700";
    case "LOW":
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function moveTaskToPosition(
  tasks: CheckTaskView[],
  taskId: string,
  nextStatus: CheckProgressStatus,
  beforeTaskId: string | null,
) {
  const sourceTask = tasks.find((task) => task.id === taskId);
  if (!sourceTask) {
    return tasks;
  }

  const remainingTasks = tasks.filter((task) => task.id !== taskId);
  const nextTask = {
    ...sourceTask,
    status: nextStatus,
  };

  let insertionIndex = remainingTasks.length;

  if (beforeTaskId) {
    const beforeIndex = remainingTasks.findIndex(
      (task) => task.id === beforeTaskId,
    );
    if (beforeIndex >= 0) {
      insertionIndex = beforeIndex;
    }
  } else {
    const matchingIndexes = remainingTasks.reduce<number[]>(
      (indexes, task, index) => {
        if (task.status === nextStatus) {
          indexes.push(index);
        }
        return indexes;
      },
      [],
    );

    if (matchingIndexes.length > 0) {
      insertionIndex = matchingIndexes[matchingIndexes.length - 1] + 1;
    }
  }

  remainingTasks.splice(insertionIndex, 0, nextTask);

  return remainingTasks.map((task, index) => ({
    ...task,
    sortOrder: index,
  }));
}

export default function CheckTaskList({
  trackingNumber,
  checkId,
  initialTasks,
  staff,
  fullScreen = false,
}: CheckTaskListProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<CheckTaskView[]>(() =>
    sortTasks(initialTasks),
  );
  const [drafts, setDrafts] = useState<TaskDraft>(() =>
    createDraftMap(initialTasks),
  );
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("MEDIUM");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newPublicStepNumber, setNewPublicStepNumber] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTasks(sortTasks(initialTasks));
    setDrafts(createDraftMap(initialTasks));
  }, [initialTasks]);

  const activeStaff = useMemo(
    () => staff.filter((member) => member.isActive),
    [staff],
  );

  const tasksByStatus = useMemo(
    () =>
      STATUS_COLUMNS.map((column) => ({
        ...column,
        tasks: tasks.filter((task) => task.status === column.value),
      })),
    [tasks],
  );

  const editingTask = editingTaskId
    ? (tasks.find((task) => task.id === editingTaskId) ?? null)
    : null;

  const editingDraft = editingTask
    ? (drafts[editingTask.id] ?? createDraft(editingTask))
    : null;

  const editingAssigneeOptions =
    editingTask && editingTask.assignee && !editingTask.assignee.isActive
      ? [...activeStaff, editingTask.assignee]
      : activeStaff;

  function refresh() {
    router.refresh();
  }

  function updateDraft(
    taskId: string,
    field: keyof TaskDraft[string],
    value: string,
  ) {
    setDrafts((current) => ({
      ...current,
      [taskId]: {
        title: current[taskId]?.title ?? "",
        description: current[taskId]?.description ?? "",
        notes: current[taskId]?.notes ?? "",
        assigneeId: current[taskId]?.assigneeId ?? "",
        priority: current[taskId]?.priority ?? "MEDIUM",
        publicStepNumber: current[taskId]?.publicStepNumber ?? "",
        dueDate: current[taskId]?.dueDate ?? "",
        [field]: value,
      },
    }));
  }

  function handleAddTask(event: React.FormEvent) {
    event.preventDefault();
    if (!newTitle.trim()) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await actionCreateCheckTask(trackingNumber, checkId, {
        title: newTitle,
        priority: newPriority,
        assigneeId: newAssigneeId || null,
        publicStepNumber: newPublicStepNumber || null,
        dueDate: newDueDate || null,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      setNewTitle("");
      setNewPriority("MEDIUM");
      setNewAssigneeId("");
      setNewPublicStepNumber("");
      setNewDueDate("");
      inputRef.current?.focus();
      refresh();
    });
  }

  function handleDelete(taskId: string) {
    setError(null);
    startTransition(async () => {
      const result = await actionDeleteCheckTask(
        trackingNumber,
        checkId,
        taskId,
      );
      if (result?.error) {
        setError(result.error);
        return;
      }

      setEditingTaskId((current) => (current === taskId ? null : current));
      refresh();
    });
  }

  function handleSave(taskId: string) {
    const draft = drafts[taskId];
    if (!draft) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await actionUpdateCheckTask(
        trackingNumber,
        checkId,
        taskId,
        {
          title: draft.title,
          description: draft.description,
          notes: draft.notes,
          assigneeId: draft.assigneeId || null,
          priority: draft.priority,
          publicStepNumber: draft.publicStepNumber || null,
          dueDate: draft.dueDate || null,
        },
      );

      if (result?.error) {
        setError(result.error);
        return;
      }

      setEditingTaskId(null);
      refresh();
    });
  }

  function handleDragStart(
    event: React.DragEvent<HTMLElement>,
    taskId: string,
  ) {
    event.dataTransfer.effectAllowed = "move";
    window.getSelection()?.removeAllRanges();
    setDragState({
      taskId,
      overStatus: null,
      beforeTaskId: null,
    });
  }

  function handleDragEnd() {
    setDragState(null);
  }

  function handleDragOver(
    event: React.DragEvent<HTMLElement>,
    overStatus: CheckProgressStatus,
    beforeTaskId: string | null,
  ) {
    event.preventDefault();

    if (!dragState || isPending) {
      return;
    }

    if (
      dragState.overStatus === overStatus &&
      dragState.beforeTaskId === beforeTaskId
    ) {
      return;
    }

    setDragState((current) =>
      current
        ? {
            ...current,
            overStatus,
            beforeTaskId,
          }
        : current,
    );
  }

  function handleDrop(
    event: React.DragEvent<HTMLElement>,
    nextStatus: CheckProgressStatus,
    beforeTaskId: string | null,
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (!dragState || isPending) {
      return;
    }

    const sourceTask = tasks.find((task) => task.id === dragState.taskId);
    if (!sourceTask) {
      setDragState(null);
      return;
    }

    if (sourceTask.id === beforeTaskId) {
      setDragState(null);
      return;
    }

    const nextTasks = moveTaskToPosition(
      tasks,
      sourceTask.id,
      nextStatus,
      beforeTaskId,
    );

    const statusChanged = sourceTask.status !== nextStatus;
    setTasks(nextTasks);
    setDragState(null);
    setError(null);

    startTransition(async () => {
      if (statusChanged) {
        const statusResult = await actionUpdateCheckTask(
          trackingNumber,
          checkId,
          sourceTask.id,
          { status: nextStatus },
        );

        if (statusResult?.error) {
          setError(statusResult.error);
          refresh();
          return;
        }
      }

      const reorderResult = await actionReorderCheckTasks(
        trackingNumber,
        checkId,
        nextTasks.map((task) => task.id),
      );

      if (reorderResult?.error) {
        setError(reorderResult.error);
        refresh();
        return;
      }

      refresh();
    });
  }

  return (
    <div className={fullScreen ? "space-y-5" : "space-y-6"}>
      <section
        className={[
          "rounded-lg border border-outline-variant/20 bg-white",
          fullScreen ? "p-4 md:p-5" : "p-5",
        ].join(" ")}
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
              Board Intake
            </p>
            <h3 className="mt-2 font-headline text-lg font-bold text-on-surface md:text-xl">
              Add a Task
            </h3>
            <p className="mt-1 text-sm leading-6 text-on-surface-variant">
              New tasks start in Backlog and can be dragged across the board.
            </p>
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-outline">
            {tasks.length} tasks in this check
          </div>
        </div>

        <form
          onSubmit={handleAddTask}
          className={[
            "mt-5 grid gap-3 rounded-lg border border-outline-variant/20 bg-surface-container-low p-4",
            fullScreen
              ? "md:grid-cols-2 xl:grid-cols-[minmax(0,1.7fr)_0.85fr_0.8fr_1fr_0.95fr_auto]"
              : "lg:grid-cols-[1.45fr_0.8fr_0.8fr_1fr_0.9fr_auto]",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="Review employer contact details"
            className="min-w-0 rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:border-on-surface focus:outline-none disabled:cursor-not-allowed"
            disabled={isPending}
          />
          <select
            value={newPriority}
            onChange={(event) =>
              setNewPriority(event.target.value as TaskPriority)
            }
            className="rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface focus:border-on-surface focus:outline-none disabled:cursor-not-allowed"
            disabled={isPending}
          >
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            step="1"
            value={newPublicStepNumber}
            onChange={(event) => setNewPublicStepNumber(event.target.value)}
            placeholder="Step #"
            className="rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:border-on-surface focus:outline-none disabled:cursor-not-allowed"
            disabled={isPending}
          />
          <select
            value={newAssigneeId}
            onChange={(event) => setNewAssigneeId(event.target.value)}
            className="rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface focus:border-on-surface focus:outline-none disabled:cursor-not-allowed"
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
            className="rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface focus:border-on-surface focus:outline-none disabled:cursor-not-allowed"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={isPending || !newTitle.trim()}
            className="inline-flex items-center justify-center rounded-md border border-on-surface bg-on-surface px-5 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white transition hover:bg-on-surface/85 disabled:opacity-40"
          >
            Create Task
          </button>
        </form>
      </section>

      {error ? (
        <p className="border border-error/30 bg-error-container px-4 py-3 text-sm text-error">
          {error}
        </p>
      ) : null}

      <section
        className={[
          "select-none rounded-lg border border-outline-variant/20 bg-surface-container-low/50",
          fullScreen ? "p-3 md:p-4" : "p-4",
        ].join(" ")}
      >
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:gap-4">
          {tasksByStatus.map((column) => (
            <div
              key={column.value}
              onDragOver={(event) => handleDragOver(event, column.value, null)}
              onDrop={(event) => handleDrop(event, column.value, null)}
              className={`flex min-h-[calc(100vh-24rem)] w-[88vw] shrink-0 snap-start flex-col rounded-lg border p-3 sm:w-[22rem] xl:w-[19rem] ${column.tone}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${column.accent}`}
                  />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-outline">
                      {column.label}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Drag cards here
                    </p>
                  </div>
                </div>
                <span className="rounded-md border border-outline-variant/30 bg-surface-container-low px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                  {column.tasks.length}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {column.tasks.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-outline-variant/30 bg-white/70 px-4 py-6 text-center text-sm text-outline">
                    Drop a task here
                  </div>
                ) : (
                  column.tasks.map((task) => {
                    const isDragging = dragState?.taskId === task.id;

                    return (
                      <article
                        key={task.id}
                        draggable={!isPending}
                        onDragStart={(event) => handleDragStart(event, task.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(event) =>
                          handleDragOver(event, column.value, task.id)
                        }
                        onDrop={(event) =>
                          handleDrop(event, column.value, task.id)
                        }
                        className={[
                          "cursor-grab select-none rounded-lg border border-outline-variant/20 bg-white p-4 transition",
                          "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]",
                          "touch-pan-x",
                          isDragging ? "opacity-45" : "opacity-100",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 text-outline">
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <div>
                              <h4 className="text-sm font-semibold leading-5 text-on-surface">
                                {task.title}
                              </h4>
                              {task.description ? (
                                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-on-surface-variant">
                                  {task.description}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <span
                            className={`border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${priorityTone(task.priority)}`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-[11px] text-on-surface-variant">
                          <div className="flex items-center gap-2">
                            <span className="border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">
                              {formatBoardPosition(task.sortOrder)}
                            </span>
                            {task.publicStepNumber !== null ? (
                              <span className="border border-outline-variant/30 bg-surface-container-low px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface">
                                Step #{task.publicStepNumber}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <UserRound className="h-3.5 w-3.5 text-outline" />
                            <span>{task.assignee?.name ?? "Unassigned"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarDays className="h-3.5 w-3.5 text-outline" />
                            <span>{formatDateLabel(task.dueDate)}</span>
                          </div>
                          {task.notes ? (
                            <p className="bg-surface-container-low px-3 py-2 text-[11px] leading-5 text-outline">
                              {task.notes}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline">
                            Drag to change status
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(task.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-outline-variant/30 bg-white text-outline transition hover:border-on-surface hover:text-on-surface"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(task.id)}
                              disabled={isPending}
                              className="inline-flex h-8 w-8 items-center justify-center border border-red-100 bg-white text-red-400 transition hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Dialog
        open={editingTaskId !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isPending) {
            setEditingTaskId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl text-on-surface md:text-2xl">
              Edit Task
            </DialogTitle>
            <DialogDescription>
              Update the task details here. Move the card on the board to change
              its status.
            </DialogDescription>
          </DialogHeader>

          {editingTask && editingDraft ? (
            <div className="space-y-4">
              <div className="border border-outline-variant/20 bg-surface-container-low px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-outline">
                Current status:{" "}
                {STATUS_COLUMNS.find(
                  (column) => column.value === editingTask.status,
                )?.label ?? editingTask.status}
              </div>

              <fieldset
                disabled={isPending}
                className="grid gap-4 disabled:opacity-100"
              >
                <div>
                  <label
                    htmlFor="task-title"
                    className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-outline"
                  >
                    Title
                  </label>
                  <input
                    id="task-title"
                    type="text"
                    value={editingDraft.title}
                    onChange={(event) =>
                      updateDraft(editingTask.id, "title", event.target.value)
                    }
                    className="w-full rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-on-surface disabled:cursor-not-allowed disabled:bg-surface-container-low"
                  />
                </div>

                <div>
                  <label
                    htmlFor="task-description"
                    className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-outline"
                  >
                    Description
                  </label>
                  <textarea
                    id="task-description"
                    rows={4}
                    value={editingDraft.description}
                    onChange={(event) =>
                      updateDraft(
                        editingTask.id,
                        "description",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-on-surface disabled:cursor-not-allowed disabled:bg-surface-container-low"
                  />
                </div>

                <div>
                  <label
                    htmlFor="task-notes"
                    className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-outline"
                  >
                    Notes
                  </label>
                  <textarea
                    id="task-notes"
                    rows={4}
                    value={editingDraft.notes}
                    onChange={(event) =>
                      updateDraft(editingTask.id, "notes", event.target.value)
                    }
                    className="w-full rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-on-surface disabled:cursor-not-allowed disabled:bg-surface-container-low"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label
                      htmlFor="task-assignee"
                      className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-outline"
                    >
                      Assignee
                    </label>
                    <select
                      id="task-assignee"
                      value={editingDraft.assigneeId}
                      onChange={(event) =>
                        updateDraft(
                          editingTask.id,
                          "assigneeId",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-on-surface disabled:cursor-not-allowed disabled:bg-surface-container-low"
                    >
                      <option value="">Unassigned</option>
                      {editingAssigneeOptions.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                          {!member.isActive ? " (Inactive)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="task-public-step"
                      className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-outline"
                    >
                      Step #
                    </label>
                    <input
                      id="task-public-step"
                      type="number"
                      min="1"
                      step="1"
                      value={editingDraft.publicStepNumber}
                      onChange={(event) =>
                        updateDraft(
                          editingTask.id,
                          "publicStepNumber",
                          event.target.value,
                        )
                      }
                      placeholder="Optional"
                      className="w-full rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-on-surface disabled:cursor-not-allowed disabled:bg-surface-container-low"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="task-priority"
                      className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-outline"
                    >
                      Priority
                    </label>
                    <select
                      id="task-priority"
                      value={editingDraft.priority}
                      onChange={(event) =>
                        updateDraft(
                          editingTask.id,
                          "priority",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-on-surface disabled:cursor-not-allowed disabled:bg-surface-container-low"
                    >
                      {PRIORITY_OPTIONS.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label
                      htmlFor="task-due-date"
                      className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-outline"
                    >
                      Due Date
                    </label>
                    <input
                      id="task-due-date"
                      type="date"
                      value={editingDraft.dueDate}
                      onChange={(event) =>
                        updateDraft(
                          editingTask.id,
                          "dueDate",
                          event.target.value,
                        )
                      }
                      className="w-full rounded-md border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-on-surface disabled:cursor-not-allowed disabled:bg-surface-container-low"
                    />
                  </div>
                </div>
              </fieldset>
            </div>
          ) : null}

          <DialogFooter>
            <button
              type="button"
              onClick={() => setEditingTaskId(null)}
              disabled={isPending}
              className="rounded-md border border-outline-variant/30 bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-on-surface transition hover:border-on-surface disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => editingTask && handleSave(editingTask.id)}
              disabled={isPending || !editingDraft?.title.trim()}
              className="rounded-md border border-on-surface bg-on-surface px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-on-surface/85 disabled:opacity-40"
            >
              {isPending ? "Saving..." : "Save Task"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
