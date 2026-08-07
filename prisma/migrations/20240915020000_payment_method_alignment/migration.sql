-- Align the PaymentMethod enum and the PaymentAttempt column names with backend expectations
ALTER TABLE "PaymentAttempt"
  RENAME COLUMN "method" TO "selectedPaymentMethod";

ALTER TYPE "PaymentMethod"
  RENAME VALUE 'NET_BANKING' TO 'BANK_TRANSFER';
