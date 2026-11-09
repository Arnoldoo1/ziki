"use client";

import { useState, useTransition } from "react";
import { toggleFavoriteAction } from "@/app/actions/favorites";

export function FavoriteButton({ bugId, initialFavorited }: { bugId: string; initialFavorited: boolean }) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    const prev = favorited;
    setFavorited(!favorited);
    startTransition(async () => {
      const result = await toggleFavoriteAction(bugId);
      if (result.error) {
        setFavorited(prev);
      } else if (result.favorited !== undefined) {
        setFavorited(result.favorited);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      className={`inline-flex items-center gap-1 rounded-md border border-zk-border px-2 py-1 text-sm transition ${favorited ? "bg-zk-tint text-zk-accent" : "bg-zk-surface text-zk-muted hover:text-zk-text"} disabled:opacity-50`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={favorited ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
      {favorited ? "Favorited" : "Favorite"}
    </button>
  );
}
