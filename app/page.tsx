import type { Metadata } from "next"
import Shell from "./shell"

export const metadata: Metadata = {
  title: "Jessica Black — Founding Engineer",
  description:
    "Founding engineer building AI agent systems in Rust and TypeScript.",
}

export default function Page() {
  return <Shell />
}
