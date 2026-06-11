"use client"

/*
  asteroids — the vector classic, drawn as wireframe phosphor. Rotate with
  ← → (or a/d, h/l), thrust with ↑ / w / k, fire with space. Momentum carries
  and the screen wraps. Big rocks split into smaller, faster ones; clear the
  field and a bigger wave drifts in. Three ships; best score persists.
*/

import { useEffect, useRef, useState } from "react"
import { GameFrame } from "./_frame"
import { themeColors } from "./_theme"

const W = 460
const H = 320
const SHIP_R = 9
const TURN = 0.062 // radians per tick
const THRUST = 0.13
const FRICTION = 0.992
const MAX_SPEED = 5.4
const BULLET_SPEED = 5.6
const BULLET_LIFE = 64 // ticks
const FIRE_COOLDOWN = 9
const MAX_BULLETS = 5
const INVULN = 140 // ticks of post-spawn blink + immunity
const STEP = 1000 / 60 // fixed timestep

const R_BY_TIER = [34, 19, 10]
const SPD_BY_TIER = [0.7, 1.15, 1.7]
const SCORE = [20, 50, 100]

type Ast = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  tier: number
  ang: number
  spin: number
  shape: number[]
}
type Bullet = { x: number; y: number; vx: number; vy: number; life: number }
type State = {
  shipX: number
  shipY: number
  vx: number
  vy: number
  heading: number
  left: boolean
  right: boolean
  thrusting: boolean
  firing: boolean
  fireCd: number
  invuln: number
  frame: number
  bullets: Bullet[]
  asteroids: Ast[]
  level: number
  lives: number
  score: number
  best: number
  over: boolean
}

const wrap = (v: number, max: number) => (v < 0 ? v + max : v >= max ? v - max : v)

function makeAsteroid(x: number, y: number, tier: number): Ast {
  const ang = Math.random() * Math.PI * 2
  const spd = SPD_BY_TIER[tier] * (0.6 + Math.random() * 0.8)
  const n = 9 + Math.floor(Math.random() * 4)
  const shape: number[] = []
  for (let i = 0; i < n; i++) shape.push(0.74 + Math.random() * 0.46)
  return {
    x,
    y,
    vx: Math.cos(ang) * spd,
    vy: Math.sin(ang) * spd,
    r: R_BY_TIER[tier],
    tier,
    ang: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.05,
    shape,
  }
}

const saveBest = (g: State) => {
  try {
    localStorage.setItem("jsh-asteroids-best", String(g.best))
  } catch {
    /* ignore */
  }
}

const spawnAwayFromShip = (g: State, tier: number) => {
  let x = 0
  let y = 0
  let tries = 0
  do {
    x = Math.random() * W
    y = Math.random() * H
    tries++
  } while (tries < 30 && Math.hypot(x - g.shipX, y - g.shipY) < 110)
  g.asteroids.push(makeAsteroid(x, y, tier))
}

