# Application architecture

This is the implementation guide for the dashboard's business rules and integrations. Setup, configuration, checks, and deployment are in the root [README](../README.md).

## Pages and access

[routes.js](../src/routes.js) lazy-loads React pages. [public/index.html](../public/index.html) sends `/` and `/index.html` to the [landing page](../public/landing_page.html). Within React, default and unknown paths redirect to `/brokeragesAndAccounts`.

Dashboard routes are public. Financial statements show guests five rows, blur the rest, and link to billing. Logged-in users see the full report. Login checks subscription dates before establishing a session.

## Accounts and statements

[AddBrokerageDialog](../src/layouts/brokeragesAndAccounts/AddBrokerageDialog.js) offers SnapTrade or the [CSV template](../public/template.csv). The [CSV parser](../src/services/parseBrokerageCsvService.js) expects account key/value rows, a blank separator, then Symbol, Market, and Quantity holdings columns.

[useAppStore](../src/stores/store.js) maintains accounts plus account-keyed and flat holdings for compatibility, persisted in `app-storage`. Unlinking removes the matching account data. [accountModel.js](../src/layouts/brokeragesAndAccounts/accountModel.js) calculates balances; [useAccountBalances](../src/layouts/brokeragesAndAccounts/useAccountBalances.js) loads shared quotes and ignores stale responses. An account whose holdings have no quote shows `N/A`, not `$0`.

Every import path (SnapTrade, brokerage CSV, Excel upload) stores the same account shape, defined in [portfolioSchema.js](../src/utils/portfolioSchema.js): `{ Account: "<Financial Institution> - <Account>", bank, holdings: [{ Symbol, Market, Quantity }] }`. `bank` is the logo identifier from `inferBankFromName`, and `Market` is the holding's exchange code. That module also owns the two market rules both models share:

- **Supported markets** are NASDAQ, NYSE, and TSX. An account is available for analysis only when every holding is on a supported market.
- **Company data is looked up by exchange as well as ticker**, because tickers repeat across exchanges (`T` is AT&T in the US and TELUS on TSX). NASDAQ and NYSE listings are read from `dashboard.financials` under `exchange = 'US'`; TSX listings are fetched on demand from Atlantis Data Solutions (below). Holdings on an unrecognized market keep the older ticker-only lookup.

Each account is one report. The account tabs ([AccountSelector](../src/layouts/financialStatements/AccountSelector.jsx)) select it, and the selection lives in [useReportAccountStore](../src/stores/useReportAccountStore.js) so the Balance Sheet and Income Statement always show the same account. Two accounts at the same institution are separate reports even when they hold the same ticker.

Both financial pages use [FinancialStatement](../src/layouts/financialStatements/FinancialStatement.jsx), its shared loading hook and calculation model, and the columns/tags in [reports.js](../src/layouts/financialStatements/reports.js). The model selects the newest fiscal-year value for each required tag:

```text
prorated metric = metric value / shares outstanding * quantity held
```

Every account's report, in both workflows, shows three holding columns before the prorated figures:

- **Shares Owned** is the quantity held in the selected account, displayed as a whole number (a fractional holding is rounded for display only).
- **Ownership Share** is `~ 1 in X shares`, where X is shares outstanding divided by the exact quantity held, rounded to a whole number. 250 shares of a company with 1,000,000 outstanding reads `~ 1 in 4,000 shares`.
- **Currency** is the currency that row's amounts are in.

These strings are produced once, in `createFinancialRow`, so the tables and the exports cannot disagree. Missing or invalid values remain `N/A`. [supabaseService](../src/services/supabaseService.js) reads `dashboard.financials` and `dashboard.stock_prices`. [pdfExportService](../src/services/pdfExportService.js) handles exports.

### TSX financial statements (Atlantis Data Solutions)

`useFinancialStatement` routes each company lookup by exchange: U.S. listings go to `supabaseService.getFinancials` as before, and TSX listings go to [atlantisService](../src/services/atlantisService.js). Both feed the same `loadFinancialRows`/`createFinancialRow`, so the layout, account tabs, editing, and exports are identical.

