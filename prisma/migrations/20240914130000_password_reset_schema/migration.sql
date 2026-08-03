-- Create a table to store secure, hashed password reset tokens
-- Includes audit metadata for usage and attempt tracking
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL PRIMARY KEY,
    "tokenHash" TEXT NOT NULL UNIQUE,
    "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "expiresAt" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "usedAt" TIMESTAMP,
    "attemptedAt" TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0
);

-- Indexes to support efficient lookups by user and cleanup queries
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken" ("userId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken" ("expiresAt");
CREATE INDEX "PasswordResetToken_usedAt_idx" ON "PasswordResetToken" ("usedAt");

-- The above migration is reversible via DROP TABLE "PasswordResetToken";
