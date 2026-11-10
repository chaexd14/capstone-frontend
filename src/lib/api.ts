import { createClient } from "@/lib/supabase/client";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string>;

  constructor(message: string, status: number, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function parseApiErrorPayload(
  errorData: unknown,
  fallbackMessage: string
): { message: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  if (!errorData || typeof errorData !== "object") {
    return { message: fallbackMessage, fieldErrors };
  }

  const data = errorData as Record<string, unknown>;
  let topMessage = "";

  if (typeof data.message === "string" && data.message.trim()) {
    topMessage = data.message.trim();
  } else if (typeof data.detail === "string" && data.detail.trim()) {
    topMessage = data.detail.trim();
  } else if (typeof data.error === "string" && data.error.trim()) {
    topMessage = data.error.trim();
  } else if (Array.isArray(data.non_field_errors) && typeof data.non_field_errors[0] === "string") {
    topMessage = data.non_field_errors[0];
  }

  for (const [key, val] of Object.entries(data)) {
    if (["message", "detail", "error", "non_field_errors"].includes(key)) continue;
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "string") {
      fieldErrors[key] = val[0];
    } else if (typeof val === "string" && val.trim()) {
      fieldErrors[key] = val.trim();
    }
  }

  if (!topMessage) {
    const firstFieldEntry = Object.entries(fieldErrors)[0];
    if (firstFieldEntry) {
      topMessage = firstFieldEntry[1];
    }
  }

  return {
    message: topMessage || fallbackMessage,
    fieldErrors,
  };
}

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "X-Requested-With": "XMLHttpRequest",
  };
  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchApiResponse(endpoint: string, options: RequestInit): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers || {});
  headers.set("X-Requested-With", "XMLHttpRequest");

  if (!headers.has("Authorization")) {
    const token = await getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "omit",
  });

  if (!response.ok) {
    const fallbackMessage = `Request failed (${response.status}). Please verify your input and try again.`;
    let parsed = { message: fallbackMessage, fieldErrors: {} as Record<string, string> };
    try {
      const errorData = await response.json();
      parsed = parseApiErrorPayload(errorData, fallbackMessage);
    } catch {
      // Ignore JSON parse error on non-json response
    }
    throw new ApiError(parsed.message, response.status, parsed.fieldErrors);
  }

  return response;
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return (await fetchApiResponse(endpoint, options)).json();
}

export async function downloadApiFile(endpoint: string, filename: string, options: RequestInit) {
  const response = await fetchApiResponse(endpoint, options);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  const serverFilename = response.headers.get("Content-Disposition")?.match(/filename="([a-z0-9._-]+)"/i)?.[1];
  link.download = serverFilename ?? filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
