# Database Schema & Migration Inventory

This document summarizes the current Prisma schema along with the migration history that establishes the persistence backing for the data-heavy flows described by the backend: authentication, password reset, product stock checks/inventory, saved cart snapshots, payment idempotency/billing, customer profiles & addresses, saved payment preferences, and reporting aggregations.

> **Note:** Prisma’s declarative schema captures supported models, relations, enums, and other structural definitions. Some runtime constraints described below—such as partial unique indexes, complex check constraints, or backend-specific view materializations—are implemented via raw SQL in migrations rather than being defined directly in `schema.prisma`. Wherever such constraints exist, we reference the migration that introduces them so maintainers understand how Prisma remains aligned with the underlying database artifacts.

---

## Persisted Domains & Source Migrations

| Domain | Current Prisma Model(s) | Migration introducing schema | Key runtime constraints/indices |
| --- | --- | --- | --- |
| **Authentication & Session State** | `User`, `Session`, `EmailVerificationToken` | `20240914120000_auth_schema` | `User.email` unique; `Session.sessionToken` unique; `EmailVerificationToken.token` unique; `Session`/`EmailVerificationToken` foreign keys cascade on user; indexes on `userId` for lookups |
| **Password Reset Flow** | `PasswordResetToken` | `20240914130000_password_reset_schema` | `tokenHash` unique; indexes on `userId`, `expiresAt`, `usedAt` for lookup/cleanup; attempts metadata tracked for rate-limiting/idempotency (enforced via migration SQL). |
| **Product Inventory & Stock Checks** | `Product` (and materialized views that rely on inventory) | `20240914140000_product_stock_checks` | Non-negative constraints on inventory fields (`stockQuantity`, `availableQuantity`, `reservedQuantity`) enforce runtime invariants used by cart/checkout stock checks (implemented via database check constraints in the migration). |
| **Saved Cart Snapshots & Restore** | `SavedCartSnapshot`, `SavedCartItem` (with enums) | `20240914150000_saved_cart_snapshots` | Restore status enums; unique constraint on `(snapshotId, productId)`; positive quantity check; indexes covering status and created-at for asynchronous restore polling (indexes/constraints created in SQL migration steps). |
| **Payment Idempotency & Methods** | `PaymentAttempt` (extended via enum `PaymentMethod`) | `20240915010000_payment_attempt_idempotency` | `PaymentAttempt.idempotencyKey` unique + indexed to avoid duplicate charges; metadata and method stored for reconciliation; idempotency enforcement occurs at the DB layer via the migration-defined unique index. |
| **Customer Profiles, Addresses & Preferences** | `CustomerProfile`, `Address`, `CommunicationPreference` | `20240916100000_customer_profile_addresses` | Unique profile per user; cascade relation from address/preferences ensures cleanup; composite unique constraint to prevent duplicate preferences (constraint defined in migration SQL). |
| **Saved Payment Preferences** | `SavedPaymentPreference`, `PaymentMethod` enum | `20240916160000_saved_payment_preferences` | Enum `SavedPaymentPreferenceState`; `gatewayToken` & `isDefault` unique indexes with `WHERE` clauses ensure single active token and default preference per user; indexes on `(userId, isDefault, state)` and `userId` (partial indexes defined in the migration’s SQL statements). |

## Schema Dependencies Relevant to Backend Flows

1. **Authentication** depends on the `User` table for identity, with `Session` and `EmailVerificationToken` tables referencing `User.id` (cascade delete) and used by NestJS auth guards for token lookup/expiration.
2. **Password Reset** uses `PasswordResetToken` tied to `User` plus indexed timestamp fields to determine expiry and usage — these indexes back cleanup jobs and rate-limiting logic. While Prisma defines the model, some cleanup indexes/checks are enforced via migration SQL.
3. **Cart & Checkout** rely on product inventory fields (`stockQuantity`, `availableQuantity`, `reservedQuantity`) and their non-negativity constraints for runtime stock validation and for snapshot creation via `SavedCartSnapshot`. The negative-value checks are implemented as migration-level constraints.
4. **Order & Payment** chains rely on `Order` → `Payment` relations along with the `PaymentAttempt` table’s idempotency key to guard against duplicate charging; unique index on `PaymentAttempt.idempotencyKey` enforces single write per key (defined inside the migration). 
5. **Customer Profile** extends `User` data and supplies `Address` & `CommunicationPreference` records, with cascade deletes and unique preference constraints keeping opt-in/out settings consistent (constraints declared in migrations when Prisma cannot express partial/conditional uniqueness). 
6. **Saved Payment Preferences** reuse the `PaymentMethod` enum and enforce single active/default `SavedPaymentPreference` per user via partial unique indexes; the indexes are expressed directly in the referenced migration SQL so Prisma doesn’t attempt to repeat them in `schema.prisma`. 
7. **Reporting Aggregates** (e.g., `DailySalesSummary`, `DailyCustomerGrowth`, `DailyProductSales`, `CurrentInventoryLevels`) are defined as Prisma models mapped to materialized views; they are marked `@@ignore` in Prisma DSL but depend on the transactional tables for ETL jobs.

## Current Schema vs Historical Milestones

- The **Prisma schema** (see `schema.prisma`) reflects the union of all persisted domains, capturing current relations, enums, and aggregate view mappings used by the backend.
- Each **migration** above represents a historical step that introduced a domain’s database artifacts; none of the migrations were deleted, preserving the tree of changes for audit.
- Runtime enforcement (non-negative inventory, unique tokens, partial unique indexes) is achieved through constraints added during migrations, not through application-only checks. Detailed SQL snippets in those migrations preserve the additional guarantees that Prisma can’t declare directly in the schema DSL.

## Runtime Constraints & Idempotency Highlights

- **Token uniqueness & foreign keys** (auth, password reset, saved payment preferences) enforce single-use semantics and cascade cleanups tied to the owning `User`.
- **Inventory constraints** prevent negative counts at the database level, ensuring stock checks do not rely solely on application validation. These constraints are defined during SQL migrations where Prisma doesn’t have DSL support for them.
- **Payment idempotency** is guaranteed by the `PaymentAttempt.idempotencyKey` column plus unique index — repeated attempts with the same key are blocked outright at the DB layer thanks to the migration-created index.
- **Saved payment preference lifecycle** uses both state enum and `WHERE` based unique indexes to ensure only one preference per customer is `ACTIVE` or default, protecting payment flows from ambiguous references; those partial unique indexes only exist in the raw migration SQL.

This inventory should guide maintainers in understanding which tables support which flows and how historical migrations introduced the constraints they rely on.