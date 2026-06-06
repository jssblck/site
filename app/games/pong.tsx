"use client"

/*
  pong — you (left) vs the machine (right). Move with ↑ ↓ (or w/s, k/j). The
  ball speeds up every rally and leaves the paddle at an angle based on where it
  hits. First to 11 wins; space serves and rematches. Longest rally persists.
*/

import { useEffect, useRef, useState } from "react"
import { GameFrame } from "./_frame"

const W = 480
const H = 320
const PW = 9
const PH = 58
const BALL = 7
const PSPEED = 6
const CPU_SPEED = 4.4
const BASE_SPEED = 4.2
const WIN = 11
const STEP = 1000 / 60
const PX = 18 // player paddle x
const CX = W - 18 - PW // cpu paddle x

type State = {
  ballX: number
  ballY: number
  vx: number
  vy: number
  pY: number
  cpuY: number
  up: boolean
  down: boolean
  pScore: number
  cpuScore: number
  rally: number
  best: number
  serveIn: number // ticks until the ball launches
  serveDir: number
  started: boolean
  over: 0 | 1 | 2 // 0 playing, 1 player won, 2 cpu won
}

export default function Pong() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const accRef = useRef(0)
  const activeRef = useRef(true)
  const [pScore, setPScore] = useState(0)
  const [cpuScore, setCpuScore] = useState(0)
  const [best, setBest] = useState(0)
  const [over, setOver] = useState(0)

  const s = useRef<State>({
    ballX: W / 2,
    ballY: H / 2,
    vx: 0,
    vy: 0,
    pY: H / 2 - PH / 2,
    cpuY: H / 2 - PH / 2,
    up: false,
    down: false,
    pScore: 0,
    cpuScore: 0,
    rally: 0,
    best: 0,
    serveIn: 90,
    serveDir: Math.random() < 0.5 ? -1 : 1,
    started: true,
    over: 0,
  })

  const serve = (g: State, dir: number) => {
    g.ballX = W / 2
    g.ballY = H / 2
    g.vx = 0
    g.vy = 0
    g.serveDir = dir
    g.serveIn = 50
    g.rally = 0
  }

  const reset = () => {
    const g = s.current
    g.pScore = 0
    g.cpuScore = 0
    g.over = 0
    g.started = true
    g.pY = H / 2 - PH / 2
    g.cpuY = H / 2 - PH / 2
    serve(g, Math.random() < 0.5 ? -1 : 1)
    setPScore(0)
    setCpuScore(0)
    setOver(0)
  }

  useEffect(() => {
    try {
      s.current.best = Number(localStorage.getItem("jsh-pong-best") || "0")
      setBest(s.current.best)
    } catch {
      /* ignore */
    }
  }, [])

  const onKey = (e: React.KeyboardEvent) => {
    const g = s.current
    const k = e.key.toLowerCase()
    if (g.over) {
      if (k === " " || k === "enter") {
        e.preventDefault()
        reset()
      }
      return
    }
    if (k === "arrowup" || k === "w" || k === "k") {
      e.preventDefault()
      g.up = true
    } else if (k === "arrowdown" || k === "s" || k === "j") {
      e.preventDefault()
      g.down = true
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const col = (n: string, f: string) =>
      getComputedStyle(canvas).getPropertyValue(n).trim() || f

    const onKeyUp = (e: KeyboardEvent) => {
      const g = s.current
      const k = e.key.toLowerCase()
      if (k === "arrowup" || k === "w" || k === "k") g.up = false
      else if (k === "arrowdown" || k === "s" || k === "j") g.down = false
    }
    window.addEventListener("keyup", onKeyUp)

    const saveBest = (g: State) => {
      if (g.rally > g.best) {
        g.best = g.rally
        setBest(g.best)
        try {
          localStorage.setItem("jsh-pong-best", String(g.best))
        } catch {
          /* ignore */
        }
      }
    }

    const update = () => {
      const g = s.current
      if (g.over) return

      // paddles
      if (g.up) g.pY -= PSPEED
      if (g.down) g.pY += PSPEED
      g.pY = Math.max(0, Math.min(H - PH, g.pY))

      // cpu: chase the ball when it's incoming, else drift to center (beatable)
      const target = g.vx > 0 ? g.ballY - PH / 2 : H / 2 - PH / 2
      const d = target - g.cpuY
      const speed = g.vx > 0 ? CPU_SPEED : CPU_SPEED * 0.5
      g.cpuY += Math.max(-speed, Math.min(speed, d))
      g.cpuY = Math.max(0, Math.min(H - PH, g.cpuY))

      // serve countdown
      if (g.serveIn > 0) {
        g.serveIn--
        if (g.serveIn === 0) {
          g.vx = g.serveDir * BASE_SPEED
          g.vy = (Math.random() * 2 - 1) * 2.2
        }
        return
      }

      g.ballX += g.vx
      g.ballY += g.vy
      if (g.ballY < BALL) {
        g.ballY = BALL
        g.vy = Math.abs(g.vy)
      }
      if (g.ballY > H - BALL) {
        g.ballY = H - BALL
        g.vy = -Math.abs(g.vy)
      }

      // player paddle
      if (
        g.vx < 0 &&
        g.ballX - BALL <= PX + PW &&
        g.ballX - BALL >= PX &&
        g.ballY >= g.pY &&
        g.ballY <= g.pY + PH
      ) {
        const off = (g.ballY - (g.pY + PH / 2)) / (PH / 2)
        const sp = Math.min(9, Math.hypot(g.vx, g.vy) + 0.4)
        g.vx = Math.abs(sp * Math.cos(off * 0.9))
        g.vy = sp * Math.sin(off * 0.9)
        g.ballX = PX + PW + BALL
        g.rally++
      }
      // cpu paddle
      if (
        g.vx > 0 &&
        g.ballX + BALL >= CX &&
        g.ballX + BALL <= CX + PW &&
        g.ballY >= g.cpuY &&
        g.ballY <= g.cpuY + PH
      ) {
        const off = (g.ballY - (g.cpuY + PH / 2)) / (PH / 2)
        const sp = Math.min(9, Math.hypot(g.vx, g.vy) + 0.4)
        g.vx = -Math.abs(sp * Math.cos(off * 0.9))
        g.vy = sp * Math.sin(off * 0.9)
        g.ballX = CX - BALL
        g.rally++
      }

      // scoring
      if (g.ballX < -BALL) {
        saveBest(g)
        g.cpuScore++
        setCpuScore(g.cpuScore)
        if (g.cpuScore >= WIN) {
          g.over = 2
          setOver(2)
        } else serve(g, -1)
      } else if (g.ballX > W + BALL) {
        saveBest(g)
        g.pScore++
        setPScore(g.pScore)
        if (g.pScore >= WIN) {
          g.over = 1
          setOver(1)
        } else serve(g, 1)
      }
    }

    const draw = () => {
      const g = s.current
      const bg = col("--jsh-bg-2", "#0e0e10")
      const accent = col("--jsh-amber", "#e0a23a")
      const fg = col("--jsh-fg", "#e8e6df")
      const muted = col("--jsh-muted", "#8a8780")
      const rule = col("--jsh-rule", "#1f1f22")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)

      // net
      ctx.strokeStyle = rule
      ctx.lineWidth = 2
      ctx.setLineDash([6, 10])
      ctx.beginPath()
      ctx.moveTo(W / 2, 0)
      ctx.lineTo(W / 2, H)
      ctx.stroke()
      ctx.setLineDash([])

      // scores
      ctx.fillStyle = muted
      ctx.font = "600 30px ui-monospace, monospace"
      ctx.textAlign = "center"
      ctx.fillText(String(g.pScore), W / 2 - 48, 44)
      ctx.fillText(String(g.cpuScore), W / 2 + 48, 44)
      ctx.textAlign = "left"

      // paddles + ball
      ctx.fillStyle = accent
      ctx.fillRect(PX, g.pY, PW, PH)
      ctx.fillRect(CX, g.cpuY, PW, PH)
      ctx.fillStyle = fg
      ctx.fillRect(g.ballX - BALL, g.ballY - BALL, BALL * 2, BALL * 2)

      ctx.fillStyle = muted
      ctx.font = "12px ui-monospace, monospace"
      ctx.textAlign = "center"
      if (g.pScore === 0 && g.cpuScore === 0 && g.serveIn > 0 && !g.over) {
        ctx.fillText("↑ ↓ to move · first to 11", W / 2, H - 26)
      } else if (g.over) {
        ctx.fillStyle = accent
        ctx.font = "600 22px ui-monospace, monospace"
        ctx.fillText(g.over === 1 ? "YOU WIN" : "CPU WINS", W / 2, H / 2 - 6)
        ctx.fillStyle = muted
        ctx.font = "12px ui-monospace, monospace"
        ctx.fillText("space to rematch", W / 2, H / 2 + 16)
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
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [])

  return (
    <GameFrame
      title="pong"
      status={
        <>
          you <b>{pScore}</b> · cpu <b>{cpuScore}</b> · longest rally <b>{best}</b>
        </>
      }
      hint={
        over ? (
          <>
            {over === 1 ? "you win" : "cpu wins"} · <b>space</b> rematch · <b>esc</b> quit
          </>
        ) : (
          <>
            <b>↑</b> <b>↓</b> move · first to 11 · <b>esc</b> quit
          </>
        )
      }
      onKey={onKey}
      onActive={(a) => {
        activeRef.current = a
        if (!a) {
          s.current.up = false
          s.current.down = false
        }
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="jsh-game-canvas"
        aria-label="pong"
      />
    </GameFrame>
  )
}
