"use client"

/*
  404 — in the shell's voice, with a Chrome-style T-Rex runner to pass the time.
  Self-contained: this route doesn't mount the shell, so it carries its own
  palette + font. All game state lives in a ref and renders to canvas, so it
  never re-renders React while you play.
*/

import { useEffect, useRef } from "react"
import Link from "next/link"
import { IBM_Plex_Mono } from "next/font/google"

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})

const BG = "#0c0c0e"
const FG = "#e8e6df"
const AMBER = "#e0a23a"
const SOFT = "#b9893a"
const MUTED = "#8a8780"
const RULE = "#262629"
const ERR = "#d98a6a"

const W = 640
const H = 160
const GROUND = 128

type Ob = { x: number; w: number; h: number }
type State = {
  dinoY: number
  vy: number
  obstacles: Ob[]
  speed: number
  dist: number
  spawnIn: number
  frame: number
  started: boolean
  over: boolean
  score: number
  best: number
}

function TRex() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const s = useRef<State>({
    dinoY: 0,
    vy: 0,
    obstacles: [],
    speed: 5,
    dist: 0,
    spawnIn: 50,
    frame: 0,
    started: false,
    over: false,
    score: 0,
    best: 0,
  })

  const reset = () => {
    const g = s.current
    g.dinoY = 0
    g.vy = 0
    g.obstacles = []
    g.speed = 5
    g.dist = 0
    g.spawnIn = 50
    g.frame = 0
    g.over = false
    g.started = true
    g.score = 0
  }
  const jump = () => {
    const g = s.current
    if (g.over) {
      reset()
      return
    }
    if (!g.started) g.started = true
    if (g.dinoY <= 0.5) g.vy = 10.5
  }

  useEffect(() => {
    try {
      s.current.best = Number(localStorage.getItem("jsh-trex-best") || "0")
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp" || e.code === "Space") {
        e.preventDefault()
        jump()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const DINO_W = 40
    const DINO_H = 43
    const DX = 56

    const drawDino = (dy: number, running: boolean, frame: number) => {
      ctx.fillStyle = AMBER
      ctx.fillRect(DX, dy + 14, 24, 20) // body
      ctx.fillRect(DX + 20, dy, 18, 18) // head
      ctx.fillRect(DX + 34, dy + 8, 6, 4) // snout
      ctx.fillRect(DX - 6, dy + 9, 10, 8) // tail
      ctx.fillStyle = BG
      ctx.fillRect(DX + 30, dy + 5, 3, 3) // eye
      ctx.fillStyle = AMBER
      if (!running) {
        ctx.fillRect(DX + 4, dy + 32, 6, 9)
        ctx.fillRect(DX + 16, dy + 32, 6, 9)
      } else if (Math.floor(frame / 6) % 2 === 0) {
        ctx.fillRect(DX + 4, dy + 32, 6, 11)
        ctx.fillRect(DX + 16, dy + 33, 6, 8)
      } else {
        ctx.fillRect(DX + 4, dy + 33, 6, 8)
        ctx.fillRect(DX + 16, dy + 32, 6, 11)
      }
    }

    const drawCactus = (o: Ob) => {
      ctx.fillStyle = FG
      const x = o.x
      const top = GROUND - o.h
      ctx.fillRect(x + o.w / 2 - 2, top, 4, o.h) // trunk
      ctx.fillRect(x, top + o.h * 0.35, 3, o.h * 0.3) // left arm
      ctx.fillRect(x + o.w - 3, top + o.h * 0.22, 3, o.h * 0.3) // right arm
    }

    const draw = () => {
      const g = s.current
      ctx.fillStyle = BG
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = RULE
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, GROUND + 0.5)
      ctx.lineTo(W, GROUND + 0.5)
      ctx.stroke()
      ctx.fillStyle = RULE
      const off = g.dist * 1.2
      for (let i = -1; i < W / 40 + 1; i++) {
        ctx.fillRect(i * 40 - (off % 40), GROUND + 6, 14, 2)
      }
      g.obstacles.forEach(drawCactus)
      drawDino(GROUND - DINO_H - g.dinoY, g.started && !g.over, g.frame)

      ctx.fillStyle = MUTED
      ctx.font = "12px ui-monospace, monospace"
      ctx.textAlign = "right"
      ctx.fillText(
        `score ${String(g.score).padStart(5, "0")}   best ${String(
          Math.max(g.best, g.score),
        ).padStart(5, "0")}`,
        W - 12,
        22,
      )
      ctx.textAlign = "left"
      if (!g.started && !g.over) {
        ctx.fillStyle = MUTED
        ctx.fillText("press space (or tap) to run", DX + 70, GROUND - 30)
      }
      if (g.over) {
        ctx.fillStyle = ERR
        ctx.font = "600 16px ui-monospace, monospace"
        ctx.fillText("G A M E   O V E R", DX + 70, 60)
        ctx.fillStyle = MUTED
        ctx.font = "12px ui-monospace, monospace"
        ctx.fillText("space / tap to retry", DX + 70, 80)
      }
    }

    const tick = () => {
      const g = s.current
      if (g.started && !g.over) {
        g.frame++
        g.vy -= 0.55
        g.dinoY += g.vy
        if (g.dinoY < 0) {
          g.dinoY = 0
          g.vy = 0
        }
        g.dist += g.speed
        g.speed += 0.0016
        g.score = Math.floor(g.dist / 10)
        g.spawnIn--
        if (g.spawnIn <= 0) {
          const h = 20 + Math.floor(Math.random() * 22)
          const w = 12 + Math.floor(Math.random() * 14)
          g.obstacles.push({ x: W + 12, w, h })
          g.spawnIn = 58 + Math.floor(Math.random() * 60) - Math.min(28, g.speed * 2.4)
        }
        g.obstacles.forEach((o) => (o.x -= g.speed))
        g.obstacles = g.obstacles.filter((o) => o.x + o.w > -12)
        const dy = GROUND - DINO_H - g.dinoY
        const db = { x: DX + 6, y: dy + 8, w: DINO_W - 14, h: DINO_H - 12 }
        for (const o of g.obstacles) {
          const ob = { x: o.x, y: GROUND - o.h, w: o.w, h: o.h }
          if (
            db.x < ob.x + ob.w &&
            db.x + db.w > ob.x &&
            db.y < ob.y + ob.h &&
            db.y + db.h > ob.y
          ) {
            g.over = true
            g.best = Math.max(g.best, g.score)
            try {
              localStorage.setItem("jsh-trex-best", String(g.best))
            } catch {
              /* ignore */
            }
            break
          }
        }
      }
      draw()
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      onClick={jump}
      aria-label="T-Rex runner — press space to jump"
      style={{
        display: "block",
        width: "min(640px, 100%)",
        height: "auto",
        border: `1px solid ${RULE}`,
        borderRadius: 4,
        background: BG,
        imageRendering: "pixelated",
        cursor: "pointer",
      }}
    />
  )
}

export default function NotFound() {
  return (
    <main
      className={plex.className}
      style={{
        minHeight: "100dvh",
        background: BG,
        color: FG,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: 24,
      }}
    >
      <div style={{ width: "min(640px, 100%)" }}>
        <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
          <span style={{ color: SOFT }}>visitor@jessica.black</span>:~$ cd /the/page/you/wanted
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: ERR }}>
          cd: no such file or directory
        </p>
        <h1
          style={{
            margin: "16px 0 0",
            fontSize: "clamp(46px, 13vw, 96px)",
            letterSpacing: "-3px",
            lineHeight: 1,
            fontWeight: 600,
          }}
        >
          404
        </h1>
        <p style={{ margin: "6px 0 0", color: MUTED, fontSize: 14 }}>
          this page 404&apos;d. the dino, however, runs on.
        </p>
      </div>

      <TRex />

      <div style={{ width: "min(640px, 100%)", fontSize: 14 }}>
        <Link
          href="/"
          style={{
            color: AMBER,
            textDecoration: "none",
            borderBottom: `1px solid ${SOFT}`,
          }}
        >
          cd ~
        </Link>
        <span style={{ color: MUTED }}> &nbsp;·&nbsp; back to jessica.black</span>
      </div>
    </main>
  )
}
