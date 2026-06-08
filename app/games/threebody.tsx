"use client"

/*
  threebody — a real-time simulation of the three-body problem: masses under
  mutual Newtonian gravity, integrated with velocity Verlet at a small fixed
  step (plus a little softening so a close pass doesn't divide by zero), so
  energy stays honest over long runs.

  Two modes:
   • trisolaris — the setup from Liu Cixin's books: three suns of unequal mass
     plus a small planet caught among them. It's a real four-body system — the
     suns dance chaotically and drag the planet through stable spells and
     violent ones, while the planet is light enough that it barely tugs back
     (as a real world wouldn't). Reseed (r) for a fresh sky.
   • chaos — three equal masses flung at random, net momentum zeroed. The bare
     problem, with nothing to hide behind: no two runs ever match.

  The camera tracks the center of mass and auto-zooms to keep the dance framed,
  even when a body is thrown across the room. No score — it's a toy.
*/

import { useEffect, useRef, useState } from "react"
import { GameFrame, themeColors } from "./_frame"

type Body = { x: number; y: number; vx: number; vy: number; m: number; role?: "planet" }
type Preset = "trisolaris" | "chaos"

const PRESETS: Preset[] = ["trisolaris", "chaos"]
const G = 1
const SOFT2 = 0.0009 // softening² — tames the 1/r² singularity at close range
const DT = 0.0016 // integration step, in world time
const BASE_SUBSTEPS = 14 // physics steps per frame at 1× speed
const SPEEDS = [0.25, 0.5, 1, 2, 4]
const DEFAULT_SPEED = 2 // index into SPEEDS → 1×
const TRAIL = 240 // points kept per body's tail

// Subtract the center-of-mass velocity so the whole system doesn't drift off
// screen — then the camera can hold the center of mass still.
function zeroMomentum(bodies: Body[]): Body[] {
  let px = 0
  let py = 0
  let tm = 0
  for (const b of bodies) {
    px += b.m * b.vx
    py += b.m * b.vy
    tm += b.m
  }
  for (const b of bodies) {
    b.vx -= px / tm
    b.vy -= py / tm
  }
  return bodies
}

// Build a preset's initial conditions. Both reseed differently each time, and
// both zero the net momentum so the center of mass stays put for the camera.
function presetBodies(p: Preset): Body[] {
  if (p === "trisolaris") {
    // Three suns of unequal mass, started on Lagrange's rotating equilateral
    // triangle — a real solution to the three-body problem. With comparable
    // masses that configuration is unstable, so a small kick tips it from an
    // orderly "stable era" into a chaotic one, yet the system stays gravitation-
    // ally bound (it dances rather than flying apart). Then a planet so light
    // (~6e-5 of a sun — think Earth) that the suns don't feel it at all, dropped
    // into orbit around the heaviest; it just gets dragged along for the ride.
    const masses = [1.35, 1.0, 0.75]
    const Mtot = masses[0] + masses[1] + masses[2]
    const a = 1.35 // triangle side
    const circum = a / Math.sqrt(3) // centroid → vertex
    const jit = () => Math.random() - 0.5
    const spin = Math.random() < 0.5 ? 1 : -1
    const rot = Math.random() * Math.PI * 2
    // rigid-rotation rate of the equilateral relative equilibrium: ω² = G·M/a³
    const omega = Math.sqrt((G * Mtot) / (a * a * a)) * (1 + jit() * 0.03)
    const verts = [0, 1, 2].map((i) => {
      const ang = rot + (i * 2 * Math.PI) / 3
      return { x: Math.cos(ang) * circum, y: Math.sin(ang) * circum }
    })
    // center of mass (unequal masses → not the centroid); spin about it
    let cx = 0
    let cy = 0
    for (let i = 0; i < 3; i++) {
      cx += masses[i] * verts[i].x
      cy += masses[i] * verts[i].y
    }
    cx /= Mtot
    cy /= Mtot
    // a gentle perturbation: enough that each reseed diverges differently, small
    // enough that the orderly "stable era" lasts a good while before chaos wins
    const stars: Body[] = verts.map((v, i) => {
      const rx = v.x - cx
      const ry = v.y - cy
      return {
        x: v.x + jit() * 0.03,
        y: v.y + jit() * 0.03,
        vx: -ry * omega * spin + jit() * 0.022, // velocity ⟂ to radius (rotation)
        vy: rx * omega * spin + jit() * 0.022,
        m: masses[i],
      }
    })
    const host = stars[0] // the heaviest
    const d = 0.26 // planet's starting orbital radius around its sun
    const pa = Math.random() * Math.PI * 2
    const vorb = Math.sqrt((G * host.m) / d) * spin
    const planet: Body = {
      x: host.x + Math.cos(pa) * d,
      y: host.y + Math.sin(pa) * d,
      vx: host.vx - Math.sin(pa) * vorb,
      vy: host.vy + Math.cos(pa) * vorb,
      m: 0.00006,
      role: "planet",
    }
    return zeroMomentum([...stars, planet])
  }
  // chaos — three equal masses flung at random, bounded so they start close
  const bodies: Body[] = []
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + (Math.random() - 0.5) * 1.2
    const r = 0.7 + Math.random() * 0.5
    bodies.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      vx: (Math.random() - 0.5) * 0.95,
      vy: (Math.random() - 0.5) * 0.95,
      m: 1,
    })
  }
  return zeroMomentum(bodies)
}

