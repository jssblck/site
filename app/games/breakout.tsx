"use client"

/*
  breakout — paddle, ball, a wall of bricks. Move with arrows / a-d or the
  mouse; space launches the ball and retries after game over. Clear the wall and
  a fresh, slightly faster one drops in. Three lives; best score persists.
*/

import { useEffect, useReducer, useRef } from "react"
import { useStoredNumber } from "@/app/_client-state"
import { GameFrame } from "./_frame"

const W = 440
const H = 320
const PADDLE_W = 68
const PADDLE_H = 10
const BALL_R = 5
const COLS = 8
const ROWS = 5
const BRICK_GAP = 6
const BRICK_TOP = 36
const BRICK_H = 16

type State = {
  paddleX: number
  ballX: number
  ballY: number
  vx: number
  vy: number
  stuck: boolean
  bricks: boolean[]
  speed: number
  score: number
  lives: number
  best: number
  over: boolean
  started: boolean
  left: boolean
  right: boolean
}

const brickW = (W - BRICK_GAP) / COLS - BRICK_GAP
type Hud = { score: number; lives: number; over: boolean }
const INITIAL_HUD: Hud = { score: 0, lives: 3, over: false }

function freshBricks(): boolean[] {
  return Array.from({ length: COLS * ROWS }, () => true)
}

function hudReducer(_hud: Hud, next: Hud): Hud {
  return next
}

