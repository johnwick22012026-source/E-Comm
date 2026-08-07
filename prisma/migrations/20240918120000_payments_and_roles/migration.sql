-- 1. Ensure payment method type exists so saved preferences and attempts can reference it
CREATE TYPE IF NOT EXISTS "PaymentMethod" AS ENUM ('CARD', 'BANK_TRANSFER', 'UPI', 'WALLET');

-- 2. Introduce statuses for payment attempts
CREATE TYPE IF NOT EXISTS "PaymentAttemptStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED');

-- 3. Track user role so reporting can filter customers and admin checks remain accurate
ALTER TABLE "User"
  ADD COLUMN "role" TEXT NOT NULL DEFAULT 'CUSTOMER';

-- 4. Store the state of payment attempts for idempotent captures and authorization flows
CREATE TABLE "PaymentAttempt" (
    "id" SERIAL PRIMARY KEY,
    "selectedPaymentMethod" "PaymentMethod" NOT NULL,
    "cartId" INTEGER REFERENCES "Cart"("id") ON DELETE SET NULL,
    "userId" INTEGER REFERENCES "User"("id") ON DELETE SET NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" NUMERIC NOT NULL,
    "metadata" JSONB,
    "failureReason" TEXT,
    "providerReference" TEXT,
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "PaymentAttempt_idempotencyKey_key" ON "PaymentAttempt" ("idempotencyKey");
CREATE INDEX "PaymentAttempt_cartId_idx" ON "PaymentAttempt" ("cartId");
CREATE INDEX "PaymentAttempt_userId_idx" ON "PaymentAttempt" ("userId");
