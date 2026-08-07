# Prisma schema & migration validation notes

## Summary

The baseline validation checked the following:

- `prisma/schema.prisma` defines the full relational model backing `User`, `Order`, `Product`, the promotional entities, and reporting models for the materialized views.
- `prisma/migrations/20240914130000_password_reset_schema/migration.sql` creates the `PasswordResetToken` table along with supporting indexes.
- `prisma/migrations/20240917120000_reporting_aggregation/migration.sql` creates the reporting materialized views (`daily_sales_summary`, `daily_customer_growth`, `daily_product_sales`) and the `current_inventory_levels` view with indexes.

No immediate Prisma schema syntax errors were detected, but the reporting migration depends on base tables (for example, `"Order"`, `"Payment"`, `"OrderLineItem"`, `"Product"`) that must exist before applying the reporting migration. Concrete validation tasks for the next iteration:

1. Run `prisma migrate status` or a dry-run to ensure all prior migrations have been applied before the reporting migration. If the baseline run fails, identify the earliest missing table migration and ensure it runs first.
2. Double-check that the SQL tables referenced in the reporting views (`OrderLineItem`, `Product`, etc.) have corresponding Prisma models in `schema.prisma`. If any are missing, add them along with their relations/indexes and create the minimal migration to bring the schema into sync.
3. Keep the reporting migration as a pure SQL migration so that the views/indexes are managed explicitly rather than through Prisma schema inference.

## Next steps

- Validate the migration order to ensure the reporting migration runs after the tables it depends on.
- If any referenced tables are not surfaced in `schema.prisma`, add the missing models and capture the change in a new Prisma migration.
- Re-run the Prisma validation commands (`prisma migrate status`, `prisma db push --preview-feature`) to confirm compatibility before unblocking the build.