// Pairwise gravitational acceleration, with softening. Newton's third law lets
// us do each pair once.
function accel(bodies: Body[]): Array<{ ax: number; ay: number }> {
  const acc = bodies.map(() => ({ ax: 0, ay: 0 }))
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].x - bodies[i].x
      const dy = bodies[j].y - bodies[i].y
      const d2 = dx * dx + dy * dy + SOFT2
      const inv = G / (d2 * Math.sqrt(d2)) // G / r³
      const fx = dx * inv
      const fy = dy * inv
      acc[i].ax += fx * bodies[j].m
      acc[i].ay += fy * bodies[j].m
      acc[j].ax -= fx * bodies[i].m
      acc[j].ay -= fy * bodies[i].m
    }
  }
  return acc
}

// One velocity-Verlet step: drift on the half-kick, recompute, kick again.
function step(bodies: Body[], dt: number) {
  const a = accel(bodies)
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].x += bodies[i].vx * dt + 0.5 * a[i].ax * dt * dt
    bodies[i].y += bodies[i].vy * dt + 0.5 * a[i].ay * dt * dt
  }
  const a2 = accel(bodies)
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].vx += 0.5 * (a[i].ax + a2[i].ax) * dt
    bodies[i].vy += 0.5 * (a[i].ay + a2[i].ay) * dt
  }
}

