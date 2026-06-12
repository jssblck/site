import type React from "react"
import "@/styles/globals.css"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/react"

export const metadata: Metadata = {
  metadataBase: new URL("https://jessica.black"),
  title: "Jessica Black - Founding Engineer",
  description:
    "Founding engineer building AI agent systems in Rust and TypeScript, with 13 years in distributed systems, program analysis, and developer tools.",
  authors: [{ name: "Jessica Black", url: "https://jessica.black" }],
  creator: "Jessica Black",
  openGraph: {
    type: "website",
    url: "https://jessica.black",
    siteName: "jessica.black",
    title: "Jessica Black - Founding Engineer",
    description:
      "Founding engineer building AI agent systems in Rust and TypeScript.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jessica Black - Founding Engineer",
    description:
      "Founding engineer building AI agent systems in Rust and TypeScript.",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
