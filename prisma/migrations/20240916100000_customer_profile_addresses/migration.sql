-- Create CustomerProfile table for extended user data
CREATE TABLE "CustomerProfile" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "dateOfBirth" DATE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "CustomerProfile_userId_idx" ON "CustomerProfile" ("userId");

-- Create Address table with one-to-many relation to CustomerProfile
CREATE TABLE "Address" (
    "id" SERIAL PRIMARY KEY,
    "profileId" INTEGER NOT NULL REFERENCES "CustomerProfile"("id") ON DELETE CASCADE,
    "label" TEXT,
    "fullName" TEXT NOT NULL,
    "company" TEXT,
    "streetLine1" TEXT NOT NULL,
    "streetLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "Address_profileId_idx" ON "Address" ("profileId");

-- Create enum for communication channels
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH');

-- Create CommunicationPreference table for opt-in/opt-out settings
CREATE TABLE "CommunicationPreference" (
    "id" SERIAL PRIMARY KEY,
    "profileId" INTEGER NOT NULL REFERENCES "CustomerProfile"("id") ON DELETE CASCADE,
    "channel" "CommunicationChannel" NOT NULL,
    "preference" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "CommunicationPreference_profile_channel_pref_unique"
      UNIQUE ("profileId", "channel", "preference")
);
CREATE INDEX "CommunicationPreference_profileId_idx" ON "CommunicationPreference" ("profileId");

-- Rollback by dropping tables and enum
-- DROP TABLE "CommunicationPreference";
-- DROP TABLE "Address";
-- DROP TABLE "CustomerProfile";
-- DROP TYPE "CommunicationChannel";
