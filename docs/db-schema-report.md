# Database Schema & Migration Dependency Report

This document summarizes the Prisma schema definitions, migration history, and the backend areas that depend on specific schema elements or migration artifacts. It is intended to guide future schema changes by clarifying which NestJS services and flows require coordinated updates.

## 1. Prisma Schema Overview

The descriptions below reflect the entities, enums, and read-only views defined in the current Prisma schema. Altering their structure has downstream impacts on the services and data flows that rely on them.

### Core Auth/Session Entities
- `User`: Serves as the central identity table with required fields for email/password hash, verification state, timestamps, and relations to sessions, carts, orders, payment preferences, and verification/reset tokens. Any column changes affect auth controllers, password reset/email verification flows, and services referencing user relations.
- `Session`: Tracks session tokens per user, including expiration and active flags. The auth module and middleware rely on `sessionToken` lookups for login persistence.
- `EmailVerificationToken` & `PasswordResetToken`: Single-use, time-limited tokens referenced by the auth/password-reset services. Schema changes here require updates to those flows and any cleanup jobs keyed by expiration indexes.

### Shopping Flow Entities
- `Cart`: Stores free-form `items` payloads, optional user linkage, and metadata. Checkout and cart services read/write this table when assembling orders or persisting quick cart states.
- `Order`, `OrderLineItem`, `Shipment`, `Invoice`: Manage the order lifecycle and are consumed by checkout, order history, and reporting modules. Fields such as `Order.status`, `paymentReference`, and `paymentConfirmedAt` propagate throughout payment orchestration.
- `Payment`: Persists gateway/reference data plus `metadata`. The payments module enforces status transitions defined by the `PaymentStatus` enum.

### Catalog & Inventory
- `Category`, `Product`, `ProductImage`: Catalog services query these entities for storefront data. Inventory constraints (`stockQuantity`, `availableQuantity`, `isAvailable`) are relied upon by cart/checkout availability checks.

### Coupons & Promotions
- `Promotion`, `Coupon`, `PromotionTarget`: Used by promotions and checkout services when applying discounts, relying on status flags, date ranges, and enum-backed discount types defined in the schema.

### Customer Profile & Preferences
- `SavedPaymentPreference`: Stores tokenized payment methods and enforces uniqueness per user for default/active preferences. Payment flows depend on these constraints to prevent conflicting defaults.
- Customer profile, address, and communication preference tables are consumed by the customer-profile services. Schema changes here require mirroring in DTOs and validators.

### Reporting Views
- Reporting models such as `DailySalesSummary`, `DailyCustomerGrowth`, `DailyProductSales`, and `CurrentInventoryLevels` are annotated with `@@ignore` because they map to materialized views and are read-only. Reporting controllers query these views under the assumption that their data is refreshed by external processes.

## 2. Migration Changes Affecting Integration Boundaries

Each recorded migration in the Prisma folder represents a schema change that downstream services may depend on. While the report does not enumerate every migration file, the following general guidance applies:

1. Auth-related migrations introduce or adjust `User`, `Session`, or token tables. When these tables or their columns change, ensure the auth module, middleware, and password reset flows are updated, and regenerate the Prisma client.
2. Shopping flow migrations affect `Cart`, `Order`, `Payment`, and related entities. Coordinated updates between the checkout orchestration layer, payment adapters, and saved-state services are required when constraints, enums, or relations are modified.
3. Inventory/catalog migrations influence `Product`, `Category`, `ProductImage`, and related constraint definitions. Admin and storefront catalog modules must stay aligned with those changes to avoid inconsistent product data.
4. Customer profile migrations impact the `CustomerProfile`, `Address`, and `CommunicationPreference` models. Profile management APIs must reflect any new fields, indexes, or enums introduced in those migrations.
5. Reporting-related migrations create or update read-only views (`daily_sales_summary`, `daily_customer_growth`, `daily_product_sales`, `current_inventory_levels`). Services that consume these views must be aware of any view definition changes and the external refresh strategy.
6. Saved-state migrations (saved carts, payment preferences, idempotency tracking) define lifecycle states and unique constraints. Checkout/payment flows depending on saved data must respect any new constraints to avoid exposing inconsistent states.

## 3. Backend Integration Points

- **Auth module** (`backend/src/auth/*`): Reads/writes `User`, `Session`, `EmailVerificationToken`, and `PasswordResetToken`. Schema changes require Prisma client regeneration and service updates.
- **Checkout/Payments** (`backend/src/checkout`, `backend/src/payments`): Depend on `Cart`, `Order`, `Payment`, `SavedPaymentPreference`, `PaymentAttempt`, and related enums (`OrderStatus`, `PaymentStatus`, `PaymentMethod`). Updates must be synchronized with checkout orchestration, payment gateway adapters, and saved-payment preference controllers.
- **Customer Profile** (`backend/src/customer-profile`): Consumes `CustomerProfile`, `Address`, `CommunicationPreference`. DTOs/validators must align with schema migrations affecting these tables.
- **Catalog/Admin Catalog** (`backend/src/catalog`, `backend/src/admin/catalog`): Depend on `Product`, `Category`, `ProductImage`, and inventory constraints. Schema changes must keep admin catalog updates and public listings in sync.
- **Notifications & Reporting** (`backend/src/notifications`, `backend/src/reporting`): Notifications insert into `NotificationEventLog`, while reporting reads from materialized views noted above.
- **Shared Prisma Service** (`backend/src/prisma`): Provides the Prisma client globally. Regenerating the Prisma client is mandatory after schema changes to keep TypeScript types in sync.

## 4. Persistence Configuration & Operational Notes

- **Prisma Client Generation**: After any schema changes or migration additions, rerun `npx prisma generate` so the Prisma client matches the updated schema.
- **Migrations**: Follow the recorded migration order in `prisma/migrations/`. Maintain alignment between the SQL/content of migrations and the Prisma schema to avoid drift.
- **Enums**: Enums such as `OrderStatus`, `PaymentStatus`, `PaymentMethod`, and `CouponDiscountType` are referenced across services. Adding or removing enum values must be accompanied by validation updates in backend and downstream clients.
- **Reporting Views**: Models using `@@ignore` rely on external definitions (`CREATE VIEW`, materialized view refresh scripts). Keep the migration SQL that defines and refreshes these views consistent with the Prisma model mappings (`@@map`, `@@ignore`).
- **Operational Assumptions**: Materialized views (`daily_sales_summary`, `daily_customer_growth`, `daily_product_sales`) and `current_inventory_levels` are refreshed outside the application lifecycle. Any schema or migration change affecting these views should document the refresh cadence or automation required.

## 5. Recommendations for Future Changes

1. When adding new tables or fields, update the Prisma schema, add the appropriate migration SQL/DDL, regenerate the Prisma client, and document which services require DTO or validation updates.
2. For enum or constraint changes, coordinate backend validation logic updates (checkout/payment services), and align any front-end contexts that rely on enum values.
3. Keep reporting view definitions synchronized between raw SQL migrations and Prisma’s `@@map`/`@@ignore` directives to avoid mismatches.
4. Coordinate saved data features (saved carts, payment preferences) with feature toggles or seeds to prevent inconsistent states during rollouts.

Review this report whenever schema migrations touch the covered areas to ensure all dependent services remain aligned with the persisted data model.