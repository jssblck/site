// Everything the page says lives here. page.tsx only lays it out.

export type Job = {
  org: string
  role: string
  dates: string
  bullets: string[]
}

export const JOBS: Job[] = [
  {
    org: "Attune",
    role: "Founding Engineer",
    dates: "2025 to present",
    bullets: [
      "Built an incident-triage agent that reads Sentry, Datadog, and Slack, runs the root-cause investigation in a sandbox, and cites its evidence.",
      "Built an agent-first dev-sandbox platform for a client: full-stack cloud environments so engineers can run agents in parallel.",
      "Hurry, a drop-in distributed build cache for Cargo: 3x median and up to 22x on clean builds across a broad range of Rust projects.",
      "Nudge, guardrails for coding agents: tree-sitter and regex rules across 9 languages, wired into Claude Code and Codex hooks.",
      "Bastion, agentic code review as focused single-concern reviewers, local and in CI.",
      "Akari, a self-hosted history of every coding-agent session: each run readable end to end, every token priced.",
    ],
  },
  {
    org: "FOSSA",
    role: "Software Engineer to Staff Tech Lead",
    dates: "2019 to 2025",
    bullets: [
      "Tech lead for the analysis platform, the distributed system under every FOSSA product: about 30k customer and 200k open-source projects a day across 20+ language ecosystems.",
      "Introduced Rust to FOSSA and drove its adoption from one service to the default for new backend systems.",
      "Founded and architected the analysis service. Took a hot path that was melting the database from seconds to sub-millisecond.",
      "Tech lead for snippet scanning, design lead for reachability, both shipped publicly.",
      "Primary author of Broker, the open-source on-prem connector that let security-conscious enterprises adopt FOSSA without exposing their source.",
    ],
  },
  {
    org: "Reynolds & Reynolds",
    role: "Software Engineer",
    dates: "2013 to 2019",
    bullets: [
      "Built a remote backup-and-repair system for databases on tens of thousands of unattended machines, with a pull-only broker and nothing exposed to the internet.",
      "Drove migrations from PHP and VB.net to Node, TypeScript, and Go. Designed and led a unified internal portal with single sign-on and org-synced RBAC.",
      "Rewrote embedded C firmware for in-field vehicle hardware to a server-driven RPC model under tight memory limits.",
    ],
  },
]

export type Project = { name: string; url: string; lang: string; note: string }

export const PROJECTS: Project[] = [
  {
    name: "sandi",
    url: "https://github.com/sandi-black/sandi",
    lang: "TypeScript",
    note: "household intelligence on Discord, with memory, tools, and personal context",
  },
  {
    name: "hurry",
    url: "https://github.com/attunehq/hurry",
    lang: "Rust",
    note: "distributed, content-addressed build cache for Cargo",
  },
  {
    name: "nudge",
    url: "https://github.com/attunehq/nudge",
    lang: "Rust",
    note: "guardrails for AI coding agents via Claude Code hooks",
  },
  {
    name: "bastion",
    url: "https://github.com/attunehq/bastion",
    lang: "Rust",
    note: "agentic code review as focused single-concern reviewers, local and in CI",
  },
  {
    name: "akari",
    url: "https://github.com/attunehq/akari",
    lang: "Go",
    note: "self-hosted, searchable history of coding-agent sessions, with per-run token cost",
  },
  {
    name: "doteph",
    url: "https://github.com/attunehq/doteph",
    lang: "Rust",
    note: "ephemeral per-workspace local services, like .env files for Postgres and Redis",
  },
  {
    name: "fossa-cli",
    url: "https://github.com/fossas/fossa-cli",
    lang: "Haskell",
    note: "dependency analysis across 20+ ecosystems",
  },
  {
    name: "broker",
    url: "https://github.com/fossas/broker",
    lang: "Rust",
    note: "secure on-prem bridge to FOSSA's cloud",
  },
  {
    name: "circe",
    url: "https://github.com/fossas/circe",
    lang: "Rust",
    note: "container image extraction and analysis",
  },
  {
    name: "mite",
    url: "https://github.com/jssblck/mite",
    lang: "Rust",
    note: "windows-first OCR overlay for reading Japanese in games",
  },
]

export type Item = { title: string; where: string; url: string }

export const WRITING: Item[] = [
  {
    title: "Engineering blog",
    where: "fossa.com",
    url: "https://fossa.com/blog/author/jessica-black/",
  },
  {
    title: '"Rust in Production" interview',
    where: "serokell.io",
    url: "https://serokell.io/blog/rust-in-production-fossa",
  },
]

export const TALKS: Item[] = [
  {
    title: "Agentic engineering",
    where: "2026, slides",
    url: "/talks/agentic-engineering.html",
  },
]

export const LINKS: Item[] = [
  { title: "GitHub", where: "github.com/jssblck", url: "https://github.com/jssblck" },
  {
    title: "LinkedIn",
    where: "linkedin.com/in/jessica-black",
    url: "https://www.linkedin.com/in/jessica-black-17947bbb",
  },
  { title: "Email", where: "me@jessica.black", url: "mailto:me@jessica.black" },
]
