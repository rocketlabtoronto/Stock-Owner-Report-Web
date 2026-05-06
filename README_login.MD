# Login / Session / Access Workflows

This document is the source of truth for:
- app login/logout behavior
- persisted browser auth context
- password reset and password set
- SnapTrade credential handling contract

## Access Model
- Routes are public by default.
- `/` and unknown paths redirect to `/brokeragesAndAccounts`.
- Financial statements use paywall logic, not route guards.

## Login Workflow
Entrypoint:
- `src/layouts/login/login.jsx`

Flow:
1. User submits email + password.
2. Frontend queries `public.users` by email.
3. Frontend decrypts `password_hash` and compares with entered password.
4. Frontend checks subscription validity.
5. On success, frontend sets in-memory app user state and navigates to `/brokeragesAndAccounts`.

Notes:
- Supabase Auth session bootstrap is not used in `App.js`.
- `supabaseClient.ts` keeps `auth.persistSession: false`.

## Auth Storage Contract
Storage key:
- `auth-storage` (Zustand persist)

Persisted fields:
- `snapTradeUserId`
- `snapUserSecret`

Non-persisted app session field:
- `user`

Hydration rule:
- SnapTrade connect modal stays unavailable until auth-storage hydration completes.

Frontend credential source of truth:
- The browser `auth-storage` entry is the only frontend credential authority.
- `useAuthStore` is the hydrated in-memory projection of that localStorage entry.

## SnapTrade Credential Rules
1. If both `snapTradeUserId` and `snapUserSecret` exist in hydrated auth-storage, always use them.
2. If one or both are missing, register once via `snaptrade-register-user-v2`.
3. If stored credentials fail, fail visibly and preserve auth-storage.
4. Do not silently clear credentials.
5. Do not silently regenerate credentials.
6. Backend `login-user` does not do fallback credential lookup.

Operational auditability:
- `snaptrade-register-user-v2` persists registration output to `snaptrade_users`.
- This persistence is for operational auditability, not as frontend fallback.

## Logout Behavior
- Sidenav Sign Out and navbar Logout both clear app session user state and redirect to `/login`.
- Sign out does not clear `auth-storage`.
- Sign out does not clear `app-storage`.

## Password Reset Workflow
### Step A: Request reset link
Frontend:
- `src/layouts/sendPasswordReset/sendPasswordReset.jsx`

Backend:
- `functions/v1/send-password-reset-link-email`

### Step B: Generate tokenized URL
Backend:
- `functions/v1/create-and-get-tokenized-url`

Behavior:
- creates 30-minute token
- upserts into `password_reset_tokens` by email
- returns `${APP_BASE_URL}/set-password?token=<token>`

### Step C: Set password with token
Frontend:
- `src/layouts/setPassword/setPassword.jsx`

Backend:
- `functions/v1/set-password-with-token`

Behavior:
- frontend validates password and encrypts password client-side
- backend validates token + expiry
- backend updates `users.password_hash`
- backend deletes consumed/expired token

## Activation Mode
- `set-password` supports `mode=activation`.
- Stripe webhook can append activation mode for first-time password setup copy.

## Environment Inputs
Frontend:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Edge function secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SNAPTRADE_CLIENT_ID`
- `SNAPTRADE_CONSUMER_KEY`
- `POSTMARK_SERVER_TOKEN`
- `APP_BASE_URL`
- `FROM_EMAIL`

## Operational Checks
- Login failures: verify `public.users` access and password hash integrity.
- SnapTrade login failures: verify credentials exist in `auth-storage` and inspect `login-user` / SnapTrade upstream errors.
- Reset email failures: verify Postmark token and allowed origin config.
- Set-password failures: verify token freshness in `password_reset_tokens`.
