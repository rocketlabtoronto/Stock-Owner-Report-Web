import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "stores/store";
import { useReportAccountStore } from "stores/useReportAccountStore";
import supabaseService from "services/supabaseService";
import { logoFromBank } from "utils/brokerageLogos";
import {
  getAccountHoldings,
  getDefaultAccount,
  getFinancialAccounts,
  loadFinancialRows,
} from "./financialStatementModel";

const emptyAccounts = [];

// Account, financial institution, and exchange travel with each row as metadata. The table
// uses them to identify the holding; they are not report columns.
function buildHoldingMeta(allAccounts, holding) {
  const owningAccount = allAccounts.find((account) => account.holdings?.includes(holding));
  return {
    id: holding?.workspaceHoldingId || null,
    source: holding?.source || null,
    quantity: holding?.Quantity ?? "",
    accountName: owningAccount?.accountNumber || "",
    financialInstitution: owningAccount?.brokerageName || "",
    exchange: holding?.Market || "",
  };
}

export default function useFinancialStatement(report) {
  const accounts = useAppStore((state) => state.accounts) || emptyAccounts;
  const selectedAccountId = useReportAccountStore((state) => state.selectedAccountId);
  const setSelectedAccountId = useReportAccountStore((state) => state.selectAccount);
  const [result, setResult] = useState({ loading: true, rows: [] });
  const allAccountsWithLogos = useMemo(
    () => getFinancialAccounts(accounts, logoFromBank),
    [accounts]
  );
  const selectedAccount =
    allAccountsWithLogos.find((account) => account.id === selectedAccountId) ||
    getDefaultAccount(allAccountsWithLogos);
  const activeAccountId = selectedAccount?.id;

  useEffect(() => {
    let active = true;
    setResult({ loading: true, rows: [] });
    const holdings = getAccountHoldings(allAccountsWithLogos, activeAccountId);
    loadFinancialRows(holdings, report, supabaseService.getFinancials)
      .then((rows) => {
        if (!active) return;
        // __holding carries the identity/account context ProRataTable needs for
        // the Upload Portfolio Edit action; it is additive and unrelated to the
        // report's own columns.
        const rowsWithHoldingMeta = rows.map((row, index) => ({
          ...row,
          __holding: buildHoldingMeta(allAccountsWithLogos, holdings[index]),
        }));
        setResult({ loading: false, rows: rowsWithHoldingMeta });
      })
      .catch((error) => {
        console.error(`Failed to load ${report.title.toLowerCase()}:`, error);
        if (active) setResult({ loading: false, rows: [] });
      });
    // Ignore a response if the account changed or the page unmounted while loading.
    return () => {
      active = false;
    };
  }, [allAccountsWithLogos, activeAccountId, report]);

  return {
    loading: result.loading,
    aggregatedData: { columns: report.columns, rows: result.rows },
    allAccountsWithLogos,
    selectedAccount,
    selectAccount: setSelectedAccountId,
  };
}
