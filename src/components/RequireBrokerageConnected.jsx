import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAppStore } from "stores/store";

export default function RequireBrokerageConnected({ children }) {
  const brokeragesAndAccounts = useAppStore((s) => s.brokeragesAndAccounts);
  const snapTradeAccounts = useAppStore((s) => s.snapTradeAccounts);
  const accounts = useAppStore((s) => s.accounts);

  const hasManual = Array.isArray(brokeragesAndAccounts) && brokeragesAndAccounts.length > 0;
  const hasSnapTrade = Array.isArray(snapTradeAccounts) && snapTradeAccounts.length > 0;
  const hasLegacy = Array.isArray(accounts) && accounts.length > 0;
  const isConnected = hasManual || hasSnapTrade || hasLegacy;

  if (!isConnected) return <Navigate to="/brokeragesAndAccounts" replace />;
  return children;
}

RequireBrokerageConnected.propTypes = {
  children: PropTypes.node.isRequired,
};
