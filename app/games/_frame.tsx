"use client"

/*
  Shared chrome for the in-terminal games. Owns the focusable surface so games
  capture the keyboard cleanly: every keydown is stopped from bubbling to the
  shell's window listeners (which would otherwise steal focus back to the
  prompt), Escape quits, and focus/blur drive a pause signal. Games render their
  own canvas/board inside and read keys via onKey.
*/

import { useEffect, useRef } from "react"

export function GameFrame({
  title,
  status,
  hint,
  onKey,
  onExit,
  onActive,
  children,
}: {
  title: string
  status?: React.ReactNode
  hint?: React.ReactNode
  onKey?: (e: React.KeyboardEvent) => void
  onExit?: () => void
  onActive?: (active: boolean) => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  const exit = () => {
    onExit?.()
    document.getElementById("jsh-input")?.focus()
  }

  return (
    <div
      className="jsh-game"
      tabIndex={0}
      ref={ref}
      role="application"
      aria-label={`${title} — a game`}
      onKeyDown={(e) => {
        // keep keys inside the game; never let them reach the shell
        e.stopPropagation()
        if (e.key === "Escape") {
          e.preventDefault()
          exit()
          return
        }
        onKey?.(e)
      }}
      onFocus={() => onActive?.(true)}
      onBlur={() => onActive?.(false)}
    >
      <div className="jsh-game-bar">
        <span className="jsh-game-title">▸ {title}</span>
        {status != null && <span className="jsh-game-status">{status}</span>}
        <button type="button" className="jsh-game-quit" onClick={exit}>
          esc ✕
        </button>
      </div>
      <div className="jsh-game-body">{children}</div>
      {hint != null && <div className="jsh-game-hint">{hint}</div>}
    </div>
  )
}

// Read the live theme colors off the CSS variables so games match amber /
// green / paper / pride automatically.
export function themeColors(el: HTMLElement | null) {
  const fallback = {
    bg: "#0e0e10",
    fg: "#e8e6df",
    accent: "#e0a23a",
    soft: "#b9893a",
    muted: "#8a8780",
    rule: "#1f1f22",
  }
  if (!el) return fallback
  const cs = getComputedStyle(el)
  const v = (name: string, f: string) => cs.getPropertyValue(name).trim() || f
  return {
    bg: v("--jsh-bg-2", fallback.bg),
    fg: v("--jsh-fg", fallback.fg),
    accent: v("--jsh-amber", fallback.accent),
    soft: v("--jsh-amber-soft", fallback.soft),
    muted: v("--jsh-muted", fallback.muted),
    rule: v("--jsh-rule", fallback.rule),
  }
}
