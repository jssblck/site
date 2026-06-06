"use client"

/*
  jessica.black — "The Shell"
  A personal site that presents as a live shell session: it boots, settles,
  then takes commands. One file, React hooks only — no terminal emulator and
  no framework gymnastics; amber phosphor on near-black.

  -- you found the source. it borrow-checks. --
  -- no framework was harmed. one file, hooks only, amber phosphor. --
  -- to whoever's reading: yes, the history buffer works. try the up arrow. --
*/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from "react"
import { IBM_Plex_Mono, Martian_Mono } from "next/font/google"

// Industrial mono for the REPL body. Static weights — predictable rhythm.
const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

// Mechanical/condensed display face for the title-block only.
const martian = Martian_Mono({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
})

/* ------------------------------------------------------------------ *
 *  CONTENT  — the facts, structured so the interpreter can render them
 * ------------------------------------------------------------------ */

const HOST = "jessica.black"
const USER = "jess"

type Job = {
  id: string
  org: string
  role: string
  start: string
  end: string
  years: string // left-gutter label, tabular
  perm: string // ls -la style mode column, in-character
  size: string // fake byte size, for flavor + column rhythm
  blurb: string
  bullets: string[]
  stack?: string
}

const JOBS: Job[] = [
  {
    id: "attune",
    org: "Attune",
    role: "Member of Technical Staff · Founding Engineer",
    start: "Jul 2025",
    end: "present",
    years: "2025—",
    perm: "drwxr-xr-x",
    size: "founding",
    blurb:
      "Applied-AI startup building developer tools for agentic software engineering.",
    bullets: [
      "Shipped production multi-agent orchestration systems — built the agent topology and coordination layers from scratch.",
      "Hurry — a drop-in distributed build cache for Cargo. Nix-like content-addressed caching with deterministic reproducibility across CI, local, and team. Rust, open source.",
      "Nudge — a lightweight guardrail system for AI coding agents using tree-sitter + regex rules via Claude Code hooks; moves coding conventions out of the prompt to reclaim context-window budget. Rust, open source.",
    ],
    stack: "Rust · TypeScript",
  },
  {
    id: "fossa",
    org: "FOSSA",
    role: "Staff Software Engineer · Tech Lead",
    start: "Sep 2019",
    end: "Jul 2025",
    years: "2019—25",
    perm: "drwxr-xr-x",
    size: "$4M+",
    blurb:
      "Tech lead for the Analysis Platform — a distributed system analyzing ~30k user projects and ~200k open-source projects every day.",
    bullets: [
      "Owned dependency analysis across 20+ language ecosystems — native toolchain integration plus custom parsers.",
      "Hunted pipeline bottlenecks and optimized critical paths: rewrote to Rust where justified, optimized JS where not.",
      "Designed the on-prem deployment architecture under strict customer infra constraints — no cloud elasticity to lean on.",
      "Led projects generating $4M+ in revenue; ran quarterly squads of 2–3 engineers end-to-end.",
    ],
    stack: "Rust · Haskell · Go · TypeScript · React",
  },
  {
    id: "reynolds",
    org: "Reynolds & Reynolds",
    role: "Software Engineer",
    start: "Jun 2013",
    end: "Sep 2019",
    years: "2013—19",
    perm: "drwxr-xr-x",
    size: "6 yrs",
    blurb: "Internal tooling and embedded systems.",
    bullets: [
      "Built internal developer tooling and embedded systems across Go, Node, React, Swift, .NET, and C.",
    ],
    stack: "Go · Node · React · Swift · .NET · C",
  },
]

type Repo = { name: string; lang: string; url: string; note: string }

const REPOS: Repo[] = [
  {
    name: "hurry",
    lang: "Rust",
    url: "https://github.com/attunehq/hurry",
    note: "distributed, content-addressed build cache for Cargo",
  },
  {
    name: "nudge",
    lang: "Rust",
    url: "https://github.com/attunehq/nudge",
    note: "guardrails for AI coding agents via Claude Code hooks",
  },
  {
    name: "fossa-cli",
    lang: "Haskell",
    url: "https://github.com/fossas/fossa-cli",
    note: "dependency analysis across 20+ ecosystems",
  },
  {
    name: "broker",
    lang: "Rust",
    url: "https://github.com/fossas/broker",
    note: "secure on-prem bridge to FOSSA's cloud",
  },
  {
    name: "circe",
    lang: "Rust",
    url: "https://github.com/fossas/circe",
    note: "container image extraction & analysis",
  },
]

type Writing = { title: string; where: string; url: string }

const WRITING: Writing[] = [
  {
    title: "Engineering blog",
    where: "fossa.com",
    url: "https://fossa.com/blog/author/jessica/",
  },
  {
    title: '"Rust in Production" interview',
    where: "serokell.io",
    url: "https://serokell.io/blog/rust-in-production-fossa",
  },
]

type Link = { key: string; label: string; url: string }

const LINKS: Link[] = [
  { key: "github", label: "github.com/jssblck", url: "https://github.com/jssblck" },
  {
    key: "linkedin",
    label: "linkedin.com/in/jessica-black",
    url: "https://www.linkedin.com/in/jessica-black-17947bbb",
  },
  { key: "email", label: "me@jessica.black", url: "mailto:me@jessica.black" },
]

const SKILLS: string[] = [
  "Rust",
  "Haskell",
  "TypeScript",
  "Go",
  "Distributed systems",
  "Agentic system design",
  "Build systems & tooling",
]

// The rotating gag. Cycles fast, then SETTLES on the last (real) line.
const MOTD_CYCLE: string[] = [
  "reticulating splines…",
  "negotiating with the borrow checker…",
  "spawning agents…",
  "reaching consensus (2 of 3)…",
  "warming the build cache…",
  "resolving 200k dependency graphs…",
  "monomorphizing…",
  "still compiling Haskell…",
  "reticulating phantom types…",
  "achieving eventual consistency…",
  "garbage-collecting the garbage collector…", // mine
  "proving termination (this may not terminate)…", // mine
  "founding engineer @ attune — building agent systems in rust & ts", // settle
]

// Boot lines: print fast, check off, settle into the prompt. Skippable.
const BOOT: string[] = [
  "borrow-checking reality…",
  "spawning agents…",
  "reaching consensus (2 of 3)…",
  "warming the build cache…",
  "reticulating splines…",
  "mounting /home/jess…",
]

/* ------------------------------------------------------------------ *
 *  TRANSCRIPT MODEL
 * ------------------------------------------------------------------ */

type Block =
  | { kind: "text"; node: JSX.Element }
  | { kind: "echo"; cmd: string } // the command the user "ran"
  | { kind: "boot"; label: string } // a boot status line (gets a check)

type Line = { id: number; block: Block }

const COMMANDS = [
  "help",
  "ls",
  "whoami",
  "cat",
  "open",
  "skills",
  "writing",
  "contact",
  "clear",
] as const

// Things `cat` knows about.
const CAT_TARGETS = [
  "about",
  "experience",
  "attune",
  "fossa",
  "reynolds",
  "skills",
  "writing",
  "contact",
  "readme",
] as const

