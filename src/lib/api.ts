export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");
export const APP_CLIENT_KEY = process.env.NEXT_PUBLIC_APP_CLIENT_KEY || "talentmatch-client-key-2026";

export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Requested-With": "XMLHttpRequest",
    "X-App-Client-Key": APP_CLIENT_KEY,
  };
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers || {});
  headers.set("X-Requested-With", "XMLHttpRequest");
  headers.set("X-App-Client-Key", APP_CLIENT_KEY);

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.message) errorMessage = errorData.message;
      else if (errorData.detail) errorMessage = errorData.detail;
    } catch {
      // Ignore JSON parse error on non-json response
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
