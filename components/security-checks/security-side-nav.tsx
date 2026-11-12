import Link from "next/link";
import type { ReactNode } from "react";

export type SideNavItem = {
  key: string;
  label: string;
  hint: string;
  /** An SVG path, 24×24, drawn as a stroke. */
  icon: string;
  count: number;
  href: string;
};

export const SIDE_ICONS = {
  all: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  prove: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",
  checking: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35",
  fix: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  done: "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3",
} as const;

/**
 * The left sidebar on Your sites and Your work (#security-checks), drawn like
 * the Settings sidebar: an icon, the name, a short hint and a count. On a
 * narrow screen it sits above the list as a row of choices.
 */
export function SecuritySideNav({ label, items, selected }: { label: string; items: SideNavItem[]; selected: string }) {
  return (
    <nav
      aria-label={label}
      className="grid grid-cols-2 gap-1 rounded-[20px] border border-zk-border bg-zk-surface p-1.5 sm:grid-cols-4 lg:flex lg:flex-col lg:p-2"
    >
      {items.map((item) => {
        const on = item.key === selected;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-w-0 items-center gap-2.5 rounded-[14px] p-2 transition lg:gap-3 lg:p-3 ${on ? "bg-zk-tint" : "hover:bg-zk-chip"}`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] lg:h-9 lg:w-9 lg:rounded-xl ${
                on ? "bg-electric-blue-strong text-white" : "bg-zk-chip text-zk-text2"
              }`}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={item.icon} />
              </svg>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={`text-sm font-bold leading-tight ${on ? "text-zk-accent" : "text-zk-text"}`}>{item.label}</span>
              <span className="hidden truncate text-xs font-medium text-zk-muted lg:block">{item.hint}</span>
            </span>
            <span className={`shrink-0 text-xs font-semibold tabular-nums ${on ? "text-zk-accent" : "text-zk-muted"}`}>{item.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/** The sidebar on the left, the list on the right; stacked on a narrow screen. */
export function SecuritySideLayout({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-6">
      {nav}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