/* ------------------------------------------------------------------ *
 *  PRESENTATIONAL HELPERS  (pure, return JSX for the transcript)
 * ------------------------------------------------------------------ */

// Blocks live inside the transcript state, so they can't receive the live
// dispatcher as a normal prop from the boot path. We hand it down via context.
const RunContext = createContext<(cmd: string) => void>(() => {})
function useRun(): (cmd: string) => void {
  return useContext(RunContext)
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  const external = !href.startsWith("mailto:")
  return (
    <a
      className="jsh-link"
      href={href}
      {...(external
        ? { target: "_blank", rel: "noreferrer noopener" }
        : {})}
    >
      {children}
    </a>
  )
}

// A clickable token that runs a command when activated. Keyboard-operable.
// `run` is optional — when omitted it dispatches through RunContext, which is
// how blocks embedded in the transcript reach the live interpreter.
function Cmd({
  run,
  children,
  label,
}: {
  run?: (cmd: string) => void
  children: string
  label?: string
}) {
  const ctxRun = useRun()
  const dispatch = run ?? ctxRun
  return (
    <button
      type="button"
      className="jsh-cmd"
      onClick={() => dispatch(children)}
      aria-label={label ?? `run command: ${children}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ *
 *  THE COMPONENT
 * ------------------------------------------------------------------ */

export default function Shell() {
  const [lines, setLines] = useState<Line[]>([])
  const [input, setInput] = useState("")
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState<number>(-1) // -1 == editing fresh line
  const [phase, setPhase] = useState<"booting" | "ready">("booting")
  const [reduced, setReduced] = useState(false)
  const [motd, setMotd] = useState(0) // index into MOTD_CYCLE
  const [focused, setFocused] = useState(true)

  const idRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const bootCancel = useRef<(() => void) | null>(null)

  const nextId = useCallback(() => {
    idRef.current += 1
    return idRef.current
  }, [])

  const push = useCallback(
    (block: Block) => {
      setLines((prev) => [...prev, { id: nextId(), block }])
    },
    [nextId],
  )

  const pushText = useCallback(
    (node: JSX.Element) => push({ kind: "text", node }),
    [push],
  )

  /* -------------------- prefers-reduced-motion -------------------- */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  /* ----------------------- MOTD rotation -------------------------- */
  // Cycle the gag, then settle on the final (real) line and stop.
  useEffect(() => {
    if (reduced) {
      setMotd(MOTD_CYCLE.length - 1) // settle immediately
      return
    }
    if (motd >= MOTD_CYCLE.length - 1) return // settled; halt
    const t = window.setTimeout(() => setMotd((m) => m + 1), motd === 0 ? 420 : 150)
    return () => window.clearTimeout(t)
  }, [motd, reduced])

  /* -------------------------- the boot ---------------------------- */
  // Build the transcript deterministically from a boot-progress count, so the
  // sequence is idempotent under re-runs and React 18 StrictMode double-mounts.
  const renderBoot = useCallback((count: number, done: boolean) => {
    const next: Line[] = []
    let n = 0
    for (let k = 0; k < count && k < BOOT.length; k++) {
      next.push({ id: ++n, block: { kind: "boot", label: BOOT[k] } })
    }
    if (done) {
      next.push({ id: ++n, block: { kind: "text", node: <WelcomeCard /> } })
    }
    idRef.current = n
    setLines(next)
  }, [])

  const finishBoot = useCallback(() => {
    renderBoot(BOOT.length, true)
    setPhase("ready")
  }, [renderBoot])

  // The boot timeline. Skippable (any key / click) via the cancel fn, which
  // jumps straight to the settled final state.
  useEffect(() => {
    if (reduced) {
      finishBoot()
      return
    }

    let cancelled = false
    const timers: number[] = []
    let i = 0

    const jumpToEnd = () => {
      if (cancelled) return
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
      finishBoot()
    }
    bootCancel.current = jumpToEnd

    const step = () => {
      if (cancelled) return
      if (i < BOOT.length) {
        i += 1
        renderBoot(i, false)
        timers.push(window.setTimeout(step, 120))
      } else {
        // settle: welcome card + palette, open the prompt
        renderBoot(BOOT.length, true)
        setPhase("ready")
        bootCancel.current = null
      }
    }
    timers.push(window.setTimeout(step, 160))

    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
      bootCancel.current = null
    }
    // run exactly once per reduced-motion value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  /* --------------------- autoscroll on growth --------------------- */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines])

  /* --------------------- window focus tracking -------------------- */
  useEffect(() => {
    const on = () => setFocused(true)
    const off = () => setFocused(false)
    window.addEventListener("focus", on)
    window.addEventListener("blur", off)
    return () => {
      window.removeEventListener("focus", on)
      window.removeEventListener("blur", off)
    }
  }, [])

  /* ----------------------- COMMAND ENGINE ------------------------- */

  const runHelp = useCallback(() => {
    pushText(<HelpBlock run={runRef.current} />)
  }, [pushText])

  const runLs = useCallback(() => {
    pushText(<LsBlock run={runRef.current} />)
  }, [pushText])

  const runWhoami = useCallback(() => {
    pushText(<WhoamiBlock run={runRef.current} />)
  }, [pushText])

  const runSkills = useCallback(() => {
    pushText(<SkillsBlock />)
  }, [pushText])

  const runWriting = useCallback(() => {
    pushText(<WritingBlock />)
  }, [pushText])

  const runContact = useCallback(() => {
    pushText(<ContactBlock />)
  }, [pushText])

  const runCat = useCallback(
    (arg: string) => {
      const t = arg.trim().toLowerCase()
      if (!t) {
        pushText(
          <Errline>
            cat: missing operand. try{" "}
            <Cmd run={runRef.current}>cat about</Cmd> or{" "}
            <Cmd run={runRef.current}>ls</Cmd>
          </Errline>,
        )
        return
      }
      if (t === "about") return pushText(<WhoamiBlock run={runRef.current} />)
      if (t === "experience" || t === "work" || t === "work/") {
        pushText(<LsBlock run={runRef.current} />)
        for (const j of JOBS) pushText(<JobBlock job={j} />)
        return
      }
      if (t === "skills") return pushText(<SkillsBlock />)
      if (t === "writing") return pushText(<WritingBlock />)
      if (t === "contact") return pushText(<ContactBlock />)
      if (t === "readme" || t === "readme.md")
        return pushText(<ReadmeBlock run={runRef.current} />)
      const job = JOBS.find((j) => j.id === t || j.org.toLowerCase() === t)
      if (job) return pushText(<JobBlock job={job} expanded />)
      pushText(
        <Errline>
          cat: {arg}: no such file. known files:{" "}
          {CAT_TARGETS.map((c, i) => (
            <span key={c}>
              {i > 0 ? " " : ""}
              <Cmd run={runRef.current}>{`cat ${c}`}</Cmd>
            </span>
          ))}
        </Errline>,
      )
    },
    [pushText],
  )

  const runOpen = useCallback(
    (arg: string) => {
      const t = arg.trim().toLowerCase()
      if (!t) {
        pushText(
          <Errline>
            open: which one? try{" "}
            <Cmd run={runRef.current}>open github</Cmd>,{" "}
            <Cmd run={runRef.current}>open linkedin</Cmd>, or a repo like{" "}
            <Cmd run={runRef.current}>open hurry</Cmd>
          </Errline>,
        )
        return
      }
      const link = LINKS.find((l) => l.key === t)
      const repo = REPOS.find((r) => r.name === t)
      const target = link?.url ?? repo?.url
      if (!target) {
        pushText(
          <Errline>
            open: {arg}: unknown target. try{" "}
            <Cmd run={runRef.current}>ls</Cmd> to see what&apos;s here.
          </Errline>,
        )
        return
      }
      const isMail = target.startsWith("mailto:")
      pushText(
        <p className="jsh-out">
          <span className="jsh-ok">→</span> opening{" "}
          <Ext href={target}>{link?.label ?? repo?.name}</Ext>
          {!isMail ? " in a new tab…" : "…"}
        </p>,
      )
      if (typeof window !== "undefined") {
        if (isMail) window.location.href = target
        else window.open(target, "_blank", "noreferrer,noopener")
      }
    },
    [pushText],
  )

  // Master dispatch. Echoes the command, then renders its output.
  const run = useCallback(
    (raw: string) => {
      const cmd = raw.trim()
      if (cmd.length === 0) {
        push({ kind: "echo", cmd: "" })
        return
      }

      // record history (dedupe consecutive)
      setHistory((h) =>
        h[h.length - 1] === cmd ? h : [...h, cmd],
      )
      setHistIdx(-1)

      if (cmd === "clear") {
        setLines([])
        idRef.current = 0
        return
      }

      push({ kind: "echo", cmd })

      const [head, ...rest] = cmd.split(/\s+/)
      const arg = rest.join(" ")
      const h = head.toLowerCase()

      switch (h) {
        case "help":
        case "?":
        case "man":
          return runHelp()
        case "ls":
        case "ll":
        case "dir":
          return runLs()
        case "whoami":
        case "about":
          return runWhoami()
        case "cat":
        case "less":
        case "more":
          return runCat(arg)
        case "open":
        case "xdg-open":
        case "start":
          return runOpen(arg)
        case "skills":
          return runSkills()
        case "writing":
        case "blog":
          return runWriting()
        case "contact":
        case "email":
          return runContact()
        case "pwd":
          return pushText(
            <p className="jsh-out">/home/{USER}</p>,
          )
        case "echo":
          return pushText(<p className="jsh-out">{arg}</p>)
        case "sudo":
          return pushText(
            <Errline>
              {USER} is not in the sudoers file. this incident will be
              reported. (it won&apos;t.)
            </Errline>,
          )
        case "exit":
        case "logout":
        case "quit":
          return pushText(
            <p className="jsh-out jsh-muted">
              there is no exit. there is only{" "}
              <Cmd run={runRef.current}>open github</Cmd>.
            </p>,
          )
        default:
          return pushText(
            <Errline>
              {head}: command not found. try{" "}
              <Cmd run={runRef.current}>help</Cmd> — or just click something
              below.
            </Errline>,
          )
      }
    },
    [
      push,
      pushText,
      runHelp,
      runLs,
      runWhoami,
      runCat,
      runOpen,
      runSkills,
      runWriting,
      runContact,
    ],
  )

  // Stable ref so child blocks (rendered into state) can call the latest run.
  const runRef = useRef(run)
  useEffect(() => {
    runRef.current = run
  }, [run])

  // A stable dispatcher for context consumers — never goes stale, never
  // changes identity, so transcript-embedded blocks always reach live `run`.
  const dispatch = useCallback((cmd: string) => runRef.current(cmd), [])

  /* ------------------------ INPUT HANDLING ------------------------ */

  const onSubmit = useCallback(() => {
    const v = input
    setInput("")
    run(v)
  }, [input, run])

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        onSubmit()
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        if (history.length === 0) return
        const next =
          histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1)
        setHistIdx(next)
        setInput(history[next] ?? "")
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        if (histIdx === -1) return
        const next = histIdx + 1
        if (next >= history.length) {
          setHistIdx(-1)
          setInput("")
        } else {
          setHistIdx(next)
          setInput(history[next] ?? "")
        }
        return
      }
      if (e.key === "Tab") {
        // simple completion against the verb table
        e.preventDefault()
        const frag = input.trim().toLowerCase()
        if (!frag) return
        const match = COMMANDS.find((c) => c.startsWith(frag) && c !== frag)
        if (match) setInput(match + " ")
        return
      }
      if ((e.key === "l" || e.key === "L") && e.ctrlKey) {
        e.preventDefault()
        setLines([])
        idRef.current = 0
        return
      }
      if (e.key === "c" && e.ctrlKey) {
        // ^C cancels the current line, like a real shell
        e.preventDefault()
        push({ kind: "echo", cmd: input + "^C" })
        setInput("")
        setHistIdx(-1)
        return
      }
    },
    [input, history, histIdx, onSubmit, push],
  )

  /* --------- global key affordance: any key skips the boot -------- */
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      // While booting, any key (except pure modifiers) jumps to the prompt.
      if (phase === "booting" && bootCancel.current) {
        if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return
        bootCancel.current()
        // refocus input after settle
        window.setTimeout(() => inputRef.current?.focus(), 0)
        return
      }
      // When ready: pressing a printable key focuses the prompt (so you can
      // just start typing from anywhere). But never steal focus from another
      // interactive control — keyboard users must be able to Space/Enter the
      // clickable commands. Only grab focus when nothing focusable is active.
      if (
        phase === "ready" &&
        e.key.length === 1 &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        const active = document.activeElement
        const interactive =
          active instanceof HTMLElement &&
          (active.tagName === "BUTTON" ||
            active.tagName === "A" ||
            active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            active.tagName === "SELECT" ||
            active.isContentEditable)
        if (!interactive) inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [phase])

  // Click anywhere in the terminal body focuses the prompt (unless selecting).
  const focusPrompt = useCallback(() => {
    const sel = window.getSelection?.()
    if (sel && sel.toString().length > 0) return // let users copy text
    if (phase === "ready") inputRef.current?.focus()
  }, [phase])

  /* ----------------------------- VIEW ----------------------------- */

  const settledMotd = motd >= MOTD_CYCLE.length - 1
  const promptStr = `${USER}@${HOST}:~$`

  const reveal = useMemo(
    () => (reduced ? "" : "jsh-reveal"),
    [reduced],
  )

  return (
    <RunContext.Provider value={dispatch}>
    <main
      className={`${plex.className} jsh-root`}
      data-reduced={reduced ? "1" : "0"}
    >
      <StyleBlock />
      <SourceEggs />

      {/* full-bleed background + faint scanline texture lives on jsh-root */}
      <div className="jsh-frame">
        {/* ---- title-block header: spec-sheet identity ---- */}
        <header className={`jsh-titleblock ${reveal}`} style={delay(0)}>
          <div className="jsh-tb-left">
            <h1 className={`${martian.className} jsh-name`}>
              JESSICA BLACK
            </h1>
            <p className="jsh-tb-sub">
              <span className="jsh-muted">FILE</span>{" "}
              ~/index.html
              <span className="jsh-tb-sep">·</span>
              <span className="jsh-muted">LOC</span> Mountain View, CA
              <span className="jsh-tb-sep">·</span>
              <span className="jsh-muted">SHE/HER</span>
            </p>
          </div>
          <dl className="jsh-tb-grid" aria-label="document metadata">
            <div>
              <dt>ROLE</dt>
              <dd>Founding Engineer</dd>
            </div>
            <div>
              <dt>ORG</dt>
              <dd>Attune</dd>
            </div>
            <div>
              <dt>REV</dt>
              <dd className="jsh-tnum">12.0 yrs</dd>
            </div>
            <div>
              <dt>STACK</dt>
              <dd>Rust · Haskell · Go · TS</dd>
            </div>
          </dl>
        </header>

        {/* ---- the MOTD / status line with the rotating gag ---- */}
        {/* The cycling text is decorative; assistive tech gets the settled,
            real descriptor once via an sr-only span — no live-region spam. */}
        <div className={`jsh-motd ${reveal}`} style={delay(1)}>
          <span className="jsh-prompt-dim" aria-hidden="true">motd</span>
          <span className="jsh-motd-sep" aria-hidden="true">:</span>
          <span
            className={`jsh-motd-text ${settledMotd ? "jsh-motd-settled" : ""}`}
            aria-hidden="true"
          >
            {MOTD_CYCLE[motd]}
          </span>
          {!settledMotd && (
            <span className="jsh-cursor jsh-cursor-sm" aria-hidden="true">▋</span>
          )}
          <span className="jsh-sr-only">{MOTD_CYCLE[MOTD_CYCLE.length - 1]}</span>
        </div>

        {/* ---- the terminal proper ---- */}
        <section
          className={`jsh-term ${reveal}`}
          style={delay(2)}
          aria-label="terminal session"
        >
          <div className="jsh-term-bar" aria-hidden="true">
            <span className="jsh-dots">
              <i />
              <i />
              <i />
            </span>
            <span className="jsh-term-title">
              {USER}@{HOST}: /home/{USER}
            </span>
            <span className="jsh-term-stat">
              {phase === "booting" ? "init" : "tty1"}
            </span>
          </div>

          <div
            className="jsh-scroll"
            ref={scrollRef}
            onClick={focusPrompt}
            role="log"
            aria-label="session transcript"
            aria-live="polite"
          >
            {lines.map((l) => (
              <TranscriptRow
                key={l.id}
                line={l}
                prompt={promptStr}
                reduced={reduced}
              />
            ))}

            {/* live prompt */}
            {phase === "ready" && (
              <form
                className="jsh-promptline"
                onSubmit={(e) => {
                  e.preventDefault()
                  onSubmit()
                }}
              >
                <label htmlFor="jsh-input" className="jsh-ps1">
                  {promptStr}
                </label>
                <span className="jsh-inputwrap">
                  <input
                    id="jsh-input"
                    ref={inputRef}
                    className="jsh-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="terminal command input"
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                  />
                  {/* fake caret tracks the input text width */}
                  <span className="jsh-caret-track" aria-hidden="true">
                    <span className="jsh-caret-ghost">{input}</span>
                    <span
                      className={`jsh-cursor ${
                        focused ? "" : "jsh-cursor-hollow"
                      }`}
                    >
                      ▋
                    </span>
                  </span>
                </span>
              </form>
            )}

            {phase === "booting" && (
              <p className="jsh-bootcursor">
                <span className="jsh-cursor">▋</span>
              </p>
            )}
          </div>

          {/* persistent hint bar */}
          <div className="jsh-hintbar">
            <span className="jsh-hint-key">type</span>{" "}
            <Cmd run={run}>help</Cmd>{" "}
            <span className="jsh-muted">or click a command ·</span>{" "}
            <span className="jsh-muted">↑↓ history · Tab completes · ⌃L clears</span>
            {phase === "booting" && (
              <span className="jsh-hint-skip"> · press any key to skip boot</span>
            )}
          </div>
        </section>

        {/* ---- footer / nav: reachable, real links ---- */}
        <footer className={`jsh-foot ${reveal}`} style={delay(3)}>
          <nav className="jsh-nav" aria-label="primary">
            {LINKS.map((l) => (
              <Ext key={l.key} href={l.url}>
                {l.key}
              </Ext>
            ))}
            <span className="jsh-foot-sep" aria-hidden="true">
              ::
            </span>
            <Cmd run={run}>ls</Cmd>
            <Cmd run={run}>whoami</Cmd>
            <Cmd run={run}>skills</Cmd>
            <Cmd run={run}>writing</Cmd>
          </nav>
          <p className="jsh-colophon jsh-muted">
            built in one file · hooks only · no glow, no gradients ·{" "}
            <span className="jsh-tnum">{new Date().getFullYear()}</span>
          </p>
        </footer>
      </div>
    </main>
    </RunContext.Provider>
  )
}

/* ------------------------------------------------------------------ *
 *  ROW RENDERER
 * ------------------------------------------------------------------ */

function TranscriptRow({
  line,
  prompt,
  reduced,
}: {
  line: Line
  prompt: string
  reduced: boolean
}) {
  const cls = reduced ? "" : "jsh-row-in"
  const b = line.block
  if (b.kind === "echo") {
    return (
      <div className={`jsh-echo ${cls}`}>
        <span className="jsh-ps1">{prompt}</span>
        <span className="jsh-echo-cmd">{b.cmd}</span>
      </div>
    )
  }
  if (b.kind === "boot") {
    return (
      <div className={`jsh-bootline ${cls}`}>
        <span className="jsh-ok">[ ok ]</span>
        <span className="jsh-boot-label">{b.label}</span>
      </div>
    )
  }
  return <div className={`jsh-block ${cls}`}>{b.node}</div>
}

/* ------------------------------------------------------------------ *
 *  CONTENT BLOCKS  (rendered as command output)
 * ------------------------------------------------------------------ */

function WelcomeCard() {
  return (
    <div className="jsh-welcome">
      {/* boot-complete summary — reads like real login output, no figlet glitz */}
      <pre className="jsh-banner" aria-hidden="true">{[
        "jessica.black — interactive shell (jsh 12.0)",
        "session: tty1   host: jessica.black   user: jess",
        "kernel: rust 1.x   userland: typescript   uptime: 12y",
      ].join("\n")}</pre>
      <p className="jsh-w-line">
        <span className="jsh-ok">login:</span> welcome. this is a real shell —
        mostly. it parses commands, keeps history, completes on{" "}
        <kbd className="jsh-kbd">Tab</kbd>.
      </p>
      <p className="jsh-w-line jsh-measure jsh-muted">
        Founding engineer building AI agent systems in Rust and TypeScript.
        Twelve years shipping distributed systems, program-analysis engines,
        and developer tools.
      </p>
      <p className="jsh-w-line jsh-muted">
        nothing here needs typing — click a command to run it:
      </p>
      <PaletteRow />
    </div>
  )
}

// The clickable command palette. Dispatches through RunContext.
function PaletteRow() {
  const run = useRun()
  const items: Array<[string, string]> = [
    ["whoami", "who is this"],
    ["ls", "list work/"],
    ["cat experience", "full history"],
    ["skills", "the toolbox"],
    ["writing", "words"],
    ["contact", "say hi"],
    ["help", "everything"],
  ]
  return (
    <div className="jsh-palette" role="group" aria-label="suggested commands">
      {items.map(([cmd, hint]) => (
        <button
          key={cmd}
          type="button"
          className="jsh-pill"
          onClick={() => run(cmd)}
          title={hint}
        >
          <span className="jsh-pill-cmd">{cmd}</span>
          <span className="jsh-pill-hint">{hint}</span>
        </button>
      ))}
    </div>
  )
}

function HelpBlock({ run }: { run: (c: string) => void }) {
  const rows: Array<[string, string]> = [
    ["help", "this list"],
    ["ls", "list work/ (ls -la style)"],
    ["whoami", "the short version"],
    ["cat <name>", "read a file — e.g. cat attune, cat fossa, cat readme"],
    ["skills", "languages & domains"],
    ["writing", "blog posts & interviews"],
    ["contact", "github · linkedin · email"],
    ["open <target>", "open a link — e.g. open github, open hurry"],
    ["clear", "wipe the screen (⌃L)"],
  ]
  return (
    <div className="jsh-help">
      <p className="jsh-out jsh-muted">available commands — click any to run:</p>
      <ul className="jsh-helpgrid">
        {rows.map(([c, d]) => {
          const base = c.split(" ")[0]
          return (
            <li key={c}>
              <Cmd run={run} label={`run ${base}`}>
                {base}
              </Cmd>
              {c.includes("<") && (
                <span className="jsh-help-arg">
                  {c.slice(c.indexOf(" "))}
                </span>
              )}
              <span className="jsh-help-desc">{d}</span>
            </li>
          )
        })}
      </ul>
      <p className="jsh-out jsh-muted jsh-help-foot">
        history: <kbd className="jsh-kbd">↑</kbd>{" "}
        <kbd className="jsh-kbd">↓</kbd> · complete:{" "}
        <kbd className="jsh-kbd">Tab</kbd> · or never type at all — everything is
        clickable.
      </p>
    </div>
  )
}

function LsBlock({ run }: { run: (c: string) => void }) {
  return (
    <div className="jsh-ls">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> ls -la ~/work
      </p>
      <p className="jsh-ls-total jsh-muted">total {JOBS.length} · drwxr-xr-x</p>
      <ul className="jsh-lslist">
        {JOBS.map((j) => (
          <li key={j.id} className="jsh-lsrow">
            <span className="jsh-ls-perm jsh-muted">{j.perm}</span>
            <span className="jsh-ls-size jsh-muted jsh-tnum">{j.size}</span>
            <span className="jsh-ls-year jsh-tnum">{j.years}</span>
            <button
              type="button"
              className="jsh-ls-name"
              onClick={() => run(`cat ${j.id}`)}
              title={`cat ${j.id}`}
            >
              {j.id}/
            </button>
            <span className="jsh-ls-role jsh-muted">{j.role}</span>
          </li>
        ))}
      </ul>
      <p className="jsh-out jsh-muted jsh-ls-hint">
        → click a name (or <Cmd run={run}>cat experience</Cmd>) to expand.
      </p>
    </div>
  )
}

function JobBlock({ job, expanded }: { job: Job; expanded?: boolean }) {
  // Hover-to-expand: bullets are revealed on hover/focus; `expanded` forces open
  // (used by `cat attune`). Both paths keep content in the DOM for a11y.
  return (
    <article
      className={`jsh-job ${expanded ? "jsh-job-open" : ""}`}
      tabIndex={0}
      aria-label={`${job.org} — ${job.role}`}
    >
      <header className="jsh-job-head">
        <span className="jsh-job-year jsh-tnum">{job.years}</span>
        <span className="jsh-job-bar" aria-hidden="true" />
        <span className="jsh-job-meta">
          <span className="jsh-job-org">{job.org}</span>
          <span className="jsh-job-role">{job.role}</span>
        </span>
        <span className="jsh-job-dates jsh-muted jsh-tnum">
          {job.start} – {job.end}
        </span>
      </header>
      <p className="jsh-job-blurb">{job.blurb}</p>
      <div className="jsh-job-detail">
        <ul className="jsh-job-bullets">
          {job.bullets.map((b, i) => (
            <li key={i}>
              <span className="jsh-bullet-mark" aria-hidden="true">
                ›
              </span>
              <span>{withRepoLinks(b)}</span>
            </li>
          ))}
        </ul>
        {job.stack && (
          <p className="jsh-job-stack jsh-muted">
            <span className="jsh-job-stack-k">stack</span> {job.stack}
          </p>
        )}
      </div>
      {!expanded && (
        <span className="jsh-job-hover jsh-muted" aria-hidden="true">
          hover to expand ↡
        </span>
      )}
    </article>
  )
}

function SkillsBlock() {
  return (
    <div className="jsh-skills">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> cat ~/skills
      </p>
      <ul className="jsh-skillgrid">
        {SKILLS.map((s) => (
          <li key={s} className="jsh-skill">
            <span className="jsh-skill-mark" aria-hidden="true">
              ▪
            </span>
            {s}
          </li>
        ))}
      </ul>
      <p className="jsh-out jsh-muted">
        deep fluency in <span className="jsh-em">Rust</span>,{" "}
        <span className="jsh-em">Haskell</span>,{" "}
        <span className="jsh-em">Go</span>, and{" "}
        <span className="jsh-em">TypeScript</span>.
      </p>
    </div>
  )
}

function WritingBlock() {
  return (
    <div className="jsh-writing">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> ls ~/writing
      </p>
      <ul className="jsh-linklist">
        {WRITING.map((w) => (
          <li key={w.url}>
            <Ext href={w.url}>{w.title}</Ext>
            <span className="jsh-linklist-where jsh-muted">— {w.where}</span>
          </li>
        ))}
      </ul>
      <p className="jsh-out jsh-muted">
        open-source work:{" "}
        {REPOS.map((r, i) => (
          <span key={r.name}>
            {i > 0 ? " · " : ""}
            <Ext href={r.url}>{r.name}</Ext>
          </span>
        ))}
      </p>
    </div>
  )
}

function ContactBlock() {
  return (
    <div className="jsh-contact">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> cat ~/.contact
      </p>
      <ul className="jsh-linklist">
        {LINKS.map((l) => (
          <li key={l.key}>
            <span className="jsh-contact-k jsh-muted">{l.key}</span>
            <Ext href={l.url}>{l.label}</Ext>
          </li>
        ))}
      </ul>
      <p className="jsh-out jsh-muted">
        open to interesting problems — distributed systems, agent
        infrastructure, anything with a borrow checker.
      </p>
    </div>
  )
}

function WhoamiBlock({ run }: { run: (c: string) => void }) {
  return (
    <div className="jsh-whoami">
      <p className="jsh-out">
        <span className="jsh-em">Jessica Black</span> — founding engineer.
      </p>
      <p className="jsh-out jsh-measure">
        I build AI agent systems in Rust and TypeScript. Twelve years shipping
        distributed systems, program-analysis engines, and developer tools —
        from a 200k-project dependency-analysis platform to multi-agent
        orchestration built from scratch. I like hard problems with crisp
        correctness conditions: consensus, build caches, dependency graphs,
        type systems.
      </p>
      <p className="jsh-out jsh-muted">
        currently <span className="jsh-em">@ Attune</span>. previously tech lead{" "}
        <span className="jsh-em">@ FOSSA</span>. read more:{" "}
        <Cmd run={run}>cat experience</Cmd> ·{" "}
        <Cmd run={run}>skills</Cmd> ·{" "}
        <Cmd run={run}>contact</Cmd>
      </p>
    </div>
  )
}

function ReadmeBlock({ run }: { run: (c: string) => void }) {
  return (
    <div className="jsh-readme">
      <p className="jsh-out">
        <span className="jsh-em"># jessica.black</span>
      </p>
      <p className="jsh-out jsh-measure">
        A personal site that presents as a shell session. It is one React file,
        hooks only — no terminal emulator library, no framework gymnastics. The
        prompt is real: it parses commands, keeps history, and completes on Tab.
      </p>
      <p className="jsh-out jsh-muted">
        Everything here is also reachable by clicking. Start with{" "}
        <Cmd run={run}>ls</Cmd> or <Cmd run={run}>whoami</Cmd>.
      </p>
      <p className="jsh-out jsh-muted jsh-readme-fine">
        {/* a wink for the source-divers */}
        psst — there are comments in the source. they borrow-check.
      </p>
    </div>
  )
}

function Errline({ children }: { children: React.ReactNode }) {
  return (
    <p className="jsh-out jsh-err">
      <span className="jsh-err-mark" aria-hidden="true">
        ✗
      </span>
      {children}
    </p>
  )
}

/* ------------------------------------------------------------------ *
 *  helpers
 * ------------------------------------------------------------------ */

// Turn the names Hurry / Nudge inside a bullet into real links.
function withRepoLinks(text: string): React.ReactNode {
  const named = [
    { word: "Hurry", url: "https://github.com/attunehq/hurry" },
    { word: "Nudge", url: "https://github.com/attunehq/nudge" },
  ]
  const hit = named.find((n) => text.startsWith(n.word + " —"))
  if (!hit) return text
  const rest = text.slice(hit.word.length)
  return (
    <>
      <Ext href={hit.url}>{hit.word}</Ext>
      {rest}
    </>
  )
}

// staggered-reveal inline style helper
function delay(step: number): React.CSSProperties {
  return { ["--jsh-d" as string]: `${step * 90}ms` }
}

/* ------------------------------------------------------------------ *
 *  STYLES — keyframes + custom CSS. All prefixed jsh-.
 * ------------------------------------------------------------------ */

function StyleBlock() {
  return (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: CSS,
      }}
    />
  )
}

// Real HTML comments for the source-divers. JSX {/* */} comments don't survive
// to the DOM, so we inject genuine <!-- --> nodes via an invisible wrapper.
const SOURCE_EGGS = [
  "you found the source. it borrow-checks.",
  "no framework was harmed. one file, hooks only, amber phosphor.",
  "the REPL is real — try the up arrow. history buffer works.",
  "reticulating phantom types… (done, statically)",
  "if you're reading this in devtools, you're exactly the kind of person I'd want to work with. say hi: me@jessica.black",
].map((c) => `<!-- ${c} -->`).join("\n")

function SourceEggs() {
  return (
    <div
      hidden
      aria-hidden="true"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: SOURCE_EGGS }}
    />
  )
}

const CSS = String.raw`
:root {
  --jsh-bg: #0c0c0e;
  --jsh-bg-2: #0e0e10;
  --jsh-fg: #e8e6df;
  --jsh-muted: #8a8780;
  --jsh-faint: #5b5953;
  --jsh-rule: #1f1f22;
  --jsh-rule-2: #17171a;
  --jsh-amber: #e0a23a;       /* desaturated phosphor amber — the one accent */
  --jsh-amber-soft: #b9893a;  /* dimmer amber for secondary marks */
}

.jsh-root {
  min-height: 100vh;
  min-height: 100dvh;
  background-color: var(--jsh-bg);
  color: var(--jsh-fg);
  font-feature-settings: "kern" 1, "liga" 0, "calt" 0;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  letter-spacing: 0.1px;
  position: relative;
  overflow-x: hidden;
}

/* faint scanline texture at <=3% — atmosphere, not glitz */
.jsh-root::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.025) 0px,
    rgba(255, 255, 255, 0.025) 1px,
    transparent 1px,
    transparent 3px
  );
  mix-blend-mode: overlay;
  opacity: 0.6;
}

