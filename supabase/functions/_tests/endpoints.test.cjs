const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const { test } = require("node:test");
const ts = require("typescript");

// Load handlers locally with SDK/network substitutes. No service credentials or deployed functions are used.
function loadEndpoint(name, options = {}) {
  let handler;
  const environment = {
    APP_BASE_URL: "https://www.stockownerreport.com",
    SUPABASE_URL: "https://supabase.example.test",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
    SNAPTRADE_CLIENT_ID: "test-client",
    SNAPTRADE_CONSUMER_KEY: "test-consumer",
    POSTMARK_SERVER_TOKEN: "test-postmark",
    FROM_EMAIL: "support@example.test",
    STRIPE_SECRET_KEY: "test-stripe",
    STRIPE_WEBHOOK_SECRET: "test-webhook",
    ...options.env,
  };
  const unexpected = () => {
    throw new Error("Unexpected external operation");
  };
  const modules = new Map();
  function load(filename) {
    if (modules.has(filename)) return modules.get(filename);
    const exports = {};
    modules.set(filename, exports);
    const source = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    const localRequire = (specifier) => {
      if (specifier.includes("/http/server.ts"))
        return {
          serve: (callback) => {
            handler = callback;
          },
        };
      if (specifier.startsWith("npm:snaptrade-typescript-sdk"))
        return {
          Snaptrade: class {
            constructor() {
              return options.snaptrade ?? {};
            }
          },
        };
      if (specifier.startsWith("npm:stripe"))
        return class {
          webhooks = { constructEventAsync: options.constructEvent ?? unexpected };
        };
      if (specifier.startsWith("https://esm.sh/@supabase/"))
        return { createClient: options.createClient ?? unexpected };
      if (specifier.endsWith("/logging.ts"))
        return { createStructuredLogger: () => ({ info() {}, warn() {}, error() {} }) };
      return load(resolve(dirname(filename), specifier));
    };
    new Function("require", "exports", "Deno", "fetch", source)(
      localRequire,
      exports,
      { env: { get: (key) => environment[key] } },
      options.fetch ?? unexpected
    );
    return exports;
  }
  load(resolve(__dirname, "..", name, "index.ts"));
  assert.equal(typeof handler, "function");
  return handler;
}

function request(method = "POST", body, headers = {}) {
  return new Request("https://functions.example.test", {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers,
  });
}

test("SnapTrade browser endpoints retain wildcard preflight headers", async () => {
  for (const name of ["login-user", "disconnect-user", "snaptrade-accounts", "get-users"]) {
    const response = await loadEndpoint(name)(request("OPTIONS"));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(response.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
  }
});

test("password endpoints preserve origin rejection and preflight policies", async () => {
  for (const name of [
    "send-password-reset-link-email",
    "set-password-with-token",
    "authenticate-user",
  ]) {
    const handler = loadEndpoint(name);
    const preflight = await handler(
      request("OPTIONS", undefined, { origin: "https://attacker.test" })
    );
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), null);
    const rejected = await handler(request("POST", {}, { origin: "https://attacker.test" }));
    assert.equal(rejected.status, 403);
    assert.deepEqual(await rejected.json(), { error: "Origin not allowed" });
  }
  const token = await loadEndpoint("create-and-get-tokenized-url")(request("OPTIONS"));
  assert.equal(token.headers.get("access-control-allow-origin"), "");
  const registration = await loadEndpoint("snaptrade-register-user-v2")(request("OPTIONS"));
  assert.equal(
    registration.headers.get("access-control-allow-origin"),
    "https://app.stockownerreport.com"
  );
});

test("account snapshots keep partial failures and process accounts sequentially", async () => {
  const calls = [];
  const handler = loadEndpoint("snaptrade-accounts", {
    snaptrade: {
      accountInformation: {
        async listUserAccounts() {
          return {
            data: [
              { id: "one", name: "First", type: "cash" },
              { id: "two", name: "Second", type: "margin" },
            ],
          };
        },
        async getUserHoldings({ accountId }) {
          calls.push(`holdings:${accountId}`);
          if (accountId === "one") throw { response: { status: 403 } };
          return { data: ["position"] };
        },
        async getUserAccountDetails({ accountId }) {
          calls.push(`details:${accountId}`);
          return { data: { accountId } };
        },
      },
    },
  });
  const response = await handler(request("POST", { userId: "user", userSecret: "secret" }));
  assert.equal(response.status, 200);
  assert.deepEqual(calls, ["holdings:one", "details:one", "holdings:two", "details:two"]);
  assert.deepEqual(await response.json(), {
    accounts: [
      { id: "one", name: "First", type: "cash", holdings: null, details: { accountId: "one" } },
      {
        id: "two",
        name: "Second",
        type: "margin",
        holdings: ["position"],
        details: { accountId: "two" },
      },
    ],
  });
});

