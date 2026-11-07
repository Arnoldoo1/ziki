/**
 * Issue pinning (#issue-pinning): pinned issues float to the top of a list.
 */

export function isPinned(value: unknown): boolean {
  return value === true;
}

/** Sort comparator: pinned first, then by the supplied fallback. */
export function pinnedFirst<T extends { isPinned?: boolean | null }>(a: T, b: T, fallback: number = 0): number {
  const pa = isPinned(a?.isPinned) ? 1 : 0;
  const pb = isPinned(b?.isPinned) ? 1 : 0;
  if (pa !== pb) return pb - pa;
  return fallback;
}
