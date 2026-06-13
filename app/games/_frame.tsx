"use client"

/*
  Shared chrome for the in-terminal games. Owns the focusable surface so games
  capture the keyboard cleanly: every keydown is stopped from bubbling to the
  shell's window listeners (which would otherwise steal focus back to the
  prompt), Escape quits, and focus/blur drive a pause signal. Games render their
  own canvas/board inside and read keys via onKey.
*/

import { use, useEffect, useRef } from "react"
import { GameExitContext } from "./_exit-context"

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
  status?: string
  hint?: string
  onKey?: (e: React.KeyboardEvent) => void
  onExit?: () => void
  onActive?: (active: boolean) => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const closeOverlay = use(GameExitContext)
  useEffect(() => {
    ref.current?.focus({ preventScroll: true })
  }, [])

  const exit = () => {
    onExit?.()
    closeOverlay()
    document.getElementById("jsh-input")?.focus()
  }

  return (
    <div
      className="jsh-game"
      tabIndex={-1}
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
