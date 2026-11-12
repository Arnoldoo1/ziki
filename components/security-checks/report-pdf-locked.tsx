"use client";

import Link from "next/link";
import { useRef } from "react";

/**
 * "Download PDF" on an unpaid check (#security-checks, part 4): the PDF comes
 * only with the full report, so the button opens a centred box asking the
 * client to pay. Same dialog style as Ziki's other modals (Add idea): the page
 * stays visible behind a light blur.
 */
export function LockedPdfButton({ payHref, priceCoins, className }: { payHref: string; priceCoins: number; className: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className={`cursor-pointer ${className}`}>
        Download PDF
      </button>
      {/* A click on the blurred area outside the box closes it, as on Add idea. Keyboard
          users close it with Escape (the dialog's own) or the Close button. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialogRef}
        aria-labelledby="locked-pdf-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-zk-border bg-zk-surface p-0 text-zk-text shadow-2xl backdrop:bg-slate-900/40 backdrop:backdrop-blur-xs"
      >
        <div className="relative p-5 sm:p-6">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-zk-muted hover:bg-zk-chip hover:text-zk-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue-strong"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          <h2 id="locked-pdf-title" className="pr-8 text-base font-semibold text-zk-text">Download PDF</h2>
          <p className="mt-2 text-sm text-zk-text2">The PDF comes with the full report.</p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href={payHref}
              className="inline-flex h-10 items-center rounded-full bg-electric-blue-strong px-5 text-sm font-bold text-white hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-blue focus-visible:ring-offset-2"
            >
              Pay {priceCoins} coins to unlock
            </Link>
            <button type="button" onClick={close} className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-zk-text2 hover:bg-zk-chip">
              Not now
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
