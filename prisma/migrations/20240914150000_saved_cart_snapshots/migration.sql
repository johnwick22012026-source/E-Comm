-- Create enums backing saved cart restore tracking
CREATE TYPE "SavedCartRestoreStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');
CREATE TYPE "SavedCartItemRestoreStatus" AS ENUM ('PENDING', 'RESTORED', 'FAILED');

-- Saved cart snapshots tied to a user for audit and restore support
CREATE TABLE "SavedCartSnapshot" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "name" TEXT,
    "metadata" JSONB,
    "restoreStatus" "SavedCartRestoreStatus" NOT NULL DEFAULT 'PENDING',
    "restoreRequestedAt" TIMESTAMPTZ,
    "restoredAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "SavedCartSnapshot_userId_idx" ON "SavedCartSnapshot" ("userId");
CREATE INDEX "SavedCartSnapshot_userId_createdAt_idx" ON "SavedCartSnapshot" ("userId", "createdAt");
CREATE INDEX "SavedCartSnapshot_userId_restoreStatus_createdAt_idx" ON "SavedCartSnapshot" ("userId", "restoreStatus", "createdAt");

-- Saved cart items linked to snapshots with metadata for restore operations and constraints
CREATE TABLE "SavedCartItem" (
    "id" SERIAL PRIMARY KEY,
    "snapshotId" INTEGER NOT NULL REFERENCES "SavedCartSnapshot"("id") ON DELETE CASCADE,
    "productId" INTEGER NOT NULL REFERENCES "Product"("id") ON DELETE RESTRICT,
    "productSku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" NUMERIC(18, 6),
    "restoreStatus" "SavedCartItemRestoreStatus" NOT NULL DEFAULT 'PENDING',
    "restoredQuantity" INTEGER,
    "restoreMessage" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "SavedCartItem_snapshot_product_unique" UNIQUE ("snapshotId", "productId"),
    CONSTRAINT "SavedCartItem_quantity_positive" CHECK ("quantity" > 0)
);

CREATE INDEX "SavedCartItem_snapshotId_idx" ON "SavedCartItem" ("snapshotId");
CREATE INDEX "SavedCartItem_productId_idx" ON "SavedCartItem" ("productId");
CREATE INDEX "SavedCartItem_snapshot_restoreStatus_idx" ON "SavedCartItem" ("snapshotId", "restoreStatus");
