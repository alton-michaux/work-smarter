export function categoryToType(category?: string | null) {
  const c = (category ?? '').trim().toLowerCase();
  if (c === 'meetings' || c === 'meeting') return 'meeting';
  if (c === 'notes' || c === 'note') return 'note';
  return 'task'; // default
}

export function buildTree<T extends { id: any; parent?: any | null; parent_id?: any | null }>(rows: T[]) {
  const byId = new Map<any, (T & { children: any[] })>();
  const roots: Array<T & { children: any[] }> = [];

  // init
  for (const r of rows) byId.set(r.id, { ...r, children: [] });

  // link
  for (const r of rows) {
    const node = byId.get(r.id)!;

    // Prefer API field `parent`, but support legacy `parent_id` too
    const parentId = (r as any).parent ?? (r as any).parent_id ?? null;

    if (parentId != null && byId.has(parentId)) {
      byId.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high:   1,
  medium: 2,
  low:    3,
};

export function priorityRank(p?: string | null): number {
  return PRIORITY_RANK[String(p ?? '').toLowerCase()] ?? 4;
}

function byPriority(a: any, b: any) {
  return priorityRank(a.priority) - priorityRank(b.priority);
}

export function splitIntoSections(tasks: any[]) {
  const uniq = Array.from(new Map((tasks ?? []).map(t => [t.id, t])).values());

  const meetings = uniq
    .filter(t => categoryToType(t.category) === 'meeting')
    .sort((a, b) => {
      const ta = a.begin_time ?? '';
      const tb = b.begin_time ?? '';
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });
  const taskItems = uniq.filter(t => categoryToType(t.category) === 'task').sort(byPriority);
  const notes = uniq.filter(t => categoryToType(t.category) === 'note').sort(byPriority);

  return {
    meetings: buildTree(meetings),
    tasks: buildTree(taskItems),
    notes: buildTree(notes),
  };
}