export default function Breakout() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const [hud, setHud] = useReducer(hudReducer, INITIAL_HUD)
  const { score, lives, over } = hud
  const [best, setBest] = useStoredNumber("jsh-breakout-best", 0)

  const s = useRef<State>({
    paddleX: W / 2 - PADDLE_W / 2,
    ballX: W / 2,
    ballY: H - 40,
    vx: 0,
    vy: 0,
    stuck: true,
    bricks: freshBricks(),
    speed: 3.4,
    score: 0,
    lives: 3,
    best: 0,
    over: false,
    started: false,
    left: false,
    right: false,
  })

  const resetBall = () => {
    const g = s.current
    g.stuck = true
    g.ballX = g.paddleX + PADDLE_W / 2
    g.ballY = H - 26
    g.vx = 0
    g.vy = 0
  }
  const launch = () => {
    const g = s.current
    if (g.over) {
      reset()
      return
    }
    g.started = true
    if (g.stuck) {
      g.stuck = false
      g.vx = (Math.random() < 0.5 ? -1 : 1) * g.speed * 0.6
      g.vy = -g.speed
    }
  }
  const reset = () => {
    const g = s.current
    g.bricks = freshBricks()
    g.score = 0
    g.lives = 3
    g.speed = 3.4
    g.over = false
    g.started = true
    g.paddleX = W / 2 - PADDLE_W / 2
    resetBall()
    setHud(INITIAL_HUD)
  }

  s.current.best = Math.max(s.current.best, best)

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === "arrowleft" || k === "a" || k === "h") {
      e.preventDefault()
      s.current.left = true
    } else if (k === "arrowright" || k === "d" || k === "l") {
      e.preventDefault()
      s.current.right = true
    } else if (k === " " || k === "enter") {
      e.preventDefault()
      launch()
    }
  }
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const css = (n: string, f: string) =>
      getComputedStyle(canvas).getPropertyValue(n).trim() || f

    // keyup isn't forwarded by GameFrame (it stops keydown only), so listen at
    // the window — otherwise a released key keeps the paddle gliding.
    const onKeyUpWin = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === "arrowleft" || k === "a" || k === "h") s.current.left = false
      else if (k === "arrowright" || k === "d" || k === "l") s.current.right = false
    }
    window.addEventListener("keyup", onKeyUpWin)

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * W
      s.current.paddleX = Math.max(0, Math.min(W - PADDLE_W, x - PADDLE_W / 2))
      if (s.current.stuck) s.current.ballX = s.current.paddleX + PADDLE_W / 2
    }
    canvas.addEventListener("mousemove", onMouse)

    const draw = () => {
      const g = s.current
      const bg = css("--jsh-bg-2", "#0e0e10")
      const accent = css("--jsh-amber", "#e0a23a")
      const soft = css("--jsh-amber-soft", "#b9893a")
      const fg = css("--jsh-fg", "#e8e6df")
      const rule = css("--jsh-rule", "#1f1f22")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      // bricks
      for (let i = 0; i < g.bricks.length; i++) {
        if (!g.bricks[i]) continue
        const c = i % COLS
        const r = Math.floor(i / COLS)
        const x = BRICK_GAP + c * (brickW + BRICK_GAP)
        const y = BRICK_TOP + r * (BRICK_H + BRICK_GAP)
        ctx.globalAlpha = 1 - r * 0.13
        ctx.fillStyle = accent
        ctx.fillRect(x, y, brickW, BRICK_H)
      }
      ctx.globalAlpha = 1
      // paddle
      ctx.fillStyle = soft
      ctx.fillRect(g.paddleX, H - 18, PADDLE_W, PADDLE_H)
      // ball
      ctx.fillStyle = fg
      ctx.fillRect(g.ballX - BALL_R, g.ballY - BALL_R, BALL_R * 2, BALL_R * 2)
      // hud
      ctx.fillStyle = rule
      ctx.fillRect(0, 24, W, 1)
      if (!g.started) {
        ctx.fillStyle = css("--jsh-muted", "#8a8780")
        ctx.font = "12px ui-monospace, monospace"
        ctx.textAlign = "center"
        ctx.fillText("space to launch · ← → or mouse to move", W / 2, H / 2)
        ctx.textAlign = "left"
      }
    }

    const tick = () => {
      const g = s.current
      if (g.started && !g.over) {
        const pSpeed = 6
        if (g.left) g.paddleX -= pSpeed
        if (g.right) g.paddleX += pSpeed
        g.paddleX = Math.max(0, Math.min(W - PADDLE_W, g.paddleX))
        if (g.stuck) {
          g.ballX = g.paddleX + PADDLE_W / 2
        } else {
          g.ballX += g.vx
          g.ballY += g.vy
          if (g.ballX < BALL_R) {
            g.ballX = BALL_R
            g.vx = Math.abs(g.vx)
          }
          if (g.ballX > W - BALL_R) {
            g.ballX = W - BALL_R
            g.vx = -Math.abs(g.vx)
          }
          if (g.ballY < BALL_R + 24) {
            g.ballY = BALL_R + 24
            g.vy = Math.abs(g.vy)
          }
          // paddle
          if (
            g.vy > 0 &&
            g.ballY + BALL_R >= H - 18 &&
            g.ballY < H - 8 &&
            g.ballX >= g.paddleX &&
            g.ballX <= g.paddleX + PADDLE_W
          ) {
            const hit = (g.ballX - (g.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2)
            const ang = hit * 1.05
            g.vx = g.speed * Math.sin(ang)
            g.vy = -Math.abs(g.speed * Math.cos(ang))
          }
          // bricks
          for (let i = 0; i < g.bricks.length; i++) {
            if (!g.bricks[i]) continue
            const c = i % COLS
            const r = Math.floor(i / COLS)
            const bx = BRICK_GAP + c * (brickW + BRICK_GAP)
            const by = BRICK_TOP + r * (BRICK_H + BRICK_GAP)
            if (
              g.ballX + BALL_R > bx &&
              g.ballX - BALL_R < bx + brickW &&
              g.ballY + BALL_R > by &&
              g.ballY - BALL_R < by + BRICK_H
            ) {
              g.bricks[i] = false
              g.score += 10
              setHud({ score: g.score, lives: g.lives, over: g.over })
              // bounce vertically (good enough)
              g.vy = -g.vy
              if (g.score > g.best) {
                g.best = g.score
                setBest(g.best)
              }
              break
            }
          }
          // cleared the wall? next level
          if (!g.bricks.some(Boolean)) {
            g.bricks = freshBricks()
            g.speed += 0.5
            resetBall()
          }
          // dropped
          if (g.ballY > H + 10) {
            g.lives -= 1
            if (g.lives <= 0) {
              g.over = true
            } else {
              resetBall()
            }
            setHud({ score: g.score, lives: g.lives, over: g.over })
          }
        }
      }
      draw()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener("mousemove", onMouse)
      window.removeEventListener("keyup", onKeyUpWin)
    }
  }, [setBest])

  return (
    <GameFrame
      title="breakout"
      status={`score ${score} · lives ${lives} · best ${best}`}
      hint={over ? "game over · space to retry · esc to quit" : "← → or mouse to move · space to launch · esc quit"}
      onKey={onKey}
      onActive={(a) => {
        if (!a) {
          s.current.left = false
          s.current.right = false
        }
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="jsh-game-canvas"
        aria-label="breakout"
      />
    </GameFrame>
  )
}
