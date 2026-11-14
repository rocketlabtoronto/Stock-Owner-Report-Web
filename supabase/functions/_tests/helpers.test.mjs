import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCorsHeaders,
  createJsonResponder,
  parseBody,
  readTextSafe,
} from "../_shared/http.ts";
import {
  extractResetUrl,
  isHttpUrl,
  requestPasswordLink,
  sendPostmarkEmail,
} from "../_shared/password-links.ts";
import { withRetry } from "../_shared/retry.ts";

test("CORS keeps exact origin matching and each endpoint's fallback policy", () => {
  const allowed = new Set(["https://www.stockownerreport.com"]);
  const request = (origin) =>
    new Request("https://functions.example.test", {
      headers: origin ? { origin } : {},
    });
  const cors = createCorsHeaders(allowed);
  assert.equal(cors(request([...allowed][0]))["Access-Control-Allow-Origin"], [...allowed][0]);
  for (const origin of [
    undefined,
    "https://attacker.test",
    "https://www.stockownerreport.com.attacker.test",
  ]) {
    assert.equal(cors(request(origin))["Access-Control-Allow-Origin"], undefined);
  }
  assert.equal(cors(request())["Access-Control-Max-Age"], "86400");
  assert.equal(cors(request()).Vary, "Origin");
  assert.equal(
    createCorsHeaders(allowed, undefined, "")(request())["Access-Control-Allow-Origin"],
    ""
  );
  const registration = createCorsHeaders(
    allowed,
    { Vary: "Origin" },
    "https://app.stockownerreport.com"
  );
  assert.deepEqual(registration(request("https://attacker.test")), {
    Vary: "Origin",
    "Access-Control-Allow-Origin": "https://app.stockownerreport.com",
  });
});

test("HTTP helpers preserve response headers, JSON parsing and consumed-body fallbacks", async () => {
  const json = createJsonResponder({ "Content-Type": "application/json", Vary: "Origin" });
  const response = json(403, { error: "Origin not allowed" });
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("vary"), "Origin");
  assert.deepEqual(await response.json(), { error: "Origin not allowed" });
  const request = (body) => new Request("https://functions.example.test", { method: "POST", body });
  assert.deepEqual(await parseBody(request('{"email":"user@example.test"}')), {
    email: "user@example.test",
  });
  assert.equal(await parseBody(request("invalid JSON")), null);
  const text = new Response("content");
  assert.equal(await readTextSafe(text), "content");
  assert.equal(await readTextSafe(text), "");
});

test("password links accept supported response shapes and only HTTP(S) URLs", () => {
  const url = "https://app.example.test/set-password?token=sample";
  for (const key of ["tokenizedUrl", "resetUrl", "url"]) {
    assert.equal(extractResetUrl(JSON.stringify({ [key]: ` ${url} ` })), url);
  }
  assert.equal(extractResetUrl(` ${url} `), url);
  assert.equal(extractResetUrl('{"success":true}'), "");
  assert.equal(isHttpUrl(url), true);
  assert.equal(isHttpUrl("http://localhost:3000/set-password"), true);
  for (const invalid of ["javascript:alert(1)", "file:///secret", "/set-password", ""]) {
    assert.equal(isHttpUrl(invalid), false);
  }
});

test("internal reset-link calls retain admin credentials and Postmark retains outbound message data", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (...args) => {
    calls.push(args);
    return new Response("ok");
  });
  await requestPasswordLink(
    "https://supabase.example.test",
    "test-service-role",
    "user@example.test"
  );
  const [url, options] = calls[0];
  assert.equal(url, "https://supabase.example.test/functions/v1/create-and-get-tokenized-url");
  assert.equal(options.method, "POST");
  assert.equal(options.headers.apikey, "test-service-role");
  assert.equal(options.headers.Authorization, "Bearer test-service-role");
  assert.deepEqual(JSON.parse(options.body), { email: "user@example.test" });

  const message = {
    From: "support@example.test",
    To: "user@example.test",
    Subject: "Reset",
    HtmlBody: "<p>Reset</p>",
    TextBody: "Reset",
  };
  await sendPostmarkEmail("test-postmark-token", message);
  assert.equal(calls[1][0], "https://api.postmarkapp.com/email");
  assert.equal(calls[1][1].headers["X-Postmark-Server-Token"], "test-postmark-token");
  assert.deepEqual(JSON.parse(calls[1][1].body), { ...message, MessageStream: "outbound" });
});

test("retries transient failures with exponential backoff and stops after the configured limit", async () => {
  const retries = [];
  const delays = [];
  const failure = { response: { status: 429 } };
  let calls = 0;
  const operation = async () => {
    calls += 1;
    throw failure;
  };
  await assert.rejects(
    withRetry(
      operation,
      { retries: 2, baseDelayMs: 100, retryOn: [429] },
      (retry) => retries.push(retry),
      async (delay) => delays.push(delay)
    ),
    (error) => error === failure
  );
  assert.equal(calls, 3);
  assert.deepEqual(delays, [100, 200]);
  assert.deepEqual(retries, [
    { attempt: 1, delayMs: 100, status: 429 },
    { attempt: 2, delayMs: 200, status: 429 },
  ]);
});

test("retries supported upstream status shapes and returns a recovered result", async () => {
  for (const failure of [{ response: { statusCode: 503 } }, { status: 503 }, { statusCode: 503 }]) {
    let calls = 0;
    const result = await withRetry(
      async () => {
        if (calls++ === 0) throw failure;
        return "recovered";
      },
      { retries: 1, baseDelayMs: 1, retryOn: [503] },
      undefined,
      async () => {}
    );
    assert.equal(result, "recovered");
    assert.equal(calls, 2);
  }
});

test("does not retry permanent errors, unknown failures, or a zero retry budget", async () => {
  for (const failure of [
    { response: { status: 401 } },
    new Error("network"),
    null,
    { status: 503 },
  ]) {
    let calls = 0;
    const options = { retries: failure?.status === 503 ? 0 : 3, baseDelayMs: 1, retryOn: [503] };
    await assert.rejects(
      withRetry(
        async () => {
          calls += 1;
          throw failure;
        },
        options,
        () => assert.fail("must not retry"),
        async () => assert.fail("must not wait")
      ),
      (error) => error === failure
    );
    assert.equal(calls, 1);
  }
});
