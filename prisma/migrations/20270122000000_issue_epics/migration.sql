-- #issue-epics: parent/child hierarchy so issues can be grouped under an epic.
ALTER TABLE "Bug" ADD COLUMN "isEpic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Bug" ADD COLUMN "parentId" TEXT;

CREATE INDEX "Bug_parentId_idx" ON "Bug"("parentId");

ALTER TABLE "Bug" ADD CONSTRAINT "Bug_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Bug"("id") ON DELETE SET NULL ON UPDATE CASCADE;