// Where the camera should look — its center and a characteristic "core" radius.
// The three-body problem loves to fling a body out on an escape trajectory, and
// a hard "drop the outlier" rule makes the frame jump as a body rides the
// threshold in and out. So instead this is a smooth, continuous function of the
// positions: iterative robust reweighting (a Cauchy/Welsch M-estimator). Each
// pass weights bodies by m / (1 + (d/core)²), so a far body's pull on the center
// and the zoom fades smoothly rather than snapping off. When the bodies sit at
// comparable distances they're all framed; when one clearly escapes it just
// fades out (and the draw loop gives it an edge arrow). No thresholds, no jumps.
const MIN_CORE = 0.9 // floor on the core radius, so a tight pair doesn't over-zoom
function cameraTarget(bodies: Body[]): { cx: number; cy: number; core: number } {
  // Seed on the closest pair of *stars* (ignore the featherweight planet). After
  // the system decays into a binary plus escaper(s), the binary sits far tighter
  // than anything else; seeding the estimator there locks the camera onto it
  // instead of settling in the empty middle between the receding pieces — which
  // is what produced the "blank screen with edge arrows" at extreme separations.
  let ai = -1
  let bi = -1
  let best = Infinity
  for (let i = 0; i < bodies.length; i++) {
    if (bodies[i].m < 0.01) continue
    for (let j = i + 1; j < bodies.length; j++) {
      if (bodies[j].m < 0.01) continue
      const d = Math.hypot(bodies[i].x - bodies[j].x, bodies[i].y - bodies[j].y)
      if (d < best) {
        best = d
        ai = i
        bi = j
      }
    }
  }
  let cx: number
  let cy: number
  let core: number
  if (ai >= 0) {
    const ma = bodies[ai].m
    const mb = bodies[bi].m
    cx = (ma * bodies[ai].x + mb * bodies[bi].x) / (ma + mb)
    cy = (ma * bodies[ai].y + mb * bodies[bi].y) / (ma + mb)
    core = Math.max(best, MIN_CORE)
  } else {
    let msum = 0
    cx = 0
    cy = 0
    for (const b of bodies) {
      cx += b.m * b.x
      cy += b.m * b.y
      msum += b.m
    }
    cx /= msum
    cy /= msum
    core = MIN_CORE
    for (const b of bodies) core = Math.max(core, Math.hypot(b.x - cx, b.y - cy))
  }
  for (let it = 0; it < 6; it++) {
    let wsum = 0
    let wx = 0
    let wy = 0
    let wd2 = 0
    for (const b of bodies) {
      const d2 = (b.x - cx) * (b.x - cx) + (b.y - cy) * (b.y - cy)
      const w = b.m / (1 + d2 / (core * core))
      wsum += w
      wx += w * b.x
      wy += w * b.y
      wd2 += w * d2
    }
    if (wsum <= 0) break
    cx = wx / wsum
    cy = wy / wsum
    core = Math.max(Math.sqrt(wd2 / wsum), MIN_CORE)
  }
  return { cx, cy, core }
}

