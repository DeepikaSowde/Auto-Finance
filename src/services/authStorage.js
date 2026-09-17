// src/services/authStorage.js
//
// Authentication now happens server-side against the users table
// (scrypt-hashed passwords) instead of the hardcoded DEMO_USERS array.
//
// login() is async because it makes a network call. getSession() stays
// synchronous on purpose: ProtectedRoute and several pages read it during
// render, so the session snapshot is mirrored into sessionStorage and the
// bearer token in api.js authorises the actual API calls.

import { apiPost, setToken } from "./api";

const SESSION_KEY = "auto_finance_session";

const storeSession = (session) => {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to persist login session:", error);
  }
};

export const login = async (username, password) => {
  try {
    const result = await apiPost("/auth/login", { username, password });

    setToken(result.token);
    storeSession(result.user);

    return { success: true, user: result.user };
  } catch (error) {
    return {
      success: false,
      message:
        error?.status === 401
          ? "Invalid username or password."
          : error?.message || "Unable to reach the server. Is the API running?",
    };
  }
};

export const getSession = () => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);

    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Failed to read login session:", error);

    return null;
  }
};

export const logout = async () => {
  try {
    await apiPost("/auth/logout");
  } catch {
    // Even if the server call fails the local session must still clear.
  }

  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }

  setToken("");
};

export const isLoggedIn = () => Boolean(getSession());
