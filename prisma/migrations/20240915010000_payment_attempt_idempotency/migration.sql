-- Add payment method enum and idempotency support for PaymentAttempt
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'UPI', 'NET_BANKING', 'WALLET');

ALTER TABLE "PaymentAttempt"
  ADD COLUMN "idempotencyKey" TEXT UNIQUE;

ALTER TABLE "PaymentAttempt"
  ADD COLUMN "amount" NUMERIC;

ALTER TABLE "PaymentAttempt"
  ADD COLUMN "currency" TEXT;

ALTER TABLE "PaymentAttempt"
  ADD COLUMN "method" "PaymentMethod";

ALTER TABLE "PaymentAttempt"
  ADD COLUMN "metadata" JSONB;

CREATE INDEX "PaymentAttempt_idempotencyKey_idx" ON "PaymentAttempt" ("idempotencyKey");
