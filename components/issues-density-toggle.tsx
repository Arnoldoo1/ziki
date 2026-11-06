"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Density = "comfortable" | "compact";

const KEY = "ziki:issues-density";
const TABLE_ID = "issues-table";

const DENSITY_LABELS: Record<Density, string> = {
  comfortable: "Comfortable",
  compact: "Compact",
};

/** Reads the saved density preference, defaulting to comfortable. */
function readDensity(): Density {
  if (typeof window === "undefined") return "comfortable";
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable";
  }
}

/** Persists the density preference. */
function writeDensity(value: Density) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    /* ignore */
  }
}

/** Applies the density to the issues table element in the DOM. */
function applyDensity(value: Density) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(TABLE_ID);
  if (el) {
    el.dataset.density = value;
  }
}

/**
 * Issues row density toggle (#density-toggle): lets the person switch
 * issue-list rows between comfortable and compact spacing. Stored in
 * localStorage only — no database, no migration.
 */
export function IssuesDensityToggle() {
  const [density, setDensity] = useState<Density>(readDensity);

  useEffect(() => {
    applyDensity(density);
  }, [density]);

  const switchTo = useCallback((next: Density) => {
    if (next === density) return;
    setDensity(next);
    writeDensity(next);
    applyDensity(next);
  }, [density]);

  const isComfortable = density === "comfortable";
  const isCompact = density === "compact";

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-zk-border bg-zk-surface shadow-sm">
      <span className="px-2 py-1 text-[11px] font-semibold text-zk-muted">Density</span>
      <div className="flex">
        <Button
          type="button"
          variant="secondary"
          onClick={() => switchTo("comfortable")}
          className={`rounded-none text-[11px] px-2.5 py-1.5 border-x-0 border-zk-border ${isComfortable ? "bg-electric-blue-strong text-white" : "text-zk-text hover:bg-zk-surface-2"}`}
        >
          {DENSITY_LABELS.comfortable}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => switchTo("compact")}
          className={`rounded-none text-[11px] px-2.5 py-1.5 border-x-0 border-zk-border ${isCompact ? "bg-electric-blue-strong text-white" : "text-zk-text hover:bg-zk-surface-2"}`}
        >
          {DENSITY_LABELS.compact}
        </Button>
      </div>
    </div>
  );
}

export type { Density };
