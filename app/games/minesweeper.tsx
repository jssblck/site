"use client"

/*
  minesweeper - 12×12, 24 mines. Reveal with click / enter / space, flag with
  right-click or f. Move the keyboard cursor with the arrows. The first reveal
  is always safe (mines are placed afterward, clear of where you tapped). Clear
  every safe cell to win; best time persists.
*/

import { useEffect, useReducer, useRef } from "react"
import { useStoredNumber } from "@/app/_client-state"
import { GameFrame } from "./_frame"

const COLS = 12
const ROWS = 12
const TOTAL = COLS * ROWS
const MINES = 24
const CELL = 30

type Status = "ready" | "playing" | "won" | "lost"
type MinesState = {
  mines: boolean[]
  counts: number[]
  revealed: boolean[]
  flagged: boolean[]
  status: Status
  cursor: number
  time: number
}
type MinesAction =
  | { type: "replace"; state: MinesState }
  | { type: "reset" }
  | { type: "tick" }
  | { type: "move"; cursor: number }

const neighbors = (idx: number): number[] => {
  const r = Math.floor(idx / COLS)
  const c = idx % COLS
  const out: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) out.push(nr * COLS + nc)
    }
  }
  return out
}

function genBoard(safe: number): { mines: boolean[]; counts: number[] } {
  const mines = Array.from({ length: TOTAL }, () => false)
  const banned = new Set([safe, ...neighbors(safe)])
  const slots: number[] = []
  for (let i = 0; i < TOTAL; i++) if (!banned.has(i)) slots.push(i)
  for (let placed = 0; placed < MINES && slots.length; placed++) {
    const j = Math.floor(Math.random() * slots.length)
    mines[slots[j]] = true
    slots.splice(j, 1)
  }
  const counts = Array.from({ length: TOTAL }, () => 0)
  for (let i = 0; i < TOTAL; i++) {
    if (mines[i]) continue
    counts[i] = neighbors(i).filter((n) => mines[n]).length
  }
  return { mines, counts }
}

// count → colour, ramping from quiet to loud
const NUM_COLOR = [
  "",
  "var(--jsh-muted)",
  "var(--jsh-amber-soft)",
  "var(--jsh-amber)",
  "var(--jsh-fg)",
  "var(--jsh-err)",
  "var(--jsh-err)",
  "var(--jsh-err)",
  "var(--jsh-err)",
]

const emptyFlags = () => Array.from({ length: TOTAL }, () => false)
const emptyCounts = () => Array.from({ length: TOTAL }, () => 0)
const initialMinesState = (): MinesState => ({
  mines: emptyFlags(),
  counts: emptyCounts(),
  revealed: emptyFlags(),
  flagged: emptyFlags(),
  status: "ready",
  cursor: Math.floor(TOTAL / 2) + COLS / 2,
  time: 0,
})

function minesReducer(state: MinesState, action: MinesAction): MinesState {
  switch (action.type) {
    case "replace":
      return action.state
    case "reset":
      return initialMinesState()
    case "tick":
      return state.status === "playing" ? { ...state, time: state.time + 1 } : state
    case "move":
      return { ...state, cursor: action.cursor }
  }
}

function revealNext(state: MinesState, idx: number): MinesState {
  if (state.status === "won" || state.status === "lost") return state
  if (state.flagged[idx] || state.revealed[idx]) return state

  let mines = state.mines
  let counts = state.counts
  let status = state.status
  if (status === "ready") {
    const board = genBoard(idx)
    mines = board.mines
    counts = board.counts
    status = "playing"
  }

  if (mines[idx]) {
    const revealed = state.revealed.slice()
    for (let i = 0; i < TOTAL; i++) if (mines[i]) revealed[i] = true
    return { ...state, mines, counts, revealed, status: "lost" }
  }

  const revealed = state.revealed.slice()
  const stack = [idx]
  while (stack.length) {
    const k = stack.pop() as number
    if (revealed[k] || state.flagged[k]) continue
    revealed[k] = true
    if (counts[k] === 0) {
      for (const n of neighbors(k)) {
        if (!revealed[n] && !mines[n] && !state.flagged[n]) stack.push(n)
      }
    }
  }

  const cleared = revealed.filter(Boolean).length
  return {
    ...state,
    mines,
    counts,
    revealed,
    status: cleared === TOTAL - MINES ? "won" : status,
  }
}

function toggleFlagNext(state: MinesState, idx: number): MinesState {
  if (state.status === "won" || state.status === "lost") return state
  if (state.revealed[idx]) return state
  const flagged = state.flagged.slice()
  flagged[idx] = !flagged[idx]
  return { ...state, flagged }
}

