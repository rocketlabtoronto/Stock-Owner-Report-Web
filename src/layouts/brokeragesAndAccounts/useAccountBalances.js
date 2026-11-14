import { useEffect, useState } from "react";
import supabaseService from "services/supabaseService";
import { loadAccountBalances } from "./accountModel";

export default function useAccountBalances(accounts) {
  const [result, setResult] = useState({ accounts: null, balances: {}, loading: false });
  useEffect(() => {
    let active = true;
    const list = Array.isArray(accounts) ? accounts : [];
    setResult({ accounts, balances: {}, loading: list.length > 0 });
    loadAccountBalances(list, supabaseService.getStockPrices)
      .then((balances) => {
        if (active) setResult({ accounts, balances, loading: false });
      })
      .catch((error) => {
        console.error("Error loading account balances:", error);
        if (active) setResult({ accounts, balances: {}, loading: false });
      });
    return () => {
      active = false;
    };
  }, [accounts]);
  return result.accounts === accounts
    ? result
    : { balances: {}, loading: Boolean(accounts?.length) };
}