.jsh-frame {
  position: relative;
  z-index: 1;
  max-width: 980px;
  margin: 0 auto;
  padding: clamp(20px, 4vw, 56px) clamp(16px, 4vw, 40px) 48px;
}

/* ---------------- title-block ---------------- */
.jsh-titleblock {
  display: flex;
  flex-wrap: wrap;
  gap: 18px 28px;
  align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--jsh-rule);
}
.jsh-name {
  font-size: clamp(26px, 5.5vw, 44px);
  line-height: 0.96;
  letter-spacing: -0.5px;
  font-weight: 700;
  margin: 0;
  color: var(--jsh-fg);
}
.jsh-tb-sub {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--jsh-fg);
  letter-spacing: 0.2px;
}
.jsh-tb-sep { color: var(--jsh-faint); margin: 0 8px; }
.jsh-tb-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 26px;
  margin: 0;
}
.jsh-tb-grid dt {
  font-size: 9.5px;
  letter-spacing: 1.4px;
  color: var(--jsh-faint);
  text-transform: uppercase;
}
.jsh-tb-grid dd {
  margin: 1px 0 0;
  font-size: 12px;
  color: var(--jsh-fg);
}

/* ---------------- motd ---------------- */
.jsh-motd {
  display: flex;
  align-items: baseline;
  gap: 0;
  margin: 16px 0 18px;
  font-size: 13px;
  min-height: 18px;
}
.jsh-prompt-dim { color: var(--jsh-faint); }
.jsh-motd-sep { color: var(--jsh-faint); margin: 0 8px 0 0; }
.jsh-motd-text { color: var(--jsh-muted); transition: color 240ms ease; }
.jsh-motd-settled { color: var(--jsh-amber); }

