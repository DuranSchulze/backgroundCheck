"use client";

import { useTransition, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  actionCreateCheckTask,
  actionUpdateCheckTask,
  actionDeleteCheckTask,
  actionReorderCheckTasks,
} from "@/app/actions/service-checks";
import type { CheckProgressStatus } from "@/lib/tracking/types";

const STATUS_OPTIONS: { value: CheckProgressStatus; label: string; color: string }[] = [
  { value: "QUEUED", label: "Queued", color: "bg-surface-container-high text-outline border-outline-variant" },
  { value: "IN_PROGRESS", label: "Ongoing", color: "bg-primary text-[color:var(--color-on-primary)] border-primary" },
  { value: "ACTIVE_INVESTIGATION", label: "Investigating", color: "bg-[#fff0cf] text-[#8a5207] border-[#eec07c]" },
  { value: "COMPLETED", label: "Done", color: "bg-[#fff7da] text-[color:var(--color-on-primary-fixed)] border-[#e8d28c]" },
  { value: "ON_HOLD", label: "On Hold", color: "bg-surface-container-high text-outline border-outline-variant" },
];

function statusStyle(status: string) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.color ??
    "bg-surface-container-high text-outline border-outline-variant";
}

function statusLabel(status: string) {
  return STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export interface TaskView {
  id: string;
  title: string;
  status: CheckProgressStatus;
  notes: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
}

interface CheckTaskListProps {
  trackingNumber: string;
  checkId: string;
  initialTasks: TaskView[];
}

export default function CheckTaskList({
  trackingNumber,
  checkId,
  initialTasks,
}: CheckTaskListProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskView[]>(
    [...initialTasks].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  );
  const [newTitle, setNewTitle] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    router.refresh();
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const optimisticTask: TaskView = {
      id: `optimistic-${Date.now()}`,
      title: newTitle.trim(),
      status: "QUEUED",
      notes: null,
      sortOrder: tasks.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, optimisticTask]);
    const title = newTitle.trim();
    setNewTitle("");
    setError(null);
    startTransition(async () => {
      const result = await actionCreateCheckTask(trackingNumber, checkId, title);
      if (result?.error) {
        setError(result.error);
        setTasks((prev) => prev.filter((t) => t.id !== optimisticTask.id));
      } else {
        refresh();
      }
    });
  }

  function handleStatusChange(taskId: string, status: CheckProgressStatus) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t)),
    );
    startTransition(async () => {
      const result = await actionUpdateCheckTask(trackingNumber, checkId, taskId, { status });
      if (result?.error) setError(result.error);
      else refresh();
    });
  }

  function handleNotesSave(taskId: string) {
    const notes = editingNotes[taskId] ?? "";
    startTransition(async () => {
      const result = await actionUpdateCheckTask(trackingNumber, checkId, taskId, { notes });
      if (result?.error) setError(result.error);
      else refresh();
    });
  }

  function handleDelete(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    startTransition(async () => {
      const result = await actionDeleteCheckTask(trackingNumber, checkId, taskId);
      if (result?.error) {
        setError(result.error);
        refresh();
      }
    });
  }

  function moveTask(index: number, direction: -1 | 1) {
    const next = [...tasks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setTasks(next);
    startTransition(async () => {
      const result = await actionReorderCheckTasks(
        trackingNumber,
        checkId,
        next.map((t) => t.id),
      );
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-xs text-red-600">{error}</p>
      ) : null}

      {tasks.length === 0 ? (
        <p className="text-sm text-outline/60 italic">
          No tasks yet. Add your first task below.
        </p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task, index) => {
            const isExpanded = expandedId === task.id;
            const currentNote = editingNotes[task.id] ?? task.notes ?? "";

            return (
              <div
                key={task.id}
                className="rounded-2xl border border-amber-100 bg-[#fffaf0] transition"
              >
                <div className="flex items-center gap-2 px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveTask(index, -1)}
                      disabled={isPending || index === 0}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-outline hover:bg-amber-100 disabled:opacity-20"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveTask(index, 1)}
                      disabled={isPending || index === tasks.length - 1}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-outline hover:bg-amber-100 disabled:opacity-20"
                    >
                      ▼
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {task.title}
                    </p>
                    {task.notes && !isExpanded ? (
                      <p className="mt-0.5 truncate text-xs text-outline">{task.notes}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      value={task.status}
                      disabled={isPending}
                      onChange={(e) =>
                        handleStatusChange(task.id, e.target.value as CheckProgressStatus)
                      }
                      className={[
                        "rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider focus:outline-none",
                        statusStyle(task.status),
                      ].join(" ")}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        if (!isExpanded) {
                          setEditingNotes((prev) => ({
                            ...prev,
                            [task.id]: task.notes ?? "",
                          }));
                        }
                        setExpandedId(isExpanded ? null : task.id);
                      }}
                      title={isExpanded ? "Collapse" : "Add note"}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-200 bg-white text-outline transition hover:border-primary hover:text-on-surface"
                    >
                      {isExpanded ? "−" : "+"}
                    </button>

                    <button
                      onClick={() => handleDelete(task.id)}
                      disabled={isPending}
                      title="Delete task"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-red-100 bg-white text-red-300 transition hover:border-red-400 hover:text-red-600 disabled:opacity-30"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="border-t border-amber-100 px-4 pb-4 pt-3">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-outline">
                      Note
                    </label>
                    <textarea
                      rows={3}
                      value={currentNote}
                      onChange={(e) =>
                        setEditingNotes((prev) => ({
                          ...prev,
                          [task.id]: e.target.value,
                        }))
                      }
                      placeholder="Add a note for this task…"
                      className="mt-2 w-full resize-none rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <button
                      onClick={() => {
                        handleNotesSave(task.id);
                        setExpandedId(null);
                      }}
                      disabled={isPending}
                      className="mt-2 inline-flex items-center rounded-full border border-primary bg-primary px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[color:var(--color-on-primary)] transition hover:bg-primary-container disabled:opacity-50"
                    >
                      Save Note
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleAddTask} className="flex gap-2 pt-1">
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New task title…"
          className="min-w-0 flex-1 rounded-2xl border border-amber-200 bg-white px-4 py-2.5 text-sm text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={isPending || !newTitle.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#f0ca52] bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-[color:var(--color-on-primary)] transition hover:bg-primary-container disabled:opacity-40"
        >
          + Add Task
        </button>
      </form>
    </div>
  );
}