- **Server proxy.** The browser calls the `atlantis-financials` Edge Function (`GET ?ticker=RY&period=annual`), which calls Atlantis with the `ATLANTIS_API_KEY` secret and returns only the latest annual period's statement lines. The key never reaches the browser. The function has no database client: neither the Atlantis data nor any calculated report value is written to Supabase. Without the secret it uses Atlantis's keyless tier (100 requests per hour).
- **Session cache.** Each answer is stored in `sessionStorage` under `sor:atlantis:v3:<TICKER>:<period>` and checked before any request, so a page refresh, an account tab, the other report, or a share-count edit reuses it and recalculates locally. One company held in several accounts is fetched once; each account's figures use that account's quantity. A "not covered" answer is cached too. A failed request (rate limit, outage) is not cached and is retried the next time the report loads.
- **Ticker resolution.** A brokerage connection reports TSX symbols with a `.TO` suffix (`RY.TO`); `atlantisService` removes it, so `RY.TO` and an uploaded `RY` are one issuer and one cache entry. Atlantis resolves `<symbol>.TO` (class shares as `GIB-A.TO`) only for companies it files under their TSX symbol. Companies it files under a U.S. ticker are mapped in `TSX_ALIASES` in the function by LEI and confirmed by company name; add entries there as needed. Anything else is reported as not covered rather than guessed, because a bare ticker can be a different company. Atlantis covers operating companies only, so ETFs (`VFV`, `XQQ`) and Canadian depositary receipts of foreign companies (`GOOG`) are always not covered.
- **Shares outstanding** is not an Atlantis field. It is that period's market capitalisation divided by its share price.
- **Unavailable data.** A company Atlantis does not cover shows `N/A` across its row. A missing line (banks report no gross or operating profit) shows `N/A` in that cell only. The rest of the report renders.
- **Banks.** Atlantis has no industry field, so `reportsLikeABank` in `atlantisService` recognises a bank from its statement: interest earned exceeds total revenue (possible only when revenue is net of interest paid) and it reports neither gross profit nor operating income. Such a row carries `__bank`, and the table shows a bubble over its missing Gross Profit and Operating Profit explaining why banks do not report them. The U.S. data has no interest lines, so this applies to TSX companies only.

### Presenting unavailable figures

The model and the exports keep `N/A` for a value that is not available. On screen, [ProRataTable](../src/layouts/financialStatements/ProRataTable.jsx) presents it more quietly: each `N/A` is a grey dash with a tooltip, a holding with no figure in any amount column (`isUnavailableRow`) is muted and tagged **No statements**, and a notice above the table (`describeUnavailableHoldings`) says how many holdings that affects and that it is expected for ETFs and other funds. When nothing can be totalled, the Total row shows dashes.

When a report has nothing to chart at all, it shows a designed state ([ReportEmptyState](../src/layouts/financialStatements/ReportEmptyState.jsx)) instead of an empty grid:

- **Loading** shows a spinner with "Loading report…".
- **No portfolio** shows "No holdings to report yet" with a button to Brokerages and Accounts.
- **No holding in the account has figures** (an account of ETFs) shows "No company financials for this account" above a short list of the holdings with only Company and Shares Owned, so share counts stay visible and editable.
- **Figures could not be loaded** (the data source is unreachable or rate limited) shows "Company figures could not be loaded" with **Try again**. `loadFinancialRows` marks such rows `__loadFailed`, so a temporary failure is never described as a holding without statements; failed answers are not cached, so retrying fetches them again.

### Currency

Amounts are shown in the currency the company reports in, never converted. U.S. listings are in U.S. dollars (`$1,234`). TSX companies are in the currency Atlantis reports for them: usually Canadian dollars (`CA$1,234`), but some TSX companies (Shopify, for example) report in U.S. dollars and are labelled USD. [reportCurrency.js](../src/utils/reportCurrency.js) owns the formatting and the rules the table and exports share: the Currency column, one total row per currency (`Total (CAD)`, `Total (USD)`) so different currencies are never added together, and the fine print below the table naming the report's currencies and crediting Atlantis Data Solutions.

## Login and password lifecycle

