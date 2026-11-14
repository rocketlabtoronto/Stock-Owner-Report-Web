# The Stock Owner's Report

A public-first portfolio dashboard that turns brokerage holdings into prorated company balance sheets and income statements. Built with React 18, Create React App, MUI, AG Grid, Zustand, and Supabase, with SnapTrade, Stripe, and Postmark integrations.

## Getting started

Use Node.js 24 LTS (see [.nvmrc](.nvmrc)) and npm. Edge Function tests require at least Node.js 22.18 for native TypeScript support.

1. Copy [.env.example](.env.example) to `.env.development.local` and set the Supabase URL and browser anon key.
2. Install dependencies and start the app:

   ```bash
   npm ci
   npm start
   ```

Open <http://localhost:3000>. The root serves the marketing page; `/brokeragesAndAccounts` opens the dashboard. Keep environment-specific values in ignored `.env.development.local` and `.env.production.local` files.

The lockfile is committed. Use `npm install` when changing dependencies and include the updated lockfile. [.npmrc](.npmrc) keeps the legacy peer resolution required by CRA 5 with this project's TypeScript version. AJV 8 is an explicit development dependency to keep the CRA/Webpack validator dependencies compatible.

## Configuration

All `REACT_APP_*` variables are embedded in the browser bundle. Keep service-role, SnapTrade consumer, Stripe secret, and Postmark keys in Edge Function secrets.

| Variable                            | Purpose                                                   |
| ----------------------------------- | --------------------------------------------------------- |
| `REACT_APP_SUPABASE_URL`            | Supabase project URL; required                            |
| `REACT_APP_SUPABASE_ANON_KEY`       | Browser anon key; required by the current client          |
| `REACT_APP_STRIPE_PRICING_TABLE_ID` | Optional Stripe pricing table ID                          |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY`  | Optional Stripe browser publishable key                   |
| `REACT_APP_DISABLE_SNAPTRADE`       | Set to `true` to use manual CSV uploads only              |
| `REACT_APP_FAKE_EQUITY`             | Development fixture toggle; keep `false` for real reports |

Restart the development server after changing environment settings. CRA uses development settings for `npm start` and production settings for `npm run build`. For a local production build, copy the template to `.env.production.local`; configure the same variables in the hosting provider for deployed builds. Only environment templates belong in Git.

## Verification

```bash
npm run check
```

This runs lint, frontend TypeScript checking, all frontend tests, mocked Edge Function tests, and a production build. The same command runs in [GitHub Actions](.github/workflows/ci.yml) with placeholder public configuration and no live-service credentials.

Individual checks are available as `npm run lint`, `npm run typecheck`, `npm run test:ci`, `npm run test:edge`, and `npm run build`. Use `npm test` for frontend watch mode.

Frontend tests cover financial calculations, guest access, exports, account switching, shared quotes, and SnapTrade registration. Edge tests verify request contracts using mocked services.

For Edge Function editing, install the Deno CLI and the recommended `denoland.vscode-deno` VS Code extension. The workspace enables Deno only under `supabase/functions` and uses [deno.json](supabase/functions/deno.json) to resolve URL and `npm:` imports. Reload the VS Code window after installing the extension. A frontend TypeScript check does not validate these Deno imports.

Production Edge Functions run in Deno. Check changed functions in that runtime before deployment, for example:

```bash
deno check --config supabase/functions/deno.json supabase/functions/login-user/index.ts
```

Known limitation: the current unpinned SnapTrade SDK imports resolve to SDK 13.2.6 with incompatible constructor and response types. The Deno check above currently reports errors. Resolve that compatibility and pin the SDK before deploying affected functions; mocked Node endpoint tests do not detect upstream SDK type changes.

## Project structure

| Location                                     | Contents                                                                         |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| [src/](src/)                                 | React application, colocated tests, state, services, and theme                   |
| [public/](public/)                           | Marketing page, app HTML entry point, images, brokerage logos, and CSV template  |
| [supabase/functions/](supabase/functions/)   | Edge Functions, shared helpers, and mocked endpoint tests                        |
| [supabase/migrations/](supabase/migrations/) | Database migration history; preserve applied migrations                          |
| [docs/](docs/)                               | Architecture, authentication, SnapTrade integration, and requirements            |
| [.vscode/](.vscode/)                         | Shared debugger, Deno settings, extension recommendations, and MCP configuration |

Documentation:

- [Architecture and business rules](docs/architecture.md)
- [Login, sessions, and password lifecycle](docs/authentication.md)
- [SnapTrade connection flow](docs/snaptrade.md)
- [Business requirements snapshot](docs/business-requirements.html) (open in a browser; consult the architecture and code for current implementation details)

## Build and deployment

```bash
npm run build
```

Deploy the generated `build/` directory to static hosting. Serve existing static files directly, including `/landing_page.html`, and route dashboard paths such as `/balanceSheet` and `/set-password` to `/index.html` so direct links and browser refreshes work.

## Supabase development and deployment

Use the repository's CLI through `npx supabase`. For local Edge Function development, copy [supabase/functions/.env.example](supabase/functions/.env.example) to `supabase/functions/.env` and fill in the integrations you need. Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` into the runtime. Local Supabase services require Docker. Seed loading is disabled because the project has no seed data.

```bash
npx supabase start
npx supabase functions serve
```

For hosted functions, configure matching secrets in the Supabase Dashboard, then deploy the specific function you changed:

```bash
npx supabase login
npx supabase link --project-ref <project_ref>
npx supabase functions deploy <function-name>
npx supabase functions list
```

Each endpoint retains its access policy in code and [config.toml](supabase/config.toml). Password email links depend on `APP_BASE_URL`; set it to the correct environment. Use Function Logs for diagnostics. Local file cleanup does not remove deployed functions; review remote retirement separately.

## Support and attribution

Contact: howard@stockownerreport.com.

The dashboard originated from a Creative Tim dashboard template. The existing package license reference remains in [package.json](package.json); this cleanup does not change licensing terms.
