# Frontend Test Coverage Audit

## Inventory of Existing Vitest/RTL Suites

### Layout & Routing Glue
- `src/__tests__/AppLayout.test.tsx` – Integration smoke verifying the shared `Layout` shell renders when `App` bootstraps and exposes the expected catalog/admin navigation links. It relies on the real `App` wiring but only checks the presence of layout links.
- `src/components/__tests__/Layout.test.tsx` – Component-level suite for `Layout` that asserts admin nav visibility, hiding when `isSupportUser` is `false`, and nesting routes inside the layout.
- `src/components/__tests__/AdminGuard.test.tsx` – Component-level guard coverage ensuring admin routes redirect non-support users and hide content while auth is loading, with support rendering the protected children.

### Customer-Facing Routes
- `src/__tests__/CustomerRoutes.test.tsx` – Route-level coverage for the customer section via `App`, mocking all page components and `Layout`. Validates public routes (catalog, cart, checkout, login/register/account/order history/order detail), non-existent route behavior, and admin vs. non-admin routing.
- `src/pages/__tests__/ProductDetailPage.test.tsx` – Page-level test covering product detail fetch scenarios: sold-out handling disables "Add to cart" and surfaces availability text; backend failure while adding to cart produces error notification.
- `src/pages/__tests__/CheckoutPage.test.tsx` – Page-level interaction on checkout: payment-method selection toggles active state, successful authorization shows success, failed authorization surfaces backend message.

## Coverage Classification
| Test Suite | Target | Type | Focus |
| --- | --- | --- | --- |
| `AppLayout.test.tsx` | App + Layout | Integration | Layout navigation/rendering |
| `Layout.test.tsx` | Layout component | Component | Admin nav toggling, outlet rendering |
| `AdminGuard.test.tsx` | AdminGuard component | Component | Auth gating/redirection |
| `CustomerRoutes.test.tsx` | App routes | Route-level | Customer/admin routes exposure |
| `ProductDetailPage.test.tsx` | Product detail page | Page-level | Data fetching states, add-to-cart behavior |
| `CheckoutPage.test.tsx` | Checkout page | Page-level | Payment method UI, auth request handling |

## Identified Gaps & Prioritized Candidates
1. **Customer Account/Profile Journeys**
   - No route- or page-level tests for `AccountPage`, `OrderHistoryPage`, or `OrderDetailPage` behavior (beyond mocks). Critical flows such as viewing/ editing profile data, order searches, and stateful interactions are untested.
   - Recommended next tests: Validation of data-fetch/rendering in `AccountPage` and `OrderHistoryPage`, including filtering/pagination of past orders and navigation to order detail.

2. **Cart State & Promotions Integration**
   - Cart page (quantity adjustments, promo code entry, pricing updates) lacks direct tests; the route-level suite only confirms the page renders.
   - `Promotions` admin page is mocked; no tests cover customer-facing promo badges, coupons, or how cart/checkout reacts to applied promotions.
   - Priority: Add page-level tests for `CartPage` verifying quantity controls, price recalculations, and promo codes; plus a route-level interaction that ensures applying a coupon updates UI/requests.

3. **Checkout Edge Cases**
   - Checkout tests hit method selection and basic fetch flows but do not verify wallet flows (e.g., saved cards vs wallet, fallback states) or validation errors for missing tokens.
   - Recommended coverage: interaction-heavy scenarios such as toggling billing vs shipping addresses, saved payment flows, and error states when required fields are blank.

4. **Customer Guard & Route Protection**
   - Only admin guard is covered; there is no equivalent coverage ensuring authenticated customer routes (like `/account/*`) redirect unauthenticated users.
   - New route-level tests should verify `PrivateRoute`-style behavior for customer-specific sections, ensuring login prompts render when necessary.

5. **Admin Navigation & Nested Sections**
   - While `CustomerRoutes.test.tsx` covers admin route exposure, it relies on mocks and doesn’t test the actual `Admin` pages, especially interaction-heavy admin flows like catalog management (`ProductsPage`, `CategoriesPage`) or coupon creation.
   - Next candidates: Tests for individual admin pages (e.g., category creation interaction, reporting filters) to ensure data fetch/UI states align with spec.

## Summary & Recommendations
- Existing suites cover layout wiring, admin guard gating, and highly interactive customer flows (product detail/checkout). However, customer account/order journeys, cart/promotion interactions, more nuanced checkout states, and admin page behaviors remain untested.
- Recommended next steps (aligned with Vitest/RTL setup):
  1. Page-level tests for `AccountPage`, `OrderHistoryPage`, and `OrderDetailPage` (mock API calls, verify state transitions).
  2. Interaction tests for `CartPage` covering quantity changes, promotion application, and empty states.
  3. Extended checkout tests for validation errors and wallet/payment-method toggles.
  4. Route-level guard tests for customer-only sections to mirror the admin guard coverage.
  5. Additional admin page tests (catalog, promotions, reporting) to ensure complex interactions are validated.
