# Architecture and business rules

This document describes the current implementation. Keep business rules unchanged during structural cleanup. Update this document for architecture changes, [authentication.md](authentication.md) for session changes, and [snaptrade.md](snaptrade.md) for brokerage integration changes.

## Runtime and access

React 18 and Create React App render the dashboard with MUI and shared theme components. [routes.js](../src/routes.js) loads pages on demand; financial report and PDF dependencies load when their pages are opened.

[public/index.html](../public/index.html) redirects `/` and `/index.html` to the standalone [marketing page](../public/landing_page.html). Within React, the default and unknown routes redirect to `/brokeragesAndAccounts`.

Dashboard routes are public by default. Financial statements apply a guest paywall when rows exist: the first five rows remain visible and the rest are blurred with a billing CTA. Logged-in users see the full report. Login checks subscription dates before establishing the in-memory user state.

## Brokerage holdings

Entry points are [brokeragesAndAccounts](../src/layouts/brokeragesAndAccounts/index.js), [AddBrokerageDialog](../src/layouts/brokeragesAndAccounts/AddBrokerageDialog.js), and [parseBrokerageCsvService](../src/services/parseBrokerageCsvService.js).

Users connect supported brokerages through SnapTrade or upload the [CSV template](../public/template.csv). The parser expects account key/value rows, a blank separator, then a holdings table with Symbol, Market, and Quantity columns.

[store.js](../src/stores/store.js) normalizes accounts and maintains both account-keyed and flat holdings for compatibility. Unlinking removes matching accounts across the relevant slices. [accountModel.js](../src/layouts/brokeragesAndAccounts/accountModel.js) computes balances using prices and quantities; [useAccountBalances](../src/layouts/brokeragesAndAccounts/useAccountBalances.js) loads shared quotes and ignores stale requests.

Only NASDAQ and NYSE holdings are available for analysis. Unsupported markets remain marked unavailable in account selectors. The optional `REACT_APP_FAKE_EQUITY` flag injects development fixture data and should remain disabled for real reports.

## Financial statements

[financialStatements](../src/layouts/financialStatements/) provides the shared page, account selector, loading hook, prorated table, and calculation model used by both statement pages. [reports.js](../src/layouts/financialStatements/reports.js) defines each report's columns and financial tags.

For each symbol, the model selects the newest fiscal-year row for each required tag and calculates:

```text
prorated metric = metric value / shares outstanding * quantity held
```

Missing or invalid data yields `N/A` rather than dropping a row. Ownership share is formatted as “1 in X”. Account selectors include holdings-bearing accounts and respect market availability. [pdfExportService](../src/services/pdfExportService.js) handles exports.

## State and sessions

[useAuthStore](../src/stores/useAuthStore.js) persists `snapTradeUserId` and `snapUserSecret` in `auth-storage`; the application `user` is runtime-only. [useAppStore](../src/stores/store.js) persists account and holding data in `app-storage`. Both logout entry points clear the session user and leave these browser caches in place.

The Supabase client uses `auth.persistSession: false`; this application does not bootstrap login through Supabase Auth listeners. See [authentication.md](authentication.md) for the custom login and password lifecycle.

## Backend surface

The frontend reads `financials` and `stock_prices` from the `dashboard` schema through [supabaseService](../src/services/supabaseService.js). Login reads `public.users` through [supabaseClient](../src/supabaseClient.ts).

| Edge Function                    | Role                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| `snaptrade-register-user-v2`     | Registers a SnapTrade user and persists its credential pair in `snaptrade_users`       |
| `login-user`                     | Creates a connection portal URL from the browser's credential pair                     |
| `snaptrade-accounts`             | Retrieves account details and holdings with retry handling                             |
| `disconnect-user`                | Disconnects brokerage authorizations after a snapshot attempt                          |
| `get-users`                      | Operational SnapTrade utility; not a frontend route                                    |
| `create-and-get-tokenized-url`   | Creates a one-time password link                                                       |
| `send-password-reset-link-email` | Requests a link and sends it through Postmark                                          |
| `set-password-with-token`        | Validates/consumes a token and updates the stored password                             |
| `stripe-webhook`                 | Verifies paid-invoice events, upserts subscription details, and sends activation email |

All these functions have local implementations. Shared HTTP, logging, password-link, and retry helpers live in [\_shared](../supabase/functions/_shared/). Utility functions are operational entry points; applied migrations are database history. Keep them even when the browser does not import them.

## Configuration and verification

See the root [README](../README.md) for setup and verification, and the [Edge Function environment template](../supabase/functions/.env.example) for integration variables. Service-role and integration secrets belong only in the backend runtime.

`npm run check` verifies frontend lint/types, frontend tests, mocked backend tests, and a production build. Deno checks and live integration verification remain separate from the mocked Node test suite.
