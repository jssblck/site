"use client"

/*
  cmatrix — the digital rain, as a screensaver. Glyphs fall in the active
  theme's phosphor (green looks the part, but amber/paper/pride work too): a
  bright head with a fading tail. Not really a game — just nice to watch. Esc
  exits, like everything else here.
*/

import { useEffect, useRef } from "react"
import { GameFrame } from "./_frame"

const W = 640
const H = 420
const FS = 16
const COLS = Math.floor(W / FS)
const STEP = 52 // ms between drops

// katakana + digits + a few symbols — the canonical alphabet
const GLYPHS = (() => {
  let s = "0123456789:.=*+-<>¦｜╌@#$%&"
  for (let k = 0x30a0; k <= 0x30ff; k++) s += String.fromCharCode(k)
  return s
})()
const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

export default function CMatrix() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const accRef = useRef(0)
  const activeRef = useRef(true)
  const dropsRef = useRef<number[]>([])
  const lastCharRef = useRef<string[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const col = (n: string, f: string) =>
      getComputedStyle(canvas).getPropertyValue(n).trim() || f

    // stagger the columns so they don't fall in lockstep
    dropsRef.current = Array.from({ length: COLS }, () =>
      Math.floor((Math.random() * -H) / FS),
    )
    lastCharRef.current = Array.from({ length: COLS }, glyph)

    // paint the backdrop once so the first frames aren't transparent
    ctx.fillStyle = col("--jsh-bg-2", "#0e0e10")
    ctx.fillRect(0, 0, W, H)
    ctx.font = `${FS}px ui-monospace, monospace`
    ctx.textBaseline = "top"

    const stepOnce = () => {
      const drops = dropsRef.current
      const lastChar = lastCharRef.current
      const bg = col("--jsh-bg-2", "#0e0e10")
      const accent = col("--jsh-amber", "#e0a23a")
      const fg = col("--jsh-fg", "#e8e6df")

      // fade the whole field a touch toward the background — makes the tails
      ctx.globalAlpha = 0.085
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1

      for (let c = 0; c < COLS; c++) {
        const x = c * FS
        const y = drops[c] * FS
        // demote the previous head to the trail colour
        if (y - FS >= 0) {
          ctx.fillStyle = accent
          ctx.fillText(lastChar[c], x, y - FS)
        }
        // new bright head
        const ch = glyph()
        ctx.fillStyle = fg
        ctx.fillText(ch, x, y)
        lastChar[c] = ch

        drops[c]++
        if (y > H && Math.random() > 0.975) drops[c] = 0
      }
    }

    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (!lastRef.current) lastRef.current = t
      let dt = t - lastRef.current
      lastRef.current = t
      if (dt > 250) dt = 250
      if (!activeRef.current) return
      accRef.current += dt
      let guard = 0
      while (accRef.current >= STEP && guard < 4) {
        accRef.current -= STEP
        stepOnce()
        guard++
      }
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <GameFrame
      title="cmatrix"
      hint={
        <>
          wake up… · <b>esc</b> to exit
        </>
      }
      onActive={(a) => {
        activeRef.current = a
      }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="jsh-game-canvas"
        aria-label="matrix digital rain"
      />
    </GameFrame>
  )
}
