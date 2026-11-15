import Link from "next/link";
import { buildPaginationUrl, getPaginationRange } from "@/lib/pagination";

export interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalCount: number;
  from: number;
  to: number;
  queryParams: Record<string, string | undefined>;
  basePath: string;
  itemLabel?: string;
}

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  from,
  to,
  queryParams,
  basePath,
  itemLabel = "issue",
}: PaginationControlsProps) {
  if (totalCount === 0) return null;

  const range = getPaginationRange(page, totalPages);
  const prevUrl = page > 1 ? buildPaginationUrl(basePath, page - 1, queryParams) : null;
  const nextUrl =
    page < totalPages ? buildPaginationUrl(basePath, page + 1, queryParams) : null;

  const pill =
    "inline-flex min-h-10 items-center justify-center rounded-full border border-zk-border bg-zk-surface px-4 py-1.5 text-xs font-semibold text-zk-text transition hover:bg-zk-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zk-accent dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.09] dark:hover:text-white dark:focus-visible:ring-blue-500";
  const pillDisabled =
    "inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-full border border-zk-border bg-zk-chip px-4 py-1.5 text-xs font-medium text-zk-muted dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-slate-500";

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="text-xs text-zk-muted dark:text-slate-400">
        Showing <span className="font-semibold text-zk-text dark:text-white">{from}</span>–
        <span className="font-semibold text-zk-text dark:text-white">{to}</span> of{" "}
        <span className="font-semibold text-zk-text dark:text-white">{totalCount}</span>{" "}
        {itemLabel}
        {totalCount === 1 ? "" : "s"}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {prevUrl ? (
            <Link href={prevUrl} className={pill}>Previous</Link>
          ) : (
            <span aria-disabled="true" className={pillDisabled}>Previous</span>
          )}

          <div className="flex items-center gap-1">
            {range.map((item, index) => {
              if (item === "...") {
                return (
                  <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-zk-muted">…</span>
                );
              }
              const isCurrent = item === page;
              const url = buildPaginationUrl(basePath, item, queryParams);
              return isCurrent ? (
                <span
                  key={item}
                  aria-current="page"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-zk-accent text-xs font-bold text-white shadow-sm dark:bg-blue-600 dark:shadow-[0_0_24px_-4px_rgba(75,117,255,0.35)]"
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={url}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zk-border bg-zk-surface text-xs font-medium text-zk-text transition hover:bg-zk-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zk-accent dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-400 dark:hover:bg-white/[0.09] dark:hover:text-white dark:focus-visible:ring-blue-500"
                >
                  {item}
                </Link>
              );
            })}
          </div>

          {nextUrl ? (
            <Link href={nextUrl} className={pill}>Next</Link>
          ) : (
            <span aria-disabled="true" className={pillDisabled}>Next</span>
          )}
        </div>
      )}
    </nav>
  );
}
