import type { Task } from "types/types";

export type SubtaskProgress = {
  done: number;
  total: number;
};

export function buildSubtaskProgressByParentId(tasks: Task[]): Record<number, SubtaskProgress> {
  const progress: Record<number, SubtaskProgress> = {};

  for (const t of tasks ?? []) {
    const parentId = (t as any).parent ?? null; // parent is optional in your Task type
    if (parentId == null) continue;

    const pid = Number(parentId);
    if (!progress[pid]) progress[pid] = { done: 0, total: 0 };

    progress[pid].total += 1;

    // Prefer effective_is_done if your weekly payload includes it; fall back to is_done
    const isDone = Boolean((t as any).effective_is_done ?? t.is_done);
    if (isDone) progress[pid].done += 1;
  }

  return progress;
}
