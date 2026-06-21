const TOKEN_KEY = "mini-study-web-token";
const DEVICE_KEY = "mini-study-device-id";

export const apiBase = "";

export function token() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function deviceId() {
  let value = localStorage.getItem(DEVICE_KEY);
  if (!value) {
    value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    localStorage.setItem(DEVICE_KEY, value);
  }
  return value;
}

export async function webLogin(accessCode: string) {
  const response = await fetch("/api/auth/web-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_code: accessCode, device_id: deviceId() }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "登录失败");
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token()}`);
  const response = await fetch(path, { ...init, headers });
  if (response.status === 401 || response.status === 403) clearToken();
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `请求失败 ${response.status}`);
  return data as T;
}

export function assetUrl(path?: string | null) {
  if (!path) return "";
  return path.startsWith("http") ? path : path;
}
