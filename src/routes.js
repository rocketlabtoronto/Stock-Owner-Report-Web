// Add Look Through Earnings Manual page
import LookThroughEarningsManual from "pages/LookThroughEarningsManual";
import SnapTradeRedirect from "layouts/SnapTradeRedirect";
import BrokeragesAndAccounts from "layouts/brokeragesAndAccounts";
import BalanceSheet from "layouts/balanceSheet/BalanceSheet";
import Billing from "layouts/billing";
import IncomeStatement from "layouts/incomeStatement/IncomeStatement";
import SetPassword from "layouts/setPassword/setPassword";
import SendPasswordReset from "layouts/sendPasswordReset/sendPasswordReset.jsx";
import Login from "layouts/login/login";
import Privacy from "pages/Privacy";
import Terms from "pages/Terms";
import EnvironmentDebug from "components/EnvironmentDebug";

import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import ReceiptLongOutlined from "@mui/icons-material/ReceiptLongOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";

import CustomBox from "components/CustomBox";

const routes = [
  {
    type: "route",
    name: "SnapTrade Redirect",
    key: "snapTradeRedirect",
    route: "/snapTradeRedirect",
    icon: <CustomBox component="i" color="black" fontSize="14px" className="ni ni-curved-next" />,
    component: <SnapTradeRedirect />,
    hidden: true,
  },
  {
    type: "route",
    name: "Brokerages and Accounts",
    key: "dashboard",
    route: "/brokeragesAndAccounts",
    icon: <AccountBalanceWalletOutlined style={{ fontSize: 20 }} />,
    component: <BrokeragesAndAccounts />,
  },
  {
    type: "route",
    name: "Balance Sheet",
    key: "balanceSheet",
    route: "/balanceSheet",
    icon: <AccountBalanceOutlined style={{ fontSize: 20 }} />,
    component: <BalanceSheet />,
  },
  {
    type: "route",
    name: "Income Statement",
    key: "incomeStatement",
    route: "/incomeStatement",
    icon: <ReceiptLongOutlined style={{ fontSize: 20 }} />,
    component: <IncomeStatement />,
  },
  {
    type: "route",
    name: "Billing",
    key: "billing",
    route: "/billing",
    icon: <CustomBox component="i" color="black" fontSize="14px" className="ni ni-credit-card" />,
    component: <Billing />, // Billing does NOT require auth
    hidden: true,
  },
  {
    type: "route",
    name: "Set Password",
    key: "setPassword",
    route: "/set-password",
    icon: (
      <CustomBox component="i" color="black" fontSize="14px" className="ni ni-lock-circle-open" />
    ),
    component: <SetPassword />,
    hidden: true,
  },
  {
    type: "route",
    name: "Login",
    key: "login",
    route: "/login",
    icon: <CustomBox component="i" color="black" fontSize="14px" className="ni ni-key-25" />,
    component: <Login />,
    hidden: true,
  },
  {
    type: "route",
    name: "Send Password Reset",
    key: "sendPasswordReset",
    route: "/send-password-reset",
    icon: <CustomBox component="i" color="black" fontSize="14px" className="ni ni-email-83" />,
    component: <SendPasswordReset />,
    hidden: true,
  },
  {
    type: "route",
    name: "The Owner's Manual",
    key: "look-through-earnings-manual",
    route: "/look-through-earnings-manual",
    icon: <MenuBookOutlined style={{ fontSize: 20 }} />,
    component: <LookThroughEarningsManual />,
  },
  {
    type: "route",
    name: "Privacy Policy",
    key: "privacy",
    route: "/privacy",
    icon: <CustomBox component="i" color="black" fontSize="14px" className="ni ni-single-copy-04" />,
    component: <Privacy />,
    hidden: true,
  },
  {
    type: "route",
    name: "Terms of Use",
    key: "terms",
    route: "/terms",
    icon: <CustomBox component="i" color="black" fontSize="14px" className="ni ni-book-bookmark" />,
    component: <Terms />,
    hidden: true,
  },
  {
    type: "route",
    name: "Environment Debug",
    key: "environment-debug",
    route: "/environment-debug",
    icon: <CustomBox component="i" color="black" fontSize="14px" className="ni ni-settings" />,
    component: <EnvironmentDebug />,
    hidden: true,
  },
];

export default routes;
