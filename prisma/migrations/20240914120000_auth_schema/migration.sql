-- 1. Create Users table with required fields
CREATE TABLE "User" (
    "id" SERIAL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
    "emailVerifiedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create EmailVerificationToken table with single-use, expiration, and lookup support
CREATE TABLE "EmailVerificationToken" (
    "id" SERIAL PRIMARY KEY,
    "token" TEXT NOT NULL UNIQUE,
    "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "usedAt" TIMESTAMPTZ
);
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken" ("userId");

-- 3. Create Session table to store session tokens and expiration state per user
CREATE TABLE "Session" (
    "id" SERIAL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL UNIQUE,
    "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "active" BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX "Session_userId_idx" ON "Session" ("userId");
