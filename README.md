# The Stock Owner's Report – Dashboard

## Current Product Model (Workflow #3)
- The dashboard is public-first: core routes are accessible without auth guards.
- Landing route is `/brokeragesAndAccounts`.
- SnapTrade connect flow is available to visitors.
- Financial statement paywall is guest-only:
  - guests see first 5 rows + blurred remainder + CTA to `/billing`
  - logged-in users see full rows (no blur, no paywall)

## Tech Stack
- Frontend: React (CRA) + MUI + AG Grid
- State: Zustand (`useAuthStore`, `useAppStore`)
- Backend: Supabase Postgres + Edge Functions
- Integrations: SnapTrade + Postmark + Stripe webhook

## Key Runtime Flows

### SnapTrade connect
1. UI waits for auth-storage hydration and checks localStorage-backed `auth-storage` via `useAuthStore`.
2. If `snapTradeUserId` and `snapUserSecret` both exist, UI uses them directly.
3. If one or both are missing, UI calls `functions/v1/snaptrade-register-user-v2` once.
4. Registration persists credentials in `snaptrade_users` for auditability and writes them to `auth-storage` for frontend reuse.
5. UI calls `functions/v1/login-user` with `userId` + `userSecret` from auth-storage (no backend fallback).
6. Redirect flow (`/snapTradeRedirect`) invokes `functions/v1/snaptrade-accounts`, persists accounts/holdings locally, then mandatorily calls `functions/v1/disconnect-user`.
7. If SnapTrade rejects stored credentials, UI shows an explicit error and preserves auth-storage; it does not clear or regenerate credentials automatically.

### Password reset / set password
1. `/send-password-reset` calls `functions/v1/send-password-reset-link-email`.
2. That function calls `functions/v1/create-and-get-tokenized-url` and sends email via Postmark.
3. `/set-password?token=...` encrypts password client-side and calls `functions/v1/set-password-with-token`.
4. Token is validated/consumed server-side and `users.password_hash` is updated.

### Stripe connection
1. User starts checkout from the billing flow.
2. Stripe handles payment and redirects using the Checkout session success/cancel URLs configured for the product.
3. Supabase Edge Function `functions/v1/stripe-webhook` processes Stripe webhook events.
4. Webhook updates subscription state in the `users` table (`is_subscribed`, interval, and payment timestamps).
5. Webhook sends activation/onboarding email when required by the event flow.

Current implementation note:
- The activation link used in webhook email content is currently production-domain based (`stockownerreport.com`).
- If you need environment-specific links (local/staging/prod), move this to an environment-driven variable in the webhook function.

## Configuration
Create `.env` in project root:

```env
REACT_APP_SUPABASE_URL=<your-supabase-url>
REACT_APP_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Supabase Edge Function secrets for Stripe webhook should include Stripe API/signing variables used by `stripe-webhook`.

Restart dev server after env changes.

## Development

```bash
npm install
npm start
```

## Build

```bash
npm run build
```

Deploy the `build/` directory to static hosting.

## Supabase Edge Functions

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

## Security & Ops Notes
- Keep service-role keys server-side only (Edge Functions).
- CORS allowlists are enforced in password reset and set-password functions.
- `set-password-with-token` preflight must allow `x-client-info` for Supabase browser invokes.
- Use Supabase Edge logs for debugging (`edge-function` service).

## Support
- Contact: howard@stockownerreport.com