/* ---------------- terminal ---------------- */
.jsh-term {
  border: 1px solid var(--jsh-rule);
  background: var(--jsh-bg-2);
  border-radius: 4px;
  overflow: hidden;
}
.jsh-term-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--jsh-rule);
  background: #0b0b0d;
  font-size: 11px;
  color: var(--jsh-muted);
}
.jsh-dots { display: inline-flex; gap: 6px; }
.jsh-dots i {
  width: 9px; height: 9px;
  border-radius: 50%;
  border: 1px solid var(--jsh-rule);
  display: block;
}
.jsh-dots i:nth-child(1) { border-color: #3a352a; }
.jsh-term-title { color: var(--jsh-faint); letter-spacing: 0.3px; }
.jsh-term-stat {
  margin-left: auto;
  color: var(--jsh-faint);
  border: 1px solid var(--jsh-rule);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  letter-spacing: 0.5px;
}

.jsh-scroll {
  height: clamp(440px, 64vh, 620px);
  overflow-y: auto;
  padding: 16px clamp(12px, 2.5vw, 22px) 18px;
  font-size: 13.5px;
  line-height: 1.62;
  scrollbar-width: thin;
  scrollbar-color: #2a2a2e transparent;
}
.jsh-scroll::-webkit-scrollbar { width: 10px; }
.jsh-scroll::-webkit-scrollbar-thumb {
  background: #26262a;
  border-radius: 6px;
  border: 3px solid var(--jsh-bg-2);
}
.jsh-scroll::-webkit-scrollbar-track { background: transparent; }

/* boot + echo + blocks */
.jsh-bootline {
  display: flex;
  gap: 12px;
  align-items: baseline;
  color: var(--jsh-muted);
  font-size: 13px;
}
.jsh-ok { color: var(--jsh-amber); }
.jsh-boot-label { color: var(--jsh-muted); }
.jsh-bootcursor { margin: 2px 0 0; }

.jsh-echo {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-top: 12px;
  flex-wrap: wrap;
}
.jsh-ps1 {
  color: var(--jsh-amber-soft);
  white-space: nowrap;
  user-select: none;
}
.jsh-echo-cmd { color: var(--jsh-fg); word-break: break-word; }

.jsh-block { margin-top: 6px; }
.jsh-out { margin: 3px 0; color: var(--jsh-fg); }
.jsh-muted { color: var(--jsh-muted); }
.jsh-faint { color: var(--jsh-faint); }
.jsh-em { color: var(--jsh-amber); font-weight: 500; }
.jsh-measure { max-width: 66ch; }

/* links + clickable command tokens */
.jsh-link {
  color: var(--jsh-amber);
  text-decoration: none;
  border-bottom: 1px solid rgba(224, 162, 58, 0.32);
  transition: border-color 140ms ease, background 140ms ease;
  padding: 0 1px;
}
.jsh-link:hover { border-bottom-color: var(--jsh-amber); }
.jsh-link:focus-visible {
  outline: none;
  background: rgba(224, 162, 58, 0.14);
  border-bottom-color: var(--jsh-amber);
}

.jsh-cmd {
  font: inherit;
  color: var(--jsh-amber);
  background: transparent;
  border: none;
  border-bottom: 1px dashed rgba(224, 162, 58, 0.4);
  padding: 0 1px;
  margin: 0 1px;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
}
.jsh-cmd::before { content: ""; }
.jsh-cmd:hover { border-bottom-style: solid; background: rgba(224, 162, 58, 0.1); }
.jsh-cmd:focus-visible {
  outline: none;
  background: rgba(224, 162, 58, 0.16);
  border-bottom: 1px solid var(--jsh-amber);
}

/* ---------------- prompt line ---------------- */
.jsh-promptline {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin-top: 14px;
}
.jsh-inputwrap {
  position: relative;
  flex: 1;
  display: inline-flex;
  align-items: baseline;
  min-width: 0;
}
.jsh-input {
  font: inherit;
  color: var(--jsh-fg);
  background: transparent;
  border: none;
  outline: none;
  caret-color: transparent; /* we draw our own block caret */
  width: 100%;
  padding: 0;
  position: relative;
  z-index: 2;
}
.jsh-caret-track {
  position: absolute;
  left: 0; top: 0;
  z-index: 1;
  display: inline-flex;
  align-items: baseline;
  pointer-events: none;
  white-space: pre;
  max-width: 100%;
  overflow: hidden;
}
.jsh-caret-ghost { visibility: hidden; white-space: pre; }

.jsh-cursor {
  color: var(--jsh-amber);
  animation: jsh-blink 1.06s steps(1, end) infinite;
  margin-left: -2px;
}
.jsh-cursor-sm { font-size: 12px; }
.jsh-cursor-hollow { color: var(--jsh-faint); animation: none; }

@keyframes jsh-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}

