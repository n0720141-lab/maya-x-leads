const API_BASE = "/api";
export function getApiUrl(path: string) { return `${API_BASE}${path}`; }

// Auto-logout on auth errors (401, "User not found", "Invalid or expired token")
function forceLogoutIfAuthError(status: number, errMsg: string) {
  if (typeof window === "undefined") return;
  // Check if user was actually logged in before forcing redirect
  let hasActiveAuth = false;
  try {
    const stored = localStorage.getItem("mayax-auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      hasActiveAuth = !!(parsed?.state?.isAuthenticated || parsed?.state?.isSuperAdmin || parsed?.state?.token);
    }
  } catch {}
  if (!hasActiveAuth) return;

  const isAuthError =
    status === 401 ||
    status === 403 ||
    errMsg.toLowerCase().includes("user not found") ||
    errMsg.toLowerCase().includes("invalid or expired token") ||
    errMsg.toLowerCase().includes("authentication required") ||
    errMsg.toLowerCase().includes("tenant suspended");
  if (!isAuthError) return;
  // Clear all auth-related localStorage entries and reset Zustand store state
  try {
    localStorage.removeItem("mayax-auth");
    localStorage.removeItem("mayax-auth-token");
    const { useAppStore } = require("./store");
    if (useAppStore && useAppStore.getState) {
      useAppStore.getState().clearAuth();
    }
  } catch {}
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let authToken: string | null = null;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("mayax-auth");
      if (stored) {
        const parsed = JSON.parse(stored);
        authToken = parsed?.state?.superAdminToken || parsed?.state?.token || null;
      }
    } catch {}
    if (!authToken) authToken = localStorage.getItem("mayax-auth-token");
  }
  const res = await fetch(getApiUrl(path), {
    ...options,
    headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...(options?.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    let errMsg = `Error ${res.status}`;
    try {
      const text = await res.text();
      try {
        const err = JSON.parse(text);
        errMsg = err.error || err.message || errMsg;
      } catch {
        // If not JSON, try to extract useful info from HTML/text
        if (text.length < 200) errMsg = text;
        else errMsg = `Server error (${res.status}). Please try again.`;
      }
    } catch {
      errMsg = `Server error (${res.status}). Please try again.`;
    }
    // Auto-logout if this is an authentication problem
    forceLogoutIfAuthError(res.status, errMsg);
    throw new Error(errMsg);
  }
  return res.json();
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("mayax-auth");
    if (stored) {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.superAdminToken || parsed?.state?.token || null;
      if (token) return token;
    }
  } catch {}
  return localStorage.getItem("mayax-auth-token");
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const authToken = getAuthToken();
    const res = await fetch(getApiUrl(path), {
      method: "POST",
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      let errMsg = `Error ${res.status}`;
      try {
        const err = await res.json();
        errMsg = err.error || err.message || errMsg;
      } catch {}
      forceLogoutIfAuthError(res.status, errMsg);
      throw new Error(errMsg);
    }
    return res.json();
  },
};

