"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

const STORAGE_EVENT = "jsh-storage"

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function notifyStoredKey(key: string) {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { key } }))
}

function subscribeStoredKey(key: string, listener: () => void) {
  if (!isBrowser()) return () => {}

  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) listener()
  }
  const onLocalStorage = (event: Event) => {
    if ((event as CustomEvent<{ key?: string }>).detail?.key === key) listener()
  }

  window.addEventListener("storage", onStorage)
  window.addEventListener(STORAGE_EVENT, onLocalStorage)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(STORAGE_EVENT, onLocalStorage)
  }
}

function readStoredString(key: string, fallback = ""): string {
  if (!isBrowser()) return fallback
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function writeStoredString(key: string, value: string) {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    return
  }
  notifyStoredKey(key)
}

export function readStoredNumber(key: string, fallback = 0): number {
  const value = Number(readStoredString(key, String(fallback)))
  return Number.isFinite(value) ? value : fallback
}

export function writeStoredNumber(key: string, value: number) {
  writeStoredString(key, String(value))
}

export function useStoredString(key: string, fallback = "") {
  const subscribe = useCallback(
    (listener: () => void) => subscribeStoredKey(key, listener),
    [key],
  )
  const getSnapshot = useCallback(() => readStoredString(key, fallback), [key, fallback])
  const getServerSnapshot = useCallback(() => fallback, [fallback])
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setValue = useCallback((next: string) => writeStoredString(key, next), [key])
  return [value, setValue] as const
}

export function useStoredNumber(key: string, fallback = 0) {
  const [raw, setRaw] = useStoredString(key, String(fallback))
  const value = Number(raw)
  const setValue = useCallback((next: number) => setRaw(String(next)), [setRaw])
  return [Number.isFinite(value) ? value : fallback, setValue] as const
}

export function useStoredBoolean(key: string, fallback = false) {
  const [raw, setRaw] = useStoredString(key, fallback ? "1" : "0")
  const setValue = useCallback((next: boolean) => setRaw(next ? "1" : "0"), [setRaw])
  return [raw === "1", setValue] as const
}

export function useStoredJson<T>(
  key: string,
  fallback: T,
  validate: (value: unknown) => T | null,
) {
  const [raw, setRaw] = useStoredString(key, "")
  const value = useMemo(() => {
    if (!raw) return fallback
    try {
      return validate(JSON.parse(raw)) ?? fallback
    } catch {
      return fallback
    }
  }, [raw, fallback, validate])
  const setValue = useCallback((next: T) => setRaw(JSON.stringify(next)), [setRaw])
  return [value, setValue] as const
}

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!isBrowser()) return () => {}
      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener("change", listener)
      return () => mediaQuery.removeEventListener("change", listener)
    },
    [query],
  )
  const getSnapshot = useCallback(() => isBrowser() && window.matchMedia(query).matches, [query])
  const getServerSnapshot = useCallback(() => false, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export const usePrefersReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)")

export function useClientSnapshot<T>(getSnapshot: () => T, getServerSnapshot: () => T): T {
  const subscribe = useCallback(() => () => {}, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useWindowFocused(): boolean {
  const subscribe = useCallback((listener: () => void) => {
    if (!isBrowser()) return () => {}
    window.addEventListener("focus", listener)
    window.addEventListener("blur", listener)
    return () => {
      window.removeEventListener("focus", listener)
      window.removeEventListener("blur", listener)
    }
  }, [])
  const getSnapshot = useCallback(() => (isBrowser() ? document.hasFocus() : true), [])
  const getServerSnapshot = useCallback(() => true, [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useIntervalSnapshot(getValue: () => string, intervalMs: number) {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!isBrowser()) return () => {}
      const id = window.setInterval(listener, intervalMs)
      return () => window.clearInterval(id)
    },
    [intervalMs],
  )
  const getSnapshot = useCallback(() => (isBrowser() ? getValue() : ""), [getValue])
  const getServerSnapshot = useCallback(() => "", [])
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