/* ---------------- hint bar ---------------- */
.jsh-hintbar {
  border-top: 1px solid var(--jsh-rule);
  padding: 8px 14px;
  font-size: 11.5px;
  color: var(--jsh-muted);
  background: #0b0b0d;
}
.jsh-hint-key { color: var(--jsh-faint); }
.jsh-hint-skip { color: var(--jsh-amber-soft); }

/* ---------------- welcome / palette ---------------- */
.jsh-welcome { margin-top: 2px; }
.jsh-banner {
  color: var(--jsh-faint);
  font-size: 11.5px;
  line-height: 1.5;
  margin: 0 0 12px;
  padding: 8px 11px;
  border: 1px solid var(--jsh-rule-2);
  border-left: 2px solid var(--jsh-amber);
  border-radius: 3px;
  background: #0b0b0d;
  overflow-x: auto;
  white-space: pre;
  letter-spacing: 0.2px;
}
.jsh-w-line { margin: 6px 0; }
.jsh-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0 4px;
}
.jsh-pill {
  font: inherit;
  display: inline-flex;
  flex-direction: column;
  gap: 1px;
  align-items: flex-start;
  background: #111114;
  border: 1px solid var(--jsh-rule);
  border-radius: 3px;
  padding: 6px 10px;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
}
.jsh-pill:hover {
  border-color: var(--jsh-amber-soft);
  background: #141417;
}
.jsh-pill:focus-visible {
  outline: none;
  border-color: var(--jsh-amber);
  background: #15151a;
}
.jsh-pill-cmd { color: var(--jsh-amber); font-size: 12.5px; }
.jsh-pill-hint { color: var(--jsh-faint); font-size: 10px; letter-spacing: 0.2px; }

