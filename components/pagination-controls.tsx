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
    "inline-flex min-h-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
  const pillDisabled =
    "inline-flex min-h-10 cursor-not-allowed items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-slate-500";

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="text-xs text-slate-400">
        Showing <span className="font-semibold text-white">{from}</span>–
        <span className="font-semibold text-white">{to}</span> of{" "}
        <span className="font-semibold text-white">{totalCount}</span>{" "}
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
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-[0_0_24px_-4px_rgba(75,117,255,0.35)]"
                >
                  {item}
                </span>
              ) : (
                <Link
                  key={item}
                  href={url}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-xs font-medium text-slate-400 transition hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
