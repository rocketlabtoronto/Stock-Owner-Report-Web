# Public Dashboard + SnapTrade Connect (Workflow #3)

This document describes the implemented login/connect/monetization behavior for the public dashboard model.

## Runtime Rules

- The default landing page is `/brokeragesAndAccounts` (public dashboard).
- SnapTrade connect is open to all visitors (no auth guard required).
- Route guards are removed (`RequireAuth`, `RequireBrokerageConnected`).
- No route-level `isAuthenticated` checks are used for SnapTrade connectivity.

## SnapTrade Registration + Login (v2)

### Frontend

- File: `src/layouts/brokeragesAndAccounts/SnapTradeConnectModal.js`
  - Generates a transient GUID userId (`crypto.randomUUID()` fallback included).
  - Calls `supabaseService.registerUser(userId)`.
  - Stores transient `snapTradeUserId` + `snapUserSecret` in local persisted store only.
  - Calls `supabaseService.getSnapTradeLoginLink(userId, userSecret, redirectURI, ...)`.

- File: `src/services/supabaseService.js`
  - `registerUser` now targets `functions/v1/snaptrade-register-user-v2`.

### Edge Functions

- File: `supabase/functions/snaptrade-register-user-v2/index.ts`
  - Calls `registerSnapTradeUser({ userId })` where `userId` is the transient GUID.
  - Does not write SnapTrade secrets to the database.

- File: `supabase/functions/login-user/index.ts`
  - Uses `userSecret` passed from frontend (Workflow #3 path).
  - Keeps legacy fallback to `users.snapusersecret` only if `userSecret` is omitted.
  - Calls `loginSnapTradeUser(...)` with unchanged login semantics.

## Redirect + Local Continuity

- File: `src/layouts/SnapTradeRedirect.jsx`
  - Uses local `snapTradeUserId` + `snapUserSecret` to fetch accounts once.
  - No fetch from `users.snapusersecret`.
  - Hydrates holdings/accounts into persisted local store.
  - Writes `snapTradeLastConnectedAt` timestamp.

- File: `src/stores/store.js`
  - Persists holdings/accounts and `snapTradeLastConnectedAt` in localStorage.
  - Supports continuity on refresh/return by reading persisted local data.

## Paywall Behavior

- File: `src/layouts/brokeragesAndAccounts/index.js`
  - Shows `Last connected to SnapTrade: <timestamp>` when available.
  - Builds a consolidated positions list sorted by market value.
  - If not subscribed:
    - First 5 positions shown fully.
    - Positions 6..N shown as blurred/locked rows.
    - Persistent CTA: “Want to see all equity holdings? Get Started and register.”
  - If subscribed (`users.is_subscribed = true`): all rows are shown unblurred.

## Secrets/Storage Constraints

- Workflow #3 does not require storing SnapTrade `userSecret` in `users`.
- `snapusersecret` is not used by the Workflow #3 frontend flow.
- Stripe secret keys are not stored in `users`.

## Subscription Linkage

- Subscription validation uses the `users` table active-subscription flag (`is_subscribed`).
- In-scope workflow columns remain:
  - `id`, `email`, `phone`, `stripe_client_id`, `is_subscribed`, `subscription_interval`, `last_payment_at`, `created_at`, `password_hash`.
