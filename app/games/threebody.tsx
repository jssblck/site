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

  The camera eases around the live body bounds and auto-zooms to keep the dance
  framed, even when a body is thrown across the room. No score — it's a toy.
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
  centerOfMass,
  presetBodies,
  randomSeed,
  specificEnergy,
  step,
  type Body,
  type Preset,
} from "./threebody-core"

const ESCAPE_CONFIRM_FRAMES = 90
const ESCAPE_END_DELAY_MS = 7500
const ESCAPE_END_DELAY_SECONDS = ESCAPE_END_DELAY_MS / 1000
const CAMERA_PADDING = 0.18
const CAMERA_GUARD_PADDING = 0.055
const CAMERA_MAX_SCALE = 330
const CAMERA_CENTER_EASE = 0.032
const CAMERA_EXPAND_EASE = 0.045
const CAMERA_CONTRACT_EASE = 0.01
const CAMERA_VIEW_EASE = 0.055
const CAMERA_ZOOM_OUT_EASE = 0.045
const CAMERA_ZOOM_IN_EASE = 0.012

type EscapeNotice = {
  bodyIndex: number
  bodyName: string
  energy: number
  radialVelocity: number
  distance: number
  detectedAt: number
  endAt: number
}

type CameraFrame = {
  cx: number
  cy: number
  width: number
  height: number
}

function catalogBodies(index: number): Body[] {
  if (TRISOLARIS_SEEDS.length === 0) return presetBodies("trisolaris", { seed: randomSeed() })
  const c = TRISOLARIS_SEEDS[index % TRISOLARIS_SEEDS.length]
  return presetBodies("trisolaris", { seed: c.seed, masses: c.masses, setup: c.setup })
}

function bodyName(bodies: readonly Body[], index: number): string {
  if (bodies[index]?.role === "planet") return "planet"
  let star = 0
  for (let i = 0; i <= index; i++) {
    if (bodies[i]?.role !== "planet") star++
  }
  return `star ${star}`
}

function framingBounds(bodies: readonly Body[]): CameraFrame {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const b of bodies) {
    if (!Number.isFinite(b.x + b.y)) continue
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x)
    maxY = Math.max(maxY, b.y)
  }
  if (!Number.isFinite(minX + minY + maxX + maxY)) {
    return { cx: 0, cy: 0, width: 2, height: 2 }
  }
  const width = Math.max(maxX - minX, 1.8)
  const height = Math.max(maxY - minY, 1.8)
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width,
    height,
  }
}

function smoothFrame(previous: CameraFrame | null, next: CameraFrame): CameraFrame {
  if (!previous) return next
  const widthEase = next.width > previous.width ? CAMERA_EXPAND_EASE : CAMERA_CONTRACT_EASE
  const heightEase = next.height > previous.height ? CAMERA_EXPAND_EASE : CAMERA_CONTRACT_EASE
  return {
    cx: previous.cx + (next.cx - previous.cx) * CAMERA_CENTER_EASE,
    cy: previous.cy + (next.cy - previous.cy) * CAMERA_CENTER_EASE,
    width: previous.width + (next.width - previous.width) * widthEase,
    height: previous.height + (next.height - previous.height) * heightEase,
  }
}

function scaleForFrame(frame: CameraFrame, width: number, height: number, dpr: number, padding: number) {
  const pad = Math.min(width, height) * padding
  return Math.min(
    (width - pad * 2) / Math.max(frame.width, 1e-6),
    (height - pad * 2) / Math.max(frame.height, 1e-6),
    CAMERA_MAX_SCALE * dpr,
  )
}

