type BlockType = 'task' | 'meeting' | 'note';

export function categoryToType(category?: string | null) {
  const c = (category ?? '').trim().toLowerCase();
  if (c === 'meetings' || c === 'meeting') return 'meeting';
  if (c === 'notes' || c === 'note') return 'note';
  return 'task'; // default
}

export function buildTree<T extends { id: any; parent_id?: any | null }>(rows: T[]) {
  const byId = new Map<any, T & { children: any[] }>();
  const roots: Array<T & { children: any[] }> = [];

  // init
  for (const r of rows) byId.set(r.id, { ...r, children: [] });

  // link
  for (const r of rows) {
    const node = byId.get(r.id)!;
    const parentId = r.parent_id ?? null;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export function splitIntoSections(tasks: any[]) {
  const meetings = tasks.filter(t => categoryToType(t.category) === 'meeting');
  const taskItems = tasks.filter(t => categoryToType(t.category) === 'task');
  const notes = tasks.filter(t => categoryToType(t.category) === 'note');

  return {
    meetings: buildTree(meetings),
    tasks: buildTree(taskItems),
    notes: buildTree(notes),
  };
}
