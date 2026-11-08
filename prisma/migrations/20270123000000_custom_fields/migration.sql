-- #custom-fields: project-defined fields on issues, with one value per issue.
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomField_projectId_name_key" ON "CustomField"("projectId", "name");
CREATE INDEX "CustomField_projectId_idx" ON "CustomField"("projectId");

ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "IssueCustomFieldValue" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "bugId" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IssueCustomFieldValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IssueCustomFieldValue_fieldId_bugId_key" ON "IssueCustomFieldValue"("fieldId", "bugId");
CREATE INDEX "IssueCustomFieldValue_bugId_idx" ON "IssueCustomFieldValue"("bugId");

ALTER TABLE "IssueCustomFieldValue" ADD CONSTRAINT "IssueCustomFieldValue_fieldId_fkey"
FOREIGN KEY ("fieldId") REFERENCES "CustomField"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "IssueCustomFieldValue" ADD CONSTRAINT "IssueCustomFieldValue_bugId_fkey"
FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE CASCADE ON UPDATE CASCADE;