/* ---------------- help ---------------- */
.jsh-help { margin-top: 2px; }
.jsh-helpgrid {
  list-style: none;
  margin: 6px 0 8px;
  padding: 0;
  display: grid;
  gap: 3px 0;
}
.jsh-helpgrid li {
  display: grid;
  grid-template-columns: 92px auto;
  align-items: baseline;
  column-gap: 12px;
}
.jsh-help-arg { color: var(--jsh-muted); margin-left: -8px; }
.jsh-help-desc { color: var(--jsh-muted); }
.jsh-help-foot { margin-top: 8px; }
.jsh-kbd, .jsh-kbd {
  display: inline-block;
  border: 1px solid var(--jsh-rule);
  border-bottom-width: 2px;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  color: var(--jsh-fg);
  background: #141417;
}

/* ---------------- ls ---------------- */
.jsh-ls { margin-top: 2px; }
.jsh-ls-total { margin: 2px 0 6px; font-size: 12px; }
.jsh-lslist { list-style: none; margin: 0; padding: 0; }
.jsh-lsrow {
  display: grid;
  grid-template-columns: 92px 64px 60px auto;
  align-items: baseline;
  column-gap: 12px;
  padding: 1px 0;
}
.jsh-ls-perm { font-size: 12px; letter-spacing: 0.3px; }
.jsh-ls-size { font-size: 12px; text-align: right; }
.jsh-ls-year { color: var(--jsh-amber-soft); }
.jsh-ls-name {
  font: inherit;
  color: var(--jsh-amber);
  background: none;
  border: none;
  border-bottom: 1px dashed rgba(224, 162, 58, 0.4);
  padding: 0;
  cursor: pointer;
  justify-self: start;
}
.jsh-ls-name:hover { border-bottom-style: solid; }
.jsh-ls-name:focus-visible {
  outline: none; background: rgba(224, 162, 58, 0.16);
}
.jsh-ls-role { font-size: 12.5px; }
.jsh-ls-hint { margin-top: 7px; }

