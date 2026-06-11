import { useRef } from "react"

export function useLazyRef<T>(factory: () => T) {
  const ref = useRef<T | null>(null)
  if (ref.current === null) ref.current = factory()
  return ref as React.MutableRefObject<T>
}
