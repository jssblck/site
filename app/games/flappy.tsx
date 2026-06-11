"use client"

/*
  flappy — tap to flap, thread the gaps. Space / ↑ / click gives a little lift;
  gravity does the rest. Pipes scroll in and speed up. One touch ends it. Score
  is pipes cleared; best persists.
*/

import { useEffect, useRef, useState } from "react"
import { GameFrame } from "./_frame"

const W = 420
const H = 360
const GROUND_H = 28
const GROUND_Y = H - GROUND_H
const BIRD_X = 96
const BIRD_R = 11
const GRAVITY = 0.46
const FLAP = -7.2
const MAX_FALL = 9
const PIPE_W = 54
const GAP = 120
const SPACING = 198 // horizontal distance between pipes
const STEP = 1000 / 60

type Pipe = { x: number; gapY: number; passed: boolean }
type State = {
  birdY: number
  vy: number
  pipes: Pipe[]
  speed: number
  frame: number
  started: boolean
  over: boolean
  score: number
  best: number
}

const newPipe = (x: number): Pipe => ({
  x,
  gapY: 50 + Math.random() * (GROUND_Y - GAP - 100),
  passed: false,
})

const hitRect = (
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
) => {
  const nx = Math.max(rx, Math.min(cx, rx + rw))
  const ny = Math.max(ry, Math.min(cy, ry + rh))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy < r * r
}