/* row that wraps on mobile */
@media (max-width: 560px) {
  .jsh-lsrow {
    grid-template-columns: 58px auto;
    grid-template-areas:
      "year name"
      "year role";
    row-gap: 0;
  }
  .jsh-ls-perm, .jsh-ls-size { display: none; }
  .jsh-ls-year { grid-area: year; }
  .jsh-ls-name { grid-area: name; }
  .jsh-ls-role { grid-area: role; }
  .jsh-helpgrid li { grid-template-columns: 80px auto; }
}

/* ---------------- job / timeline ---------------- */
.jsh-job {
  border: 1px solid var(--jsh-rule-2);
  border-left: 2px solid var(--jsh-rule);
  border-radius: 3px;
  padding: 12px 14px;
  margin: 8px 0;
  transition: border-color 180ms ease, background 180ms ease;
  outline: none;
}
.jsh-job:hover, .jsh-job:focus-visible, .jsh-job-open {
  border-left-color: var(--jsh-amber);
  background: #101013;
}
.jsh-job:focus-visible { border-color: var(--jsh-amber-soft); }
.jsh-job-head {
  display: grid;
  grid-template-columns: 64px 10px 1fr auto;
  align-items: baseline;
  column-gap: 10px;
}
.jsh-job-year { color: var(--jsh-amber-soft); font-weight: 600; }
.jsh-job-bar {
  width: 1px;
  align-self: stretch;
  background: var(--jsh-rule);
  justify-self: center;
}
.jsh-job-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.jsh-job-org { color: var(--jsh-fg); font-weight: 600; font-size: 14px; }
.jsh-job-role { color: var(--jsh-muted); font-size: 12.5px; }
.jsh-job-dates { font-size: 11.5px; white-space: nowrap; }
.jsh-job-blurb { margin: 9px 0 0; color: var(--jsh-fg); font-size: 13px; }

