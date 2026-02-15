// Central place to manage which SnapTrade brokerages you want to expose in the UI.
//
// The `broker` field maps to SnapTrade's `broker` parameter for:
// POST https://api.snaptrade.com/api/v1/snapTrade/login
// ("Generate Connection Portal URL" / Authentication_loginSnapTradeUser)
//
// SnapTrade's canonical list of supported brokerages + slugs lives here:
// https://docs.snaptrade.com/docs/integrations
// and the API reference links to a Notion list of slugs.

export const SNAPTRADE_BROKER_ALLOWLIST = [
  { label: "Questrade", broker: "QUESTRADE-UNOFFICIAL", enabled: true },
  { label: "Wealthsimple", broker: "WEALTHSIMPLETRADE", enabled: true },
  { label: "TD Direct Investing", broker: "TD-DIRECT-INVESTING", enabled: true },
];
