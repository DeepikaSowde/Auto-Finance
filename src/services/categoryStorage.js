// src/services/categoryStorage.js
//
// User-managed income/expense category lists — thin client over
// /api/categories.

import { apiDelete, apiGet, apiPost, notifyDataUpdated } from "./api";

export const getCategories = async (type) => {
  try {
    const query = type ? `?type=${encodeURIComponent(type)}` : "";
    const categories = await apiGet(`/categories${query}`);

    return Array.isArray(categories) ? categories : [];
  } catch (error) {
    console.error("Failed to load categories:", error);

    return [];
  }
};

export const addCategory = async (type, name) => {
  const saved = await apiPost("/categories", { type, name });

  notifyDataUpdated();

  return saved;
};

export const deleteCategory = async (categoryId) => {
  await apiDelete(`/categories/${categoryId}`);

  notifyDataUpdated();
};