`public.users` has RLS enabled with no policies and no anon/authenticated grants (see the `lock_down_public_tables` migration), so [Login](../src/layouts/login/login.jsx) cannot query it directly. It instead calls the `authenticate-user` Edge Function, which uses the service role to look up the row, decrypt the stored password for comparison, and check subscription validity from `subscription_interval` and `last_payment_at`. The function returns the user row (minus `password_hash`) on success, or `subscriptionExpired`/`expiresAt` so the client can render the renew CTA with the viewer's own locale/timezone.

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

## Workspaces: sign-in, Excel upload, and brokerage connections

A **workspace** is the record that remembers a user's accounts/holdings across sessions, independent of the subscription login above. [BrokeragesAndAccounts](../src/layouts/brokeragesAndAccounts/index.js) places **Upload a Portfolio** beside **Connect a Brokerage**; both require sign-in and a workspace before they proceed.

1. Clicking either button calls `openForAction`, which checks [useWorkspaceStore](../src/stores/useWorkspaceStore.js). With no workspace, it stores the intended action in `sessionStorage` ([workspaceActions.js](../src/layouts/brokeragesAndAccounts/workspace/workspaceActions.js)) and opens [SignInModal](../src/layouts/brokeragesAndAccounts/workspace/SignInModal.jsx) (Google, Microsoft, LinkedIn), which calls Supabase Auth's `signInWithOAuth` directly — this is unrelated to the subscription login's `authenticate-user` flow.
2. The provider redirects to [AuthCallback](../src/layouts/AuthCallback.jsx) (`/auth/callback`), which calls the `resolve-workspace` Edge Function. A returning email (any provider) loads its existing workspace; a new email sees [CreateWorkspaceModal](../src/layouts/brokeragesAndAccounts/workspace/CreateWorkspaceModal.jsx) to choose **Upload Portfolio** or **Connect to Brokerage** once (`create-workspace`). The user then returns to the dashboard and the original action resumes automatically.
3. [useWorkspaceBootstrap](../src/stores/useWorkspaceBootstrap.js) (mounted once in `App.js`) re-resolves the workspace and loads its holdings whenever a Supabase Auth session is already present, so a returning user does not need to sign in again in the same browser.
4. An **Upload Portfolio** workspace accepts Excel imports (below) and lets the user edit share counts. A **Connect to Brokerage** workspace only accepts SnapTrade/manual-CSV brokerage connections (same consent flow as before), persisted read-only via `save-brokerage-connection` from [SnapTradeRedirect](../src/layouts/SnapTradeRedirect.jsx) and [AddBrokerageDialog](../src/layouts/brokeragesAndAccounts/AddBrokerageDialog.js). A workspace's type cannot change after creation; clicking the other button shows an inline message instead.

### Excel upload and normalization

