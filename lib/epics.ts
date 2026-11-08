/**
 * Issue epics (#issue-epics): an issue can be marked as an epic and other
 * issues can be nested under it. Progress is derived from the children so it
 * never drifts out of sync.
 */

export type EpicChildState = { status: string };

/** True when an issue counts as finished for epic progress. */
export function isEpicChildDone(status: string): boolean {
  return status === "resolved" || status === "closed" || status === "done" || status === "merge";
}

/** Progress rollup for an epic's children. */
export function epicProgress(children: ReadonlyArray<EpicChildState>): {
  total: number;
  done: number;
  percent: number;
} {
  const total = children.length;
  const done = children.filter((child) => isEpicChildDone(child.status)).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, percent };
}

/** Walk parent edges to prevent an issue from being nested under itself indirectly. */
export async function wouldCreateHierarchyCycle(
  childId: string,
  parentId: string,
  parentsFor: (issueIds: string[]) => Promise<string[]>,
): Promise<boolean> {
  if (childId === parentId) return true;
  const visited = new Set<string>();
  let frontier = [parentId];
  while (frontier.length) {
    if (frontier.includes(childId)) return true;
    const unseen = frontier.filter((id) => !visited.has(id));
    if (!unseen.length) return false;
    unseen.forEach((id) => visited.add(id));
    frontier = await parentsFor(unseen);
  }
  return false;
}