function escapeSample(bodies: readonly Body[], index: number) {
  const c = centerOfMass(bodies)
  const b = bodies[index]
  const dx = b.x - c.x
  const dy = b.y - c.y
  const distance = Math.hypot(dx, dy)
  const radialVelocity = ((b.vx - c.vx) * dx + (b.vy - c.vy) * dy) / Math.max(distance, 1e-6)
  const energy = specificEnergy(bodies, index)
  const far = b.role === "planet" ? 3.4 : 2.9
  return {
    distance,
    energy,
    radialVelocity,
    escaping: distance > far && energy > 0.006 && radialVelocity > 0.012,
  }
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
  const escapeFramesRef = useRef<number[]>(bodiesRef.current.map(() => 0))
  const escapeNoticeRef = useRef<EscapeNotice | null>(null)
  const endStateRef = useRef<EscapeNotice | null>(null)
  // one trail per body (4 for trisolaris, 3 for chaos) — derived so the counts
  // never fall out of sync with the body list
  const trailRef = useRef<Array<Array<{ x: number; y: number }>>>(
    bodiesRef.current.map(() => []),
  )
  const viewRef = useRef({ cx: 0, cy: 0, scale: 220 })
  const cameraFrameRef = useRef<CameraFrame | null>(null)
  const snapRef = useRef(true) // snap the camera (no easing) on the next frame
  const pwRef = useRef(0)
  const phRef = useRef(0)

  const [preset, setPreset] = useState<Preset>("trisolaris")
  const [paused, setPaused] = useState(false)
  const [trails, setTrails] = useState(true)
  const [speed, setSpeed] = useState<number>(SPEEDS[DEFAULT_SPEED].label)
  const [escapeNotice, setEscapeNotice] = useState<EscapeNotice | null>(null)
  const [endState, setEndState] = useState<EscapeNotice | null>(null)

  const seed = (p: Preset) => {
    presetRef.current = p
    bodiesRef.current =
      p === "trisolaris" ? catalogBodies(catalogIndexRef.current++) : presetBodies(p, { seed: randomSeed() })
    trailRef.current = bodiesRef.current.map(() => [])
    escapeFramesRef.current = bodiesRef.current.map(() => 0)
    escapeNoticeRef.current = null
    endStateRef.current = null
    cameraFrameRef.current = null
    snapRef.current = true
    setEscapeNotice(null)
    setEndState(null)
    setPreset(p)
  }
  const restart = () => seed(presetRef.current)

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (k === " ") {
      e.preventDefault()
      pausedRef.current = !pausedRef.current
      setPaused(pausedRef.current)
    } else if (k === "r") {
      e.preventDefault()
      restart()
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

      const rawFrame = framingBounds(bodies)
      const frame = smoothFrame(cameraFrameRef.current, rawFrame)
      cameraFrameRef.current = frame
      const smoothScale = scaleForFrame(frame, PW, PH, dpr, CAMERA_PADDING)
      const guardScale = scaleForFrame(rawFrame, PW, PH, dpr, CAMERA_GUARD_PADDING)
      const targetScale = Math.min(smoothScale, guardScale)
      const v = viewRef.current
      if (snapRef.current) {
        cameraFrameRef.current = rawFrame
        v.cx = frame.cx
        v.cy = frame.cy
        v.scale = targetScale
        snapRef.current = false
      } else {
        const zoomEase = targetScale < v.scale ? CAMERA_ZOOM_OUT_EASE : CAMERA_ZOOM_IN_EASE
        v.cx += (frame.cx - v.cx) * CAMERA_VIEW_EASE
        v.cy += (frame.cy - v.cy) * CAMERA_VIEW_EASE
        v.scale += (targetScale - v.scale) * zoomEase
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
      ctx.globalAlpha = 1

      if (pausedRef.current) {
        ctx.fillStyle = c.muted
        ctx.font = `${12 * dpr}px ui-monospace, monospace`
        ctx.textAlign = "center"
        ctx.fillText("paused", PW / 2, 20 * dpr)
        ctx.textAlign = "left"
      }
    }

    const detectEscape = (now: number) => {
      if (escapeNoticeRef.current || endStateRef.current) return
      const bodies = bodiesRef.current
      if (escapeFramesRef.current.length !== bodies.length) {
        escapeFramesRef.current = bodies.map(() => 0)
      }
      for (let i = 0; i < bodies.length; i++) {
        const sample = escapeSample(bodies, i)
        if (sample.escaping) {
          escapeFramesRef.current[i]++
        } else {
          escapeFramesRef.current[i] = Math.max(0, escapeFramesRef.current[i] - 2)
        }
        if (escapeFramesRef.current[i] >= ESCAPE_CONFIRM_FRAMES) {
          const notice = {
            bodyIndex: i,
            bodyName: bodyName(bodies, i),
            energy: sample.energy,
            radialVelocity: sample.radialVelocity,
            distance: sample.distance,
            detectedAt: now,
            endAt: now + ESCAPE_END_DELAY_MS,
          }
          escapeNoticeRef.current = notice
          setEscapeNotice(notice)
          return
        }
      }
    }

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop)
      const bodies = bodiesRef.current
      const now = performance.now()
      // keep simulating even when the window/tab loses focus (only an explicit
      // pause stops it; the browser still throttles rAF in a fully hidden tab)
      if (!pausedRef.current && !endStateRef.current) {
        const steps = Math.max(1, Math.round(BASE_SUBSTEPS * SPEEDS[speedRef.current].multiplier))
        for (let i = 0; i < steps; i++) step(bodies, DT)
        if (trailsRef.current) {
          for (let i = 0; i < bodies.length; i++) {
            const tr = trailRef.current[i]
            tr.push({ x: bodies[i].x, y: bodies[i].y })
            if (tr.length > TRAIL) tr.shift()
          }
        }
        detectEscape(now)
        if (escapeNoticeRef.current && now >= escapeNoticeRef.current.endAt) {
          endStateRef.current = escapeNoticeRef.current
          setEndState(escapeNoticeRef.current)
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
          {escapeNotice && !endState ? " · escape detected" : ""}
          {endState ? " · ended" : ""}
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
      <div className="jsh-threebody-stage">
        <canvas
          ref={canvasRef}
          className="jsh-game-canvas jsh-sim-canvas"
          aria-label="three-body gravitational simulation"
        />
        {escapeNotice && !endState && (
          <div className="jsh-threebody-alert" role="status" aria-live="polite">
            <span>escape trajectory detected</span>
            <small>{escapeNotice.bodyName} is leaving; ending shortly</small>
          </div>
        )}
        {endState && (
          <div
            className="jsh-threebody-end"
            role="dialog"
            aria-modal="true"
            aria-live="assertive"
            aria-label="simulation ended"
          >
            <p className="jsh-threebody-end-title">simulation ended</p>
            <p>
              {endState.bodyName} reached escape velocity and left the system after{" "}
              {ESCAPE_END_DELAY_SECONDS.toFixed(1)} seconds on an outward trajectory.
            </p>
            <button
              type="button"
              className="jsh-threebody-run"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                restart()
              }}
            >
              run again
            </button>
          </div>
        )}
      </div>
    </GameFrame>
  )
}