export default function ThreeBody() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const pausedRef = useRef(false)
  const trailsRef = useRef(true)
  const speedRef = useRef(DEFAULT_SPEED)
  const presetRef = useRef<Preset>("trisolaris")
  const bodiesRef = useRef<Body[]>(presetBodies("trisolaris"))
  // one trail per body (4 for trisolaris, 3 for chaos) — derived so the counts
  // never fall out of sync with the body list
  const trailRef = useRef<Array<Array<{ x: number; y: number }>>>(
    bodiesRef.current.map(() => []),
  )
  const viewRef = useRef({ cx: 0, cy: 0, scale: 220 })
  const snapRef = useRef(true) // snap the camera (no easing) on the next frame
  const pwRef = useRef(0)
  const phRef = useRef(0)

  const [preset, setPreset] = useState<Preset>("trisolaris")
  const [paused, setPaused] = useState(false)
  const [trails, setTrails] = useState(true)
  const [speed, setSpeed] = useState(SPEEDS[DEFAULT_SPEED])

  const seed = (p: Preset) => {
    presetRef.current = p
    bodiesRef.current = presetBodies(p)
    trailRef.current = bodiesRef.current.map(() => [])
    snapRef.current = true
    setPreset(p)
  }

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === " ") {
      e.preventDefault()
      pausedRef.current = !pausedRef.current
      setPaused(pausedRef.current)
    } else if (k === "r") {
      e.preventDefault()
      seed(presetRef.current)
    } else if (k === "1") {
      seed("trisolaris")
    } else if (k === "2") {
      seed("chaos")
    } else if (k === "n" || k === "p" || k === "tab") {
      // cycle presets (n/p, or Tab) for keyboards without a numeric row
      e.preventDefault()
      const dir = k === "p" ? -1 : 1
      const idx = (PRESETS.indexOf(presetRef.current) + dir + PRESETS.length) % PRESETS.length
      seed(PRESETS[idx])
    } else if (k === "[" || k === "-" || k === "arrowdown") {
      e.preventDefault()
      speedRef.current = Math.max(0, speedRef.current - 1)
      setSpeed(SPEEDS[speedRef.current])
    } else if (k === "]" || k === "+" || k === "=" || k === "arrowup") {
      e.preventDefault()
      speedRef.current = Math.min(SPEEDS.length - 1, speedRef.current + 1)
      setSpeed(SPEEDS[speedRef.current])
    } else if (k === "t") {
      e.preventDefault()
      trailsRef.current = !trailsRef.current
      setTrails(trailsRef.current)
      if (!trailsRef.current) trailRef.current = bodiesRef.current.map(() => [])
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Match the backing store to the displayed size × DPR (capped) so the
    // trails stay smooth instead of pixel-stepped.
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      pwRef.current = w
      phRef.current = h
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)

    const draw = () => {
      const PW = pwRef.current || canvas.width
      const PH = phRef.current || canvas.height
      const c = themeColors(canvas)
      const bodies = bodiesRef.current
      const dpr = Math.max(1, PW / (canvas.clientWidth || PW))

      ctx.fillStyle = c.bg
      ctx.fillRect(0, 0, PW, PH)

      // follow the bound core, not the global center of mass, so escapers leave
      // the frame instead of shoving the survivors off-screen. Span is clamped
      // so a tight pair doesn't zoom to infinity and a loose dance still fits.
      const cam = cameraTarget(bodies)
      // frame the core (a few core-radii across) with margin; clamped so a tight
      // pair doesn't fill the screen and a wide bound dance still fits
      const span = Math.min(Math.max(cam.core * 3.4, 1.7), 12)
      const targetScale = Math.min(PW, PH) / (span * 1.18)
      const v = viewRef.current
      if (snapRef.current) {
        v.cx = cam.cx
        v.cy = cam.cy
        v.scale = targetScale
        snapRef.current = false
      } else {
        // track the core's position tightly — after an ejection the survivors
        // recoil and drift at constant velocity, so a slow follow would lag
        // them toward the edge — but ease the zoom gently to avoid jitter
        v.cx += (cam.cx - v.cx) * 0.12
        v.cy += (cam.cy - v.cy) * 0.12
        v.scale += (targetScale - v.scale) * 0.05
      }
      const sx = (wx: number) => PW / 2 + (wx - v.cx) * v.scale
      const sy = (wy: number) => PH / 2 - (wy - v.cy) * v.scale

      // every star is the same amber — mass shows in size, not colour — while
      // the planet takes a different, paler colour so it never blends into a sun.
      const bodyColor = bodies.map((b) => (b.role === "planet" ? c.fg : c.accent))

      // trails — fade from dim (old) to bright (recent)
      ctx.shadowBlur = 0
      if (trailsRef.current) {
        ctx.lineWidth = 1.5 * dpr
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        for (let i = 0; i < bodies.length; i++) {
          const tr = trailRef.current[i]
          if (!tr || tr.length < 2) continue
          ctx.strokeStyle = bodyColor[i]
          for (let q = 1; q < tr.length; q++) {
            const a = q / tr.length
            ctx.globalAlpha = a * a * 0.85
            ctx.beginPath()
            ctx.moveTo(sx(tr[q - 1].x), sy(tr[q - 1].y))
            ctx.lineTo(sx(tr[q].x), sy(tr[q].y))
            ctx.stroke()
          }
        }
        ctx.globalAlpha = 1
      }

      // the bodies: glowing suns sized by mass, and a much smaller, dimmer planet
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i]
        const isPlanet = b.role === "planet"
        const r = isPlanet ? 2.4 * dpr : Math.max(4 * dpr, Math.cbrt(b.m) * 6 * dpr)
        ctx.fillStyle = bodyColor[i]
        ctx.shadowColor = bodyColor[i]
        ctx.shadowBlur = (isPlanet ? 5 : 16) * dpr
        ctx.beginPath()
        ctx.arc(sx(b.x), sy(b.y), r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0

      // edge arrows: any body the framing let off-screen (an escaper) gets a
      // little marker at the rim pointing toward it, so you always know where
      // the missing bodies went — like an off-screen character indicator.
      for (let i = 0; i < bodies.length; i++) {
        const px = sx(bodies[i].x)
        const py = sy(bodies[i].y)
        if (px >= 0 && px <= PW && py >= 0 && py <= PH) continue
        const dx = px - PW / 2
        const dy = py - PH / 2
        const margin = 20 * dpr
        const t = Math.min(
          (PW / 2 - margin) / (Math.abs(dx) || 1e-6),
          (PH / 2 - margin) / (Math.abs(dy) || 1e-6),
        )
        const ex = PW / 2 + dx * t
        const ey = PH / 2 + dy * t
        const sz = 7 * dpr
        ctx.save()
        ctx.translate(ex, ey)
        ctx.rotate(Math.atan2(dy, dx))
        ctx.globalAlpha = 0.9
        ctx.fillStyle = bodyColor[i]
        ctx.beginPath()
        ctx.moveTo(sz, 0)
        ctx.lineTo(-sz * 0.8, sz * 0.72)
        ctx.lineTo(-sz * 0.8, -sz * 0.72)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
        // its distance from what we're framing, so you can read receding vs
        // returning at a glance (it climbs as the body escapes)
        const dist = Math.hypot(bodies[i].x - v.cx, bodies[i].y - v.cy)
        const label = dist >= 100 ? String(Math.round(dist)) : dist.toFixed(1)
        const len = Math.hypot(dx, dy) || 1
        const inward = 15 * dpr
        ctx.globalAlpha = 0.7
        ctx.fillStyle = bodyColor[i]
        ctx.font = `${10 * dpr}px ui-monospace, monospace`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(label, ex - (dx / len) * inward, ey - (dy / len) * inward)
        ctx.textAlign = "left"
        ctx.textBaseline = "alphabetic"
      }
      ctx.globalAlpha = 1

      if (pausedRef.current) {
        ctx.fillStyle = c.muted
        ctx.font = `${12 * dpr}px ui-monospace, monospace`
        ctx.textAlign = "center"
        ctx.fillText("paused", PW / 2, 20 * dpr)
        ctx.textAlign = "left"
      }
    }

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const bodies = bodiesRef.current
      // keep simulating even when the window/tab loses focus (only an explicit
      // pause stops it; the browser still throttles rAF in a fully hidden tab)
      if (!pausedRef.current) {
        const steps = Math.max(1, Math.round(BASE_SUBSTEPS * SPEEDS[speedRef.current]))
        for (let i = 0; i < steps; i++) step(bodies, DT)
        if (trailsRef.current) {
          for (let i = 0; i < bodies.length; i++) {
            const tr = trailRef.current[i]
            tr.push({ x: bodies[i].x, y: bodies[i].y })
            if (tr.length > TRAIL) tr.shift()
          }
        }
      }
      draw()
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <GameFrame
      title="three-body"
      status={
        <>
          {preset} · {speed}×{paused ? " · paused" : ""}
        </>
      }
      hint={
        <>
          <b>space</b> pause · <b>r</b> reseed · <b>1</b>/<b>2</b> trisolaris / chaos ·{" "}
          <b>[ ]</b> speed · <b>t</b> trails · <b>esc</b> quit
        </>
      }
      onKey={onKey}
    >
      <canvas
        ref={canvasRef}
        className="jsh-game-canvas jsh-sim-canvas"
        aria-label="three-body gravitational simulation"
      />
    </GameFrame>
  )
}
