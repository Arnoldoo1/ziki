-- Pinned issues (#issue-pinning): shown first on the board.
ALTER TABLE "Bug" ADD COLUMN "isPinned" BOOLEAN NOT NULL DEFAULT false;
