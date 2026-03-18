/**
 * Global API fetch wrapper.
 * Automatically adds Authorization header from localStorage.
 * On 401, clears token and redirects to /login with session expired message.
 */

import API_URL from "./api";

export function getAuthHeaders(contentType = false): Record<string, string> {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (contentType) headers["Content-Type"] = "application/json";
  return headers;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem("access_token");

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // Token expired or invalid — clear and redirect
    localStorage.removeItem("access_token");
    localStorage.setItem("session_expired", "1");
    window.location.href = "/login";
  }

  return res;
}