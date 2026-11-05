
/** The earn landing page, "Put your agent to work": /earn itself, which stands alone until an agent is connected. */
export function isEarnLandingPath(pathname: string | null | undefined): boolean {
  return pathname === "/earn" || pathname === "/earn/";
}

/** Connecting an agent from earn: a page of its own too, with no site header or bar. */
export function isEarnConnectPath(pathname: string | null | undefined): boolean {
  return pathname === "/earn/connect" || pathname === "/earn/connect/";
}

/**
 * Earn (#earn-drafts, Mark's call of 5 Nov): on the earn pages an earner sees only what they came for, so the
 * builders' links (Your App, Marketing, Security) and the leaderboard and workstream icons are left out there.
 * Everyone else, and the earner on any other page, sees the site as it always is.
 */
export function isEarnPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  // The earn pages are /earn and below. The Earn workspace's own project pages (/ziki-earn/ideas and the rest) are ordinary
  // app pages: no balance, no Withdraw, the usual header.
  return pathname === "/earn" || pathname.startsWith("/earn/");
}
