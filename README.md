# The Stock Owner's Report – Dashboard

## Business Overview
The Dashboard provides authenticated users with access to portfolio insights, reporting, and account management. It is designed to support subscription-driven access to analytics and investor reporting.

**Primary goals**
- Deliver timely, trustworthy portfolio insights.
- Reduce support burden with self-service account actions.
- Provide a clear path to onboarding and retention.

**Target users**
- Retail investors and advisors who need portfolio visibility.
- Internal support/admin staff for account triage.

**Success metrics**
- Activation rate (first report generated).
- Retention (weekly/monthly active users).
- Support deflection (self-service password resets, profile updates).

## Technology Overview
This is a React-based web application that integrates with Supabase for authentication, edge functions, and backend services.

**Key components**
- **Frontend:** React (Create React App)
- **Backend services:** Supabase (Auth, Edge Functions, Storage, Database)
- **Deployment:** Static hosting + environment-based configuration

**Primary integrations**
- Supabase Auth for account management and password resets.
- Supabase Edge Functions for server-side workflows.

## Architecture
- **UI Layer:** React components and layouts.
- **API Layer:** Supabase REST/Edge Functions.
- **Data Layer:** Supabase Postgres.

**Data flow**
1. User triggers an action in the UI.
2. UI calls Supabase Auth or Edge Functions.
3. Responses are rendered with user-friendly messaging and optional debug data.

## Security & Compliance
- Environment variables are used for Supabase configuration.
- Use of anon keys only (no service role keys in client).
- Password resets are handled via Supabase Auth or Edge Function.

**Recommendations**
- Restrict CORS for Edge Functions to trusted origins.
- Rotate anon keys and update environment variables as needed.
- Enable rate limiting on sensitive endpoints.

## Configuration
Create a `.env` file in the Dashboard root with:
```
REACT_APP_SUPABASE_URL=<your-supabase-url>
REACT_APP_SUPABASE_ANON_KEY=<your-supabase-anon-key>
REACT_APP_SNAPTRADE_CLIENT_ID=<your-snaptrade-client-id>
REACT_APP_SNAPTRADE_CONSUMER_KEY=<your-snaptrade-consumer-key>
```

If you add or update env vars, restart the dev server so React can re-read them.

## Development
```
npm install
npm start
```

## Build & Deploy
```
npm run build
```
Deploy the `build/` output to your static hosting provider.

## Operational Notes
- If password reset calls fail with `Failed to fetch`, check Edge Function CORS and OPTIONS handling.
- Use the on-screen debug panel (in the password reset view) to inspect response status and raw body.
- Environment debug route: open `/environment-debug` to see the current `REACT_APP_` variables in the browser.

## Support
- Primary support: support@stockownerreport.com
- Use application logs and Supabase logs for incident triage.

