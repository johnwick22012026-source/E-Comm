-- Add fields for storing validation/evidence and residual risk notes
ALTER TABLE "RiskRegisterItem"
  ADD COLUMN "verificationEvidence" JSONB,
  ADD COLUMN "validationOutcome" TEXT,
  ADD COLUMN "finalStatus" TEXT,
  ADD COLUMN "residualRiskNotes" TEXT;
