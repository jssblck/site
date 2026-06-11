"use client"

/*
  tetris — 10x20 well, the seven tetrominoes, soft/hard drop, line clears,
  levels. Move with arrows / hjkl, rotate with up / w / k / x, soft drop with
  down, hard drop with space. Monochrome: locked blocks sit in the dim accent,
  the live piece in the bright one. Best score persists.
*/

import { useEffect, useRef, useState } from "react"
import { useStoredNumber } from "@/app/_client-state"
import { GameFrame } from "./_frame"
import { useLazyRef } from "./_hooks"

const COLS = 10
const ROWS = 20
const CELL = 20

type Cell = 0 | 1 | 2 // 0 empty, 1 locked, 2 active (drawn separately)
type Matrix = number[][]

const SHAPES: Matrix[] = [
  [[1, 1, 1, 1]], // I
  [[1, 1], [1, 1]], // O
  [[0, 1, 0], [1, 1, 1]], // T
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]], // Z
  [[1, 0, 0], [1, 1, 1]], // J
  [[0, 0, 1], [1, 1, 1]], // L
]
const SCORE_FOR = [0, 100, 300, 500, 800]

const rotateCW = (m: Matrix): Matrix =>
  m[0].map((_, c) => m.map((row) => row[c]).reverse())

const emptyBoard = (): Cell[] => Array.from({ length: COLS * ROWS }, () => 0)

type Piece = { m: Matrix; x: number; y: number }

function spawnPiece(): Piece {
  const m = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  return { m, x: Math.floor((COLS - m[0].length) / 2), y: 0 }
}

