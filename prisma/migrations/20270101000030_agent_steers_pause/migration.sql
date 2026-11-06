-- #236: owner pause state and durable human-to-agent steer notes.
ALTER TABLE "Agent" ADD COLUMN "pausedAt" TIMESTAMP(3);

CREATE TABLE "AgentSteerNote" (
  "id" TEXT NOT NULL,
  "bugId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "plan" TEXT,
  "heartbeatCount" INTEGER NOT NULL DEFAULT 0,
  "acknowledgedAt" TIMESTAMP(3),
  "notifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentSteerNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AgentSteerNote_agentId_acknowledgedAt_createdAt_idx" ON "AgentSteerNote"("agentId", "acknowledgedAt", "createdAt");
CREATE INDEX "AgentSteerNote_bugId_createdAt_idx" ON "AgentSteerNote"("bugId", "createdAt");
ALTER TABLE "AgentSteerNote" ADD CONSTRAINT "AgentSteerNote_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentSteerNote" ADD CONSTRAINT "AgentSteerNote_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentSteerNote" ADD CONSTRAINT "AgentSteerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
