"use client"

/*
  2048 — slide tiles with the arrows; equal tiles merge and double. Reach 2048,
  then keep going until the board jams. Monochrome tiles: the accent gets more
  intense as the value climbs. Best score persists.
*/

import { useCallback, useEffect, useRef, useState } from "react"
import { GameFrame } from "./_frame"

const SIZE = 4
type Board = number[]
type Dir = "left" | "right" | "up" | "down"

const empty = (): Board => new Array(SIZE * SIZE).fill(0)

function spawn(b: Board): Board {
  const slots = b.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0)
  if (!slots.length) return b
  const i = slots[Math.floor(Math.random() * slots.length)]
  const nb = b.slice()
  nb[i] = Math.random() < 0.9 ? 2 : 4
  return nb
}

const rows = (b: Board) => {
  const out: number[][] = []
  for (let r = 0; r < SIZE; r++) out.push(b.slice(r * SIZE, r * SIZE + SIZE))
  return out
}
const flat = (rs: number[][]): Board => rs.flat()
const transpose = (rs: number[][]) => rs[0].map((_, c) => rs.map((row) => row[c]))
const reverse = (rs: number[][]) => rs.map((row) => row.slice().reverse())

function slideLeft(row: number[]): { row: number[]; gained: number } {
  const nums = row.filter((n) => n !== 0)
  const out: number[] = []
  let gained = 0
  for (let i = 0; i < nums.length; i++) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const merged = nums[i] * 2
      out.push(merged)
      gained += merged
      i++
    } else {
      out.push(nums[i])
    }
  }
  while (out.length < SIZE) out.push(0)
  return { row: out, gained }
}

function move(b: Board, dir: Dir): { board: Board; gained: number; moved: boolean } {
  let rs = rows(b)
  if (dir === "right") rs = reverse(rs)
  if (dir === "up") rs = transpose(rs)
  if (dir === "down") rs = reverse(transpose(rs))
  let gained = 0
  rs = rs.map((row) => {
    const r = slideLeft(row)
    gained += r.gained
    return r.row
  })
  if (dir === "right") rs = reverse(rs)
  if (dir === "up") rs = transpose(rs)
  if (dir === "down") rs = transpose(reverse(rs))
  const nb = flat(rs)
  return { board: nb, gained, moved: nb.some((v, i) => v !== b[i]) }
}

const canMove = (b: Board) =>
  b.some((v) => v === 0) ||
  (["left", "right", "up", "down"] as Dir[]).some((d) => move(b, d).moved)

export default function Game2048() {
  const [board, setBoard] = useState<Board>(() => spawn(spawn(empty())))
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [won, setWon] = useState(false)
  const [over, setOver] = useState(false)
  const boardRef = useRef(board)
  boardRef.current = board
  const bestRef = useRef(0)
  const overRef = useRef(false)
  overRef.current = over

  useEffect(() => {
    try {
      bestRef.current = Number(localStorage.getItem("jsh-2048-best") || "0")
      setBest(bestRef.current)
    } catch {
      /* ignore */
    }
  }, [])

  const reset = useCallback(() => {
    setBoard(spawn(spawn(empty())))
    setScore(0)
    setWon(false)
    setOver(false)
  }, [])

  const doMove = useCallback((dir: Dir) => {
    if (overRef.current) return
    const res = move(boardRef.current, dir)
    if (!res.moved) return
    const withNew = spawn(res.board)
    setBoard(withNew)
    if (res.gained > 0) {
      setScore((s) => {
        const ns = s + res.gained
        if (ns > bestRef.current) {
          bestRef.current = ns
          setBest(ns)
          try {
            localStorage.setItem("jsh-2048-best", String(ns))
          } catch {
            /* ignore */
          }
        }
        return ns
      })
    }
    if (withNew.includes(2048)) setWon(true)
    if (!canMove(withNew)) setOver(true)
  }, [])

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    const map: Record<string, Dir> = {
      arrowleft: "left", a: "left", h: "left",
      arrowright: "right", d: "right", l: "right",
      arrowup: "up", w: "up", k: "up",
      arrowdown: "down", s: "down", j: "down",
    }
    if (map[k]) {
      e.preventDefault()
      doMove(map[k])
    } else if (k === "r" || ((k === " " || k === "enter") && over)) {
      e.preventDefault()
      reset()
    }
  }

  const tileStyle = (v: number): React.CSSProperties => {
    if (v === 0) {
      return { background: "var(--jsh-surface)", border: "1px solid var(--jsh-rule)" }
    }
    const pct = Math.min(16 + Math.log2(v) * 9, 92)
    return {
      background: `color-mix(in srgb, var(--jsh-amber) ${pct}%, var(--jsh-bg-2))`,
      border: "1px solid var(--jsh-amber-soft)",
      color: pct > 52 ? "var(--jsh-bg)" : "var(--jsh-fg)",
      fontWeight: 600,
    }
  }

  return (
    <GameFrame
      title="2048"
      status={
        <>
          score <b>{score}</b> · best <b>{best}</b>
          {won && !over ? (
            <>
              {" "}
              · <b>2048!</b>
            </>
          ) : null}
        </>
      }
      hint={
        over ? (
          <>
            no moves left · <b>space</b> to retry · <b>esc</b> to quit
          </>
        ) : (
          <>
            arrows / wasd / hjkl to merge · <b>r</b> restart · <b>esc</b> quit
          </>
        )
      }
      onKey={onKey}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
          width: 320,
          maxWidth: "100%",
        }}
      >
        {board.map((v, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1 / 1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
              fontSize: v >= 1024 ? 17 : 22,
              fontVariantNumeric: "tabular-nums",
              transition: "background 120ms ease, color 120ms ease",
              ...tileStyle(v),
            }}
          >
            {v !== 0 ? v : ""}
          </div>
        ))}
      </div>
    </GameFrame>
  )
}
