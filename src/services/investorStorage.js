// src/services/investorStorage.js
//
// Investors and their transactions, backed by the API. Transactions are the
// ledger of record: invested / allocated / available figures are summed
// from them server-side rather than stored, so they cannot drift.
//
// Note on attribution: a loan allocation draws on the pool as a whole and
// is not tied to one investor, which is how this app has always worked.
// Per-investor "allocated" therefore stays 0; the pool-level summary is
// what onboarding checks before disbursing.

import { apiGet, apiPost, notifyDataUpdated } from "./api";

const EMPTY_SUMMARY = {
  totalInvestors: 0,
  totalInvestment: 0,
  distributedToLoans: 0,
  availableInvestmentBalance: 0,
};

export const getInvestors = async () => {
  try {
    const investors = await apiGet("/investors");

    return Array.isArray(investors) ? investors : [];
  } catch (error) {
    console.error("Failed to load investors:", error);

    return [];
  }
};

export const getInvestorById = async (investorId) => {
  try {
    return await apiGet(`/investors/${investorId}`);
  } catch (error) {
    console.error("Failed to load investor:", error);

    return null;
  }
};

export const getInvestorTransactions = async (investorId) => {
  try {
    const query = investorId ? `?investorId=${encodeURIComponent(investorId)}` : "";
    const transactions = await apiGet(`/investors/transactions${query}`);

    return Array.isArray(transactions) ? transactions : [];
  } catch (error) {
    console.error("Failed to load investor transactions:", error);

    return [];
  }
};

export const getFundingSummary = async () => {
  try {
    return await apiGet("/investors/summary");
  } catch (error) {
    console.error("Failed to load funding summary:", error);

    return { ...EMPTY_SUMMARY };
  }
};

export const getInvestmentPoolSummary = getFundingSummary;

export const getInvestorFundingSummary = async (investorId) => {
  const investor = await getInvestorById(investorId);

  return {
    totalInvested: investor?.investment?.totalInvested || 0,
    allocatedAmount: investor?.investment?.allocatedAmount || 0,
    availableBalance: investor?.investment?.availableBalance || 0,
  };
};

/**
 * Investor rows already carry their derived totals, so this is just the
 * list. Kept for the pages that import it by name.
 */
export const getInvestorSummaries = getInvestors;

export const createInvestor = async (input) => {
  const investor = await apiPost("/investors", input);

  notifyDataUpdated();

  return investor;
};

export const addInvestorInvestment = async ({ investorId, ...rest }) => {
  const result = await apiPost(`/investors/${investorId}/investments`, rest);

  notifyDataUpdated();

  return result.transaction;
};

/**
 * Funds a loan from the investment pool. The balance check and the
 * one-allocation-per-loan rule are enforced server-side.
 */
export const allocateInvestmentPoolToLoan = async ({ amount, loanId, loanNumber, date, notes }) => {
  const result = await apiPost("/investors/allocations", {
    amount,
    loanId,
    loanNumber,
    date,
    notes,
  });

  notifyDataUpdated();

  return result.transaction;
};

export const allocateInvestorToLoan = allocateInvestmentPoolToLoan;

export const getInvestorFundedLoans = async (investorId) =>
  (await getInvestorTransactions(investorId)).filter(
    (transaction) => transaction.type === "Loan Allocation"
  );

/**
 * The server assigns transaction ids on insert. Kept as an async no-op
 * shaped like the old helper so existing callers keep working.
 */
export const getNextInvestorTransactionId = () => "";
