"use client";

import { useEffect, useState } from "react";
import { KindIcon } from "./entry-box";

const AGENTS = ["Web", "API", "Code", "Login", "Ports"];

const FINDINGS: { level: string; tone: string; title: string }[] = [
  { level: "High", tone: "bg-zk-bad-bg text-zk-bad-fg", title: "No limit on login attempts" },
  { level: "Medium", tone: "bg-zk-warn-bg text-zk-warn-fg", title: "Session cookie not marked secure" },
  { level: "Low", tone: "bg-zk-chip text-zk-text2", title: "Server tells visitors its version" },
];

// One loop: scan for SCAN_MS, show a finding every STEP_MS, hold, then start again.
const SCAN_MS = 2200;
const STEP_MS = 650;
const HOLD_MS = 4200;
const LOOP_MS = SCAN_MS + FINDINGS.length * STEP_MS + HOLD_MS;

/**
 * A made-up report, labelled as an example, so a new client sees what a check
 * gives them (#security-checks, part 1). It plays a short scan and the findings
 * arrive one by one; with reduced motion it just shows the finished report.
 */
export function ExampleReport() {
  const [elapsed, setElapsed] = useState(LOOP_MS - HOLD_MS);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Pick up from the finished report the page first showed, hold it, then loop.
    let start = performance.now() - (LOOP_MS - HOLD_MS);
    let frame = 0;
    const tick = (now: number) => {
      if (now - start >= LOOP_MS) start = now;
      setElapsed(now - start);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const scanning = elapsed < SCAN_MS;
  const shown = scanning ? 0 : Math.min(FINDINGS.length, Math.floor((elapsed - SCAN_MS) / STEP_MS) + 1);
  const progress = scanning ? elapsed / SCAN_MS : 1;

  return (
    <figure className="relative m-0 overflow-hidden rounded-[22px] bg-[#0b1733] p-4 sm:p-6" aria-label="An example of a finished check report">
      {/* Rings behind everything, as in the agents picture. */}
      {[150, 105, 62].map((size) => (
        <span
          key={size}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10"
          style={{ width: `${size}%`, aspectRatio: "1" }}
        />
      ))}
      <div aria-hidden="true" className="relative mb-4 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/80">
          <span className={`grid h-8 w-8 place-items-center rounded-xl bg-electric-blue-strong text-white transition-shadow duration-500 ${scanning ? "shadow-[0_0_26px_rgba(59,130,246,0.75)]" : "shadow-[0_0_14px_rgba(59,130,246,0.35)]"}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z" /><path d="M9 12l2 2 4-4" /></svg>
          </span>
          Ziki&apos;s agents
        </span>
        <span className="text-xs text-white/60">{scanning ? "Checking" : "Done"}</span>
      </div>
      <div aria-hidden="true" className="relative mb-4 flex flex-wrap gap-1.5">
        {AGENTS.map((agent, index) => {
          const active = scanning && Math.floor((elapsed / SCAN_MS) * AGENTS.length) === index;
          return (
            <span
              key={agent}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold transition-colors duration-300 ${active ? "border-electric-blue-strong bg-electric-blue-strong text-white" : "border-white/20 bg-white/5 text-white/75"}`}
            >
              {agent}
            </span>
          );
        })}
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-zk-border bg-zk-surface shadow-[0_18px_40px_-28px_rgba(11,23,51,0.45)]">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-zk-bg">
              <KindIcon kind="website" className="h-4 w-4 text-zk-text2" />
            </span>
            <div className="min-w-0">
              <p className="m-0 truncate text-sm font-bold text-zk-text">yourshop.com</p>
              <p className="m-0 text-xs text-zk-muted" aria-hidden="true">
                {scanning ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-electric-blue-strong" />
                    Agents checking…
                  </span>
                ) : (
                  <>Website · {shown} found</>
                )}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-zk-border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-zk-muted">Example</span>
        </div>
        <div aria-hidden="true" className="h-0.5 bg-zk-border">
          <div className="h-full bg-electric-blue-strong transition-[width] duration-100 ease-linear" style={{ width: `${progress * 100}%` }} />
        </div>
        <ul className="m-0 list-none divide-y divide-zk-border p-0">
          {FINDINGS.map((finding, index) => {
            const visible = index < shown;
            return (
              <li
                key={finding.title}
                className={`flex items-center gap-3 px-4 py-3 transition duration-500 ease-out motion-reduce:transition-none ${visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"}`}
              >
                <span className={`w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-bold ${finding.tone}`}>{finding.level}</span>
                <span className="min-w-0 truncate text-sm text-zk-text">{finding.title}</span>
              </li>
            );
          })}
        </ul>
        <p className={`m-0 flex items-center gap-2 border-t border-zk-border px-4 py-3 text-xs text-zk-ok-fg transition-opacity duration-500 ${shown === FINDINGS.length ? "opacity-100" : "opacity-0"}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L19 7" /></svg>
          Each one comes with how to fix it
        </p>
      </div>
      <figcaption className="sr-only">
        Example: a check of yourshop.com found three problems, high, medium and low, each with how to fix it.
      </figcaption>
    </figure>
  );
}
