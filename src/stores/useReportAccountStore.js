import { create } from "zustand";

// The account tab selects the report. It is shared so the Balance Sheet and the
// Income Statement always show the same account.
export const useReportAccountStore = create((set) => ({
  selectedAccountId: null,
  selectAccount: (selectedAccountId) => set({ selectedAccountId }),
}));
