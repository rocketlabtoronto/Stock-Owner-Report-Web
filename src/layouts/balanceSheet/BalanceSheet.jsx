import FinancialStatement from "../financialStatements/FinancialStatement";
import { balanceSheet } from "../financialStatements/reports";

export default function BalanceSheet() {
  return <FinancialStatement report={balanceSheet} />;
}
