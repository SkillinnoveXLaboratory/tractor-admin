// Thin fetch wrapper for /api/admin. The token lives in localStorage and expires on the server after 8 hours.
const TOKEN_KEY = "tractor-admin-token";
export const API_ROOT = `${import.meta.env.VITE_API_ORIGIN || ""}/api/admin`;

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* storage blocked: the session lasts until reload */ }
};

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (handler) => { onUnauthorized = handler; };

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) if (value !== undefined && value !== null && value !== "") search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function api(path, { method = "GET", body, params, form } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(`${API_ROOT}${path}${buildQuery(params)}`, { method, headers, body: payload });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  }
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && !path.startsWith("/auth/login")) {
    setToken(null);
    onUnauthorized(data.message);
  }
  if (!response.ok) throw new ApiError(data.message || `Request failed (${response.status}).`, response.status);
  return data;
}

// Downloads a CSV export with the admin token (a plain link can't send the Authorization header).
export async function downloadCsv(path, params, filename) {
  const response = await fetch(`${API_ROOT}${path}${buildQuery(params)}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError(data.message || "Export failed.", response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