test("password reset email uses the generated URL and sends only after token generation succeeds", async () => {
  const calls = [];
  const fetch = async (url, options) => {
    calls.push([url, options]);
    return calls.length === 1
      ? Response.json({ tokenizedUrl: "https://app.example.test/set-password?token=test" })
      : Response.json({ sent: true });
  };
  const response = await loadEndpoint("send-password-reset-link-email", { fetch })(
    request("POST", { email: " user@example.test " })
  );
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(calls[0][1].body), { email: "user@example.test" });
  assert.equal(calls[0][1].headers.Authorization, "Bearer test-service-role");
  const email = JSON.parse(calls[1][1].body);
  assert.equal(email.To, "user@example.test");
  assert.equal(email.MessageStream, "outbound");
  assert.match(email.HtmlBody, /https:\/\/app\.example\.test\/set-password\?token=test/);
  const failed = await loadEndpoint("send-password-reset-link-email", {
    fetch: async () => new Response("failed", { status: 500 }),
  })(request("POST", { email: "user@example.test" }));
  assert.equal(failed.status, 500);
});

test("Stripe checks signatures before event processing and preserves raw request body", async () => {
  const unsigned = await loadEndpoint("stripe-webhook")(request("POST", {}));
  assert.equal(unsigned.status, 400);
  assert.equal(await unsigned.text(), "Missing stripe-signature header");
  const raw = '{ "unaltered": true }';
  const handler = loadEndpoint("stripe-webhook", {
    constructEvent: async (body, signature, secret) => {
      assert.equal(body, raw);
      assert.equal(signature, "signature");
      assert.equal(secret, "test-webhook");
      return { type: "customer.updated" };
    },
  });
  assert.equal(
    (
      await handler(
        new Request("https://functions.example.test", {
          method: "POST",
          body: raw,
          headers: { "stripe-signature": "signature" },
        })
      )
    ).status,
    200
  );
  const invalid = await loadEndpoint("stripe-webhook", {
    constructEvent: async () => {
      throw new Error("Invalid signature");
    },
  })(request("POST", {}, { "stripe-signature": "invalid" }));
  assert.equal(invalid.status, 400);
});

test("paid invoices retain user upsert and activation email behavior", async () => {
  let payload;
  let message;
  const handler = loadEndpoint("stripe-webhook", {
    constructEvent: async () => ({
      type: "invoice.payment_succeeded",
      data: {
        object: {
          customer_email: " USER@EXAMPLE.TEST ",
          customer_phone: " 123 ",
          lines: { data: [{ description: "Plan - Monthly" }] },
        },
      },
    }),
    createClient: () => ({
      from: (table) => {
        assert.equal(table, "users");
        return {
          upsert: (value, options) => {
            payload = value;
            assert.deepEqual(options, { onConflict: "email" });
            return {
              select: () => ({ single: async () => ({ data: { id: "user" }, error: null }) }),
            };
          },
        };
      },
    }),
    fetch: async (url, options) => {
      if (url.includes("/create-and-get-tokenized-url"))
        return Response.json({ tokenizedUrl: "https://app.example.test/set-password?token=test" });
      message = JSON.parse(options.body);
      return Response.json({ sent: true });
    },
  });
  const response = await handler(request("POST", {}, { "stripe-signature": "signature" }));
  assert.equal(response.status, 200);
  assert.equal(payload.email, "user@example.test");
  assert.equal(payload.phone, "123");
  assert.equal(payload.subscription_interval, "month");
  assert.equal(message.To, "user@example.test");
  assert.match(message.HtmlBody, /token=test&mode=activation/);
});

