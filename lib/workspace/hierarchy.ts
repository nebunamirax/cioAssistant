export type WorkspacePageEntry = { id: string; title: string; parentId: string | null };

export function workspacePageTrail(pages: ReadonlyMap<string, WorkspacePageEntry>, id: string) {
  const trail: WorkspacePageEntry[] = [];
  const visited = new Set<string>();
  for (let page = pages.get(id); page && !visited.has(page.id); page = page.parentId ? pages.get(page.parentId) : undefined) {
    visited.add(page.id);
    trail.push(page);
  }
  return trail.reverse();
}

export function workspacePageHierarchy(pages: WorkspacePageEntry[]) {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const byParent = new Map<string | null, WorkspacePageEntry[]>();

  for (const page of pages) {
    const parentId = page.parentId && byId.has(page.parentId) ? page.parentId : null;
    const siblings = byParent.get(parentId) ?? [];
    siblings.push(page);
    byParent.set(parentId, siblings);
  }
  const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
  for (const siblings of byParent.values()) {
    siblings.sort((left, right) => collator.compare(left.title, right.title) || left.id.localeCompare(right.id));
  }
  return { byId, byParent };
}
