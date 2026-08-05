-- Create reporting materialized views and supporting indexes for dashboards

-- Daily sales summary: revenue and order count per day
DROP MATERIALIZED VIEW IF EXISTS daily_sales_summary;
CREATE MATERIALIZED VIEW daily_sales_summary AS
SELECT
  DATE(o."createdAt") AS date,
  SUM(p.amount) AS total_revenue,
  COUNT(*) AS order_count
FROM "Order" o
JOIN "Payment" p ON p."orderId" = o.id
WHERE o.status IN ('CONFIRMED', 'SHIPPED', 'FULFILLED')
GROUP BY DATE(o."createdAt")
WITH NO DATA;
CREATE INDEX idx_daily_sales_summary_date ON daily_sales_summary(date);

-- Daily customer growth: new user signups per day
DROP MATERIALIZED VIEW IF EXISTS daily_customer_growth;
CREATE MATERIALIZED VIEW daily_customer_growth AS
SELECT
  DATE(u."createdAt") AS date,
  COUNT(*) AS new_customers
FROM "User" u
GROUP BY DATE(u."createdAt")
WITH NO DATA;
CREATE INDEX idx_daily_customer_growth_date ON daily_customer_growth(date);

-- Daily product sales: quantity and revenue per product per day
DROP MATERIALIZED VIEW IF EXISTS daily_product_sales;
CREATE MATERIALIZED VIEW daily_product_sales AS
SELECT
  DATE(o."createdAt") AS date,
  li."productId" AS product_id,
  pr.name AS product_name,
  SUM(li.quantity) AS quantity_sold,
  SUM(li."totalPrice") AS revenue
FROM "Order" o
JOIN "OrderLineItem" li ON li."orderId" = o.id
JOIN "Product" pr ON pr.id = li."productId"
WHERE o.status IN ('CONFIRMED', 'SHIPPED', 'FULFILLED')
GROUP BY DATE(o."createdAt"), li."productId", pr.name;
CREATE INDEX idx_daily_product_sales_date ON daily_product_sales(date);
CREATE INDEX idx_daily_product_sales_product ON daily_product_sales(product_id);

-- Current inventory levels view for dashboard lookup
DROP VIEW IF EXISTS current_inventory_levels;
CREATE VIEW current_inventory_levels AS
SELECT
  id AS product_id,
  "stockQuantity" AS stock_quantity,
  "availableQuantity" AS available_quantity,
  "reservedQuantity" AS reserved_quantity,
  "updatedAt" AS as_of
FROM "Product";
CREATE INDEX idx_current_inventory_levels_product_id ON current_inventory_levels(product_id);

-- Refresh functions (optional scheduling outside of migration)