// Mirrors src/services/encryptionService.js so test fixtures decrypt correctly
// against the real authenticate-user handler (no mocking of the crypto itself).
async function encryptPasswordForTest(password) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode("LTPSecretKey123!"),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("LTP-Salt-2025"), iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(password)
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return Buffer.from(combined).toString("base64");
}

test("authenticate-user verifies credentials against public.users via the service role", async () => {
  const passwordHash = await encryptPasswordForTest("CorrectHorseBattery1!");
  const users = {
    "active@example.test": {
      email: "active@example.test",
      phone: null,
      subscription_interval: "month",
      last_payment_at: new Date().toISOString(),
      password_hash: passwordHash,
    },
    "expired@example.test": {
      email: "expired@example.test",
      phone: null,
      subscription_interval: "month",
      last_payment_at: "2000-01-01T00:00:00.000Z",
      password_hash: passwordHash,
    },
  };
  const createClient = () => ({
    from: (table) => {
      assert.equal(table, "users");
      return {
        select: () => ({
          eq: (column, value) => {
            assert.equal(column, "email");
            return { maybeSingle: async () => ({ data: users[value] ?? null, error: null }) };
          },
        }),
      };
    },
  });
  const handler = loadEndpoint("authenticate-user", { createClient });

  const ok = await handler(
    request("POST", { email: "active@example.test", password: "CorrectHorseBattery1!" })
  );
  const okBody = await ok.json();
  assert.equal(okBody.success, true);
  assert.equal(okBody.user.email, "active@example.test");
  assert.equal("password_hash" in okBody.user, false);

  const wrongPassword = await handler(
    request("POST", { email: "active@example.test", password: "nope" })
  );
  assert.deepEqual(await wrongPassword.json(), {
    success: false,
    error: "Invalid email or password.",
  });

  const unknown = await handler(request("POST", { email: "missing@example.test", password: "x" }));
  assert.deepEqual(await unknown.json(), {
    success: false,
    error: "Invalid email or password.",
  });

  const expired = await handler(
    request("POST", { email: "expired@example.test", password: "CorrectHorseBattery1!" })
  );
  const expiredBody = await expired.json();
  assert.equal(expiredBody.success, false);
  assert.equal(expiredBody.subscriptionExpired, true);
  assert.ok(expiredBody.expiresAt);
});

// Minimal chainable Supabase mock covering the select/eq/in/insert/update/upsert
// surface the workspace endpoints use, keyed by table name so each test can
// seed exactly the rows it needs.
function fakeWorkspaceClient({ user, data = {} }) {
  function builder(table, rows) {
    let filtered = Array.isArray(rows) ? [...rows] : [];
    const self = {
      select: () => self,
      eq: (column, value) => {
        filtered = filtered.filter((row) => String(row[column]) === String(value));
        return self;
      },
      in: (column, values) => {
        filtered = filtered.filter((row) => values.includes(row[column]));
        return self;
      },
      ilike: (column, value) => {
        filtered = filtered.filter(
          (row) => String(row[column]).toLowerCase() === String(value).toLowerCase()
        );
        return self;
      },
      order: () => self,
      limit: () => self,
      maybeSingle: async () => ({ data: filtered[0] ?? null, error: null }),
      single: async () =>
        filtered[0]
          ? { data: filtered[0], error: null }
          : { data: null, error: { message: "not found" } },
      insert: (value) => {
        const row = { id: `new-${table}-id`, ...value };
        (data[table] ||= []).push(row);
        return builder(table, [row]);
      },
      update: (value) => {
        const updated = filtered.map((row) => ({ ...row, ...value }));
        data[table] = (data[table] || []).map((row) =>
          updated.find((u) => u.id === row.id) || row
        );
        return builder(table, updated);
      },
      upsert: (value) => builder(table, Array.isArray(value) ? value : [value]),
    };
    return self;
  }
  return {
    auth: {
      getUser: async (token) =>
        token === "valid-token" && user ? { data: { user }, error: null } : { data: null, error: new Error("invalid") },
    },
    from: (table) => builder(table, data[table]),
  };
}

function authedRequest(method, body) {
  return new Request("https://functions.example.test", {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: { authorization: "Bearer valid-token", "content-type": "application/json" },
  });
}

