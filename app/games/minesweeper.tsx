"use client"

/*
  minesweeper — 12×12, 24 mines. Reveal with click / enter / space, flag with
  right-click or f. Move the keyboard cursor with the arrows. The first reveal
  is always safe (mines are placed afterward, clear of where you tapped). Clear
  every safe cell to win; best time persists.
*/

import { useCallback, useEffect, useRef, useState } from "react"
import { GameFrame } from "./_frame"

const COLS = 12
const ROWS = 12
const TOTAL = COLS * ROWS
const MINES = 24
const CELL = 30

type Status = "ready" | "playing" | "won" | "lost"

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
  const mines = new Array(TOTAL).fill(false)
  const banned = new Set([safe, ...neighbors(safe)])
  const slots: number[] = []
  for (let i = 0; i < TOTAL; i++) if (!banned.has(i)) slots.push(i)
  for (let placed = 0; placed < MINES && slots.length; placed++) {
    const j = Math.floor(Math.random() * slots.length)
    mines[slots[j]] = true
    slots.splice(j, 1)
  }
  const counts = new Array(TOTAL).fill(0)
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

export default function Minesweeper() {
  const [mines, setMines] = useState<boolean[]>(() => new Array(TOTAL).fill(false))
  const [counts, setCounts] = useState<number[]>(() => new Array(TOTAL).fill(0))
  const [revealed, setRevealed] = useState<boolean[]>(() => new Array(TOTAL).fill(false))
  const [flagged, setFlagged] = useState<boolean[]>(() => new Array(TOTAL).fill(false))
  const [status, setStatus] = useState<Status>("ready")
  const [cursor, setCursor] = useState(Math.floor(TOTAL / 2) + COLS / 2)
  const [time, setTime] = useState(0)
  const [best, setBest] = useState(0)
  const statusRef = useRef<Status>("ready")
  statusRef.current = status

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem("jsh-mines-best") || "0"))
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (status !== "playing") return
    const id = window.setInterval(() => setTime((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [status])

  const reset = useCallback(() => {
    setMines(new Array(TOTAL).fill(false))
    setCounts(new Array(TOTAL).fill(0))
    setRevealed(new Array(TOTAL).fill(false))
    setFlagged(new Array(TOTAL).fill(false))
    setStatus("ready")
    setTime(0)
  }, [])

  const reveal = useCallback(
    (idx: number) => {
      if (statusRef.current === "won" || statusRef.current === "lost") return
      if (flagged[idx] || revealed[idx]) return

      let m = mines
      let c = counts
      if (statusRef.current === "ready") {
        const board = genBoard(idx)
        m = board.mines
        c = board.counts
        setMines(m)
        setCounts(c)
        setStatus("playing")
      }

      if (m[idx]) {
        const rev = revealed.slice()
        for (let i = 0; i < TOTAL; i++) if (m[i]) rev[i] = true
        setRevealed(rev)
        setStatus("lost")
        return
      }

      const rev = revealed.slice()
      const stack = [idx]
      while (stack.length) {
        const k = stack.pop() as number
        if (rev[k] || flagged[k]) continue
        rev[k] = true
        if (c[k] === 0) {
          for (const n of neighbors(k)) if (!rev[n] && !m[n] && !flagged[n]) stack.push(n)
        }
      }
      setRevealed(rev)

      const cleared = rev.filter(Boolean).length
      if (cleared === TOTAL - MINES) {
        setStatus("won")
        const finalT = time
        setBest((b) => {
          const val = b === 0 ? finalT : Math.min(b, finalT)
          try {
            localStorage.setItem("jsh-mines-best", String(val))
          } catch {
            /* ignore */
          }
          return val
        })
      }
    },
    [mines, counts, revealed, flagged, time],
  )

  const toggleFlag = useCallback(
    (idx: number) => {
      if (statusRef.current === "won" || statusRef.current === "lost") return
      if (revealed[idx]) return
      setFlagged((f) => {
        const nf = f.slice()
        nf[idx] = !nf[idx]
        return nf
      })
    },
    [revealed],
  )

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (status === "won" || status === "lost") {
      if (k === " " || k === "enter") {
        e.preventDefault()
        reset()
      }
      return
    }
    if (k === "arrowleft" || k === "h") {
      e.preventDefault()
      setCursor((i) => (i % COLS === 0 ? i : i - 1))
    } else if (k === "arrowright" || k === "l") {
      e.preventDefault()
      setCursor((i) => (i % COLS === COLS - 1 ? i : i + 1))
    } else if (k === "arrowup" || k === "k") {
      e.preventDefault()
      setCursor((i) => (i < COLS ? i : i - COLS))
    } else if (k === "arrowdown" || k === "j") {
      e.preventDefault()
      setCursor((i) => (i >= TOTAL - COLS ? i : i + COLS))
    } else if (k === " " || k === "enter") {
      e.preventDefault()
      reveal(cursor)
    } else if (k === "f") {
      e.preventDefault()
      toggleFlag(cursor)
    }
  }

  const flagCount = flagged.filter(Boolean).length
  const cellStyle = (i: number): React.CSSProperties => {
    const isRev = revealed[i]
    const base: React.CSSProperties = {
      width: CELL,
      height: CELL,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 15,
      fontWeight: 700,
      fontVariantNumeric: "tabular-nums",
      cursor: status === "won" || status === "lost" ? "default" : "pointer",
      userSelect: "none",
      boxSizing: "border-box",
      outline: i === cursor ? "2px solid var(--jsh-amber)" : "none",
      outlineOffset: -2,
    }
    if (isRev) {
      return {
        ...base,
        background: "var(--jsh-bg-2)",
        border: "1px solid var(--jsh-rule-2)",
        color: mines[i] ? "var(--jsh-err)" : NUM_COLOR[counts[i]] || "transparent",
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
      status={
        <>
          mines <b>{Math.max(0, MINES - flagCount)}</b> · time <b>{time}s</b> · best{" "}
          <b>{best || "—"}</b>
          {status === "won" ? (
            <>
              {" "}
              · <b>cleared!</b>
            </>
          ) : status === "lost" ? (
            <>
              {" "}
              · <b>boom</b>
            </>
          ) : null}
        </>
      }
      hint={
        status === "won" || status === "lost" ? (
          <>
            {status === "won" ? "swept clean" : "boom"} · <b>space</b> to retry ·{" "}
            <b>esc</b> to quit
          </>
        ) : (
          <>
            click reveal · <b>right-click</b>/<b>f</b> flag · arrows move · <b>esc</b> quit
          </>
        )
      }
      onKey={onKey}
    >
      <div
        style={{ display: "grid", gridTemplateColumns: `repeat(${COLS}, ${CELL}px)`, gap: 2 }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: TOTAL }, (_, i) => (
          <div
            key={i}
            style={cellStyle(i)}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setCursor(i)
              reveal(i)
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              setCursor(i)
              toggleFlag(i)
            }}
          >
            {flagged[i] && !revealed[i]
              ? "⚑"
              : revealed[i]
                ? mines[i]
                  ? "✸"
                  : counts[i] > 0
                    ? counts[i]
                    : ""
                : ""}
          </div>
        ))}
      </div>
    </GameFrame>
  )
}
