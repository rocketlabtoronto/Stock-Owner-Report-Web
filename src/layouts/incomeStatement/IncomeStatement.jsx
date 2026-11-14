import FinancialStatement from "../financialStatements/FinancialStatement";
import { incomeStatement } from "../financialStatements/reports";

export default function IncomeStatement() {
  return <FinancialStatement report={incomeStatement} />;
}
