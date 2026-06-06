"use client"

/*
  The backdrop for "matrix mode" (toggled by the `cmatrix` command): a
  full-viewport sheet of digital rain that sits BEHIND the still-usable
  terminal, so the shell reads like it's living inside the code. Classic
  algorithm — per-column drops, a bright head trailing into fading phosphor,
  the field dimmed each frame toward black. Movie-green on purpose. Sizes to
  the window, and under prefers-reduced-motion it paints a static field
  instead of animating.
*/

import { useEffect, useRef } from "react"

const FS = 16
const HEAD = "#d6ffda"
const TRAIL = "#37c850"
const BASE = "#010a01"

const GLYPHS = (() => {
  let s = "0123456789:.=*+-<>¦｜╌@#$%&Z"
  for (let k = 0x30a0; k <= 0x30ff; k++) s += String.fromCharCode(k)
  return s
})()
const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let w = 0
    let h = 0
    let cols = 0
    let drops: number[] = []
    let last: string[] = []

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cols = Math.ceil(w / FS)
      drops = Array.from({ length: cols }, () => Math.floor((Math.random() * -h) / FS))
      last = Array.from({ length: cols }, glyph)
      ctx.fillStyle = BASE
      ctx.fillRect(0, 0, w, h)
      ctx.font = `${FS}px ui-monospace, monospace`
      ctx.textBaseline = "top"
    }

    const step = () => {
      // dim the whole field toward black — short trails keep text readable
      ctx.globalAlpha = 0.12
      ctx.fillStyle = BASE
      ctx.fillRect(0, 0, w, h)
      ctx.globalAlpha = 1
      for (let c = 0; c < cols; c++) {
        const x = c * FS
        const y = drops[c] * FS
        if (y - FS >= 0) {
          ctx.fillStyle = TRAIL
          ctx.fillText(last[c], x, y - FS)
        }
        const ch = glyph()
        ctx.fillStyle = HEAD
        ctx.fillText(ch, x, y)
        last[c] = ch
        drops[c]++
        if (y > h && Math.random() > 0.975) drops[c] = 0
      }
    }

    setup()

    let raf = 0
    if (reduced) {
      for (let i = 0; i < 50; i++) step() // a still field, no motion
    } else {
      let prev = 0
      let acc = 0
      const STEP = 55
      const loop = (t: number) => {
        raf = requestAnimationFrame(loop)
        if (!prev) prev = t
        let dt = t - prev
        prev = t
        if (dt > 250) dt = 250
        acc += dt
        let guard = 0
        while (acc >= STEP && guard < 4) {
          acc -= STEP
          step()
          guard++
        }
      }
      raf = requestAnimationFrame(loop)
    }

    const onResize = () => setup()
    window.addEventListener("resize", onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="jsh-matrix-rain" aria-hidden="true" />
}
