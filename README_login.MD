# Login / Session / Access Workflows (Current)

This file is the source of truth for authentication-adjacent behavior:
- login/logout
- session persistence
- access gating and paywall behavior
- password reset and password set

SnapTrade brokerage workflows are documented in `SNAPTRADE.md`.

## Access Model
- The app is route-public by default.
- `/` and unknown paths redirect to `/brokeragesAndAccounts`.
- Access restriction for financial statements is data-level paywall logic (not route guards).

## Login Workflow (Implemented)

Entrypoint:
- `src/layouts/login/login.jsx`

Flow:
1. User submits email + password.
2. Frontend queries `public.users` by email.
3. Frontend decrypts stored `password_hash` using `services/encryptionService.js`.
4. Frontend compares decrypted string to entered password.
5. If equal, checks subscription validity using:
	- `subscription_interval`
	- `last_payment_at`
6. If subscription valid, writes user object to `useAuthStore.user` and navigates to `/brokeragesAndAccounts`.
7. If invalid credentials or expired subscription, shows user-facing error.

Important:
- This login flow does not perform a Supabase Auth sign-in mutation.
- Supabase Auth session persistence is disabled in `supabaseClient.ts`.

## Session & Persistence Model

### Supabase client
- `auth.persistSession: false`.

### Zustand auth store (`auth-storage`)
Persisted fields:
- `user`
- `snapTradeUserId`
- `snapUserSecret`

Consequences:
- App continuity relies on localStorage-backed Zustand state.
- `App.js` still listens to Supabase auth events, but local store state is the primary active signal for UI login state.

## Logout / Sign Out Behavior (Current)

### Sidenav Sign Out
Location:
- `src/ui/Sidenav/index.js`

Behavior:
- calls `clearUser()`
- calls `resetStorage()`
- redirects to `/login`

Effect:
- clears auth store
- clears `app-storage` (account/holdings cache)

### Navbar Logout
Location:
- `src/ui/Navbars/DashboardNavbar/index.js`

Behavior:
- calls `clearUser()` only
- redirects to `/login`

Effect:
- clears auth store
- does not clear `app-storage`

Current mismatch:
- Sign Out and Logout labels are semantically equivalent, but current implementation is not equivalent.

## Paywall / Access Rule for Statements

Used in both Balance Sheet and Income Statement:
- `enabled = hasRows && !isLoggedIn`

Behavior:
- logged-in users: full rows visible
- guests: first 5 rows visible, remaining rows blurred + billing CTA

## Password Reset Workflow

### Step A: Request reset link
Frontend:
- `src/layouts/sendPasswordReset/sendPasswordReset.jsx`

Backend:
- `functions/v1/send-password-reset-link-email`

Behavior:
- validates email format client-side
- sends POST with `{ email }`
- server generates tokenized URL via internal function call
- server sends email via Postmark

### Step B: Generate tokenized URL
Backend:
- `functions/v1/create-and-get-tokenized-url`

Behavior:
- creates 30-minute token
- upserts into `password_reset_tokens` on `email`
- returns `${APP_BASE_URL}/set-password?token=<token>`

### Step C: Set password with token
Frontend:
- `src/layouts/setPassword/setPassword.jsx`

Backend:
- `functions/v1/set-password-with-token`

Behavior:
- frontend validates password strength + confirm match
- frontend encrypts password with `encryptionService.encrypt()`
- backend validates token + expiry
- backend updates `users.password_hash`
- backend deletes consumed/expired token
- frontend redirects to `/login` on success

## Activation Mode (Post-billing)
- `set-password` supports `mode=activation` query parameter.
- Stripe webhook email appends this mode so UI copy changes to first-time activation language.
- Password write path is the same token + hash endpoint.

## Security-Relevant Implementation Notes
- Encryption key/salt are currently hardcoded in frontend encryption service.
- Password verification is performed client-side by decrypting stored hash.
- Edge password endpoints enforce CORS/origin rules.

## Environment Inputs Used by Login/Password Domain

Frontend:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

Edge secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POSTMARK_SERVER_TOKEN`
- `APP_BASE_URL`
- `FROM_EMAIL`

## Operational Checkpoints
- If login fails for all users, verify `public.users` access and stored `password_hash` integrity.
- If reset emails fail, verify Postmark token, sender email, and allowed CORS origin.
- If set-password fails, verify token freshness in `password_reset_tokens` and service-role permissions.
