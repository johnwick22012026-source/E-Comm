-- Add non-negative stock constraints to Product and ProductInventoryLevel for reliable inventory checks
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_non_negative_quantities"
  CHECK (
    "stockQuantity" >= 0 AND
    "availableQuantity" >= 0 AND
    "reservedQuantity" >= 0
  );

ALTER TABLE "ProductInventoryLevel"
  ADD CONSTRAINT "ProductInventoryLevel_non_negative_quantities"
  CHECK (
    "quantityOnHand" >= 0 AND
    "quantityReserved" >= 0 AND
    "quantityAvailable" >= 0
  );
