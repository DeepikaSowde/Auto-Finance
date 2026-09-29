// src/services/authStorage.js
//
// Authentication now happens server-side against the users table
// (scrypt-hashed passwords) instead of the hardcoded DEMO_USERS array.
//
// login() is async because it makes a network call. getSession() stays
// synchronous on purpose: ProtectedRoute and several pages read it during
// render, so the session snapshot is mirrored into sessionStorage and the
// bearer token in api.js authorises the actual API calls.

import { apiGet, apiPost, setToken } from "./api";

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

/*
 * Re-reads the signed-in user from the API so permission changes an admin
 * made take effect without signing out. Returns the fresh session, or null
 * when the token is no longer valid (the local session is cleared then).
 */
export const refreshSession = async () => {
  const current = getSession();

  if (!current) {
    return null;
  }

  try {
    const { user } = await apiGet("/auth/me");
    const next = { ...current, ...user };

    storeSession(next);

    return next;
  } catch (error) {
    if (error?.status === 401) {
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // ignore
      }

      setToken("");

      return null;
    }

    // Network hiccup: keep the session we have.
    return current;
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
