import type React from "react";
import Link from "next/link";

/**
 * The stages of the work across the top of the Issues page, on one row: Your
 * Work (only while you have any), Ideas, In Progress, Delivered and Live (only
 * once something went live), each with its count. The picked stage is filled in;
 * its statuses are listed down the left of the panel.
 *
 * On a phone they are plain tabs: equal columns, a long label on two lines with
 * its count under it, no dot, and a thin underline that is thick on the picked one.
 */
export type PipelineStage = { label: string; count: number; href: string; selected: boolean };

export function PipelineSteps({ stages, label = "Stages" }: { stages: PipelineStage[]; label?: string }) {
  return (
    // One row whatever the number of stages (Your Work and Live come and go): a column each, about 133px wide.
    <nav
      aria-label={label}
      className="grid w-full grid-cols-[repeat(var(--stages),minmax(0,1fr))] gap-x-2 rounded-xl border border-zk-border bg-zk-surface p-2 max-sm:gap-x-0 max-sm:border-b max-sm:border-zk-border"
      style={{ "--stages": stages.length, maxWidth: stages.length * 140 } as React.CSSProperties}
    >
      {stages.map((stage) => (
        <Link
          key={stage.label}
          href={stage.href}
          aria-current={stage.selected ? "page" : undefined}
          className="group flex flex-col items-center gap-2 rounded-lg px-2 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zk-accent max-sm:min-h-11 max-sm:justify-end max-sm:gap-1.5 max-sm:pb-0 max-sm:rounded-none max-sm:px-0.5"
        >
          <span
            className={`flex items-center gap-2 whitespace-nowrap text-sm max-sm:flex-col max-sm:gap-0 max-sm:whitespace-normal max-sm:text-center max-sm:text-[13px] max-sm:leading-[1.2] ${
              stage.selected ? "font-bold text-zk-text" : "font-medium text-zk-text2 group-hover:text-zk-text"
            }`}
          >
            {stage.label}
            <span className={`inline-flex min-w-[1.75rem] items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
              stage.selected
                ? "bg-zk-accent text-white"
                : "bg-zk-chip text-zk-text2 group-hover:bg-zk-accent/15 group-hover:text-zk-accent"
            }`}>
              {stage.count}
            </span>
          </span>
          <span
            aria-hidden="true"
            className={`h-1.5 w-full rounded-full max-sm:-mb-px max-sm:rounded-none ${
              stage.selected
                ? "bg-zk-accent max-sm:h-[3px]"
                : "bg-zk-border group-hover:bg-zk-accent/30 max-sm:h-0 max-sm:bg-transparent"
            }`}
          />
        </Link>
      ))}
    </nav>
  );
}
