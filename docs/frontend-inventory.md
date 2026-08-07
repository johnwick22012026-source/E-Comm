# Frontend dependencies and integration inventory

This document captures the current Vite + React frontend setup, highlighting package/runtime dependencies, environment/runtime configuration, API client usage, and the UI areas that directly depend on backend contracts.

## 1. Package/runtime dependencies

Collected from `package.json`:

- **Runtime dependencies**
  - `react` ^18.3.1
  - `react-dom` ^18.3.1
  - `react-router-dom` ^6.18.0

- **Dev/build/test dependencies**
  - Vite build system and tooling: `vite` ^5.4.11
  - React plugin for Vite: `@vitejs/plugin-react` ^4.3.3
  - TypeScript compiler: `typescript` ^5.6.3
  - Vitest test runner: `vitest` ^0.34.3
  - Test utilities: `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`
  - DOM shim for tests: `jsdom`
  - Type definitions for React: `@types/react`, `@types/react-dom`

Any change to runtime dependencies (e.g., upgrading React or React Router) will likely affect all UI code, so this dependency list should be revisited before upgrades.

## 2. Vite configuration

`vite.config.ts` is minimal:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

The only plugin is the official React plugin. Runtime config is accessed at runtime via `import.meta.env`, and new environment variables must be defined in `.env`/`.env.*` files using the `VITE_` prefix so that they are exposed to the client bundle. (The `define` option is only necessary when you need to provide compile-time replacements or defaults that cannot be supplied through `.env` files.)

## 3. Environment variables

- `VITE_API_URL`: Defined in `src/lib/api.ts` as the base API URL used by frontend code.
  - Default fallback: `http://localhost:3333`
  - Any change to backend host/port or API contract must be reflected here or in Vite `.env` files because the API client resolves requests through this value.

No other `process.env` or `import.meta.env` usage exists (per current audit), so the frontend does not yet depend on additional runtime configuration values.

## 4. API client and backend touchpoints

`src/lib/api.ts` contains the shared API helper logic:

```ts
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333'

export async function parseApiError(response: Response, fallback: string) {
  try {
    const body = await response.json()
    if (body && typeof body === 'object' && 'message' in body) {
      return (body as { message?: string }).message ?? fallback
    }
  } catch (_error) {
    // Ignore parsing failures
  }
  return fallback
}
```

- `API_BASE` is the central point for all fetch calls.
- `parseApiError` provides a consistent error extraction helper.

### Integration mapping (per file structure)

While the full codebase was not expanded here, the expected integration points include:

- `src/context/AuthContext.tsx`: Likely uses `API_BASE` when signing in/out or fetching the authenticated user, so changes to auth endpoints (routes, response shapes) will impact this file.
- `src/context/CheckoutContext.tsx`: Depends on cart/checkout APIs; any modification of order creation or pricing endpoints must be reflected here.
- `src/lib/api.ts`: Central helper for all API interactions, so backend contract changes (URLs, payloads, error shapes) go through this file.
- Page components under `src/pages/*` and `src/pages/admin/*`: Each page that presents data from the backend will import from `src/lib/api` or context providers, so they are the files most affected when backend responses change (e.g., product fields, order structure, admin actions).
- `src/components/Layout.tsx`: If the layout uses backend-driven navigation or user info, it also ties into these APIs.

## 5. Runtime bootstrap

`src/main.tsx` is the entry point that wires everything together:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Any change to context providers or the app shell (App component, Layout, route configuration) should be reviewed in tandem with backend contract changes because this file is where global providers (AuthContext, CheckoutContext, etc.) are composed.

## 6. Files to touch when backend contracts/configuration change

1. `src/lib/api.ts` – update base URL defaults, helpers, or shared fetch logic.
2. `src/context/*` – adjust API calls and state shape for auth/checkout context providers.
3. `src/pages/*` and `src/pages/admin/*` – update fetch hooks or data consumers when API responses change (e.g., schema updates or new endpoints).
4. `src/components/Layout.tsx` and other shared UI components – handle new data or props arising from configuration changes.
5. `src/main.tsx`/`src/App.tsx` – ensure providers/contexts are configured appropriately when underlying services/configuration evolve.

This inventory should be reviewed alongside new backend changes to assess the frontend impact before deploying cross-cutting updates.