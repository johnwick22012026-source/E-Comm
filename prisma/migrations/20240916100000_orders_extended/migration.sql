-- Create the missing order-related tables required by Prisma schema relations
CREATE TABLE "OrderLineItem" (
    "id" SERIAL PRIMARY KEY,
    "orderId" INTEGER NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "productId" INTEGER REFERENCES "Product"("id"),
    "productSku" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" NUMERIC NOT NULL,
    "totalPrice" NUMERIC NOT NULL,
    "currency" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "OrderLineItem_orderId_idx" ON "OrderLineItem" ("orderId");
CREATE INDEX "OrderLineItem_productId_idx" ON "OrderLineItem" ("productId");

CREATE TABLE "Shipment" (
    "id" SERIAL PRIMARY KEY,
    "orderId" INTEGER NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "carrier" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "status" TEXT NOT NULL,
    "shippedAt" TIMESTAMPTZ,
    "estimatedDeliveryAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "Shipment_orderId_idx" ON "Shipment" ("orderId");

CREATE TABLE "Invoice" (
    "id" SERIAL PRIMARY KEY,
    "orderId" INTEGER NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
    "invoiceNumber" TEXT NOT NULL UNIQUE,
    "issuedAt" TIMESTAMPTZ NOT NULL,
    "dueAt" TIMESTAMPTZ,
    "paidAt" TIMESTAMPTZ,
    "amount" NUMERIC NOT NULL,
    "currency" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "Invoice_orderId_idx" ON "Invoice" ("orderId");
