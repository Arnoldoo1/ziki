import type { WorkspaceCheckRow } from "@/lib/security-checks/entry";
import { SecurityWelcome } from "./security-welcome";
import { SecurityChat } from "./security-chat";
import { FlashNote } from "./flash-note";
import { ScanList } from "./scan-list";

/** One panel for everything, as wide as the tabs above it, like a project's Ideas and Issues. */
const PANEL = "mx-auto w-full max-w-6xl overflow-hidden rounded-[20px] border border-zk-border bg-zk-surface";
function PrivacyNote() {
  return (
    <p className="m-0 flex items-start gap-2 text-xs text-zk-muted">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px shrink-0"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
      Agents only look. They never log in as you, change anything, or use what they find. Results stay private to you.
    </p>
  );
}

/**
 * The Security page (#security-checks, 14 Nov plan): one page, no wizard and
 * no proof step. With nothing scanned yet it's the one big box; after that
 * the box stays on top and the person's scans sit under it as cards, each
 * one click from its report.
 */
export function SecurityChecksPanel({
  checks,
  highlight,
  startWith,
  show,
  page,
}: {
  checks: WorkspaceCheckRow[];
  highlight?: { checkId: string; unlocked: number };
  /** An address brought from the public page after sign-up: its scan starts on arrival. */
  startWith?: string;
  /** Which scans to show (?show=): all, scanning, report or in_app. */
  show?: string;
  /** Which page of scans (?page=). */
  page?: number;
}) {
  if (checks.length === 0) {
    return (
      <section aria-label="Security" className={PANEL}>
        <SecurityWelcome startWith={startWith} />
      </section>
    );
  }

  return (
    <section aria-labelledby="security-scans-heading" className={PANEL}>
      <div className="border-b border-zk-divider bg-gradient-to-b from-zk-tint/60 to-zk-surface px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-1 text-center">
          <p className="m-0 text-xl font-extrabold tracking-tight text-zk-text sm:text-2xl">What do you want to secure?</p>
          <p className="m-0 text-sm text-zk-muted">Paste a website, server address or GitHub repo. Its scan shows here.</p>
          <div className="mt-4 w-full text-left">
            <SecurityChat id="security-chat" startWith={startWith} />
          </div>
        </div>
      </div>
      {highlight?.unlocked ? (
        <FlashNote>
          {highlight.unlocked === 1 ? "1 fix unlocked." : `${highlight.unlocked} fixes unlocked.`} Open the report to read each one in full, with how to fix it.
        </FlashNote>
      ) : null}
      <div className="p-3 sm:p-6">
        <ScanList checks={checks} highlightId={highlight?.checkId} show={show} page={page} />
      </div>
      <div className="border-t border-zk-border bg-zk-bg px-4 py-3 sm:px-6">
        <PrivacyNote />
      </div>
    </section>
  );
}
