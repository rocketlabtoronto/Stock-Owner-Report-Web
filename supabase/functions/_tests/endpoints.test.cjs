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
      if (specifier === "npm:stripe")
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
  for (const name of ["send-password-reset-link-email", "set-password-with-token"]) {
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
