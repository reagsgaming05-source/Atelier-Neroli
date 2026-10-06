import { useEffect, useState } from 'preact/hooks';

/**
 * A tiny persisted store: one JSON value in localStorage, shared by every
 * component that reads it. Storage failures (private mode, quota) are ignored —
 * the app keeps working with in-memory state.
 */
export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(fn: (value: T) => void): () => void;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    // Merge plain objects so new settings get their defaults after an update.
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
      return deepMerge(fallback, parsed);
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return (patch ?? base) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    const b = (base as Record<string, unknown>)?.[k];
    out[k] = b && typeof b === 'object' && !Array.isArray(b) && v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(b, v) : v;
  }
  return out as T;
}

export function createStore<T>(key: string, initial: T): Store<T> {
  let value = typeof localStorage === 'undefined' ? initial : readStorage(key, initial);
  const listeners = new Set<(value: T) => void>();

  return {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* storage unavailable */
      }
      listeners.forEach((fn) => fn(value));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function useStore<T>(store: Store<T>): [T, Store<T>['set']] {
  const [value, setValue] = useState(store.get);
  useEffect(() => {
    setValue(store.get());
    return store.subscribe(setValue);
  }, [store]);
  return [value, store.set];
}

/** Re-renders the caller every `ms` milliseconds and returns the current time. */
export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
