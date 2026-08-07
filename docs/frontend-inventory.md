# Frontend Architecture & Runtime Path Inventory

This document captures the current React/Vite frontend wiring: routing entry points, layout composition, shared state providers, and reusable component roles as exercised in production.

## App Bootstrap & Routing

- `src/App.tsx` is the single place that declares all `react-router-dom` routes wrapped by a top-level `<Layout />`.
- Public routes handled by the layout include:
  - `/` and `/catalog` → `<CatalogPage />`
  - `/catalog/:id` → `<ProductDetailPage />`
  - `/cart` → `<CartPage />`
  - `/checkout` → `<CheckoutPage />`
  - `/confirmation/:orderReference` → `<OrderConfirmationPage />`
  - `/login`, `/register`, `/request-password`, `/set-password`, `/verify-email` → authentication flows
  - `/account`, `/account/orders`, `/account/orders/:orderId` → account and order history/detail pages
- Admin routes are nested under `/admin` and are guarded by `<AdminGuard />` that uses `useAuth()` to ensure the user is a support user before rendering its `<Outlet />`.
  - `/admin/operations` → `<OperationsPage />`
  - `/admin/catalog/*` subdivided into `/catalog/categories/*` (`<CatalogCategoriesPage />`) and `/catalog/products/*` (`<CatalogProductsPage />`)
  - `/admin/coupons/*` → `<CouponsPage />`
  - `/admin/promotions/*` → `<PromotionsPage />`
  - `/admin/reporting/*` → `<ReportingPage />`
- Several routes use `<Navigate />` redirects (`/admin` → `/admin/catalog/categories`, `/admin/catalog` → `/admin/catalog/categories`).

## Layout Composition

- `src/components/Layout.tsx` composes the overall shell:
  - Always renders a `<header>` that can optionally include an admin navigation menu (Operations, Catalog, Coupons, Promotions, Reporting) when `isSupportUser` from `useAuth()` is `true`.
  - Exposes the page content via `<main>{children ?? <Outlet />}</main>` so route elements inherit the shared header/navigation.

## Shared State Providers & API Touchpoints

### AuthContext (`src/context/AuthContext.tsx`)
- Centralizes authentication state and exposes `useAuth()` to consumers.
- Maintains `user`, `loading`, `error`, `isReady`, and derived `isSupportUser`.
- Provides async helpers for `/auth` endpoints: `register`, `login`, `logout`, `refreshUser` (called on mount to hydrate `user`).
- `API_BASE` for auth calls is derived from `import.meta.env.VITE_API_URL` (fallback `http://localhost:3333`).
- `useAuth()` is used by layout navigation and `AdminGuard`.

### CheckoutContext (`src/context/CheckoutContext.tsx`)
- Provides checkout session state and actions used in the checkout flow pages.
- Key values/functions:
  - `sessionToken` stored in `sessionStorage` under `checkoutSessionToken`.
  - `isReady` toggled after hydration.
  - `createSession`, `saveCustomerDetails`, `saveShippingAddress`, `fetchShippingMethods`, `selectShippingMethod`, `fetchReview`, `clear`.
- All functions target `/checkout/sessions` and session-specific subpaths, always sending `credentials: 'include'` and JSON headers when altering state.
- The context is accessed via `useCheckout()` within the checkout page components.

### API Utility (`src/lib/api.ts`)
- Exposes the same `API_BASE` for cross-cutting client code.
- `parseApiError` helper normalizes server error responses for user feedback, reusing the same `message` contract returned by the backend.

## Key Pages & Component Relationships

- **Catalog & Product Pages**: `<CatalogPage />` and `<ProductDetailPage />` sit at `/catalog` paths; they are the storefront entry points.
- **Cart & Checkout**: `<CartPage />` leads to `<CheckoutPage />`, which relies on `useCheckout()` to create sessions, capture customer/shipping data, retrieve shipping methods, and show review data before confirming an order.
- **Account & Orders**: `<AccountPage />`, `<OrderHistoryPage />`, and `<OrderDetailPage />` depend on authenticated user state from `useAuth()` and likely fetch order data via shared API helpers.
- **Auth Flows**: `<LoginPage />`, `<RegisterPage />`, `<RequestPasswordResetPage />`, `<SetNewPasswordPage />`, and `<VerifyEmailPage />` all interact with `/auth` routes, using `useAuth()` helpers for mutations plus global error/loading indicators.
- **Admin Section**: All admin pages (`OperationsPage`, catalog/product management, coupons, promotions, reporting) render within `<AdminGuard />`, inheriting the shared layout, and depend on support-user navigation to surface their links.

## Runtime Paths Summary
- Consumers of `useAuth()`:
  - `Layout` (to render admin nav when `isSupportUser`), `AdminGuard` (permission gate), any page that needs auth state or helper actions.
- Consumers of `useCheckout()`:
  - Checkout flow components under `/checkout` that need to orchestrate session state and present shipping/review data.
- Reusable components:
  - `Layout`: global shell + outlet for nested routes.
  - `AdminGuard`: gate to ensure only support users see `/admin/*` content.
  - `AuthContext` + `CheckoutContext`: cross-cutting providers installed high in the tree (presumably in `src/main.tsx`) so every page shares consistent state and API roots.

This inventory highlights the path from routing through layout to context-provided API helpers, covering both public and admin flows, the shared navigation, and the checkout session lifecycle.