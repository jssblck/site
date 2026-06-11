import { ImageResponse } from "next/og"
import type { CSSProperties } from "react"

/*
  The share-link image. When jessica.black is dropped in Slack / LinkedIn /
  iMessage, this is the unfurl: the wordmark in phosphor amber on near-black,
  framed like the shell. Rendered at build with IBM Plex Mono (the body face),
  fetched from a CDN with a graceful fallback so a build never breaks on it.
*/

export const alt =
  "Jessica Black — Founding Engineer building AI agent systems in Rust and TypeScript"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const BG = "#0c0c0e"
const FG = "#e8e6df"
const AMBER = "#e0a23a"
const SOFT = "#b9893a"
const MUTED = "#8a8780"

const IMAGE_ROOT_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  backgroundColor: BG,
  color: FG,
  padding: 72,
  position: "relative",
}

const imageRootStyle = (fontFamily: string): CSSProperties => ({
  ...IMAGE_ROOT_STYLE,
  fontFamily,
})

async function loadFont(weight: number): Promise<ArrayBuffer | null> {
  // .woff (satori-supported; not woff2) from the fontsource CDN.
  const url = `https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-${weight}-normal.woff`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.arrayBuffer()
  } catch {
    return null
  }
}

export default async function Image() {
  const [bold, med] = await Promise.all([loadFont(700), loadFont(500)])
  const fonts = [
    bold && { name: "Plex", data: bold, weight: 700 as const, style: "normal" as const },
    med && { name: "Plex", data: med, weight: 500 as const, style: "normal" as const },
  ].filter(Boolean) as {
    name: string
    data: ArrayBuffer
    weight: 700 | 500
    style: "normal"
  }[]

  return new ImageResponse(
    (
      <div
        style={imageRootStyle(fonts.length ? "Plex" : "monospace")}
      >
        {/* faint scanline texture, like the terminal */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 5px)",
          }}
        />

        {/* prompt */}
        <div style={{ display: "flex", fontSize: 27, color: MUTED }}>
          <span style={{ color: SOFT }}>visitor@jessica.black</span>
          <span>:~$ whoami</span>
        </div>

        {/* wordmark + tagline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 118,
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: -4,
            }}
          >
            <span>JESSICA</span>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span>BLACK</span>
              <span style={{ color: AMBER, marginLeft: 28, fontSize: 74 }}>{">_"}</span>
            </div>
          </div>
          <div style={{ display: "flex", width: 132, height: 4, backgroundColor: AMBER, marginTop: 30 }} />
          <div style={{ display: "flex", fontSize: 27, color: SOFT, marginTop: 24, fontWeight: 500 }}>
            founding engineer · AI agent systems in Rust & TypeScript
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: MUTED,
          }}
        >
          <span>13 years · distributed systems · build tools</span>
          <span style={{ color: AMBER, fontWeight: 700 }}>jessica.black</span>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  )
}
