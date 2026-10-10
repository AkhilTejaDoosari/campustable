"use client";

import { useCallback, useState } from "react";
import type { ApiEnvelope } from "./demo-data";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  demo: boolean;
}

export function useApiList<T>(resource: "people" | "projects" | "requests" | "messages", fallback: T): FetchState<T> {
  const [state] = useState<FetchState<T>>({ data: fallback, loading: false, error: null, demo: true });
  return state;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  try {
    const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
    const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
    if (!json) return { error: { code: "dependency_unavailable", message: "Service unavailable in demo mode. Your draft is preserved." } };
    return json;
  } catch {
    return { error: { code: "dependency_unavailable", message: "Service unavailable in demo mode. Your draft is preserved." } };
  }
}

export function useDraft(key: string, initial: string): [string, (v: string) => void] {
  const [value, setValue] = useState<string>(() => {
    if (typeof window === "undefined") return initial;
    return window.localStorage.getItem(key) ?? initial;
  });
  const update = useCallback(
    (v: string) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, v);
      } catch {
        /* storage unavailable */
      }
    },
    [key]
  );
  return [value, update];
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
