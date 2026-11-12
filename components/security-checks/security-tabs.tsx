import Link from "next/link";
import { PipelineSteps } from "@/components/pipeline-steps";
import { SecuritySettingsLink } from "@/components/security/security-settings-link";

/**
 * The top of Security once someone has something there (#security-checks):
 * the same stage bar as a project's Your Work and Ideas, with Findings and
 * settings as small icon links on the right, like the project's own icons.
 */
export function SecurityTabs({ selected, checks, jobs }: { selected: "checks" | "work"; checks: number; jobs: number }) {
  return (
    <div className="relative flex flex-wrap items-start justify-center gap-3">
      <PipelineSteps
        label="Security"
        stages={[
          { label: "Your sites", count: checks, href: "/security", selected: selected === "checks" },
          { label: "Your work", count: jobs, href: "/security/work", selected: selected === "work" },
        ]}
      />
      <div className="flex items-center gap-2 sm:absolute sm:right-0 sm:top-0">
        <Link
          href="/security?view=findings"
          aria-label="Findings"
          title="Findings"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zk-border bg-zk-surface text-zk-text transition hover:bg-zk-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-blue"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </Link>
        <SecuritySettingsLink />
      </div>
    </div>
  );
}
