CREATE TABLE "Finding" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL,
  "rootCause" TEXT NOT NULL,
  "remediationSummary" TEXT NOT NULL,
  "modifiedFiles" TEXT[] NOT NULL DEFAULT '{}'::text[],
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "Finding_status_idx" ON "Finding" ("status");
CREATE INDEX "Finding_created_at_idx" ON "Finding" ("createdAt");
