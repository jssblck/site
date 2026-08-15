import type React from "react"
import "@/styles/globals.css"
import type { Metadata } from "next"
import { IBM_Plex_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-mono",
})

const DESCRIPTION =
  "Founding engineer building AI agent systems in Rust and TypeScript, with 13 years in distributed systems, program analysis, and developer tools."

export const metadata: Metadata = {
  metadataBase: new URL("https://jessica.black"),
  title: "Jessica Black",
  description: DESCRIPTION,
  authors: [{ name: "Jessica Black", url: "https://jessica.black" }],
  creator: "Jessica Black",
  openGraph: {
    type: "website",
    url: "https://jessica.black",
    siteName: "jessica.black",
    title: "Jessica Black",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Jessica Black",
    description: DESCRIPTION,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={plex.variable}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
