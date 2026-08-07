# Backend Test Coverage Audit

## 1. Existing Coverage Inventory (per module)

| Backend Module | Spec Files | Focused Areas | Notes |
| --- | --- | --- | --- |
| **Admin Catalog** | `backend/src/admin/catalog/admin-catalog.service.spec.ts` | `updateInventory` validations (negative inventory, available/reserved > stock, auto availability when inactive) and `deleteCategory` guard for assigned products. | Exercises service guards around inventory consistency and cascading category deletes.
| **Admin Promotions** | `backend/src/admin/promotions/admin-promotions.service.spec.ts` | Promotion/coupon creation validation (window ordering, usage limits, coupon bounds). | Covers promotion lifecycle validation rules but not happy-path persistence flows.
| **Cart** | `backend/src/cart/cart.service.spec.ts` | Cart item quantity updates, inventory limit enforcement, removing last item totals. | Focuses on service behavior for quantity adjustment and totals computation.
| **Catalog Controller** | `backend/src/catalog/catalog.controller.spec.ts` | Controller delegation to `CatalogService` for product detail/related queries and error propagation. | Confirms controller wiring but not underlying business logic.

## 2. Notable Coverage Gaps (Critical Paths)

1. **Auth module (routes, services, tokens, password reset flows)**
   - No spec file found under `backend/src/auth/*` to verify login, registration, refresh-token handling, password reset validation, or email dispatch. This is a critical path that touches every user session and deserves high-priority coverage (service logic + controller guards).
2. **Payments & Saved Payment Preferences**
   - While there may be service specs, there is no explicit coverage referenced above for charging flows, webhook handling, or stored payment lifecycle. Payment processing issues would be customer-impacting, so dedicated tests for success/failure and reconciliation paths are needed.
3. **Notifications delivery service**
   - A spec for `backend/src/notifications/notifications.service.ts` was not observed. Notification/Email events drive customer communication; missing tests for event enqueuing, error logging, and throttling are notable gaps.
4. **Checkout & Orders orchestration**
   - Only observed coverage is the `catalog.controller` spec. There is no explicit controller/service spec for `backend/src/checkout` or `backend/src/orders` in the current listing. These modules coordinate multi-entity state (orders, payments, inventory), so ensuring service validations, idempotency, and controller error mapping are covered is critical.
5. **Customer Profile & Admin operations beyond catalog/promotions**
   - Customer-profile controller/service spec files were mentioned but not reviewed. If they exist, a gap audit should verify identity updates, address handling, and preference persistence are asserted. Admin modules beyond catalog/promotions (e.g., `admin/orders`, `admin/reporting`) should similarly be verified for dedicated specs.

## 3. Service vs Controller Coverage Comments

- The audited catalog controller spec verifies that the controller delegates to `CatalogService` and surfaces errors, but does not validate service business logic (covered elsewhere).
- Service specs (admin catalog, admin promotions, cart) concentrate on internal validation and side-effects but rarely assert controller behavior. If those modules expose controllers (e.g., `AdminCatalogController`), corresponding specs should be added to ensure HTTP mapping and guard application are consistent.
- There is a disparity in salted coverage: services have some specific validations covered, but controller-level authorization, transformation, and error propagation (especially in admin/auth/checkout) remain untested per current findings.

## 4. Prioritized Next Tests

1. **Auth Service & Controller Specs** (High)
   - Cover credential validation, token generation/refresh, password reset flows, and failed login edge cases.
2. **Checkout/Orders Service Logic** (High)
   - Test order creation workflows, inventory reservation, payment binding, error handling, and idempotent retries across services.
3. **Notifications Service** (Medium)
   - Verify creation of notification jobs, respect for user preferences, and failure logging.
4. **Payments and Saved Preference Operations** (High)
   - Assert payment instrument creation/update/deletion, integration with payment gateways (mocked), and failures.
5. **Controller Coverage for Admin Modules** (Medium)
   - Where controllers exist, ensure they respect guards and correctly translate service errors into HTTP responses.
6. **Customer Profile Module** (Medium)
   - Validate profile retrieval/updates, address handling, and badge of contact preferences.

## 5. Actionable Takeaways

- Continue expanding service specs for modules currently only covered on the validation path (admin catalog/promotions) to include successful persistence flows and error propagation.
- Introduce controller specs for high-risk routes (auth, checkout, admin operations) to assert guard usage and exception mapping.
- Establish a coverage matrix referencing the spec files listed above and update it as new tests surface in the repo to prevent regressions in critical user journeys.