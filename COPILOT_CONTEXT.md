# COPILOT_CONTEXT

This file is the system-level source of truth for architecture and business logic.

Auth details are documented in `README_login.MD`.
SnapTrade implementation details are documented in `SNAPTRADE.md`.

## Product Model
- Public-first React dashboard for portfolio look-through analysis.
- Core value: transform brokerage holdings into company-level prorated balance sheet and income statement metrics.
- Data sources:
	- Manual CSV uploads
	- SnapTrade-linked brokerage accounts
	- Supabase `financials` and `stock_prices`
- Monetization: Stripe pricing table + webhook-driven subscription activation.

## Runtime Architecture
- Frontend: CRA + React + MUI + custom components.
- State: Zustand stores persisted to localStorage (`auth-storage`, `app-storage`).
- Backend: Supabase REST + Edge Functions.
- Routing: declarative routes in `src/routes.js`, with default redirect to `/brokeragesAndAccounts`.

## Primary Domains

### 1) Brokerage & Holdings Domain
Entry files:
- `src/layouts/brokeragesAndAccounts/index.js`
- `src/layouts/brokeragesAndAccounts/AddBrokerageDialog.js`
- `src/services/parseBrokerageCsvService.js`
- `src/services/snaptradeMappingService.js`
- `src/stores/store.js`

Business rules:
- User can connect brokerage or upload CSV manually.
- Manual CSV parser expects:
	- Table 1 key/value rows (As of Date, Account, Cash, Investments, Total Value, Margin)
	- Blank separator row
	- Table 2 holdings rows with Symbol/Market/Quantity
- Parsed holdings are written to:
	- `brokeragesAndAccounts`
	- `accountHoldingsByAccount`
	- `accountHoldings` (flat compatibility list)
- Brokerage screen computes balances from live `stock_prices` by symbol and quantity.
- Brokerage unlink removes matching accounts across manual, normalized, and snaptrade slices.

Market-availability rule:
- Allowed markets are `NASDAQ` and `NYSE`.
- Holdings/accounts with other markets are marked unavailable in analysis/account selectors.

### 2) Financial Statement Domain
Entry files:
- `src/layouts/balanceSheet/useAggregatedFinancials.js`
- `src/layouts/incomeStatement/useAggregatedIncomeStatement.js`
- `src/layouts/balanceSheet/BalanceSheet.jsx`
- `src/layouts/incomeStatement/IncomeStatement.jsx`
- `src/layouts/balanceSheet/ProRataTable.jsx`

Business rules:
- For each holding symbol, fetch financial rows from Supabase `financials`.
- For each required tag, pick the newest `fy_end_date` row.
- Compute prorated values as:
	- `metric_value / shares_outstanding * quantity_held`
- Missing or invalid data yields `N/A` rows rather than dropping rows.
- Ownership share is formatted as “1 in X” based on shares outstanding vs held shares.
- Account selectors are built from holdings-bearing accounts and respect market availability.

Paywall rule:
- `paywall.enabled = hasRows && !isLoggedIn`
- Guests: first 5 rows visible, remaining rows blurred.
- Logged-in users: full unblurred access.

### 3) Billing & Subscription Domain
Entry files:
- `src/layouts/billing/index.js`
- `src/layouts/billing/components/BillingInformation/index.js`
- `supabase/functions/stripe-webhook/index.ts`

Business rules:
- Billing page renders Stripe pricing table via env-configured pricing table ID and publishable key.
- Stripe webhook listens for `invoice.payment_succeeded`.
- Webhook derives subscription interval from invoice line description.
- Webhook upserts `public.users` by email with:
	- `phone`
	- `subscription_interval`
	- `last_payment_at`
- Webhook sends activation email (via Postmark) using a tokenized setup link.

### 4) Password Lifecycle Domain
Entry files:
- `src/layouts/sendPasswordReset/sendPasswordReset.jsx`
- `src/layouts/setPassword/setPassword.jsx`
- `supabase/functions/send-password-reset-link-email/index.ts`
- `supabase/functions/create-and-get-tokenized-url/index.ts`
- `supabase/functions/set-password-with-token/index.ts`

Business rules:
- Reset request accepts email and triggers server-side email delivery.
- Token generation:
	- creates UUID token
	- stores/updates in `password_reset_tokens` with 30-minute expiry
	- returns tokenized URL to `/set-password?token=...`
- Set password flow:
	- client encrypts plaintext password
	- sends `{ token, passwordHash }` to edge function
	- edge function validates token + expiry, updates `users.password_hash`, deletes token

## State & Persistence Model

### `useAuthStore` (`auth-storage`)
Persisted fields:
- `user`
- `snapTradeUserId`
- `snapUserSecret`

### `useAppStore` (`app-storage`)
Persisted fields:
- `brokeragesAndAccounts`
- `accountHoldings`
- `accountHoldingsByAccount`
- `accounts`
- `snapTradeAccounts`
- `snapTradeHoldings`
- `snapTradeLastConnectedAt`

Additional behavior:
- Optional fake equity injection (`REACT_APP_FAKE_EQUITY`) augments a selected account for testing.
- `resetStorage()` clears `app-storage` and resets in-memory app slices.

## Routing & UX Contract
- Public entrypoint: `/brokeragesAndAccounts`.
- Hidden utility routes include login/reset/set-password and snaptrade redirect.
- Sidenav sign out clears auth + app storage.
- Top navbar logout clears auth only (current mismatch, intentional current-state documentation).

## Backend Surface Map

### Supabase REST tables consumed directly from frontend
- `financials`
- `stock_prices`

### Supabase Edge Functions consumed from frontend
- `login-user`
- `snaptrade-register-user-v2` (remote deployed; frontend target)
- `snaptrade-accounts`
- `send-password-reset-link-email`
- `set-password-with-token`

### Additional edge functions present in repo
- `snaptrade-register-user` (legacy/local variant)
- `get-users`
- `create-and-get-tokenized-url`
- `stripe-webhook`

## Environment & Secrets

Frontend env (`REACT_APP_*`):
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_DISABLE_SNAPTRADE`
- `REACT_APP_STRIPE_PRICING_TABLE_ID`
- `REACT_APP_STRIPE_PUBLISHABLE_KEY`
- optional fake equity flags

Edge Function secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SNAPTRADE_CLIENT_ID`
- `SNAPTRADE_CONSUMER_KEY`
- `POSTMARK_SERVER_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FROM_EMAIL`
- `APP_BASE_URL`
- optional `SUPABASE_DB_SCHEMA`, `SNAPTRADE_REDIRECT_URI`

## Known Code Realities (Important)
- Frontend references `snaptrade-register-user-v2`; local repo contains `snaptrade-register-user` (remote/local drift).
- `supabaseClient.ts` uses `auth.persistSession: false`; app login continuity is driven by Zustand persistence.
- Account cache can persist after navbar logout because that path does not call `resetStorage()`.

## Editing Guardrails
- Keep business rules unchanged unless explicitly requested.
- Treat docs as descriptive of current behavior, not intended behavior.
- Prefer updating one domain doc when behavior changes:
	- auth/session -> `README_login.MD`
	- brokerage/snaptrade -> `SNAPTRADE.md`
	- system-wide architecture/business map -> this file
