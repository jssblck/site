import { ImageResponse } from "next/og"

// The unfurl when jessica.black is pasted into Slack, LinkedIn, or iMessage.

export const alt = "Jessica Black, founding engineer"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          backgroundColor: "#1c1c2b",
          color: "#cdd6f4",
          padding: 80,
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700 }}>Jessica Black</div>
        <div style={{ display: "flex", fontSize: 30, color: "#9399b2", marginTop: 20 }}>
          AI agent systems in Rust and TypeScript
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#cba6f7", marginTop: 48 }}>
          jessica.black
        </div>
      </div>
    ),
    size,
  )
}
