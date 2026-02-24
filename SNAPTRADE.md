# SnapTrade Workflows (Current Implementation)

This file is the source of truth for brokerage-connect behavior through SnapTrade.

## Integration Surface

Frontend entry points:
- `src/layouts/brokeragesAndAccounts/AddBrokerageDialog.js`
- `src/layouts/brokeragesAndAccounts/SnapTradeConnectModal.js`
- `src/layouts/SnapTradeRedirect.jsx`
- `src/services/supabaseService.js`
- `src/services/snaptradeMappingService.js`
- `src/services/snaptradeBrokerAllowlistService.js`

Edge functions used by frontend:
- `login-user`
- `snaptrade-accounts`
- `snaptrade-register-user-v2` (currently remote/deployed target)

Related functions in repo:
- `snaptrade-register-user` (legacy/local variant)
- `get-users` (utility/debug)

## End-to-End Flow (Workflow #3)

1. User opens Add Brokerage dialog.
2. If selected brokerage supports direct integration and has allowlisted broker slug, app opens SnapTrade connect modal.
3. Modal creates transient GUID `userId`.
4. Modal calls `registerUser(userId)` -> `functions/v1/snaptrade-register-user-v2`.
5. On success, modal stores transient `snapTradeUserId` + `snapUserSecret` in `useAuthStore`.
6. Modal calls `getSnapTradeLoginLink(userId, userSecret, redirectURI, { broker, connectionPortalVersion })` -> `functions/v1/login-user`.
7. Modal loads returned SnapTrade portal URL in iframe.
8. On success message event, app navigates to `/snapTradeRedirect`.
9. Redirect page calls `snaptrade-accounts` with `userId + userSecret`.
10. Returned account payload is normalized and persisted into app store slices.

## Direct vs Manual Decision Logic

Source:
- `AddBrokerageDialog`
- `brokerageData`
- `SNAPTRADE_BROKER_ALLOWLIST`

A brokerage uses manual upload when any of these are true:
- integration marked not available
- integration marked SnapTrade but globally disabled (`REACT_APP_DISABLE_SNAPTRADE=true`)
- SnapTrade integration selected but no enabled allowlist slug found

Otherwise direct SnapTrade flow is attempted.

## Modal Runtime Behavior

`SnapTradeConnectModal` behavior highlights:
- has a 5-second fallback timer
- if direct flow fails or is unavailable, displays manual CSV upload instructions
- supports debug logging view toggle with Ctrl/Cmd + D
- parses postMessage events for `SUCCESS`, `ERROR`, `CLOSED`, `ABANDONED`, and redirect status
- normalizes redirect URI query params before embedding portal URL

## Redirect Sync & Mapping

`SnapTradeRedirect` responsibilities:
- validates presence of `snapTradeUserId` and `snapUserSecret`
- invokes `snaptrade-accounts`
- aggregates holdings and maps accounts using `mapSnapTradeAccountsToSpreadsheet`
- writes to store:
  - `snapTradeHoldings`
  - `snapTradeAccounts`
  - `brokeragesAndAccounts` (upserted normalized entries)
  - `accountHoldingsByAccount`
  - `accountHoldings`
  - `snapTradeLastConnectedAt`

Mapping rules (`snaptradeMappingService`):
- infer brokerage bank code from institution name
- derive account label and dedupe key
- map positions to holdings as `{ Symbol, Market, Quantity, currentPrice, marketValue }`
- compute account-level cash/investments/total value representation

## Edge Function Business Logic

### `login-user`
- validates request body and userId
- allows either supplied `userSecret` or fallback lookup from `users.snapusersecret`
- calls SnapTrade `loginSnapTradeUser`
- rewrites redirect URI params when missing
- logs detailed step markers to `dashboard.webhook_errors`

### `snaptrade-accounts`
- validates env + `userId/userSecret`
- lists user accounts
- per account:
  - fetch holdings with retry/backoff
  - fetch details with retry/backoff
- returns combined `{ accounts: [...] }`
- writes diagnostics to `dashboard.webhook_errors`

### `snaptrade-register-user` (legacy/local)
- requires auth header
- optional forced delete-then-register behavior
- writes `snapusersecret` into `users` table when successful
- normalizes upstream errors

Note:
- Frontend does not currently call this local function slug.

## Credential & Pairing Model

App-level credentials (edge secrets):
- `SNAPTRADE_CLIENT_ID`
- `SNAPTRADE_CONSUMER_KEY`

User-level transient credentials:
- `userId` (generated client-side for flow)
- `userSecret` (issued by SnapTrade)

Critical rule:
- `userId` and `userSecret` must remain paired exactly; mismatch yields 401 from SnapTrade.

## Data Persistence Reality
- SnapTrade account data is fetched from backend after successful portal workflow.
- After fetch, data is cached in localStorage-backed Zustand (`app-storage`).
- Transient `userId/userSecret` are persisted in `auth-storage` until cleared.

## Known Operational Realities
- Frontend references `snaptrade-register-user-v2`, but local repo contains `snaptrade-register-user`.
- This indicates remote/local function drift; deployments must account for that.
- Sign-out behavior differs by UI entrypoint, affecting whether cached snaptrade data remains.

## Common Failure Modes
- 401 during register/list users: wrong SnapTrade app key pair or wrong environment pairing.
- 401 during account fetch: stale/mismatched `userId`/`userSecret`.
- Missing login link: broker slug absent or not allowlisted.
- Direct connect timeout/error: modal falls back to manual CSV upload path.
- Empty holdings: upstream account has no positions or sync not complete.

## Environment Inputs

Frontend:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_DISABLE_SNAPTRADE`

Edge secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SNAPTRADE_CLIENT_ID`
- `SNAPTRADE_CONSUMER_KEY`
- optional `SNAPTRADE_REDIRECT_URI`

## Deployment Commands

```bash
supabase login
supabase link --project-ref <project_ref>
supabase functions deploy
supabase functions list
```

Delete remote functions that are no longer local:

```powershell
$local = Get-ChildItem .\supabase\functions -Directory | Select-Object -ExpandProperty Name
$remote = (supabase functions list --output json | ConvertFrom-Json) | Select-Object -ExpandProperty name
$toDelete = $remote | Where-Object { $_ -notin $local }
foreach ($fn in $toDelete) { supabase functions delete $fn }
```
