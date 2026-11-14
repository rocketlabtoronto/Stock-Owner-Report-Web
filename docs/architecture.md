# Application architecture

This is the implementation guide for the dashboard's business rules and integrations. Setup, configuration, checks, and deployment are in the root [README](../README.md).

## Pages and access

[routes.js](../src/routes.js) lazy-loads React pages. [public/index.html](../public/index.html) sends `/` and `/index.html` to the [landing page](../public/landing_page.html). Within React, default and unknown paths redirect to `/brokeragesAndAccounts`.

Dashboard routes are public. Financial statements show guests five rows, blur the rest, and link to billing. Logged-in users see the full report. Login checks subscription dates before establishing a session.

## Accounts and statements

[AddBrokerageDialog](../src/layouts/brokeragesAndAccounts/AddBrokerageDialog.js) offers SnapTrade or the [CSV template](../public/template.csv). The [CSV parser](../src/services/parseBrokerageCsvService.js) expects account key/value rows, a blank separator, then Symbol, Market, and Quantity holdings columns.

[useAppStore](../src/stores/store.js) maintains accounts plus account-keyed and flat holdings for compatibility, persisted in `app-storage`. Unlinking removes the matching account data. [accountModel.js](../src/layouts/brokeragesAndAccounts/accountModel.js) calculates balances; [useAccountBalances](../src/layouts/brokeragesAndAccounts/useAccountBalances.js) loads shared quotes and ignores stale responses. Only NASDAQ and NYSE holdings are available for analysis.

Both financial pages use [FinancialStatement](../src/layouts/financialStatements/FinancialStatement.jsx), its shared loading hook and calculation model, and the columns/tags in [reports.js](../src/layouts/financialStatements/reports.js). The model selects the newest fiscal-year value for each required tag:

```text
prorated metric = metric value / shares outstanding * quantity held
```

Missing or invalid values remain `N/A`; ownership is displayed as “1 in X”. [supabaseService](../src/services/supabaseService.js) reads `dashboard.financials` and `dashboard.stock_prices`. [pdfExportService](../src/services/pdfExportService.js) handles exports.

## Login and password lifecycle

[Login](../src/layouts/login/login.jsx) reads `public.users`, decrypts the stored password for comparison, and checks subscription validity from `subscription_interval` and `last_payment_at`.

[useAuthStore](../src/stores/useAuthStore.js) keeps the application `user` in memory. It persists only `snapTradeUserId` and `snapUserSecret` in `auth-storage`. Both logout entry points clear the session user and redirect to `/login`, preserving the account and SnapTrade caches. [supabaseClient](../src/supabaseClient.ts) sets `auth.persistSession: false`; Supabase Auth listeners do not bootstrap this application's login state.

Password reset follows this sequence:

1. [sendPasswordReset](../src/layouts/sendPasswordReset/sendPasswordReset.jsx) calls `send-password-reset-link-email`.
2. That function requests a link from `create-and-get-tokenized-url`, which upserts a 30-minute token in `password_reset_tokens` and returns `${APP_BASE_URL}/set-password?token=...`.
3. Postmark sends the link. [setPassword](../src/layouts/setPassword/setPassword.jsx) validates/encrypts the new password and calls `set-password-with-token`.
4. The backend validates the token and expiry, updates `users.password_hash`, and consumes the token. `mode=activation` changes the first-time setup copy.

## SnapTrade

[SnapTradeConnectModal](../src/layouts/brokeragesAndAccounts/SnapTradeConnectModal.js) waits for `auth-storage` hydration. [snaptradeConnectionService](../src/services/snaptradeConnectionService.js) reuses an existing credential pair; if either field is missing, it generates a user ID and shares one registration request across concurrent callers.

1. `snaptrade-register-user-v2` registers the user and persists the credential pair in `snaptrade_users` for auditability. The browser saves the pair in `auth-storage`.
2. `login-user` receives the browser's ID/secret, redirect URI, and broker, then returns a portal URL. It has no database credential fallback.
3. On success, [SnapTradeRedirect](../src/layouts/SnapTradeRedirect.jsx) calls `snaptrade-accounts`. The backend fetches accounts and holdings with retry/backoff and partial-failure handling.
4. [snaptradeMappingService](../src/services/snaptradeMappingService.js) normalizes the payload. The redirect page upserts accounts and records the connection time.
5. After a snapshot attempt, `disconnect-user` removes brokerage authorizations in cleanup, including when fetching fails. Cached account data stays in the browser.

Rejected stored credentials produce an error and remain stored; do not silently regenerate or clear them. The user ID and secret must remain paired. CSV upload is used when integration is unavailable, the broker is not allowlisted, or `REACT_APP_DISABLE_SNAPTRADE=true`.

## Billing and backend operations

[Billing](../src/layouts/billing/index.js) embeds the environment-configured Stripe pricing table. `stripe-webhook` verifies signatures, processes `invoice.payment_succeeded`, upserts subscription details in `public.users`, and requests a tokenized Postmark activation email.

All backend entry points are in [supabase/functions](../supabase/functions/). `get-users` is an operational SnapTrade utility. Shared HTTP, CORS, logging, password-link, and retry helpers live in [\_shared](../supabase/functions/_shared/). Each endpoint keeps its access policy in code and [config.toml](../supabase/config.toml). Use Supabase Function Logs for diagnostics.

Preserve applied migrations and operational endpoints even when the frontend does not import them. Mocked endpoint tests cover request contracts; validate Deno types and live integrations separately before deployment.