test("workspace endpoints reject disallowed origins and preserve preflight policies", async () => {
  for (const name of [
    "resolve-workspace",
    "create-workspace",
    "get-reference-data",
    "validate-portfolio-upload",
    "import-portfolio",
    "get-workspace-holdings",
    "update-holding-quantity",
    "save-brokerage-connection",
  ]) {
    const handler = loadEndpoint(name, { createClient: () => fakeWorkspaceClient({}) });
    const preflight = await handler(
      new Request("https://functions.example.test", {
        method: "OPTIONS",
        headers: { origin: "https://attacker.test" },
      })
    );
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), null);
  }
});

test("workspace endpoints require a signed-in Supabase Auth session", async () => {
  const handler = loadEndpoint("resolve-workspace", {
    createClient: () => fakeWorkspaceClient({}),
  });
  const response = await handler(new Request("https://functions.example.test", { method: "GET" }));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Not signed in" });
});

test("resolve-workspace returns the existing workspace for a returning email regardless of provider", async () => {
  const user = { id: "u1", email: "owner@example.test", app_metadata: { provider: "azure" } };
  const handler = loadEndpoint("resolve-workspace", {
    createClient: () =>
      fakeWorkspaceClient({
        user,
        data: {
          workspaces: [
            {
              id: "ws-1",
              email: "owner@example.test",
              workspace_type: "upload_portfolio",
              auth_provider: "google",
            },
          ],
        },
      }),
  });
  const response = await handler(authedRequest("GET"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.workspace.id, "ws-1");
  assert.equal(body.workspace.workspace_type, "upload_portfolio");
  assert.equal(body.provider, "azure");
});

test("create-workspace is idempotent per email and rejects an invalid workspace type", async () => {
  const user = { id: "u1", email: "new@example.test", app_metadata: { provider: "google" } };
  const makeClient = (data) => fakeWorkspaceClient({ user, data });

  const invalid = await loadEndpoint("create-workspace", { createClient: () => makeClient({}) })(
    authedRequest("POST", { workspaceType: "not_a_real_type" })
  );
  assert.equal(invalid.status, 400);

  const data = {};
  const client = makeClient(data);
  const handler = loadEndpoint("create-workspace", { createClient: () => client });
  const created = await handler(authedRequest("POST", { workspaceType: "upload_portfolio" }));
  assert.equal(created.status, 201);
  const createdBody = await created.json();
  assert.equal(createdBody.created, true);
  assert.equal(createdBody.workspace.workspace_type, "upload_portfolio");

  const again = await handler(authedRequest("POST", { workspaceType: "connect_brokerage" }));
  assert.equal(again.status, 200);
  const againBody = await again.json();
  assert.equal(againBody.created, false);
  assert.equal(againBody.workspace.workspace_type, "upload_portfolio");
});

test("update-holding-quantity only allows editing the caller's own Excel-imported holdings", async () => {
  const user = { id: "u1", email: "owner@example.test", app_metadata: { provider: "google" } };
  const baseData = {
    workspaces: [{ id: "ws-1", email: "owner@example.test", workspace_type: "upload_portfolio" }],
    workspace_holdings: [
      { id: "holding-1", workspace_id: "ws-1", account_id: "acct-1", exchange_code: "TSX", ticker: "RY", quantity: 25, source: "excel_upload" },
      { id: "holding-2", workspace_id: "ws-1", account_id: "acct-1", exchange_code: "TSX", ticker: "TD", quantity: 10, source: "brokerage_connection" },
    ],
  };

  const handler = loadEndpoint("update-holding-quantity", {
    createClient: () => fakeWorkspaceClient({ user, data: baseData }),
  });

  const ok = await handler(
    authedRequest("POST", { workspaceId: "ws-1", holdingId: "holding-1", quantity: 40 })
  );
  assert.equal(ok.status, 200);
  const okBody = await ok.json();
  assert.equal(okBody.holding.Quantity, "40");

  const readOnly = await handler(
    authedRequest("POST", { workspaceId: "ws-1", holdingId: "holding-2", quantity: 99 })
  );
  assert.equal(readOnly.status, 400);

  const otherWorkspace = await handler(
    authedRequest("POST", { workspaceId: "ws-other", holdingId: "holding-1", quantity: 5 })
  );
  assert.equal(otherWorkspace.status, 403);

  const invalidQuantity = await handler(
    authedRequest("POST", { workspaceId: "ws-1", holdingId: "holding-1", quantity: -1 })
  );
  assert.equal(invalidQuantity.status, 400);
});

function atlantisRequest(query) {
  return new Request(`https://functions.example.test/atlantis-financials${query}`);
}

function fakeAtlantis(responses) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), headers: init?.headers ?? {} });
    const { status = 200, body = {}, headers = {} } = responses[calls.length - 1] ?? {};
    return new Response(JSON.stringify(body), { status, headers });
  };
  return { fetch, calls };
}

