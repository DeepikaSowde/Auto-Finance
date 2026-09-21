// src/services/userStorage.js
//
// Admin user management — thin client over /api/auth/users.

import { apiDelete, apiGet, apiPost } from "./api";

export const getUsers = async () => {
  try {
    const users = await apiGet("/auth/users");

    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Failed to load users:", error);

    return [];
  }
};

export const createUser = (user) => apiPost("/auth/users", user);

export const deleteUser = (userId) => apiDelete(`/auth/users/${userId}`);
