// src/services/api.js
//
// Fetch client for the Auto Finance API. The bearer token lives in
// sessionStorage next to the session so that authStorage.getSession()
// can stay synchronous (ProtectedRoute reads it during render).

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export const TOKEN_KEY = "auto_finance_token";

export const getToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

export const setToken = (token) => {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Storage can be unavailable (private mode); the request layer will
    // simply act unauthenticated.
  }
};

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const request = async (path, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.error || `Request failed with status ${response.status}`,
      response.status
    );
  }

  return data;
};

export const apiGet = (path) => request(path);

export const apiPost = (path, body) =>
  request(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export const apiPut = (path, body) =>
  request(path, { method: "PUT", body: JSON.stringify(body ?? {}) });

export const apiDelete = (path) => request(path, { method: "DELETE" });

/*
 * Same-tab refresh signal. The app grew two different event names over
 * time, so both are dispatched to keep every existing listener working.
 */
export const notifyDataUpdated = () => {
  window.dispatchEvent(new CustomEvent("fleetopz:data-updated"));
  window.dispatchEvent(new CustomEvent("auto-finance:data-updated"));
};
