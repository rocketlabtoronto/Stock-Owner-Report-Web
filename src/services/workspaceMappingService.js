import { inferBankFromName } from "services/snaptradeMappingService";
import { splitAccountLabel } from "utils/portfolioSchema";

// Maps saved workspace accounts (Excel uploads and persisted brokerage connections) into the
// account shape mapSnapTradeAccountsToSpreadsheet produces, with the same bank identifiers,
// so both sources run through the same report generation.
export const mapWorkspaceAccountsToSpreadsheet = (accounts = []) => ({
  mappedItems: (Array.isArray(accounts) ? accounts : []).map((account) => {
    const accountRaw = String(account?.Account || "");
    const [institutionName] = splitAccountLabel(accountRaw);
    return {
      accountRaw,
      bank: inferBankFromName(institutionName),
      holdings: Array.isArray(account?.holdings) ? account.holdings : [],
    };
  }),
});