export default function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [best, setBest] = useStoredNumber("jsh-tetris-best", 0)
  const [over, setOver] = useState(false)

  const board = useLazyRef<Cell[]>(emptyBoard)
  const piece = useLazyRef<Piece>(spawnPiece)
  const scoreRef = useRef(0)
  const linesRef = useRef(0)
  const levelRef = useRef(1)
  const bestRef = useRef(best)
  bestRef.current = best
  const overRef = useRef(false)
  const dropAccRef = useRef(0)
  const lastRef = useRef(0)
  const rafRef = useRef(0)
  const softDropRef = useRef<() => void>(() => {})

  const collides = (m: Matrix, x: number, y: number) => {
    for (let r = 0; r < m.length; r++) {
      for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue
        const bx = x + c
        const by = y + r
        if (bx < 0 || bx >= COLS || by >= ROWS) return true
        if (by >= 0 && board.current[by * COLS + bx]) return true
      }
    }
    return false
  }

  const reset = () => {
    board.current = emptyBoard()
    piece.current = spawnPiece()
    scoreRef.current = 0
    linesRef.current = 0
    levelRef.current = 1
    overRef.current = false
    dropAccRef.current = 0
    setScore(0)
    setLines(0)
    setLevel(1)
    setOver(false)
  }

  const lock = () => {
    const p = piece.current
    for (let r = 0; r < p.m.length; r++) {
      for (let c = 0; c < p.m[r].length; c++) {
        if (p.m[r][c] && p.y + r >= 0) board.current[(p.y + r) * COLS + (p.x + c)] = 1
      }
    }
    // clear full lines
    let cleared = 0
    for (let r = ROWS - 1; r >= 0; r--) {
      let full = true
      for (let c = 0; c < COLS; c++) {
        if (!board.current[r * COLS + c]) {
          full = false
          break
        }
      }
      if (full) {
        board.current.splice(r * COLS, COLS)
        board.current.unshift(...Array.from({ length: COLS }, () => 0 as Cell))
        cleared++
        r++ // recheck the same row index after shift
      }
    }
    if (cleared > 0) {
      linesRef.current += cleared
      scoreRef.current += SCORE_FOR[cleared] * levelRef.current
      levelRef.current = 1 + Math.floor(linesRef.current / 10)
      setLines(linesRef.current)
      setScore(scoreRef.current)
      setLevel(levelRef.current)
      if (scoreRef.current > bestRef.current) {
        bestRef.current = scoreRef.current
        setBest(scoreRef.current)
      }
    }
    const next = spawnPiece()
    if (collides(next.m, next.x, next.y)) {
      overRef.current = true
      setOver(true)
    } else {
      piece.current = next
    }
  }

  const softDrop = () => {
    const p = piece.current
    if (!collides(p.m, p.x, p.y + 1)) {
      p.y += 1
    } else {
      lock()
    }
  }
  softDropRef.current = softDrop

  const move = (dx: number) => {
    const p = piece.current
    if (!collides(p.m, p.x + dx, p.y)) p.x += dx
  }

  const rotate = () => {
    const p = piece.current
    const rm = rotateCW(p.m)
    for (const kick of [0, -1, 1, -2, 2]) {
      if (!collides(rm, p.x + kick, p.y)) {
        p.m = rm
        p.x += kick
        return
      }
    }
  }

  const hardDrop = () => {
    const p = piece.current
    while (!collides(p.m, p.x, p.y + 1)) p.y += 1
    lock()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (overRef.current) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault()
        reset()
      }
      return
    }
    const k = e.key.toLowerCase()
    if (k === "arrowleft" || k === "a" || k === "h") {
      e.preventDefault()
      move(-1)
    } else if (k === "arrowright" || k === "d" || k === "l") {
      e.preventDefault()
      move(1)
    } else if (k === "arrowdown" || k === "s" || k === "j") {
      e.preventDefault()
      softDrop()
      dropAccRef.current = 0
    } else if (k === "arrowup" || k === "w" || k === "k" || k === "x") {
      e.preventDefault()
      rotate()
    } else if (k === " ") {
      e.preventDefault()
      hardDrop()
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const W = COLS * CELL
    const Hpx = ROWS * CELL

    const css = (name: string, f: string) =>
      getComputedStyle(canvas).getPropertyValue(name).trim() || f

    const cell = (cx: number, cy: number, color: string) => {
      ctx.fillStyle = color
      ctx.fillRect(cx * CELL + 1, cy * CELL + 1, CELL - 2, CELL - 2)
    }

    const draw = () => {
      const bg = css("--jsh-bg-2", "#0e0e10")
      const accent = css("--jsh-amber", "#e0a23a")
      const soft = css("--jsh-amber-soft", "#b9893a")
      const rule = css("--jsh-rule", "#1f1f22")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, Hpx)
      ctx.strokeStyle = rule
      ctx.globalAlpha = 0.4
      ctx.lineWidth = 1
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath()
        ctx.moveTo(x * CELL + 0.5, 0)
        ctx.lineTo(x * CELL + 0.5, Hpx)
        ctx.stroke()
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * CELL + 0.5)
        ctx.lineTo(W, y * CELL + 0.5)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      for (let i = 0; i < board.current.length; i++) {
        if (board.current[i]) cell(i % COLS, Math.floor(i / COLS), soft)
      }
      const p = piece.current
      for (let r = 0; r < p.m.length; r++) {
        for (let c = 0; c < p.m[r].length; c++) {
          if (p.m[r][c] && p.y + r >= 0) cell(p.x + c, p.y + r, accent)
        }
      }
    }

    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (!lastRef.current) lastRef.current = t
      const dt = t - lastRef.current
      lastRef.current = t
      if (!overRef.current) {
        const interval = Math.max(90, 600 - (levelRef.current - 1) * 55)
        dropAccRef.current += dt
        while (dropAccRef.current >= interval) {
          dropAccRef.current -= interval
          softDropRef.current()
        }
      }
      draw()
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [board, piece])

  return (
    <GameFrame
      title="tetris"
      status={`score ${score} · lines ${lines} · lvl ${level} · best ${best}`}
      hint={over ? "game over · space to retry · esc to quit" : "← → move · ↑ rotate · ↓ soft · space hard drop"}
      onKey={onKey}
    >
      <canvas
        ref={canvasRef}
        width={COLS * CELL}
        height={ROWS * CELL}
        className="jsh-game-canvas"
        aria-label="tetris well"
      />
    </GameFrame>
  )
}
