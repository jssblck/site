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
import { TRISOLARIS_SEEDS } from "./threebody-catalog"
import {
  BASE_SUBSTEPS,
  DEFAULT_SPEED,
  DT,
  PRESETS,
  SPEEDS,
  TRAIL,
  cameraTarget,
  presetBodies,
  randomSeed,
  step,
  type Body,
  type Preset,
} from "./threebody-core"

function catalogBodies(index: number): Body[] {
  if (TRISOLARIS_SEEDS.length === 0) return presetBodies("trisolaris", { seed: randomSeed() })
  const c = TRISOLARIS_SEEDS[index % TRISOLARIS_SEEDS.length]
  return presetBodies("trisolaris", { seed: c.seed, masses: c.masses })
}

export default function ThreeBody() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const pausedRef = useRef(false)
  const trailsRef = useRef(true)
  const speedRef = useRef(DEFAULT_SPEED)
  const presetRef = useRef<Preset>("trisolaris")
  const catalogIndexRef = useRef(1)
  const bodiesRef = useRef<Body[]>(catalogBodies(0))
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
  const [speed, setSpeed] = useState<number>(SPEEDS[DEFAULT_SPEED].label)

  const seed = (p: Preset) => {
    presetRef.current = p
    bodiesRef.current =
      p === "trisolaris" ? catalogBodies(catalogIndexRef.current++) : presetBodies(p, { seed: randomSeed() })
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
      setSpeed(SPEEDS[speedRef.current].label)
    } else if (k === "]" || k === "+" || k === "=" || k === "arrowup") {
      e.preventDefault()
      speedRef.current = Math.min(SPEEDS.length - 1, speedRef.current + 1)
      setSpeed(SPEEDS[speedRef.current].label)
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
        const steps = Math.max(1, Math.round(BASE_SUBSTEPS * SPEEDS[speedRef.current].multiplier))
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