[UploadPortfolioDialog](../src/layouts/brokeragesAndAccounts/workspace/UploadPortfolioDialog.jsx) offers **Download Excel Template** and **Upload Excel File**, built with [excelPortfolioService.js](../src/services/excelPortfolioService.js) (SheetJS `xlsx`). An unreadable workbook or missing required column is rejected immediately with an explanation. Otherwise the parsed rows go to `validate-portfolio-upload`, which resolves Financial Institution/Exchange free text against the `financial_institutions`/`exchanges` alias tables (so "BOFA" and "Bank of America" — or "NYSE" and "New York Stock Exchange" — resolve to the same record used by brokerage connections) and checks each ticker against `dashboard.financials`/`dashboard.stock_prices` (NASDAQ/NYSE) or `ticker_directory` (other exchanges, e.g. TSX's starter list). A clean file imports immediately; otherwise [ReviewUploadIssuesModal](../src/layouts/brokeragesAndAccounts/workspace/ReviewUploadIssuesModal.jsx) lets the user correct one row at a time (Save/Cancel per row, dropdowns from `get-reference-data`) until every row is clean and only one exchange remains, then **Import Portfolio** calls `import-portfolio`.

TSX accounts are supported end to end. Company figures for TSX holdings come from Atlantis Data Solutions (see [TSX financial statements](#tsx-financial-statements-atlantis-data-solutions)). `dashboard.stock_prices` contains only `exchange = 'US'` rows, so the equities value of a TSX account on the Brokerages and Accounts page still shows `N/A`. Lookups never fall back to a US row with the same ticker, because that is often a different company. `ticker_directory` is a starter list that should grow over time.

### Shared holding storage and editable share counts

Both import paths write to `public.workspaces` / `public.workspace_accounts` / `public.workspace_holdings` (new migration `create_workspace_portfolio_tables`), locked down the same way as other public tables (RLS on, no anon/authenticated grants; only the Edge Functions above, using the service role, read or write them). `get-workspace-holdings` returns the saved accounts, and `applyWorkspaceAccountsToStore` in [workspaceService.js](../src/services/workspaceService.js) stores them through [mapWorkspaceAccountsToSpreadsheet](../src/services/workspaceMappingService.js), the counterpart of `mapSnapTradeAccountsToSpreadsheet`. Excel-imported and brokerage-connected holdings therefore reach the store in the same shape, with the same `bank` identifiers, and run through the same [FinancialStatement](../src/layouts/financialStatements/FinancialStatement.jsx)/[ProRataTable](../src/layouts/financialStatements/ProRataTable.jsx) report generation.

In an **Upload Portfolio** workspace, the uploaded Number of Shares is the holding's `Quantity`, the same field a brokerage connection fills, so it appears as Shares Owned and drives Ownership Share. Account, financial institution, and exchange stay on each row as metadata (`__holding`) and are not columns; the account tab identifies them. The only added column is Actions, pinned to the right, and it appears only on an account that has uploaded holdings: a brokerage-connected account is read-only and has no Actions column, even inside an Upload Portfolio workspace. Edit turns that row's Shares Owned cell into an input holding the exact saved quantity (Save/Cancel within the row); Save calls `update-holding-quantity`, which rejects holdings from a brokerage connection (`source != 'excel_upload'`) or outside the caller's own workspace. On success, [store.js](../src/stores/store.js)'s `updateHoldingQuantity` action updates the shared holding, so both reports and portfolio totals recompute immediately and the change persists the next time either report loads.

OAuth providers (`google`, `azure` for Microsoft, `linkedin_oidc` for LinkedIn) must be enabled with real client ID/secret in the Supabase Dashboard (Authentication → Providers) for both Dev and Prod before sign-in works end-to-end; this cannot be done from code. Two different URLs are involved, and they are not interchangeable: each provider's own OAuth app (Google Cloud Console / Azure App registrations / LinkedIn Developer app) must allow-list that **Supabase project's** callback URL, `https://<project-ref>.supabase.co/auth/v1/callback` (shown on each provider's page under Authentication → Providers in the Supabase Dashboard); separately, Supabase's own Authentication → URL Configuration → Redirect URLs allow-list must include **this app's** `<APP_BASE_URL>/auth/callback` for each environment, since that is the `redirectTo` [SignInModal](../src/layouts/brokeragesAndAccounts/workspace/SignInModal.jsx) passes to `signInWithOAuth`.



[Billing](../src/layouts/billing/index.js) embeds the environment-configured Stripe pricing table. `stripe-webhook` verifies signatures, processes `invoice.payment_succeeded`, upserts subscription details in `public.users`, and requests a tokenized Postmark activation email.

The Stripe Dashboard's Pricing Table **Confirmation page** setting must redirect back to `<APP_BASE_URL>/billing?session_id={CHECKOUT_SESSION_ID}` for both the Dev and Prod pricing tables. When Billing sees a `session_id` query param, it shows [PaymentSuccessModal](../src/layouts/billing/PaymentSuccessModal.js) (a non-dismissible "Payment successful" dialog telling the customer to check their inbox and activate via email) and navigates to `/login` once the user clicks OK.

All backend entry points are in [supabase/functions](../supabase/functions/). `get-users` is an operational SnapTrade utility. Shared HTTP, CORS, logging, password-link, encryption, subscription-expiry, and retry helpers live in [\_shared](../supabase/functions/_shared/). Each endpoint keeps its access policy in code and [config.toml](../supabase/config.toml). Use Supabase Function Logs for diagnostics.

Preserve applied migrations and operational endpoints even when the frontend does not import them. Mocked endpoint tests cover request contracts; validate Deno types and live integrations separately before deployment.
