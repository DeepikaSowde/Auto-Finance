// src/services/incomeStorage.js
//
// Manual, non-loan income — thin client over /api/incomes.

import { apiDelete, apiGet, apiPost, apiPut, notifyDataUpdated } from "./api";

export const getIncomes = async () => {
  try {
    const incomes = await apiGet("/incomes");

    return Array.isArray(incomes) ? incomes : [];
  } catch (error) {
    console.error("Failed to load incomes:", error);

    return [];
  }
};

export const getIncomeById = async (incomeId) => {
  try {
    return await apiGet(`/incomes/${incomeId}`);
  } catch (error) {
    console.error("Failed to load income:", error);

    return null;
  }
};

export const addIncome = async (income) => {
  const saved = await apiPost("/incomes", income);

  notifyDataUpdated();

  return saved;
};

export const updateIncome = async (incomeId, updates) => {
  const saved = await apiPut(`/incomes/${incomeId}`, updates);

  notifyDataUpdated();

  return saved;
};

export const deleteIncome = async (incomeId) => {
  await apiDelete(`/incomes/${incomeId}`);

  notifyDataUpdated();
};
