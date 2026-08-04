-- Create enum to track saved payment preference lifecycle
CREATE TYPE "SavedPaymentPreferenceState" AS ENUM ('ACTIVE', 'REVOKED', 'DELETED');

-- Store tokenized payment references without persisting sensitive card/ACH data
CREATE TABLE "SavedPaymentPreference" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "gatewayToken" TEXT NOT NULL,
    "maskedDisplay" TEXT NOT NULL,
    "brand" TEXT,
    "method" "PaymentMethod",
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "billingNickname" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
    "state" "SavedPaymentPreferenceState" NOT NULL DEFAULT 'ACTIVE',
    "revokedAt" TIMESTAMPTZ,
    "deletedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes to support lookups and defaults per customer
CREATE INDEX "SavedPaymentPreference_userId_idx" ON "SavedPaymentPreference" ("userId");
CREATE INDEX "SavedPaymentPreference_userId_isDefault_state_idx" ON "SavedPaymentPreference" ("userId", "isDefault", "state");

-- Enforce a single active token per customer and a single active default preference
CREATE UNIQUE INDEX "SavedPaymentPreference_user_gateway_active_uk" ON "SavedPaymentPreference" ("userId", "gatewayToken") WHERE "state" = 'ACTIVE';
CREATE UNIQUE INDEX "SavedPaymentPreference_user_default_active_uk" ON "SavedPaymentPreference" ("userId") WHERE "isDefault" AND "state" = 'ACTIVE';
