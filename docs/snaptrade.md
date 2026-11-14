# SnapTrade integration

This document describes the local frontend and Edge Function implementations. See [authentication.md](authentication.md) for the session and credential storage contract.

## Entry points

- [AddBrokerageDialog](../src/layouts/brokeragesAndAccounts/AddBrokerageDialog.js) chooses direct connection or CSV upload.
- [SnapTradeConnectModal](../src/layouts/brokeragesAndAccounts/SnapTradeConnectModal.js) waits for hydration and opens the portal.
- [snaptradeConnectionService](../src/services/snaptradeConnectionService.js) reuses credentials and shares concurrent registration requests.
- [SnapTradeRedirect](../src/layouts/SnapTradeRedirect.jsx) retrieves the account snapshot and performs disconnect cleanup.
- [snaptradeMappingService](../src/services/snaptradeMappingService.js) maps the payload into the application's account representation.

## Connection workflow

1. The user selects a brokerage in the Add Brokerage dialog.
2. The app uses CSV upload when direct integration is unavailable, `REACT_APP_DISABLE_SNAPTRADE=true`, or no enabled broker slug exists in the allowlist.
3. For a direct connection, the modal waits for `auth-storage` hydration.
4. If both stored credentials exist, the connection service reuses them. Otherwise it generates a user ID and registers once through `snaptrade-register-user-v2`, sharing overlapping requests.
5. Registration persists the credential pair in `snaptrade_users` for auditability. The browser stores the pair in `auth-storage` for subsequent connections.
6. The modal calls `login-user` with `userId`, `userSecret`, the redirect URI, and the chosen broker, then opens the returned portal URL.
7. After a successful portal message, the app navigates to `/snapTradeRedirect`.
8. The redirect page calls `snaptrade-accounts`, maps the returned holdings, upserts accounts, and records the connection timestamp.
9. After an account fetch attempt, the redirect page calls `disconnect-user` in cleanup, including when snapshot retrieval fails. Cached account data stays in the browser.

Rejected stored credentials produce an error and remain stored. The app does not silently clear or replace them. `login-user` requires the browser's credential pair and performs no database fallback lookup.

## Functions

All five implementations are under [supabase/functions](../supabase/functions/):

| Function                     | Behavior                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `snaptrade-register-user-v2` | Registers a requested user ID, persists the credential pair, and returns the result                 |
| `login-user`                 | Creates a portal URL and normalizes redirect parameters                                             |
| `snaptrade-accounts`         | Lists accounts, then retrieves holdings and details with retry/backoff and partial-failure handling |
| `disconnect-user`            | Removes brokerage authorizations after the snapshot workflow                                        |
| `get-users`                  | Operational utility for listing SnapTrade users; retained although the frontend does not call it    |

Diagnostics use Supabase Function Logs through the shared structured logger. The removed legacy `snaptrade-register-user` slug is not the current registration target.

## Mapping and persistence

Mapping derives the brokerage code, account label, deduplication key, quantities, prices, and values from the upstream payload. The redirect page uses the store's account upsert action so account and holding slices stay consistent.

`app-storage` caches accounts and holdings. `auth-storage` persists the SnapTrade credential pair. Both logout entry points clear only the in-memory application user, leaving these browser caches in place.

## Configuration

Frontend setup requires `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`. `REACT_APP_DISABLE_SNAPTRADE` enables CSV-only operation.

Backend secrets include `SNAPTRADE_CLIENT_ID` and `SNAPTRADE_CONSUMER_KEY`; registration also needs the runtime-injected Supabase URL and service-role key. `SNAPTRADE_REDIRECT_URI` supplies a fallback when the browser does not provide one. See the [environment template](../supabase/functions/.env.example).

The user ID and secret must remain paired exactly. Upstream 401 responses commonly indicate an invalid app key pair or user credential pair. Missing portal URLs can arise from unsupported broker slugs; empty holdings can reflect upstream sync state.

## Verification and deployment

`npm run test:ci` covers credential reuse, shared registration, and account mapping. `npm run test:edge` checks mocked request/response contracts and account-fetch behavior. Neither suite verifies a live brokerage connection.

Use the root [README](../README.md) for Deno checking and targeted function deployment. Review remote function consumers separately before retiring an endpoint.
