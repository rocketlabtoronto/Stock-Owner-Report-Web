# SnapTrade Cole’s Notes (One‑Page Manual)

## What SnapTrade Does
SnapTrade provides brokerage connection, accounts, holdings, and transactions for end users. You authenticate your app with **clientId + consumerKey**, and each user with **userId + userSecret**.

---

## Core Workflow (High Level)
1. **Create user** (app → SnapTrade) → receive `userId` + `userSecret`.
2. **Generate connection portal** → user connects a brokerage.
3. **List accounts** → use `userId + userSecret` to fetch connected accounts.
4. **Fetch holdings** (account scoped) → use `userId + userSecret + accountId`.

---

## Required Credentials
- **App credentials** (server only):
  - `SNAPTRADE_CLIENT_ID`
  - `SNAPTRADE_CONSUMER_KEY`
- **Per-user credentials**:
  - `userId` (your unique identifier, often email)
  - `userSecret` (returned by SnapTrade on user creation)

⚠️ Never expose `consumerKey` or `userSecret` in browser logs or URLs.

---

## Minimum Setup (Backend)
1. **Install SDK**
  - `npm i snaptrade-typescript-sdk`
2. **Set environment variables**
  - `SNAPTRADE_CLIENT_ID` and `SNAPTRADE_CONSUMER_KEY`
3. **Create a server-side proxy**
  - All SnapTrade calls go through your backend.
4. **Store userSecret safely**
  - DB in prod, localStorage only for dev.

---

## Minimal API Contract (Backend Proxy)
Use a backend to avoid exposing secrets in the browser.

**Create user**
```
POST /api/users
{ userId }
```
Returns: `{ userId, userSecret }`

Example request:
```json
{ "userId": "jane.doe@example.com" }
```

Example response:
```json
{ "userId": "jane.doe@example.com", "userSecret": "<uuid>" }
```

**Generate portal**
```
POST /api/users/login
{ userId, userSecret }
```
Returns: `{ redirectURI }`

Example request:
```json
{ "userId": "jane.doe@example.com", "userSecret": "<uuid>" }
```

Example response:
```json
{ "redirectURI": "https://app.snaptrade.com/connect/..." }
```

**List accounts**
```
POST /api/users/accounts
{ userId, userSecret }
```
Returns: `[ { id, name, institution_name, ... } ]`

Example response:
```json
[
  {
    "id": "<accountId>",
    "name": "Individual Cash",
    "institution_name": "Questrade",
    "balance": { "total": { "amount": 56.5, "currency": "CAD" } }
  }
]
```

**Get holdings (account scoped)**
```
POST /api/users/holdings
{ accountId, userId, userSecret }
```
Returns: positions array (shape varies by connector)

Example response (common shape):
```json
[
  {
    "symbol": {
      "symbol": {
        "symbol": "SSTK",
        "description": "Shutterstock Inc"
      }
    },
    "quantity": 1,
    "price": 18.27
  }
]
```

---

## SDK Usage Notes (Node.js)
- Use **Snaptrade** high‑level client for auth/user endpoints.
- For generated APIs, ensure `Configuration({ consumerKey })` is set.

Example (Node):
```
const snaptrade = new Snaptrade({ clientId, consumerKey });
const config = new Configuration({ consumerKey, basePath: snaptrade.configuration.basePath });
const accountApi = new AccountInformationApiGenerated(config);
```

### Minimal Backend Example (Express)
```js
import express from "express";
import { Snaptrade, AccountInformationApiGenerated, Configuration } from "snaptrade-typescript-sdk";

const app = express();
app.use(express.json());

const snaptrade = new Snaptrade({
  clientId: process.env.SNAPTRADE_CLIENT_ID,
  consumerKey: process.env.SNAPTRADE_CONSUMER_KEY,
});

const generatedConfig = new Configuration({
  consumerKey: process.env.SNAPTRADE_CONSUMER_KEY,
  basePath: snaptrade.configuration.basePath,
  baseOptions: snaptrade.configuration.baseOptions,
});

const accountApi = new AccountInformationApiGenerated(generatedConfig);

// Create user
app.post("/api/users", async (req, res) => {
  const { userId } = req.body;
  const response = await snaptrade.authentication.registerSnapTradeUser({ userId });
  res.json(response.data); // { userId, userSecret }
});

// Generate portal URL
app.post("/api/users/login", async (req, res) => {
  const { userId, userSecret } = req.body;
  const response = await snaptrade.authentication.loginSnapTradeUser({ userId, userSecret });
  res.json(response.data); // { redirectURI, ... }
});

// List accounts
app.post("/api/users/accounts", async (req, res) => {
  const { userId, userSecret } = req.body;
  const response = await snaptrade.accountInformation.listUserAccounts({ userId, userSecret });
  res.json(response.data);
});

// Holdings by accountId
app.post("/api/users/holdings", async (req, res) => {
  const { accountId, userId, userSecret } = req.body;
  const response = await snaptrade.accountInformation.getUserAccountPositions({
    accountId,
    userId,
    userSecret,
  });
  res.json(response.data);
});
```

---

## Handling Holdings Response Variations
Holdings shapes vary across connectors. Common paths for ticker/name:
- Ticker: `position.symbol.symbol.symbol` or `position.symbol.symbol` or `position.universalSymbol.symbol`
- Name: `position.symbol.symbol.description` or `position.universalSymbol.description`

Recommendation: normalize data in UI by checking multiple nested paths.

---

## Connection Portal Notes
- The portal URL is **time‑limited** (typically 5 minutes).
- Users must complete the brokerage connection in that window.
- After connection, call **list accounts** to confirm the link succeeded.

---

## Auth Pairing Rules (Critical)
- Every SnapTrade call that uses user credentials must pair **the same** `userId` and `userSecret` that were created together.
- If you override `userId` for debugging, keep the original `userSecret` paired with it or you’ll get **401 Unauthorized**.

---

## Error & Debugging Tips
- **401 Unauthorized** usually means wrong `userId` / `userSecret` pairing.
- Log **fingerprints** of secrets instead of raw values.
- Log upstream `x-request-id` from SnapTrade responses for support.
- **Empty holdings** can mean the account has no positions or the sync isn’t complete yet.

---

## Client/Server Split (Quick Reminder)
- **Server only**: SnapTrade SDK, consumerKey, userSecret storage.
- **Client**: UI calls your backend proxy only.

---

## Security Guidelines
- Never store `consumerKey` in the client.
- Store `userSecret` securely (DB) for production.
- In dev tools, localStorage is OK but mark it as **dev‑only**.

---

## Quick Checklist
- [ ] App credentials set in env.
- [ ] User created and `userSecret` stored.
- [ ] Portal generated and user connected.
- [ ] Accounts list returns data.
- [ ] Holdings fetched per account.
