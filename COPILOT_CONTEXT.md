# COPILOT_CONTEXT

## 10-line product summary
1. A React dashboard for “The Stock Owner’s Report” that delivers portfolio insights to authenticated users.
2. The UI is built on Custom Dashboard Material UI components with a green brand theme.
3. Auth and user sessions are managed with Supabase Auth and stored in Zustand.
4. Data and workflows come from Supabase REST endpoints and Edge Functions.
5. SnapTrade integration supports brokerage linking and account retrieval.
6. Financial statements (balance sheet/income statement) are core reporting views.
7. Manual CSV uploads supplement brokerage data when needed.
8. Billing, login, and password reset flows are supported via dedicated routes.
9. Deployment is static (CRA build output) with environment-based configuration.
10. Supabase is the single backend for data, auth, and server-side workflows.

## Repo map (high-level components)
- `src/index.js`: App bootstrap (ReactDOM, router, controller provider).
- `src/App.js`: Global layout, theme, routes, auth session hydration.
- `src/routes.js`: Route table and auth/brokerage guards.
- `src/layouts/`: Screen-level layouts (brokerages, balance sheet, income statement, billing, auth flows).
- `src/pages/`: Static/legal pages and “Owner’s Manual”.
- `src/components/`: Shared UI, auth guards, UI primitives (Custom*).
- `src/services/`: API/service layer (Supabase REST + Edge Functions, CSV parsing, encryption).
- `src/stores/`: Zustand stores for auth and application state.
- `src/context/`: Custom UI controller and theme state.
- `src/utils/`: Small utilities (auth helpers, logos).
- `supabase/`: Local Supabase config, database scripts, and Edge Functions.
- `public/` + `build/`: Static assets (build/ is generated output).

## Key flows (request → service → data)
- Auth bootstrap: `src/App.js` → `supabase.auth.getSession()` → `useAuthStore.setUser()` → `RequireAuth` gates routes.
- Login/Reset: `layouts/login` or `layouts/sendPasswordReset` → Supabase tables + Edge Functions → UI feedback.
- SnapTrade connect: UI action → `src/services/supabaseService.js` (Edge Function `login-user`, `get-users`, `snaptrade-register-user`) → Supabase Edge Functions.
- Financials fetch: UI → `supabaseService.getFinancials()` → Supabase REST `/rest/v1/financials`.
- CSV import: UI file upload → `parseBrokerageCsv()` → normalized table data → store/state.

## Flow traces (end-to-end)
### 1) Auth + password reset
- Login: `src/layouts/login/login.jsx` → Supabase `users` table (password_hash) → `services/encryptionService` (decrypt) → `useAuthStore.setUser()` → redirect to `/brokeragesAndAccounts`.
- Password reset request: `src/layouts/sendPasswordReset/sendPasswordReset.jsx` → Edge Function `send-password-reset-link-email` → calls `send_password_setup_link` → stores token in `password_reset_tokens` → Resend email.
- Set password: `src/layouts/setPassword/setPassword.tsx` → validate token in `password_reset_tokens` → encrypt + update `users.password_hash` → delete token → redirect to `/login`.

### 2) Manual CSV upload → holdings → statements
- `AddBrokerageDialog` parses CSV via `parseBrokerageCsv()`.
- Updates state: `useAppStore.upsertBrokerageAccount()` + `setAccountHoldingsForAccount()` + `setAccountHoldings()`.
- Balance/Income statements consume holdings via `useAggregatedFinancials()` and `useAggregatedIncomeStatement()` → `supabaseService.getFinancials()` → `/rest/v1/financials`.

### 3) SnapTrade connect → accounts/holdings
- Connect modal: `SnapTradeConnectModal`.
- Registration check: `supabaseService.getSnapTradeUser()` → Edge Function `get-users`.
- Register if missing: `supabaseService.registerUser()` → Edge Function `snaptrade-register-user` → save `snapusersecret` in `users` table.
- Login link: PoC direct browser call to SnapTrade API (env `REACT_APP_SNAPTRADE_CLIENT_ID`, `REACT_APP_SNAPTRADE_CONSUMER_KEY`).
- Account/holdings Edge Function available: `supabase/functions/snaptrade-accounts` (returns accounts + holdings).

## Conventions & patterns
- React 18 + CRA (`react-scripts`).
- MUI + Custom components; keep UI primitives in `src/components/Custom*`.
- Routes are declarative in `src/routes.js` and guarded via `RequireAuth` / `RequireBrokerageConnected`.
- Data access via `src/services/*` using `fetch` + Supabase REST/Edge Functions.
- Global state via Zustand in `src/stores/*`.
- Environment variables use `REACT_APP_*` (CRA convention).
- Components: PascalCase filenames; utilities/services: camelCase filenames.
- Prefer explicit `res.ok` checks and surface meaningful errors to UI.

## Config, secrets, and environment wiring
- `.env` (not committed): `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_DISABLE_SNAPTRADE`.
- SnapTrade (PoC client): `REACT_APP_SNAPTRADE_CLIENT_ID`, `REACT_APP_SNAPTRADE_CONSUMER_KEY` (client-side only; move to Edge Function for production).
- Edge Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SNAPTRADE_CLIENT_ID`, `SNAPTRADE_CONSUMER_KEY`, `RESEND_API_KEY`.
- `src/supabaseClient.ts`: Initializes Supabase client from env vars.
- `supabase/config.toml`: Local Supabase stack configuration.
- `genezio.yaml`: Deployment build instructions.
- `package.json`: scripts, dependencies, and CRA tooling.

## “Do not touch” areas
- `build/` (generated build artifacts).
- `public/manifest.json`, `public/robots.txt` (deployment metadata unless explicitly changing PWA behavior).
- Supabase database scripts in `supabase/Database Scripts/` unless coordinating schema changes.

## Pinned entrypoints/config/docs (open first)
- Entrypoints: `src/index.js`, `src/App.js`, `src/routes.js`.
- State & auth: `src/stores/useAuthStore.js`, `src/components/RequireAuth.jsx`.
- Services: `src/services/supabaseService.js`, `src/supabaseClient.ts`.
- Config: `package.json`, `tsconfig.json`, `genezio.yaml`, `supabase/config.toml`.
- Docs: `README.md`, `CHANGELOG.md`, `ISSUE_TEMPLATE.md`.

## Next files to open (to deepen context)
- `src/layouts/brokeragesAndAccounts/` (primary dashboard landing).
- `src/layouts/balanceSheet/BalanceSheet` (core reporting view).
- `src/layouts/incomeStatement/IncomeStatement` (core reporting view).
- `src/stores/store.js` (main app state beyond auth).
- `src/services/parseBrokerageCsv.js` (manual import logic).
- `supabase/functions/*` (Edge Function handlers).
- `src/layouts/login/login.jsx`, `src/layouts/sendPasswordReset/sendPasswordReset.jsx`, `src/layouts/setPassword/setPassword.tsx` (auth flows).

## Copilot prompt to request a repo map
Use this in Copilot Chat:
“Scan the repository structure and produce:
(1) a high-level component map,
(2) the main entrypoints and data flow,
(3) key modules and their responsibilities,
(4) where config, secrets, and environment variables are wired,
(5) a list of files you need me to open next to deepen context.”

## Guidance for Copilot
- Treat this file as the source of truth for architecture and conventions.
- Prefer minimal, surgical edits and keep UI/style consistent with Custom/MUI patterns.