export default function Flappy() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const accRef = useRef(0)
  const activeRef = useRef(true)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [over, setOver] = useState(false)

  const s = useRef<State>({
    birdY: H / 2,
    vy: 0,
    pipes: [],
    speed: 2.4,
    frame: 0,
    started: false,
    over: false,
    score: 0,
    best: 0,
  })

  const reset = () => {
    const g = s.current
    g.birdY = H / 2
    g.vy = 0
    g.pipes = [newPipe(W + 40)]
    g.speed = 2.4
    g.started = true
    g.over = false
    g.score = 0
    setScore(0)
    setOver(false)
  }

  const flap = () => {
    const g = s.current
    if (g.over) {
      reset()
      return
    }
    if (!g.started) {
      g.started = true
      if (!g.pipes.length) g.pipes = [newPipe(W + 40)]
    }
    g.vy = FLAP
  }

  useEffect(() => {
    try {
      s.current.best = Number(localStorage.getItem("jsh-flappy-best") || "0")
      setBest(s.current.best)
    } catch {
      /* ignore */
    }
  }, [])

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === " " || k === "arrowup" || k === "w" || k === "k" || k === "enter") {
      e.preventDefault()
      flap()
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const col = (n: string, f: string) =>
      getComputedStyle(canvas).getPropertyValue(n).trim() || f

    const update = () => {
      const g = s.current
      g.frame++
      if (!g.started || g.over) return

      g.vy = Math.min(MAX_FALL, g.vy + GRAVITY)
      g.birdY += g.vy
      g.speed += 0.0009

      for (const p of g.pipes) p.x -= g.speed
      if (g.pipes.length && g.pipes[g.pipes.length - 1].x < W - SPACING) {
        g.pipes.push(newPipe(W + PIPE_W))
      }
      g.pipes = g.pipes.filter((p) => p.x + PIPE_W > -4)

      for (const p of g.pipes) {
        if (!p.passed && p.x + PIPE_W < BIRD_X) {
          p.passed = true
          g.score++
          setScore(g.score)
          if (g.score > g.best) {
            g.best = g.score
            setBest(g.best)
            try {
              localStorage.setItem("jsh-flappy-best", String(g.best))
            } catch {
              /* ignore */
            }
          }
        }
      }

      // ceiling: soft clamp; ground + pipes: fatal
      if (g.birdY - BIRD_R < 0) {
        g.birdY = BIRD_R
        g.vy = 0
      }
      let dead = g.birdY + BIRD_R >= GROUND_Y
      for (const p of g.pipes) {
        if (
          hitRect(BIRD_X, g.birdY, BIRD_R, p.x, 0, PIPE_W, p.gapY) ||
          hitRect(BIRD_X, g.birdY, BIRD_R, p.x, p.gapY + GAP, PIPE_W, GROUND_Y - p.gapY - GAP)
        ) {
          dead = true
          break
        }
      }
      if (dead) {
        g.over = true
        setOver(true)
      }
    }

    const drawBird = (accent: string, bg: string) => {
      const g = s.current
      const ang = Math.max(-0.5, Math.min(0.9, g.vy * 0.07))
      ctx.save()
      ctx.translate(BIRD_X, g.birdY)
      ctx.rotate(ang)
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.moveTo(BIRD_R, 0)
      ctx.lineTo(-BIRD_R, -BIRD_R * 0.8)
      ctx.lineTo(-BIRD_R * 0.4, 0)
      ctx.lineTo(-BIRD_R, BIRD_R * 0.8)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = bg
      ctx.fillRect(BIRD_R * 0.2, -BIRD_R * 0.35, 2.5, 2.5) // eye
      ctx.restore()
    }

    const draw = () => {
      const g = s.current
      const bg = col("--jsh-bg-2", "#0e0e10")
      const accent = col("--jsh-amber", "#e0a23a")
      const soft = col("--jsh-amber-soft", "#b9893a")
      const rule = col("--jsh-rule", "#1f1f22")
      const muted = col("--jsh-muted", "#8a8780")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // pipes — wireframe rectangles with a faint fill
      ctx.lineWidth = 1.5
      for (const p of g.pipes) {
        ctx.fillStyle = "rgba(224,162,58,0.07)"
        ctx.strokeStyle = soft
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY)
        ctx.strokeRect(p.x + 0.5, 0.5, PIPE_W - 1, p.gapY)
        const by = p.gapY + GAP
        ctx.fillRect(p.x, by, PIPE_W, GROUND_Y - by)
        ctx.strokeRect(p.x + 0.5, by + 0.5, PIPE_W - 1, GROUND_Y - by - 1)
      }

      // ground line + scrolling hatch
      ctx.strokeStyle = rule
      ctx.beginPath()
      ctx.moveTo(0, GROUND_Y + 0.5)
      ctx.lineTo(W, GROUND_Y + 0.5)
      ctx.stroke()
      ctx.fillStyle = rule
      const off = (g.frame * g.speed) % 18
      for (let x = -18; x < W + 18; x += 18) {
        ctx.fillRect(x - off, GROUND_Y + 7, 9, 2)
      }

      drawBird(accent, bg)

      ctx.fillStyle = muted
      ctx.font = "12px ui-monospace, monospace"
      ctx.textAlign = "center"
      if (!g.started) {
        ctx.fillText("space / ↑ / click to flap", W / 2, H / 2 - 30)
      }
      if (g.over) {
        ctx.fillStyle = accent
        ctx.font = "600 20px ui-monospace, monospace"
        ctx.fillText("GAME OVER", W / 2, H / 2 - 18)
        ctx.fillStyle = muted
        ctx.font = "12px ui-monospace, monospace"
        ctx.fillText(`${g.score} cleared · space to retry`, W / 2, H / 2 + 4)
      }
      ctx.textAlign = "left"
    }

    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (!lastRef.current) lastRef.current = t
      let dt = t - lastRef.current
      lastRef.current = t
      if (dt > 100) dt = 100
      accRef.current += dt
      while (accRef.current >= STEP) {
        accRef.current -= STEP
        if (activeRef.current) update()
      }
      draw()
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <GameFrame
      title="flappy"
      status={`score ${score} · best ${best}`}
      hint={over ? "game over · space to retry · esc to quit" : "space / ↑ / click to flap · esc quit"}
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
        aria-label="flappy"
        onClick={flap}
        style={{ cursor: "pointer" }}
      />
    </GameFrame>
  )
}