export default function Asteroids() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const accRef = useRef(0)
  const activeRef = useRef(true)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [best, setBest] = useState(0)
  const [over, setOver] = useState(false)

  const s = useRef<State>({
    shipX: W / 2,
    shipY: H / 2,
    vx: 0,
    vy: 0,
    heading: -Math.PI / 2,
    left: false,
    right: false,
    thrusting: false,
    firing: false,
    fireCd: 0,
    invuln: INVULN,
    frame: 0,
    bullets: [],
    asteroids: [],
    level: 0,
    lives: 3,
    score: 0,
    best: 0,
    over: false,
  })

  const nextWave = (g: State) => {
    g.level++
    setLevel(g.level)
    const count = 3 + g.level
    for (let i = 0; i < count; i++) spawnAwayFromShip(g, 0)
    g.invuln = Math.max(g.invuln, 60)
  }

  const loseLife = (g: State) => {
    g.lives--
    setLives(g.lives)
    g.bullets = []
    if (g.lives <= 0) {
      g.over = true
      setOver(true)
      saveBest(g)
      return
    }
    g.shipX = W / 2
    g.shipY = H / 2
    g.vx = 0
    g.vy = 0
    g.heading = -Math.PI / 2
    g.invuln = INVULN
  }

  const splitAsteroid = (g: State, idx: number) => {
    const a = g.asteroids[idx]
    g.score += SCORE[a.tier]
    setScore(g.score)
    if (g.score > g.best) {
      g.best = g.score
      setBest(g.best)
      saveBest(g)
    }
    g.asteroids.splice(idx, 1)
    if (a.tier < 2) {
      g.asteroids.push(makeAsteroid(a.x, a.y, a.tier + 1))
      g.asteroids.push(makeAsteroid(a.x, a.y, a.tier + 1))
    }
  }

  const reset = () => {
    const g = s.current
    g.shipX = W / 2
    g.shipY = H / 2
    g.vx = 0
    g.vy = 0
    g.heading = -Math.PI / 2
    g.bullets = []
    g.asteroids = []
    g.level = 0
    g.lives = 3
    g.score = 0
    g.invuln = INVULN
    g.over = false
    g.firing = false
    setScore(0)
    setLives(3)
    setOver(false)
    nextWave(g)
  }

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
    if (k === "arrowleft" || k === "a" || k === "h") {
      e.preventDefault()
      g.left = true
    } else if (k === "arrowright" || k === "d" || k === "l") {
      e.preventDefault()
      g.right = true
    } else if (k === "arrowup" || k === "w" || k === "k") {
      e.preventDefault()
      g.thrusting = true
    } else if (k === " ") {
      e.preventDefault()
      g.firing = true
    }
  }

  useEffect(() => {
    try {
      s.current.best = Number(localStorage.getItem("jsh-asteroids-best") || "0")
      setBest(s.current.best)
    } catch {
      /* ignore */
    }
    nextWave(s.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // keyup isn't forwarded by GameFrame (keydown only), so listen at the window
    const onKeyUp = (e: KeyboardEvent) => {
      const g = s.current
      const k = e.key.toLowerCase()
      if (k === "arrowleft" || k === "a" || k === "h") g.left = false
      else if (k === "arrowright" || k === "d" || k === "l") g.right = false
      else if (k === "arrowup" || k === "w" || k === "k") g.thrusting = false
      else if (k === " ") g.firing = false
    }
    window.addEventListener("keyup", onKeyUp)

    const update = () => {
      const g = s.current
      g.frame++
      // rocks always drift (even on the game-over screen)
      for (const a of g.asteroids) {
        a.x = wrap(a.x + a.vx, W)
        a.y = wrap(a.y + a.vy, H)
        a.ang += a.spin
      }
      if (g.over) return

      if (g.left) g.heading -= TURN
      if (g.right) g.heading += TURN
      if (g.thrusting) {
        g.vx += Math.cos(g.heading) * THRUST
        g.vy += Math.sin(g.heading) * THRUST
      }
      g.vx *= FRICTION
      g.vy *= FRICTION
      const sp = Math.hypot(g.vx, g.vy)
      if (sp > MAX_SPEED) {
        g.vx *= MAX_SPEED / sp
        g.vy *= MAX_SPEED / sp
      }
      g.shipX = wrap(g.shipX + g.vx, W)
      g.shipY = wrap(g.shipY + g.vy, H)
      if (g.invuln > 0) g.invuln--

      if (g.fireCd > 0) g.fireCd--
      if (g.firing && g.fireCd <= 0 && g.bullets.length < MAX_BULLETS) {
        g.bullets.push({
          x: g.shipX + Math.cos(g.heading) * SHIP_R,
          y: g.shipY + Math.sin(g.heading) * SHIP_R,
          vx: Math.cos(g.heading) * BULLET_SPEED,
          vy: Math.sin(g.heading) * BULLET_SPEED,
          life: BULLET_LIFE,
        })
        g.fireCd = FIRE_COOLDOWN
      }
      for (const b of g.bullets) {
        b.x = wrap(b.x + b.vx, W)
        b.y = wrap(b.y + b.vy, H)
        b.life--
      }
      g.bullets = g.bullets.filter((b) => b.life > 0)

      for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
        const b = g.bullets[bi]
        for (let ai = g.asteroids.length - 1; ai >= 0; ai--) {
          const a = g.asteroids[ai]
          const dx = b.x - a.x
          const dy = b.y - a.y
          if (dx * dx + dy * dy < a.r * a.r) {
            g.bullets.splice(bi, 1)
            splitAsteroid(g, ai)
            break
          }
        }
      }

      if (g.invuln <= 0) {
        for (const a of g.asteroids) {
          const dx = g.shipX - a.x
          const dy = g.shipY - a.y
          const hit = a.r + SHIP_R * 0.7
          if (dx * dx + dy * dy < hit * hit) {
            loseLife(g)
            break
          }
        }
      }

      if (g.asteroids.length === 0) nextWave(g)
    }

    const drawAsteroid = (a: Ast) => {
      const n = a.shape.length
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const th = a.ang + (i / n) * Math.PI * 2
        const rr = a.r * a.shape[i]
        const px = a.x + Math.cos(th) * rr
        const py = a.y + Math.sin(th) * rr
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }

    const drawShip = (accent: string, soft: string) => {
      const g = s.current
      // blink while invulnerable
      if (g.invuln > 0 && Math.floor(g.frame / 4) % 2 === 0) return
      const h = g.heading
      const nx = g.shipX + Math.cos(h) * SHIP_R
      const ny = g.shipY + Math.sin(h) * SHIP_R
      const lx = g.shipX + Math.cos(h + 2.5) * SHIP_R
      const ly = g.shipY + Math.sin(h + 2.5) * SHIP_R
      const rx = g.shipX + Math.cos(h - 2.5) * SHIP_R
      const ry = g.shipY + Math.sin(h - 2.5) * SHIP_R
      ctx.strokeStyle = accent
      ctx.beginPath()
      ctx.moveTo(nx, ny)
      ctx.lineTo(lx, ly)
      ctx.lineTo(rx, ry)
      ctx.closePath()
      ctx.stroke()
      // thrust flame, flickering
      if (g.thrusting && Math.floor(g.frame / 2) % 2 === 0) {
        ctx.strokeStyle = soft
        ctx.beginPath()
        ctx.moveTo(
          g.shipX + Math.cos(h + 2.5) * SHIP_R * 0.7,
          g.shipY + Math.sin(h + 2.5) * SHIP_R * 0.7,
        )
        ctx.lineTo(g.shipX - Math.cos(h) * SHIP_R * 1.7, g.shipY - Math.sin(h) * SHIP_R * 1.7)
        ctx.lineTo(
          g.shipX + Math.cos(h - 2.5) * SHIP_R * 0.7,
          g.shipY + Math.sin(h - 2.5) * SHIP_R * 0.7,
        )
        ctx.stroke()
      }
    }

    const draw = () => {
      const g = s.current
      const c = themeColors(canvas)
      ctx.fillStyle = c.bg
      ctx.fillRect(0, 0, W, H)
      ctx.lineWidth = 1.5
      ctx.lineJoin = "round"
      ctx.lineCap = "round"

      ctx.strokeStyle = c.fg
      for (const a of g.asteroids) drawAsteroid(a)

      ctx.fillStyle = c.accent
      for (const b of g.bullets) ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3)

      if (!g.over) drawShip(c.accent, c.soft)

      // tiny ship icons for remaining lives, top-left
      ctx.strokeStyle = c.muted
      for (let i = 0; i < g.lives; i++) {
        const x = 12 + i * 14
        const y = 16
        ctx.beginPath()
        ctx.moveTo(x, y - 6)
        ctx.lineTo(x - 4, y + 5)
        ctx.lineTo(x + 4, y + 5)
        ctx.closePath()
        ctx.stroke()
      }

      if (g.over) {
        ctx.fillStyle = c.accent
        ctx.font = "600 20px ui-monospace, monospace"
        ctx.textAlign = "center"
        ctx.fillText("GAME OVER", W / 2, H / 2 - 6)
        ctx.fillStyle = c.muted
        ctx.font = "12px ui-monospace, monospace"
        ctx.fillText("space to fly again", W / 2, H / 2 + 16)
        ctx.textAlign = "left"
      }
    }

    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (!lastRef.current) lastRef.current = t
      let dt = t - lastRef.current
      lastRef.current = t
      if (dt > 100) dt = 100 // don't spiral after a tab-away
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <GameFrame
      title="asteroids"
      status={`score ${score} · ships ${lives} · wave ${level} · best ${best}`}
      hint={over ? "game over · space to fly again · esc to quit" : "← → turn · ↑ thrust · space fire · esc quit"}
      onKey={onKey}
      onActive={(a) => {
        activeRef.current = a
        if (!a) {
          const g = s.current
          g.left = g.right = g.thrusting = g.firing = false
        }
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="jsh-game-canvas"
        aria-label="asteroids"
      />
    </GameFrame>
  )
}
