"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchApi, type PaginatedResponse } from "@/lib/api";

const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 50;
const responseCache = new Map<string, { expires: number; value: PaginatedResponse<unknown> }>();
const inFlight = new Map<string, Promise<PaginatedResponse<unknown>>>();

function awaitWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DOMException("The request was aborted.", "AbortError"));

  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new DOMException("The request was aborted.", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

function cacheResponse<T>(key: string, value: PaginatedResponse<T>) {
  if (responseCache.size >= MAX_CACHE_ENTRIES && !responseCache.has(key)) {
    const oldest = responseCache.keys().next().value;
    if (oldest) responseCache.delete(oldest);
  }
  responseCache.set(key, { expires: Date.now() + CACHE_TTL_MS, value: value as PaginatedResponse<unknown> });
}

export function invalidatePaginatedCache(prefix?: string) {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) responseCache.delete(key);
  }
}

async function loadPage<T>(endpoint: string, signal?: AbortSignal, force = false) {
  const cached = responseCache.get(endpoint);
  if (!force && cached && cached.expires > Date.now()) {
    return cached.value as PaginatedResponse<T>;
  }
  const pending = inFlight.get(endpoint);
  if (!force && pending) {
    return awaitWithAbort(pending as Promise<PaginatedResponse<T>>, signal);
  }

  // The shared request must not inherit an individual component's AbortSignal.
  // React Strict Mode intentionally mounts, cleans up, and remounts effects; tying
  // the deduplicated promise to the first mount leaves the second with an aborted
  // promise and an empty collection.
  const request = fetchApi<PaginatedResponse<T>>(endpoint)
    .then((value) => {
      cacheResponse(endpoint, value);
      return value;
    })
    .finally(() => {
      if (inFlight.get(endpoint) === request) inFlight.delete(endpoint);
    });
  inFlight.set(endpoint, request as Promise<PaginatedResponse<unknown>>);
  return awaitWithAbort(request, signal);
}

export function usePaginatedApi<T>(endpoint: string | null) {
  const [data, setData] = useState<PaginatedResponse<T> | null>(null);
  const [loading, setLoading] = useState(Boolean(endpoint));
  const [error, setError] = useState("");
  const requestRef = useRef(0);

  const refresh = useCallback(async (force = true) => {
    if (!endpoint) return;
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    try {
      const value = await loadPage<T>(endpoint, controller.signal, force);
      if (requestId === requestRef.current) setData(value);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (requestId === requestRef.current) {
        setError(err instanceof Error ? err.message : "The data could not be loaded.");
      }
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
    return () => controller.abort();
  }, [endpoint]);

  useEffect(() => {
    if (!endpoint) {
      return;
    }
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const value = await loadPage<T>(endpoint, controller.signal);
        if (requestId === requestRef.current) setData(value);
      } catch (err) {
        if (controller.signal.aborted || requestId !== requestRef.current) return;
        setError(err instanceof Error ? err.message : "The data could not be loaded.");
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [endpoint]);

  return { data, loading, error, refresh, setData };
}