/* hover-to-expand: collapse detail until hover/focus/open */
.jsh-job-detail {
  display: grid;
  grid-template-rows: 0fr;
  opacity: 0;
  transition: grid-template-rows 240ms ease, opacity 200ms ease, margin 240ms ease;
  margin-top: 0;
}
.jsh-job-detail > * { overflow: hidden; min-height: 0; }
.jsh-job:hover .jsh-job-detail,
.jsh-job:focus-visible .jsh-job-detail,
.jsh-job:focus-within .jsh-job-detail,
.jsh-job-open .jsh-job-detail {
  grid-template-rows: 1fr;
  opacity: 1;
  margin-top: 10px;
}
.jsh-job-bullets { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.jsh-job-bullets li {
  display: grid;
  grid-template-columns: 16px 1fr;
  align-items: baseline;
  color: var(--jsh-fg);
  font-size: 12.8px;
  line-height: 1.55;
}
.jsh-job-bullets li > span:last-child { max-width: 64ch; }
.jsh-bullet-mark { color: var(--jsh-amber-soft); }
.jsh-job-stack { margin: 9px 0 0; font-size: 12px; }
.jsh-job-stack-k {
  color: var(--jsh-faint);
  border: 1px solid var(--jsh-rule);
  border-radius: 3px;
  padding: 0 5px;
  margin-right: 6px;
  font-size: 10.5px;
  letter-spacing: 0.4px;
}
.jsh-job-hover {
  display: block;
  margin-top: 8px;
  font-size: 10.5px;
  letter-spacing: 0.4px;
  opacity: 0.7;
}
.jsh-job:hover .jsh-job-hover,
.jsh-job:focus-within .jsh-job-hover,
.jsh-job-open .jsh-job-hover { display: none; }

@media (max-width: 560px) {
  .jsh-job-head {
    grid-template-columns: 60px 1fr;
    row-gap: 2px;
  }
  .jsh-job-bar { display: none; }
  .jsh-job-dates { grid-column: 2; }
}

/* ---------------- skills / writing / contact ---------------- */
.jsh-skillgrid {
  list-style: none; margin: 6px 0 8px; padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 3px 18px;
}
.jsh-skill {
  display: flex; gap: 8px; align-items: baseline;
  color: var(--jsh-fg); font-size: 13px;
}
.jsh-skill-mark { color: var(--jsh-amber-soft); font-size: 9px; }

.jsh-linklist { list-style: none; margin: 6px 0 8px; padding: 0; display: grid; gap: 4px; }
.jsh-linklist li { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.jsh-linklist-where { font-size: 12px; }
.jsh-contact-k {
  min-width: 64px;
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--jsh-faint);
}

.jsh-err { color: #d98a6a; }
.jsh-err-mark { color: #d98a6a; margin-right: 8px; }
.jsh-readme-fine { margin-top: 8px; font-size: 11.5px; opacity: 0.8; }

/* ---------------- footer ---------------- */
.jsh-foot {
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--jsh-rule);
}
.jsh-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: baseline;
  font-size: 12.5px;
}
.jsh-foot-sep { color: var(--jsh-faint); }
.jsh-colophon { margin: 12px 0 0; font-size: 11px; }

/* tabular numerals everywhere we show years/figures */
.jsh-tnum { font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1; }

/* visually hidden, exposed only to assistive tech */
.jsh-sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* ================= MOTION ================= */
/* staggered page-load reveals */
.jsh-reveal {
  opacity: 0;
  transform: translateY(6px);
  animation: jsh-rise 480ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  animation-delay: var(--jsh-d, 0ms);
}
@keyframes jsh-rise {
  to { opacity: 1; transform: translateY(0); }
}
/* each transcript row eases in */
.jsh-row-in {
  animation: jsh-rowin 220ms ease both;
}
@keyframes jsh-rowin {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ================= REDUCED MOTION ================= */
@media (prefers-reduced-motion: reduce) {
  .jsh-reveal,
  .jsh-row-in {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .jsh-cursor { animation: none !important; }
  .jsh-job-detail { transition: none !important; }
  .jsh-motd-text { transition: none !important; }
  .jsh-link, .jsh-cmd, .jsh-pill { transition: none !important; }
}
/* also honor the data attribute we set from JS */
.jsh-root[data-reduced="1"] .jsh-reveal,
.jsh-root[data-reduced="1"] .jsh-row-in {
  animation: none !important;
  opacity: 1 !important;
  transform: none !important;
}
.jsh-root[data-reduced="1"] .jsh-cursor { animation: none !important; }
`
