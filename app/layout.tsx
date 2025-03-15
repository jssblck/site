import type React from "react"
import "@/styles/globals.css"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/react"

export const metadata: Metadata = {
  title: "Jessica Black | Staff Software Engineer",
  description: "Personal profile of Jessica Black, a Staff Software Engineer specializing in Rust, Go, Haskell, and TypeScript",
  generator: 'Next.js'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
