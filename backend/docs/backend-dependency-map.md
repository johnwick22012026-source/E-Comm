# Backend Dependency & Integration Map

This document captures the runtime dependencies, required configuration, and major integration touchpoints for the NestJS backend. It references the primary modules and services that orchestrate auth, payments, notifications, Prisma access, cart/checkout/order flows, and reporting so that maintainers can understand the downstream impact of cross-cutting changes.

> **Legend**:
> - 🚧 Inferred/assumed entry; requires verification against source code.
> - Unmarked entries are confirmed by examining code references (e.g., `package.json`, module imports, and code wiring).

---

## 1. Package & Framework Dependencies

| Layer     | Packages / Providers                                                                                             | Notes                                                                                       |
|-----------|-------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------|
| Framework | `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/jwt`, `@nestjs/config`, `@nestjs/cli`, `@nestjs/testing`, `@nestjs/schematics` | Confirmed in `package.json` and wired in `src/app.module.ts`.                               |
| Runtime   | `@prisma/client`, `bcrypt`, `cookie-parser`, `pdfkit`, `reflect-metadata`, `rxjs`, `xlsx`                         | Confirmed: ORM, hashing, cookie parsing; reporting/export libs noted for documentation.     |
| Dev/Test  | `prisma`, `ts-node`, `ts-jest`, `jest`, `typescript`, etc.                                                       | Confirmed as devDependencies in `package.json`.                                            |

*Entries below may evolve; verify any new additions via source search.*

---

## 2. Environment Variables & Usage Locations

| Env Var                              | Consuming Files / Services                             | Purpose / Notes                                                |
|--------------------------------------|--------------------------------------------------------|----------------------------------------------------------------|
| `FRONTEND_URL`                       | `src/main.ts`, `src/notification/notification.service.ts` | CORS origin, notification link generation.                      |
| `PORT`                               | `src/main.ts`                                          | HTTP port (defaults to 3333).                                  |
| `SESSION_DURATION_MS`                | `src/auth/auth.service.ts`                             | Overrides default session TTL for JWT cookie duration.         |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES`   | `src/auth/auth.service.ts`                             | Lifespan of password reset tokens.                             |
| `PASSWORD_RESET_MAX_ATTEMPTS`        | `src/auth/auth.service.ts`                             | Caps retry attempts before invalidating reset token.           |
| `JWT_SECRET`, `JWT_EXPIRATION`       | `src/auth/auth.module.ts`                              | Signed JWT configuration via `JwtModule.registerAsync`.         |
| `NODE_ENV`                           | `src/auth/auth.service.ts`                             | Enables secure cookies in production.                          |
| `BRAND_NAME`, `SUPPORT_EMAIL`        | `src/notification/notification.service.ts`             | Branding and support contact info for transactional emails.     |
| 🚧 `PAYMENT_PROVIDER_TOKEN`          | `src/payments/payments.module.ts?`                      | Inferred injection token for payment provider — verify actual binding and name.             |
| 🚧 Additional `ConfigService.get` vars | Various feature modules                                 | Assumed usage; search `ConfigService.get(...)` for full inventory.                         |

---

## 3. Internal Module Interdependencies & Notable Contracts

### 3.1 Auth Stack

- **AuthModule** imports: `ConfigModule`, `PrismaModule`, `NotificationModule`, `JwtModule.registerAsync(...)` (confirmed).
- **AuthService** depends on: `PrismaService`, `JwtService`, `NotificationService`, `NotificationEventLogService`, `ConfigService` (confirmed).
- Integration points: session records (`session`, `passwordResetToken`, `emailVerificationToken`), transactional emails, JWT cookie (`auth_token`).

### 3.2 Payments & Orders

- **PaymentsModule** imports: `PrismaModule`, `PaymentsService` (confirmed).
- **PaymentsService** depends on: `PrismaService`, injected provider via 🚧 `PAYMENT_PROVIDER_TOKEN` (verify token name), DB model (`paymentAttempt`).
- Changes to payment-provider interface impact DTOs (`src/payments/dto/`), constants (`src/payments/constants.ts`), and provider implementations.

### 3.3 Notifications

- **NotificationModule** imports: `PrismaModule`, provides `NotificationService`, `NotificationEventLogService`, and providers such as `LoggingEmailProvider` (confirmed).
- Email provider contract (`EmailProvider`, `EMAIL_PROVIDER_TOKEN`) consumed in `NotificationService` (confirmed).

### 3.4 Prisma (Database)

- **PrismaModule** exposes singleton `PrismaService` used across the backend (confirmed).
- `PrismaService` extends `PrismaClient`, connecting on init and disconnecting on destroy (confirmed).

### 3.5 Cart / Checkout / Orders / Reporting

- Each module (`CartModule`, `CheckoutModule`, `OrdersModule`, `ReportingModule`) imports `PrismaModule` and leverages shared models (confirmed).
- Reporting (`ReportingModule`) may depend on `pdfkit`/`xlsx` for export (confirmed by mentions in `package.json`).

---

## 4. External Integrations & Configuration Touchpoints

| Integration         | Modules / Files                               | Notes                                                                        |
|---------------------|------------------------------------------------|------------------------------------------------------------------------------|
| **JWT Auth**        | `src/auth/auth.module.ts`, `src/auth/auth.service.ts`, `src/auth/auth.controller.ts` | `JwtModule.registerAsync`; cookies set/cleared in service.                   |
| **Payments Provider** | `src/payments/payments.service.ts`, 🚧 `PAYMENT_PROVIDER_TOKEN`, DTOs              | Provider injection schema requires verification of token naming.             |
| **Notifications**   | `src/notification/notification.service.ts`, `src/notification/notification.module.ts` | Templates use `BRAND_NAME`, `SUPPORT_EMAIL`, `FRONTEND_URL`.                 |
| **Prisma**          | `src/prisma/prisma.service.ts`, all feature services | Database client and schema impacts all modules.                              |
| **Reporting exports** | `src/reporting/**/*`, `package.json` deps      | PDF/XLS reporting libraries (`pdfkit`, `xlsx`).                              |

---

## 5. Change Impact Summary

| Concern Area             | Files Likely Touched                                                                             | Reasoning                                                                                |
|--------------------------|-------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| Auth integration changes | `src/auth/auth.module.ts`, `src/auth/auth.service.ts`, `src/auth/auth.controller.ts`, `src/notification/notification.service.ts` | Session handling, JWT secrets, email flows.                                              |
| Payment/Checkout adjustments | `src/payments/*`, `src/checkout/*`, `src/orders/*`, possible 🚧 token references             | Idempotency, provider contracts, DTOs, database records (`paymentAttempt`).              |
| Notification/email flow  | `src/notification/*`                                                                             | Template content, provider tokens, env var dependencies.                                 |
| Database schema/prisma changes | `src/prisma/*`, `prisma/schema.prisma`, migrations                                      | Cross-cutting data model changes across domains.                                         |
| Environment/config changes | `src/main.ts`, `ConfigModule` consumers (`Auth`, `Notification`, `Payments`), deployment configs | CORS, JWT, cookie security, branding, and any newly introduced env vars.                 |


---

*Note: All 🚧 entries are assumptions drawn from code patterns and should be validated against the actual source implementations before treating them as authoritative.*
