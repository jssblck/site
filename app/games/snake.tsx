"use client"

/*
  snake — the canonical terminal game. Grid + canvas, fixed-timestep loop,
  theme-aware colors. Arrows / WASD / hjkl to steer; eat the squares, don't
  bite yourself or the walls. Best score persists per browser.
*/

import { useEffect, useRef, useState } from "react"
import { GameFrame, themeColors } from "./_frame"

const COLS = 24
const ROWS = 16
const CELL = 20
const W = COLS * CELL
const H = ROWS * CELL
const START_MS = 130
const MIN_MS = 64

type P = { x: number; y: number }

export default function Snake() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [over, setOver] = useState(false)
  const [started, setStarted] = useState(false)

  const snake = useRef<P[]>([])
  const dir = useRef<P>({ x: 1, y: 0 })
  const nextDir = useRef<P>({ x: 1, y: 0 })
  const food = useRef<P>({ x: 12, y: 8 })
  const scoreRef = useRef(0)
  const bestRef = useRef(0)
  const speedRef = useRef(START_MS)
  const active = useRef(true)
  const startedRef = useRef(false)
  const overRef = useRef(false)
  const accRef = useRef(0)
  const lastRef = useRef(0)
  const rafRef = useRef(0)

  const placeFood = () => {
    let f: P
    do {
      f = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      }
    } while (snake.current.some((s) => s.x === f.x && s.y === f.y))
    food.current = f
  }

  const reset = () => {
    snake.current = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ]
    dir.current = { x: 1, y: 0 }
    nextDir.current = { x: 1, y: 0 }
    placeFood()
    speedRef.current = START_MS
    scoreRef.current = 0
    setScore(0)
    overRef.current = false
    setOver(false)
    accRef.current = 0
    lastRef.current = 0
  }

  useEffect(() => {
    try {
      bestRef.current = Number(localStorage.getItem("jsh-snake-best") || "0")
      setBest(bestRef.current)
    } catch {
      /* ignore */
    }
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const step = () => {
    dir.current = nextDir.current
    const s = snake.current
    const head = { x: s[0].x + dir.current.x, y: s[0].y + dir.current.y }
    if (
      head.x < 0 ||
      head.x >= COLS ||
      head.y < 0 ||
      head.y >= ROWS ||
      s.some((p) => p.x === head.x && p.y === head.y)
    ) {
      overRef.current = true
      setOver(true)
      startedRef.current = false
      setStarted(false)
      const b = Math.max(bestRef.current, scoreRef.current)
      bestRef.current = b
      setBest(b)
      try {
        localStorage.setItem("jsh-snake-best", String(b))
      } catch {
        /* ignore */
      }
      return
    }
    s.unshift(head)
    if (head.x === food.current.x && head.y === food.current.y) {
      scoreRef.current += 1
      setScore(scoreRef.current)
      placeFood()
      if (speedRef.current > MIN_MS) speedRef.current -= 3
    } else {
      s.pop()
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      const c = themeColors(canvas)
      ctx.fillStyle = c.bg
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = c.rule
      ctx.globalAlpha = 0.45
      ctx.lineWidth = 1
      for (let x = 0; x <= COLS; x++) {
        ctx.beginPath()
        ctx.moveTo(x * CELL + 0.5, 0)
        ctx.lineTo(x * CELL + 0.5, H)
        ctx.stroke()
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * CELL + 0.5)
        ctx.lineTo(W, y * CELL + 0.5)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      const f = food.current
      ctx.fillStyle = c.fg
      ctx.fillRect(f.x * CELL + 5, f.y * CELL + 5, CELL - 10, CELL - 10)
      snake.current.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? c.accent : c.soft
        ctx.fillRect(p.x * CELL + 2, p.y * CELL + 2, CELL - 4, CELL - 4)
      })
    }

    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (!active.current) {
        lastRef.current = 0
        return
      }
      if (!lastRef.current) lastRef.current = t
      const dt = t - lastRef.current
      lastRef.current = t
      if (startedRef.current && !overRef.current) {
        accRef.current += dt
        let guard = 0
        while (accRef.current >= speedRef.current && guard++ < 8) {
          accRef.current -= speedRef.current
          step()
        }
      }
      draw()
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const begin = () => {
    if (!startedRef.current && !overRef.current) {
      startedRef.current = true
      setStarted(true)
      lastRef.current = 0
      accRef.current = 0
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    const turn = (x: number, y: number) => {
      if (dir.current.x === -x && dir.current.y === -y) return // no 180°
      nextDir.current = { x, y }
    }
    if (k === "arrowup" || k === "w" || k === "k") {
      e.preventDefault()
      turn(0, -1)
      begin()
    } else if (k === "arrowdown" || k === "s" || k === "j") {
      e.preventDefault()
      turn(0, 1)
      begin()
    } else if (k === "arrowleft" || k === "a" || k === "h") {
      e.preventDefault()
      turn(-1, 0)
      begin()
    } else if (k === "arrowright" || k === "d" || k === "l") {
      e.preventDefault()
      turn(1, 0)
      begin()
    } else if (k === " " || k === "enter") {
      e.preventDefault()
      if (overRef.current) {
        reset()
        startedRef.current = true
        setStarted(true)
      } else {
        begin()
      }
    }
  }

  return (
    <GameFrame
      title="snake"
      status={
        <>
          score <b>{score}</b> · best <b>{best}</b>
        </>
      }
      hint={
        over ? (
          <>
            game over · <b>space</b> to retry · <b>esc</b> to quit
          </>
        ) : started ? (
          <>
            arrows / wasd / hjkl to steer · <b>esc</b> to quit
          </>
        ) : (
          <>
            arrows / wasd / hjkl · <b>space</b> to start
          </>
        )
      }
      onKey={onKey}
      onActive={(a) => {
        active.current = a
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="jsh-game-canvas"
        aria-label="snake board"
      />
    </GameFrame>
  )
}
