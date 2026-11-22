import { lazy } from "react";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";

function route(name, key, path, loadPage, Icon) {
  const Page = lazy(loadPage);
  return {
    type: "route",
    name,
    key,
    route: path,
    component: <Page />,
    hidden: !Icon,
    ...(Icon ? { icon: <Icon style={{ fontSize: 20 }} /> } : {}),
  };
}

const routes = [
  route("SnapTrade Redirect", "snapTradeRedirect", "/snapTradeRedirect", () =>
    import("layouts/SnapTradeRedirect")
  ),
  route("Auth Callback", "authCallback", "/auth/callback", () => import("layouts/AuthCallback")),
  route(
    "Brokerages and Accounts",
    "dashboard",
    "/brokeragesAndAccounts",
    () => import("layouts/brokeragesAndAccounts"),
    AccountBalanceWalletOutlined
  ),
  route(
    "Balance Sheet",
    "balanceSheet",
    "/balanceSheet",
    () => import("layouts/balanceSheet/BalanceSheet"),
    AccountBalanceOutlined
  ),
  route(
    "Income Statement",
    "incomeStatement",
    "/incomeStatement",
    () => import("layouts/incomeStatement/IncomeStatement"),
    ReceiptLongOutlined
  ),
  route("Billing", "billing", "/billing", () => import("layouts/billing")),
  route("Set Password", "setPassword", "/set-password", () =>
    import("layouts/setPassword/setPassword")
  ),
  route("Login", "login", "/login", () => import("layouts/login/login")),
  route("Send Password Reset", "sendPasswordReset", "/send-password-reset", () =>
    import("layouts/sendPasswordReset/sendPasswordReset")
  ),
  route(
    "The Owner's Manual",
    "look-through-earnings-manual",
    "/look-through-earnings-manual",
    () => import("pages/LookThroughEarningsManual"),
    MenuBookOutlined
  ),
  route("Privacy Policy", "privacy", "/privacy", () => import("pages/Privacy")),
  route("Terms of Use", "terms", "/terms", () => import("pages/Terms")),
  route("Our Principles", "our-principles", "/our-principles", () => import("pages/OurPrinciples")),
];

export default routes;
