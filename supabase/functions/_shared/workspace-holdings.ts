// Business purpose: load a workspace's saved accounts/holdings in the same
// shape the dashboard already stores client-side (Account string, bank code,
// holdings with Symbol/Market/Quantity), so Excel-imported and brokerage-
// connected holdings both feed the existing Balance Sheet / Income Statement
// pipeline without further mapping on the client.
type QueryClient = {
  from: (table: string) => any;
};

export type WorkspaceHoldingRow = {
  Symbol: string;
  Market: string;
  Quantity: string;
  workspaceHoldingId: string;
  source: "excel_upload" | "brokerage_connection";
};

export type WorkspaceAccountGroup = {
  Account: string;
  bank: string;
  accountId: string;
  accountName: string;
  institutionCode: string;
  holdings: WorkspaceHoldingRow[];
};

export async function loadWorkspaceHoldings(
  supabase: QueryClient,
  workspaceId: string
): Promise<WorkspaceAccountGroup[]> {
  const { data: accounts, error: accountsError } = await supabase
    .from("workspace_accounts")
    .select("id, account_name, institution_code, financial_institutions(display_name)")
    .eq("workspace_id", workspaceId);
  if (accountsError) throw accountsError;

  const accountIds = (accounts ?? []).map((account: any) => account.id);
  let holdings: any[] = [];
  if (accountIds.length > 0) {
    const { data, error } = await supabase
      .from("workspace_holdings")
      .select("id, account_id, exchange_code, ticker, quantity, source")
      .in("account_id", accountIds);
    if (error) throw error;
    holdings = data ?? [];
  }

  return (accounts ?? []).map((account: any) => {
    const institutionName =
      account.financial_institutions?.display_name ?? account.institution_code;
    const accountHoldings: WorkspaceHoldingRow[] = holdings
      .filter((holding) => holding.account_id === account.id)
      .map((holding) => ({
        Symbol: holding.ticker,
        Market: holding.exchange_code,
        Quantity: String(holding.quantity),
        workspaceHoldingId: holding.id,
        source: holding.source,
      }));

    return {
      Account: `${institutionName} - ${account.account_name}`,
      bank: account.institution_code,
      accountId: account.id,
      accountName: account.account_name,
      institutionCode: account.institution_code,
      holdings: accountHoldings,
    };
  });
}
