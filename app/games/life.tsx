"use client"

/*
  life — Conway's Game of Life, the zero-player classic. Draw cells with the
  mouse; space plays/pauses; → steps one generation while paused; r reseeds a
  random soup; c clears; g drops a glider; ↑/↓ change speed. Edges wrap, so
  gliders sail off one side and back in the other.
*/

import { useEffect, useRef, useState } from "react"
import { GameFrame } from "./_frame"
import { useLazyRef } from "./_hooks"

const COLS = 48
const ROWS = 34
const CELL = 10
const W = COLS * CELL
const H = ROWS * CELL

const idx = (c: number, r: number) => r * COLS + c

function dropGlider(cells: Uint8Array, x: number, y: number) {
  const pts = [
    [1, 0],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ]
  for (const [dx, dy] of pts) {
    const c = (x + dx + COLS) % COLS
    const r = (y + dy + ROWS) % ROWS
    cells[idx(c, r)] = 1
  }
}

function populationOf(cells: Uint8Array) {
  let n = 0
  for (let i = 0; i < cells.length; i++) n += cells[i]
  return n
}

function seededCells(density = 0.22) {
  const cells = new Uint8Array(COLS * ROWS)
  for (let i = 0; i < cells.length; i++) cells[i] = Math.random() < density ? 1 : 0
  dropGlider(cells, 4, 4)
  dropGlider(cells, COLS - 10, ROWS - 10)
  return cells
}

export default function Life() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const accRef = useRef(0)
  const activeRef = useRef(true)

  const cellsRef = useLazyRef(seededCells)
  const nextRef = useLazyRef(() => new Uint8Array(COLS * ROWS))
  const runningRef = useRef(true)
  const rateRef = useRef(12) // generations per second
  const paintRef = useRef<{ down: boolean; val: number }>({ down: false, val: 1 })
  const stepRef = useRef<() => void>(() => {})

  const [running, setRunning] = useState(true)
  const [gen, setGen] = useState(0)
  const [pop, setPop] = useState(() => populationOf(cellsRef.current))
  const [rate, setRate] = useState(12)

  const seed = (density = 0.22) => {
    cellsRef.current = seededCells(density)
    nextRef.current.fill(0)
    setGen(0)
    setPop(populationOf(cellsRef.current))
  }

  const clear = () => {
    cellsRef.current.fill(0)
    setGen(0)
    setPop(0)
  }

  const step = () => {
    const c = cellsRef.current
    const n = nextRef.current
    for (let r = 0; r < ROWS; r++) {
      const rUp = (r - 1 + ROWS) % ROWS
      const rDn = (r + 1) % ROWS
      for (let col = 0; col < COLS; col++) {
        const cL = (col - 1 + COLS) % COLS
        const cR = (col + 1) % COLS
        const live =
          c[idx(cL, rUp)] +
          c[idx(col, rUp)] +
          c[idx(cR, rUp)] +
          c[idx(cL, r)] +
          c[idx(cR, r)] +
          c[idx(cL, rDn)] +
          c[idx(col, rDn)] +
          c[idx(cR, rDn)]
        n[idx(col, r)] = live === 3 || (live === 2 && c[idx(col, r)]) ? 1 : 0
      }
    }
    cellsRef.current = n
    nextRef.current = c
    setGen((g) => g + 1)
    setPop(populationOf(cellsRef.current))
  }
  stepRef.current = step

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === " ") {
      e.preventDefault()
      runningRef.current = !runningRef.current
      setRunning(runningRef.current)
    } else if (k === "arrowright" || k === "n") {
      e.preventDefault()
      if (!runningRef.current) step()
    } else if (k === "r") {
      e.preventDefault()
      seed()
    } else if (k === "c") {
      e.preventDefault()
      clear()
    } else if (k === "g") {
      e.preventDefault()
      dropGlider(
        cellsRef.current,
        Math.floor(Math.random() * COLS),
        Math.floor(Math.random() * ROWS),
      )
      setPop(populationOf(cellsRef.current))
    } else if (k === "arrowup") {
      e.preventDefault()
      rateRef.current = Math.min(30, rateRef.current + 2)
      setRate(rateRef.current)
    } else if (k === "arrowdown") {
      e.preventDefault()
      rateRef.current = Math.max(2, rateRef.current - 2)
      setRate(rateRef.current)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const col = (n: string, f: string) =>
      getComputedStyle(canvas).getPropertyValue(n).trim() || f

    const cellAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const cx = Math.floor(((clientX - rect.left) / rect.width) * COLS)
      const cy = Math.floor(((clientY - rect.top) / rect.height) * ROWS)
      if (cx < 0 || cx >= COLS || cy < 0 || cy >= ROWS) return -1
      return idx(cx, cy)
    }
      const onDown = (e: MouseEvent) => {
      const i = cellAt(e.clientX, e.clientY)
      if (i < 0) return
      const val = cellsRef.current[i] ? 0 : 1
      paintRef.current = { down: true, val }
      cellsRef.current[i] = val
      setPop(populationOf(cellsRef.current))
    }
    const onMove = (e: MouseEvent) => {
      if (!paintRef.current.down) return
      const i = cellAt(e.clientX, e.clientY)
      if (i < 0) return
      cellsRef.current[i] = paintRef.current.val
      setPop(populationOf(cellsRef.current))
    }
    const onUp = () => {
      paintRef.current.down = false
    }
    canvas.addEventListener("mousedown", onDown)
    canvas.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)

    const draw = () => {
      const bg = col("--jsh-bg-2", "#0e0e10")
      const accent = col("--jsh-amber", "#e0a23a")
      const grid = col("--jsh-rule-2", "#17171a")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      // faint schematic grid
      ctx.strokeStyle = grid
      ctx.globalAlpha = 0.6
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let c = 0; c <= COLS; c++) {
        ctx.moveTo(c * CELL + 0.5, 0)
        ctx.lineTo(c * CELL + 0.5, H)
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.moveTo(0, r * CELL + 0.5)
        ctx.lineTo(W, r * CELL + 0.5)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
      // live cells
      ctx.fillStyle = accent
      const cells = cellsRef.current
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (cells[idx(c, r)]) ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2)
        }
      }
    }

    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (!lastRef.current) lastRef.current = t
      let dt = t - lastRef.current
      lastRef.current = t
      if (dt > 200) dt = 200
      if (activeRef.current && runningRef.current) {
        accRef.current += dt
        const stepMs = 1000 / rateRef.current
        let steps = 0
        while (accRef.current >= stepMs && steps < 4) {
          accRef.current -= stepMs
          stepRef.current()
          steps++
        }
      }
      draw()
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener("mousedown", onDown)
      canvas.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [cellsRef])

  return (
    <GameFrame
      title="life"
      status={`gen ${gen} · pop ${pop} · ${rate}/s · ${running ? "▶ running" : "⏸ paused"}`}
      hint="draw with mouse · space play/pause · → step · r seed · g glider · c clear · esc quit"
      onKey={onKey}
      onActive={(a) => {
        activeRef.current = a
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="jsh-game-canvas"
        aria-label="conway's game of life"
        style={{ cursor: "crosshair" }}
      />
    </GameFrame>
  )
}
