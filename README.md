# The Stock Owner's Report

A React dashboard that turns brokerage holdings into prorated company balance sheets and income statements. Uses MUI, AG Grid, Zustand, Supabase, SnapTrade, Stripe, and Postmark.

## Development

Use Node.js 24 ([.nvmrc](.nvmrc)) and npm.

1. Copy [.env.example](.env.example) to `.env.development.local` and fill in the Supabase URL and browser anon key.
2. Run:

   ```bash
   npm ci
   npm start
   ```

Open <http://localhost:3000> for the landing page or `/brokeragesAndAccounts` for the dashboard. Restart the server after changing environment settings.

Environment files are ignored. All `REACT_APP_*` values are public browser configuration; keep backend secrets out of them. Stripe settings are optional. Keep `REACT_APP_FAKE_EQUITY=false` for real portfolios; `REACT_APP_DISABLE_SNAPTRADE=true` enables CSV-only operation.

Commit [package-lock.json](package-lock.json) when dependencies change. [.npmrc](.npmrc) preserves CRA 5's required legacy peer resolution; the explicit AJV 8 development dependency keeps its Webpack validators compatible.

## Checks

```bash
npm run check
```

Runs lint, frontend type checking, frontend tests, mocked Edge Function tests, and a production build. [CI](.github/workflows/ci.yml) runs the same command with placeholder configuration. `npm test` starts frontend watch mode. Edge tests require Node.js 22.18 or later and do not contact live services.

Edge Functions run in Deno. VS Code enables Deno only for [supabase/functions](supabase/functions/) through [deno.json](supabase/functions/deno.json). Check changed functions before deployment:

```bash
deno check --config supabase/functions/deno.json supabase/functions/login-user/index.ts
```

SnapTrade SDK imports are pinned to the version Prod was built with (`npm:snaptrade-typescript-sdk@9.0.191`). Do not return to an unpinned import: SDK 13.x changed the `Snaptrade` constructor and fails with `Cannot read properties of undefined (reading 'mode')`. Upgrade deliberately, test against Dev, and change all five SDK-using functions together. Mocked Node tests do not detect upstream SDK changes.

## Deployment

Set production browser variables in the host or an ignored `.env.production.local`, then run `npm run build`. Deploy the generated `build/` directory. Serve static files directly and rewrite dashboard routes to `/index.html` for direct links and refreshes.

For local Edge Functions, copy [supabase/functions/.env.example](supabase/functions/.env.example) to `supabase/functions/.env`. With Docker running:

```bash
npx supabase start
npx supabase functions serve
```

For hosted functions, set integration secrets in the Supabase Dashboard. Supabase injects its URL and service-role key at runtime. Set `APP_BASE_URL` to the correct environment for password emails.

```bash
npx supabase login
npx supabase link --project-ref <project_ref>
npx supabase functions deploy <function-name>
```

## Database

The schema is defined only by [supabase/migrations](supabase/migrations/). Prod is the reference; Dev and local are built from the same migrations and must stay identical to Prod. Change the schema by adding a migration, never in the Supabase dashboard, and add a new migration instead of editing one that has been applied. Keep migrations idempotent and free of credentials, connection strings and foreign servers, because each environment keeps its own.

```bash
npx supabase db reset                        # rebuild the local database (Docker required)
npx supabase link --project-ref <dev_ref>
npx supabase db push                         # apply to Dev and verify first
npx supabase link --project-ref <prod_ref>
npx supabase db push                         # then apply to Prod
```

See [architecture.md](docs/architecture.md) for application behavior and integration contracts.

Contact: howard@stockownerreport.com. The UI originated from a Creative Tim template; the existing license reference remains in [package.json](package.json).
