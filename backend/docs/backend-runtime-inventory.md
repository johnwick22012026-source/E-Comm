# Backend Runtime Entry Point Inventory

This document outlines the high-level NestJS backend modules, controllers, and services that support customer and admin request flows, along with shared infrastructure such as guards, pipes, and Prisma-powered persistence.

## Bootstrap & Shared Infrastructure
- `backend/src/main.ts` (not shown) initializes the Nest application and configures global pipes/interceptors as required.
- `backend/src/app.module.ts` aggregates domain modules so that application-wide concerns like Prisma and notification delivery are available to every feature module.
- `backend/src/prisma/prisma.module.ts`/`.../prisma.service.ts` export a shared Prisma client that services use to interact with the database, manage transactions, and apply any tenancy considerations.

## Auth Module (`auth/*`)
- `AuthController` exposes actions such as `/auth/register`, `/auth/verify-email`, `/auth/login`, and `/auth/logout` that route incoming HTTP requests into the authentication domain.
- Incoming requests reach `AuthService`, which coordinates Prisma writes (users, verification tokens), delegates notification work (e.g., verification emails), and leverages the configured `JwtModule` (secret/expiration supplied through `ConfigService`) to issue tokens.
- Login/logout flows manipulate JWT cookies via dedicated helpers like `attachCookie` and `clearCookie`, with guards such as `JwtAuthGuard` eventually validating the token before protected requests proceed.
- Password reset endpoints follow a similar chain: controller → `AuthService` → Prisma → notification logging through services such as `NotificationEventLogService`.

## Catalog Module (`catalog/*`)
- `CatalogController` handles public routes like `GET /catalog`, reading catalog data from `CatalogService`, which queries products, categories, pricing, and inventory projections through Prisma.
- These endpoints are typically open to unauthenticated clients, reflecting customer-facing catalog browsing.

## Cart Module (`cart/*`)
- Controllers such as `CartController` and related pricing controllers expose item-level modifications (`/cart/items/:id`) and cart summary data.
- Controllers apply route-level guards (e.g., `JwtAuthGuard`) to ensure only authenticated users access cart operations; once authenticated, the guard provides the resolved user context to downstream services.
- Controllers rely on services (`CartService`, `CartPricingService`) to interact with cart tables, line items, and pricing aggregates via `PrismaService`.
- DTOs describe expected payload shapes, and controllers typically configure `ValidationPipe` instances (e.g., enabling whitelisting) so requests are validated before reaching the service layer.

## Checkout Module (`checkout/*`)
- `CheckoutController` manages flows under `/checkout/sessions`, with the routes wrapped by guards such as `JwtAuthGuard` to restrict access to logged-in users building a checkout.
- Controller methods use DTOs (e.g., `CreateCheckoutSessionDto`, `CustomerDetailsDto`) and `ValidationPipe` configurations (such as forbidding non-whitelisted properties) to validate incoming data at the controller boundary.
- Business logic is delegated to `CheckoutService`, which persists session records, customer/shipping data, shipping method selections, and review payloads through Prisma-accessed tables like `CheckoutSession`, `Cart`, and `Shipment`.
- The checkout domain imports the cart module to reuse pricing and cart state logic where appropriate.

## Customer Profile Module (`customer-profile/*`)
- `CustomerProfileController` exposes profile, address, and preference update routes, typically guarded so that only authenticated users can modify their own data.
- `CustomerProfileService` executes updates against related tables (`CustomerProfile`, `User`, `Address`, preference tables) using Prisma, often reacting to auth or notification needs triggered by sensitive changes.
- Auth integration ensures necessary side effects such as token refreshes or notification dispatches occur when profile data is updated.

## Notifications Module (`notifications/*`)
- This module does not expose public HTTP endpoints; instead, its services are injected where notifications or logging are required.
- `NotificationService` offers helpers to send emails or push event notifications, relying on providers like `LoggingEmailProvider` and `NotificationEventLogService` to capture audit records.
- `NotificationEventLogService` writes notification history via Prisma, enabling observability of async side effects such as verification and order alerts.
- Auth and other modules inject these services to publish verification, order, or cart-related notifications as part of their flows.

## Orders Module (`orders/*`)
- `OrdersController` exposes both public (`POST /orders/from-payment`) and authenticated routes (`GET /orders`, `GET /orders/:id` guarded by `JwtAuthGuard`).
- The creation endpoint consumes an `idempotency-key` header to guard against double creation and delegates to `OrdersService`, which manages transactional coordination between payment, order, and shipment persistence via Prisma.
- List and detail routes resolve the authenticated user context (e.g., `request.user?.id`) and apply pagination/filters validated through controller-level pipes before fetching customer-specific order data.

## Payments Module (`payments/*`)
- `PaymentsController` exposes guarded endpoints like `POST /payments/authorizations`, where DTOs outline the required request payloads and validation is enforced before delegating to services.
- After extracting the authenticated user identifier, the controller invokes `PaymentsService.authorize`, which interfaces with payment providers, manages tokenized instruments, and records authorization attempts in Prisma.
- The service may also emit notification events or audit logs via injected notification services to reflect approval or denial outcomes.

## Admin Modules (`admin/catalog/*`, `admin/promotions/*`)
- Admin controllers (not shown) are secured via role-specific guards such as `AdminGuard`, ensuring only appropriately privileged users reach catalog or promotion management endpoints.
- Related services enforce business rules while manipulating catalog and promotion structures in the database, potentially invoking notification/event logging for large-scale changes.

## Reporting Module (`reporting/*`)
- Reporting routes (e.g., `GET /reporting/*`) aggregate data through Prisma-powered queries, which may leverage read-optimized tables or views dedicated to analytics.
- Access to these endpoints is typically restricted via guards, API keys, or other authorization measures to prevent exposure of sensitive aggregates.
- Reporting services often consume data generated by background jobs (e.g., nightly revenue builds) that use Prisma transactions to maintain consistency.

## Cross-cutting Concerns
- **Guards**: `JwtAuthGuard` and role-based guards such as `AdminGuard` validate tokens/roles before controller handlers run, ensuring authenticated and authorized requests reach the service layer.
- **Validation Pipes**: Controllers apply `ValidationPipe` instances to transform and validate incoming requests (e.g., whitelisting, forbidding unknown properties) before DTOs reach services.
- **PrismaService**: Most services inject `PrismaService` to centralize database connectivity, transaction helpers, and any tenant-specific logic.
- **Notification Logging**: Services like `NotificationEventLogService` and `LoggingEmailProvider` persist notification metadata when other modules trigger emails or push events, supporting observability of async side effects.
- **Payment Background Flows**: `PaymentsService` may also handle retries, webhooks, or asynchronous authorizations, ensuring idempotency through request headers and persisted records.

This inventory illustrates how HTTP requests travel from controllers into services backed by Prisma, with guards and validation pipes enforcing security and data integrity while notification and payment helpers manage side effects.