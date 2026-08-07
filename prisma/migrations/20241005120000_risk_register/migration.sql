-- Create risk register tracking table and supporting types

CREATE TYPE "RiskSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');
CREATE TYPE "RiskImpact" AS ENUM ('CATASTROPHIC', 'MAJOR', 'MODERATE', 'MINOR', 'NEGLIGIBLE');
CREATE TYPE "RiskLikelihood" AS ENUM ('CERTAIN', 'LIKELY', 'POSSIBLE', 'UNLIKELY', 'RARE');
CREATE TYPE "RiskStatus" AS ENUM ('CONFIRMED', 'SUSPECTED');

CREATE TABLE "RiskRegisterItem" (
  "id" SERIAL PRIMARY KEY,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "severity" "RiskSeverity" NOT NULL,
  "impact" "RiskImpact" NOT NULL,
  "likelihood" "RiskLikelihood" NOT NULL,
  "status" "RiskStatus" NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "riskScore" NUMERIC(14,4) NOT NULL DEFAULT 0,
  "sourceContext" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

CREATE INDEX idx_risk_register_status ON "RiskRegisterItem"("status");
CREATE INDEX idx_risk_register_priority ON "RiskRegisterItem"("priority" DESC);
CREATE INDEX idx_risk_register_risk_score ON "RiskRegisterItem"("riskScore" DESC);
