"use client"

import { useEffect, useRef } from "react"

export function BackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Create animated squares
    const squares: Square[] = []
    const squareCount = Math.min(15, Math.floor(window.innerWidth / 100))

    interface Square {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      rotation: number
      rotationSpeed: number
      color: string
      opacity: number
    }

    // Generate pastel colors
    const generatePastelColor = () => {
      const colors = [
        "rgba(203, 195, 227, 0.1)", // Lavender
        "rgba(209, 196, 233, 0.1)", // Periwinkle
        "rgba(214, 198, 235, 0.1)", // Lilac
        "rgba(223, 207, 239, 0.1)", // Light Lavender
        "rgba(196, 181, 253, 0.1)", // Soft Purple
      ]
      return colors[Math.floor(Math.random() * colors.length)]
    }

    // Initialize squares
    for (let i = 0; i < squareCount; i++) {
      squares.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 100 + 50,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.002,
        color: generatePastelColor(),
        opacity: Math.random() * 0.1 + 0.05,
      })
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      squares.forEach((square) => {
        // Update position
        square.x += square.speedX
        square.y += square.speedY
        square.rotation += square.rotationSpeed

        // Boundary check
        if (square.x < -square.size) square.x = canvas.width + square.size
        if (square.x > canvas.width + square.size) square.x = -square.size
        if (square.y < -square.size) square.y = canvas.height + square.size
        if (square.y > canvas.height + square.size) square.y = -square.size

        // Draw rounded square
        ctx.save()
        ctx.translate(square.x, square.y)
        ctx.rotate(square.rotation)
        ctx.fillStyle = square.color

        // Draw rounded rectangle
        const radius = square.size / 5
        const x = -square.size / 2
        const y = -square.size / 2
        const width = square.size
        const height = square.size

        ctx.beginPath()
        ctx.moveTo(x + radius, y)
        ctx.lineTo(x + width - radius, y)
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
        ctx.lineTo(x + width, y + height - radius)
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
        ctx.lineTo(x + radius, y + height)
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
        ctx.lineTo(x, y + radius)
        ctx.quadraticCurveTo(x, y, x + radius, y)
        ctx.closePath()

        ctx.fill()
        ctx.restore()
      })

      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" style={{ pointerEvents: "none" }} />
}

