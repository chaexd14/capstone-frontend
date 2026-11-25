import { createClient } from "@/lib/supabase/client";
import type { Application, CommunicationTemplate, Resume } from "@/types/application";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");

export interface PaginationFacets {
  status_counts?: Record<string, number>;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  next: string | null;
  previous: string | null;
  results: T[];
  facets?: PaginationFacets;
}

export interface PaginatedTasksResponse<T> extends PaginatedResponse<T> {
  summary: { open: number; overdue: number; due_today: number };
}

let cachedAccessToken: string | null = null;
let authListenerInitialized = false;
let pendingSessionPromise: Promise<string | null> | null = null;

function ensureAuthTokenListener() {
  if (authListenerInitialized || typeof window === "undefined") return;
  authListenerInitialized = true;
  try {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((_event, session) => {
      cachedAccessToken = session?.access_token ?? null;
    });
  } catch {
    authListenerInitialized = false;
  }
}

export function clearAuthTokenCache() {
  cachedAccessToken = null;
  pendingSessionPromise = null;
}

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
  ensureAuthTokenListener();
  if (cachedAccessToken) {
    return cachedAccessToken;
  }
  if (!pendingSessionPromise) {
    pendingSessionPromise = (async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        cachedAccessToken = session?.access_token || null;
        return cachedAccessToken;
      } catch {
        return null;
      } finally {
        pendingSessionPromise = null;
      }
    })();
  }
  return pendingSessionPromise;
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

export interface ResumePreviewPage {
  page_number: number;
  width: number;
  height: number;
  data_url: string;
}

export interface ResumePreviewResponse {
  format: string;
  page_count: number;
  rendered_pages: number;
  pages: ResumePreviewPage[];
}

const resumeBlobCache = new Map<string, Blob>();
const resumePreviewCache = new Map<number, ResumePreviewResponse>();
const resumeDetailCache = new Map<number, Resume>();
const resumeDetailInFlight = new Map<number, Promise<Resume>>();
let communicationTemplatesCache: CommunicationTemplate[] | null = null;
let communicationTemplatesInFlight: Promise<CommunicationTemplate[]> | null = null;

export function clearResumeBlobCache() {
  resumeBlobCache.clear();
  resumePreviewCache.clear();
  resumeDetailCache.clear();
  resumeDetailInFlight.clear();
  communicationTemplatesCache = null;
  communicationTemplatesInFlight = null;
  clearAuthTokenCache();
}

export function invalidateCommunicationTemplatesCache() {
  communicationTemplatesCache = null;
  communicationTemplatesInFlight = null;
}

export async function fetchCommunicationTemplatesCached(
  forceRefresh = false
): Promise<CommunicationTemplate[]> {
  if (!forceRefresh && communicationTemplatesCache !== null) {
    return communicationTemplatesCache;
  }
  if (!forceRefresh && communicationTemplatesInFlight) {
    return communicationTemplatesInFlight;
  }
  const request = (async () => {
    try {
      const data = await fetchApi<CommunicationTemplate[]>("/communication-templates/");
      communicationTemplatesCache = data;
      return data;
    } catch {
      const fallback = await fetchApi<CommunicationTemplate[]>("/applications/communication-templates/");
      communicationTemplatesCache = fallback;
      return fallback;
    } finally {
      communicationTemplatesInFlight = null;
    }
  })();
  communicationTemplatesInFlight = request;
  return request;
}

export async function fetchResumeDetail(resumeId: number, useCache = true): Promise<Resume> {
  if (useCache && resumeDetailCache.has(resumeId)) {
    return resumeDetailCache.get(resumeId)!;
  }
  if (useCache && resumeDetailInFlight.has(resumeId)) {
    return resumeDetailInFlight.get(resumeId)!;
  }

  const request = fetchApi<Resume>(`/resumes/${resumeId}/`)
    .then((data) => {
      if (useCache) {
        if (resumeDetailCache.size >= 40) {
          const oldestKey = resumeDetailCache.keys().next().value;
          if (oldestKey !== undefined) resumeDetailCache.delete(oldestKey);
        }
        resumeDetailCache.set(resumeId, data);
      }
      return data;
    })
    .finally(() => {
      resumeDetailInFlight.delete(resumeId);
    });

  if (useCache) {
    resumeDetailInFlight.set(resumeId, request);
  }
  return request;
}

export function prefetchResumeForApplication(app: Application | null | undefined, anonymize: boolean) {
  const resume = app?.resume;
  if (!app || !resume?.id || resume.is_purged) return;
  if (!resume.extracted_text && !resume.redacted_text && !resumeDetailCache.has(resume.id)) {
    void fetchResumeDetail(resume.id).catch(() => {});
  }
  const isRevealed = !anonymize || ["SHORTLISTED", "INTERVIEW", "HIRED"].includes(app.status);
  const isPdf =
    (resume.original_filename || "").toLowerCase().endsWith(".pdf") ||
    (resume.file_type || "").toLowerCase() === "application/pdf";
  if (isRevealed && isPdf && !resumePreviewCache.has(resume.id)) {
    void fetchResumePreview(resume.id).catch(() => {});
  }
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetchApiResponse(endpoint, options);
  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function fetchResumePreview(
  resumeId: number,
  useCache = true
): Promise<ResumePreviewResponse> {
  if (useCache && resumePreviewCache.has(resumeId)) {
    return resumePreviewCache.get(resumeId)!;
  }

  const data = await fetchApi<ResumePreviewResponse>(`/resumes/${resumeId}/preview/`);

  if (useCache) {
    if (resumePreviewCache.size >= 30) {
      const oldestKey = resumePreviewCache.keys().next().value;
      if (oldestKey !== undefined) resumePreviewCache.delete(oldestKey);
    }
    resumePreviewCache.set(resumeId, data);
  }

  return data;
}

export async function fetchApiBlob(
  endpoint: string,
  options: RequestInit = {},
  useCache = true
): Promise<Blob> {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const isGet = !options.method || options.method.toUpperCase() === "GET";

  if (useCache && isGet && resumeBlobCache.has(normalizedEndpoint)) {
    return resumeBlobCache.get(normalizedEndpoint)!;
  }

  const response = await fetchApiResponse(normalizedEndpoint, options);
  const blob = await response.blob();

  if (useCache && isGet) {
    // Keep cache bounded to 30 recent resume blobs to avoid memory bloat
    if (resumeBlobCache.size >= 30) {
      const oldestKey = resumeBlobCache.keys().next().value;
      if (oldestKey) resumeBlobCache.delete(oldestKey);
    }
    resumeBlobCache.set(normalizedEndpoint, blob);
  }

  return blob;
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