test("atlantis-financials returns the latest annual statements and keeps the API key server-side", async () => {
  const { fetch, calls } = fakeAtlantis([
    {
      body: {
        name: "Royal Bank Of Canada",
        currency: "CAD",
        periods: [
          { period_type: "annual", period_end: "2024-10-31", fiscal_year: 2024, values: { total_assets: 1 } },
          { period_type: "interim", period_end: "2026-01-31", fiscal_year: 2026, values: { total_assets: 3 } },
          {
            period_type: "annual",
            period_end: "2025-10-31",
            fiscal_year: 2025,
            currency: "CAD",
            values: { total_assets: 2, gross_profit: null, interest_income: 9, market_cap: 100, share_price: 4, pe_ratio: 12 },
          },
        ],
      },
    },
  ]);
  const handler = loadEndpoint("atlantis-financials", { fetch, env: { ATLANTIS_API_KEY: "secret-key" } });

  const response = await handler(atlantisRequest("?ticker=ry"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(calls[0].url, "https://atlantisdatasolutions.com/v1/ca/company/RY.TO/ratios?period=annual");
  assert.equal(calls[0].headers["X-API-Key"], "secret-key");
  assert.equal(JSON.stringify(body).includes("secret-key"), false);
  assert.deepEqual(
    { available: body.available, ticker: body.ticker, currency: body.currency, periodEnd: body.periodEnd },
    { available: true, ticker: "RY", currency: "CAD", periodEnd: "2025-10-31" }
  );
  assert.equal(body.values.total_assets, 2);
  assert.equal(body.values.gross_profit, null);
  assert.equal(body.values.revenue, null);
  assert.equal(body.values.market_cap, 100);
  assert.equal(body.values.interest_income, 9);
  assert.equal("pe_ratio" in body.values, false);
});

test("atlantis-financials resolves class shares and aliased issuers, and reports gaps without failing", async () => {
  const { fetch, calls } = fakeAtlantis([
    { status: 404, body: { error: "not found" } },
    { body: { name: "Canadian National Railway", currency: "CAD", periods: [] } },
    { body: { name: "Some Other Company", periods: [{ period_type: "annual", period_end: "2025-12-31" }] } },
    { status: 429, headers: { "Retry-After": "120" } },
    { status: 500 },
  ]);
  const handler = loadEndpoint("atlantis-financials", { fetch });

  const notCovered = await handler(atlantisRequest("?ticker=GIB.A&period=annual"));
  assert.equal(calls[0].url.includes("/company/GIB-A.TO/"), true);
  assert.equal("X-API-Key" in calls[0].headers, false);
  assert.equal(notCovered.status, 200);
  assert.deepEqual(await notCovered.json(), {
    available: false,
    reason: "not_covered",
    ticker: "GIB.A",
    period: "annual",
  });

  const noAnnual = await handler(atlantisRequest("?ticker=CNR"));
  assert.equal(calls[1].url.includes("/company/3SU7BEP7TH9YEQOZCS77/"), true);
  assert.equal((await noAnnual.json()).reason, "no_annual_period");

  // An alias that resolves to a different company must not be reported under this ticker.
  const mismatch = await handler(atlantisRequest("?ticker=T"));
  assert.equal((await mismatch.json()).available, false);

  const limited = await handler(atlantisRequest("?ticker=TD"));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "120");
  assert.equal((await handler(atlantisRequest("?ticker=TD"))).status, 502);

  for (const query of ["", "?ticker=../admin", "?ticker=RY&period=interim"]) {
    assert.equal((await handler(atlantisRequest(query))).status, 400);
  }
  assert.equal(calls.length, 5);
  assert.equal((await handler(request("POST", {}))).status, 405);
});