export default function Minesweeper() {
  const [state, dispatch] = useReducer(minesReducer, undefined, initialMinesState)
  const [best, setBest] = useStoredNumber("jsh-mines-best", 0)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (state.status !== "playing") return
    const id = window.setInterval(() => dispatch({ type: "tick" }), 1000)
    return () => window.clearInterval(id)
  }, [state.status])

  const reset = () => dispatch({ type: "reset" })

  const reveal = (idx: number) => {
    const current = stateRef.current
    const next = revealNext(current, idx)
    if (next === current) return
    dispatch({ type: "replace", state: next })
    if (current.status !== "won" && next.status === "won") {
      const finalTime = next.time
      const nextBest = best === 0 ? finalTime : Math.min(best, finalTime)
      setBest(nextBest)
    }
  }

  const toggleFlag = (idx: number) => {
    const current = stateRef.current
    const next = toggleFlagNext(current, idx)
    if (next !== current) dispatch({ type: "replace", state: next })
  }

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (state.status === "won" || state.status === "lost") {
      if (k === " " || k === "enter") {
        e.preventDefault()
        reset()
      }
      return
    }
    if (k === "arrowleft" || k === "h") {
      e.preventDefault()
      dispatch({ type: "move", cursor: state.cursor % COLS === 0 ? state.cursor : state.cursor - 1 })
    } else if (k === "arrowright" || k === "l") {
      e.preventDefault()
      dispatch({
        type: "move",
        cursor: state.cursor % COLS === COLS - 1 ? state.cursor : state.cursor + 1,
      })
    } else if (k === "arrowup" || k === "k") {
      e.preventDefault()
      dispatch({ type: "move", cursor: state.cursor < COLS ? state.cursor : state.cursor - COLS })
    } else if (k === "arrowdown" || k === "j") {
      e.preventDefault()
      dispatch({
        type: "move",
        cursor: state.cursor >= TOTAL - COLS ? state.cursor : state.cursor + COLS,
      })
    } else if (k === " " || k === "enter") {
      e.preventDefault()
      reveal(state.cursor)
    } else if (k === "f") {
      e.preventDefault()
      toggleFlag(state.cursor)
    }
  }

  const flagCount = state.flagged.filter(Boolean).length
  const cellStyle = (i: number): React.CSSProperties => {
    const isRev = state.revealed[i]
    const base: React.CSSProperties = {
      width: CELL,
      height: CELL,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 15,
      fontWeight: 700,
      fontVariantNumeric: "tabular-nums",
      cursor: state.status === "won" || state.status === "lost" ? "default" : "pointer",
      userSelect: "none",
      padding: 0,
      boxSizing: "border-box",
      fontFamily: "inherit",
      outline: i === state.cursor ? "2px solid var(--jsh-amber)" : "none",
      outlineOffset: -2,
    }
    if (isRev) {
      return {
        ...base,
        background: "var(--jsh-bg-2)",
        border: "1px solid var(--jsh-rule-2)",
        color: state.mines[i] ? "var(--jsh-err)" : NUM_COLOR[state.counts[i]] || "transparent",
      }
    }
    return {
      ...base,
      background: "var(--jsh-surface-2)",
      border: "1px solid var(--jsh-rule)",
      color: "var(--jsh-amber)",
    }
  }

  return (
    <GameFrame
      title="minesweeper"
      status={`mines ${Math.max(0, MINES - flagCount)} · time ${state.time}s · best ${best || "-"}${state.status === "won" ? " · cleared!" : state.status === "lost" ? " · boom" : ""}`}
      hint={
        state.status === "won" || state.status === "lost"
          ? `${state.status === "won" ? "swept clean" : "boom"} · space to retry · esc to quit`
          : "click reveal · right-click/f flag · arrows move · esc quit"
      }
      onKey={onKey}
    >
      <div
        style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gap: 2 }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: TOTAL }, (_, i) => (
          <button
            type="button"
            key={i}
            style={cellStyle(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              dispatch({ type: "move", cursor: i })
              reveal(i)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              dispatch({ type: "move", cursor: i })
              toggleFlag(i)
            }}
          >
            {state.flagged[i] && !state.revealed[i]
              ? "⚑"
              : state.revealed[i]
                ? state.mines[i]
                  ? "✸"
                  : state.counts[i] > 0
                    ? state.counts[i]
                    : ""
                : ""}
          </button>
        ))}
      </div>
    </GameFrame>
  )
}
