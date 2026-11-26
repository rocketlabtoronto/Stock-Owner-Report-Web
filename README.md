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

`xlsx` (SheetJS, used for the Upload Portfolio template/parsing) is installed from the SheetJS CDN tarball, not the npm registry: the public registry's last published version (0.18.5) predates fixes for known prototype-pollution/ReDoS issues. Upgrade by changing the pinned tarball URL in `package.json`'s `dependencies`, e.g. `https://cdn.sheetjs.com/xlsx-<version>/xlsx-<version>.tgz`, and re-run `npm install`.

## Checks

```bash
npm run check
```

Runs lint, frontend type checking, frontend tests, mocked Edge Function tests, and a production build. [CI](.github/workflows/ci.yml) runs the same command with placeholder configuration. `npm test` starts frontend watch mode. Edge tests require Node.js 22.18 or later and do not contact live services.

Edge Functions run in Deno. VS Code enables Deno only for [supabase/functions](supabase/functions/) through [deno.json](supabase/functions/deno.json). Check changed functions before deployment:

```bash
deno check --config supabase/functions/deno.json supabase/functions/login-user/index.ts
```

SnapTrade SDK imports are pinned to the version Prod was built with (`npm:snaptrade-typescript-sdk@9.0.191`), and Stripe is pinned to `npm:stripe@22.1.0`. Do not return to unpinned imports: a redeploy resolves them to the newest release, and SnapTrade SDK 13.x changed the `Snaptrade` constructor and fails with `Cannot read properties of undefined (reading 'mode')`. Upgrade deliberately, test against Dev, and change every function that imports the package together. Mocked Node tests do not detect upstream SDK changes.

Prod and Dev use the same function code, with changes tested in Dev first. Deploy with `npx supabase functions deploy --project-ref <project_ref> --use-api`; deploy to Prod only when explicitly instructed. Secrets and `APP_BASE_URL` are set per project in the Supabase Dashboard and are never part of a deploy.

## Deployment

**Pushes to `main` automatically deploy the frontend to Dev, not Production. Production deployment requires explicit instructions.** Supabase Edge Functions and migrations remain separate operations; a Git push does not deploy them.

Set production browser variables in the host or an ignored `.env.production.local`, then run `npm run build`. Deploy the generated `build/` directory. Serve static files directly and rewrite dashboard routes to `/index.html` for direct links and refreshes.

### Dev site (Vercel)

<https://stock-owner-report-dev.vercel.app> is the separate Vercel project `stock-owner-report-dev`, connected to this GitHub repository with `main` as its production branch. Pushing to `main` automatically rebuilds this site with Dev Supabase settings. Other branches create previews in the Dev project, not in the Production project.

Vercel calls the stable deployment within each project "Production": in the **Dev project**, that still means the Dev site and Dev data, not the public Production application.

For manual Dev deployments, first link your local CLI to Dev (this workspace is already linked), then deploy:

```powershell
npx vercel link --yes --project stock-owner-report-dev --scope rocketlabtorontos-projects
npx vercel deploy --prod
```

The Dev project's Production and Preview variables hold the Dev `REACT_APP_*` values. [middleware.js](middleware.js) protects both with HTTP Basic auth when `BASIC_AUTH_ENABLED=true`, using the `BASIC_AUTH_USER` and `BASIC_AUTH_PASSWORD` project variables (the password is a Sensitive variable). Change them under the project's Settings → Environment Variables, then redeploy. Without `BASIC_AUTH_ENABLED` (the Prod project) the middleware only passes requests through.

The stable Dev origin is in the Dev Supabase project's `ALLOWED_ORIGINS` function secret, and `https://stock-owner-report-dev.vercel.app/auth/callback` is in its Auth redirect allowlist alongside the localhost callback. Use the stable Dev URL for end-to-end sign-in testing; branch preview origins are not automatically added to Supabase CORS or Auth redirect allowlists.

### Production site (manual only)

<https://app.stockownerreport.com> uses the Vercel project `mvp-2-0-free-report-hook`. Its Git integration is disconnected, so commits and pushes do not deploy it. Keep it disconnected; do not add automatic Production deployments to CI.

Only after explicit instructions to deploy Production, deploy the commit tested in Dev from a clean working copy. Build it in the Production project using that project's environment variables; **do not promote a Dev build**, which contains Dev Supabase configuration.

```powershell
try {
  $env:VERCEL_ORG_ID = "team_FZmQZW70k5ThFCT2Dw6rGz8q"
  $env:VERCEL_PROJECT_ID = "prj_OyXdrHz55l2aPs3L8WCA8ENrcwmf"
  npx vercel deploy --prod
} finally {
  Remove-Item Env:VERCEL_PROJECT_ID, Env:VERCEL_ORG_ID -ErrorAction SilentlyContinue
}
```

The temporary overrides leave the local CLI linked to Dev after the command.

### Supabase deployments

For local Edge Functions, copy [supabase/functions/.env.example](supabase/functions/.env.example) to `supabase/functions/.env`. With Docker running:

```bash
npx supabase start
npx supabase functions serve
```

For hosted functions, set integration secrets in the Supabase Dashboard. Supabase injects its URL and service-role key at runtime. Set `APP_BASE_URL` to the correct environment for password emails.

TSX company figures come from Atlantis Data Solutions through the `atlantis-financials` function. Set the `ATLANTIS_API_KEY` function secret in Dev and Prod; without it the function still works, on Atlantis's keyless limit of 100 requests per hour. See [architecture.md](docs/architecture.md#tsx-financial-statements-atlantis-data-solutions).

Workspace sign-in (Upload a Portfolio / Connect a Brokerage) needs Google, Microsoft (`azure`), and LinkedIn (`linkedin_oidc`) enabled under Authentication → Providers in the Supabase Dashboard, for both Dev and Prod, each with a real client ID/secret from that provider's developer console. Each provider's OAuth app must allow-list that project's own `https://<project-ref>.supabase.co/auth/v1/callback`; separately, add `<APP_BASE_URL>/auth/callback` to Supabase's Authentication → URL Configuration → Redirect URLs for each environment. See [architecture.md](docs/architecture.md#workspaces-sign-in-excel-upload-and-brokerage-connections) for the full walkthrough. This cannot be configured from code or migrations.

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
