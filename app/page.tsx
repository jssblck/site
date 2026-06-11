"use client"

/*
  jessica.black — "The Shell"
  A personal site that presents as a live, full-screen shell session: it boots,
  settles, then takes commands. One file, React hooks only — no terminal
  emulator and no framework gymnastics; amber phosphor on near-black.

  -- you found the source. it borrow-checks. --
  -- no framework was harmed. one file, hooks only, three themes. --
  -- yes, the history buffer works. try the up arrow. and the konami code. --
*/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from "react"
import { IBM_Plex_Mono, Martian_Mono } from "next/font/google"
import dynamic from "next/dynamic"
import { GameExitContext } from "@/app/games/_exit-context"
import MatrixRain from "@/app/MatrixRain"

const PACIFIC_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
})

const PALETTE_ITEMS: Array<[string, string]> = [
  ["whoami", "who is this"],
  ["ls", "browse files"],
  ["experience", "full history"],
  ["skills", "skill files"],
  ["resume", "the whole thing"],
  ["contact", "say hi"],
  ["help", "everything"],
]

const HELP_ROWS: Array<[string, string]> = [
  ["help", "this list"],
  ["man <cmd>", "read the manual — e.g. man ls"],
  ["ls", "list the current directory"],
  ["cd <dir>", "change directory — e.g. cd skills, cd .."],
  ["pwd", "print where you are"],
  ["whoami", "the short version"],
  ["cat <name>", "read a file — e.g. cat attune, cat readme"],
  ["skills", "skill files — like the ones you give an agent"],
  ["projects", "the things I've built"],
  ["resume", "the whole résumé, printed"],
  ["tree", "the filesystem, at a glance"],
  ["writing", "blog posts & interviews"],
  ["contact", "github · linkedin · email"],
  ["open <target>", "open a link — e.g. open github, open hurry"],
  ["theme <name>", "amber · green · paper"],
  ["history", "what you have run"],
  ["achievements", "what you've unlocked"],
  ["games", "yes, there are games"],
  ["clear", "wipe the screen (⌃L)"],
]

// Industrial mono for the REPL body. Static weights — predictable rhythm.
const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

// Mechanical/condensed display face for the wordmark only.
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
    blurb: "Internal tooling and embedded systems.",
    bullets: [
      "Built internal developer tooling and embedded systems across Go, Node, React, Swift, .NET, and C.",
    ],
    stack: "Go · Node · React · Swift · .NET · C",
  },
]

// Everything worth pointing at, open source or not. The shape is uniform; what
// differs is the link. Open-source projects carry a `code` URL (their repo) and
// a `lang`; closed ones may instead have a `site` (their own public home, like
// Sandi's) and a `badge`. `open <name>` and the projects list send you to
// `code ?? site` — the code if it's open, its home if not, nowhere if neither.
type Project = {
  name: string
  note: string
  code?: string // public source repo — present iff open source
  site?: string // a public home of its own (e.g. Sandi's site)
  lang?: string // language badge, for open-source code
  badge?: string // badge text for projects without public code
}

const PROJECTS: Project[] = [
  {
    name: "sandi",
    site: "https://sandi.jessica.black",
    badge: "live · private",
    note: "household intelligence on Discord — memory, tools, taste of her own",
  },
  {
    name: "hurry",
    code: "https://github.com/attunehq/hurry",
    lang: "Rust",
    note: "distributed, content-addressed build cache for Cargo",
  },
  {
    name: "nudge",
    code: "https://github.com/attunehq/nudge",
    lang: "Rust",
    note: "guardrails for AI coding agents via Claude Code hooks",
  },
  {
    name: "fossa-cli",
    code: "https://github.com/fossas/fossa-cli",
    lang: "Haskell",
    note: "dependency analysis across 20+ ecosystems",
  },
  {
    name: "broker",
    code: "https://github.com/fossas/broker",
    lang: "Rust",
    note: "secure on-prem bridge to FOSSA's cloud",
  },
  {
    name: "circe",
    code: "https://github.com/fossas/circe",
    lang: "Rust",
    note: "container image extraction & analysis",
  },
  {
    name: "mite",
    code: "https://github.com/jssblck/mite",
    lang: "Rust",
    note: "windows-first OCR overlay for reading Japanese in games",
  },
  {
    name: "unempty",
    code: "https://github.com/jssblck/unempty",
    lang: "Rust",
    note: "non-empty collection types, published on crates.io",
  },
  {
    name: "procession",
    code: "https://github.com/jssblck/procession",
    lang: "Rust",
    note: "language-agnostic, Redis-backed background job server",
  },
]

// Where a project opens: its source if open, else its own home, else nowhere.
const projectUrl = (p: Project): string | undefined => p.code ?? p.site

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

const linkUrl = (k: string) => LINKS.find((l) => l.key === k)?.url ?? "#"

// A visitor is a guest on jess's machine. Rather than an IP (creepy + useless),
// they get a Docker-style handle: an adjective + a computer-science name, in
// kebab-case. Rolled fresh on every load — you're a different guest each visit.
const GUEST_ADJ = [
  "curious", "nostalgic", "eager", "brave", "clever", "gentle", "quiet",
  "bold", "keen", "witty", "stoic", "lucid", "nimble", "wry", "candid",
  "plucky", "jolly", "mellow", "zesty", "dapper",
]
const GUEST_NAME = [
  "lovelace", "turing", "hopper", "knuth", "dijkstra", "hamilton", "liskov",
  "ritchie", "torvalds", "perlis", "backus", "engelbart", "goldberg",
  "wozniak", "shannon", "babbage", "kay", "sutherland", "hejlsberg", "matsumoto",
]
function makeGuest(): string {
  const a = GUEST_ADJ[Math.floor(Math.random() * GUEST_ADJ.length)]
  const n = GUEST_NAME[Math.floor(Math.random() * GUEST_NAME.length)]
  return `${a}-${n}`
}

// Skills, modeled as SKILL.md files — the kind you hand an agent. Each is a real
// little document with name / description / level frontmatter and a short body.
type Skill = {
  id: string
  name: string
  description: string
  level: string
  body: string
}

const SKILLS: Skill[] = [
  {
    id: "rust",
    name: "rust",
    description: "systems programming with a borrow checker for a conscience",
    level: "native",
    body: "Production Rust across Hurry (distributed build cache), Nudge (agent guardrails), Circe (container analysis), and hot-path rewrites of analysis pipelines at FOSSA. The borrow checker and I have an understanding.",
  },
  {
    id: "distributed-systems",
    name: "distributed-systems",
    description: "correctness under partial failure",
    level: "native",
    body: "Built and operated a platform analyzing ~200k projects a day, designed on-prem architecture with no cloud elasticity to hide behind, and shipped multi-agent coordination layers from scratch. Consensus is just disagreement with a deadline.",
  },
  {
    id: "agentic-systems",
    name: "agentic-systems",
    description: "multi-agent orchestration — topology, coordination, guardrails",
    level: "fluent",
    body: "Founding work at Attune: agent topology and coordination from scratch, plus Nudge — tree-sitter + regex guardrails via Claude Code hooks that move conventions out of the prompt and back into the tooling.",
  },
  {
    id: "build-systems",
    name: "build-systems",
    description: "caches, reproducibility, determinism",
    level: "fluent",
    body: "Hurry: a drop-in distributed, content-addressed build cache for Cargo with Nix-like reproducibility across CI, local, and team. The fastest build is the one you already did.",
  },
  {
    id: "program-analysis",
    name: "program-analysis",
    description: "reading code at scale across 20+ ecosystems",
    level: "native",
    body: "Owned dependency analysis across 20+ language ecosystems at FOSSA — native toolchain integration plus custom parsers feeding a 200k-project graph. I have met your package manager's edge cases.",
  },
  {
    id: "haskell",
    name: "haskell",
    description: "types as a design tool; laziness as a lifestyle",
    level: "fluent",
    body: "Haskell in production on the FOSSA CLI — a dependency-analysis tool spanning dozens of ecosystems. (yes. it is still compiling. it is fine.)",
  },
  {
    id: "typescript",
    name: "typescript",
    description: "the other half of the stack, where agents meet humans",
    level: "fluent",
    body: "TypeScript and React across analysis tooling and agent interfaces — the human-facing edge of otherwise very Rust-shaped systems. This very shell is one of them.",
  },
  {
    id: "go",
    name: "go",
    description: "boring on purpose; ships",
    level: "fluent",
    body: "Go for networked services and internal tooling at FOSSA and Reynolds & Reynolds — the language you reach for when it just needs to run, and keep running.",
  },
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
  "garbage-collecting the garbage collector…",
  "proving termination (this may not terminate)…",
  "founding engineer @ attune — agent systems in rust & ts", // settle
]

/* ------------------------------------------------------------------ *
 *  BOOT REEL
 *  The page boots like a machine: a few hundred lines of deterministic
 *  kernel + systemd chatter that print fast and settle into the prompt
 *  in ~1s. You only meet it again by scrolling up. No jokes — it reads
 *  like a real Arch boot. Two quiet exceptions reward anyone who keeps
 *  reading: the hidden commands appear as package installs
 *  ("installing breakout (1.0-1)..."), and BOOT_EXTRA (just below) lets
 *  the owner drop in their own lines, shuffled in at random.
 * ------------------------------------------------------------------ */

type BootKind = "ok" | "kmsg" | "info"
//  ok   → systemd status line   "[  OK  ] Started …"
//  kmsg → kernel ring buffer    "[   12.345678] …"  (timestamp added below)
//  info → bare line             pacman output, login banner, blank spacing
type BootLine = { kind: BootKind; text: string; ts?: string }

/* ---- config: your own boot lines --------------------------------- *
 *  Anything here is shuffled into the reel at a stable-random position.
 *  A plain string prints as a kernel message; pass an object for more
 *  control, e.g. { kind: "ok", text: "Started Foo." } or
 *  { kind: "info", text: "installing thing (1.0-1)..." }.
 * ------------------------------------------------------------------- */
const BOOT_EXTRA: Array<string | { kind: BootKind; text: string }> = [
  // "calibrating the coffee delay loop",
  // { kind: "ok", text: "Started Personal Assistant Daemon." },
  // { kind: "info", text: "installing dotfiles (13.0-1)..." },
]

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function buildBoot(): BootLine[] {
  const rand = mulberry32(0x5eed)
  const pick = <T,>(a: readonly T[]): T => a[Math.floor(rand() * a.length)]
  const hex = (n: number) => {
    let s = ""
    for (let k = 0; k < n; k++) s += "0123456789abcdef"[Math.floor(rand() * 16)]
    return s
  }
  const num = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo))
  const pad2 = (n: number) => String(n).padStart(2, "0")
  const uuid = () => `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`
  const ok = (text: string): BootLine => ({ kind: "ok", text })
  const km = (text: string): BootLine => ({ kind: "kmsg", text })
  const info = (text: string): BootLine => ({ kind: "info", text })

  const kver = `6.${num(6, 12)}.${num(1, 12)}-arch1-1`

  /* -------------------- early kernel ring buffer ------------------- */
  const header: BootLine[] = [
    km(`Linux version ${kver} (linux@archlinux) (gcc (GCC) ${num(13, 15)}.${num(1, 3)}.1, GNU ld (GNU Binutils) 2.4${num(0, 3)}.0) #1 SMP PREEMPT_DYNAMIC`),
    km(`Command line: BOOT_IMAGE=/vmlinuz-linux root=UUID=${uuid()} rw loglevel=3 quiet`),
    km(`KERNEL supported cpus: Intel GenuineIntel, AMD AuthenticAMD, Hygon HygonGenuine`),
    km(`x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point registers'`),
    km(`x86/fpu: Supporting XSAVE feature 0x002: 'SSE registers'`),
    km(`x86/fpu: Supporting XSAVE feature 0x004: 'AVX registers'`),
    km(`signal: max sigframe size: 3632`),
    km(`BIOS-provided physical RAM map:`),
    km(`NX (Execute Disable) protection: active`),
    km(`SMBIOS ${num(2, 4)}.${num(0, 4)}.0 present.`),
    km(`DMI: LENOVO 21CB; BIOS N3${hex(1)}ET${num(40, 99)}W (1.${num(10, 40)}) ${num(2021, 2024)}`),
    km(`tsc: Detected ${num(2400, 3800)}.${num(100, 999)} MHz processor`),
    km(`last_pfn = 0x${hex(6)} max_arch_pfn = 0x${hex(9)}`),
    km(`x86/PAT: Configuration [0-7]: WB  WC  UC- UC  WB  WP  UC- WT`),
    km(`Using GB pages for direct mapping`),
    km(`ACPI: Early table checksum verification disabled`),
    km(`ACPI: RSDP 0x00000000${hex(6).toUpperCase()} 000024 (v02 LENOVO)`),
    km(`smpboot: Allowing ${num(8, 32)} CPUs, 0 hotplug CPUs`),
    km(`Memory: ${num(16, 31)}${num(100000, 999999)}K/${num(33, 66)}${num(100000, 999999)}K available`),
    km(`SLUB: HWalign=64, Order=0-3, MinObjects=0, CPUs=${num(8, 32)}, Nodes=1`),
    km(`rcu: Hierarchical RCU implementation.`),
    km(`rcu:     RCU restricting CPUs from NR_CPUS=512 to nr_cpu_ids=${num(8, 32)}.`),
    km(`NR_IRQS: 524544, nr_irqs: ${num(900, 2048)}, preallocated irqs: 16`),
    km(`Console: colour dummy device 80x25`),
    km(`printk: console [tty0] enabled`),
    km(`ACPI: Core revision 20230628`),
    km(`clocksource: hpet: mask: 0xffffffff max_cycles: 0x${hex(8)}, max_idle_ns: 133484882848 ns`),
    km(`APIC: Switch to symmetric I/O mode setup`),
    km(`smpboot: CPU0: Intel(R) Core(TM) i7-13${num(60, 99)}0H CPU @ ${num(2, 3)}.${num(0, 9)}0GHz`),
    km(`Performance Events: PEBS fmt4+, Alderlake events, 32-deep LBR, full-width counters`),
    km(`smp: Bringing up secondary CPUs ...`),
    km(`smp: Brought up 1 node, ${num(8, 32)} CPUs`),
    km(`devtmpfs: initialized`),
    km(`clocksource: jiffies: mask: 0xffffffff max_cycles: 0xffffffff, max_idle_ns: 7645519600211568 ns`),
    km(`NET: Registered PF_NETLINK/PF_ROUTE protocol family`),
    km(`PCI: Using configuration type 1 for base access`),
    km(`cryptd: max_cpu_qlen set to 1000`),
    km(`raid6: avx2x4   gen() ${num(20000, 42000)} MB/s`),
    km(`xor: automatically using best checksumming function   avx`),
    km(`Freeing SMP alternatives memory: ${num(20, 48)}K`),
    km(`random: crng init done`),
  ]

  /* ----------------------- procgen pools -------------------------- */
  const inputs = [
    "AT Translated Set 2 keyboard", "Power Button", "Lid Switch", "Sleep Button",
    "PC Speaker", "Video Bus", "ELAN Touchpad", "Logitech USB Receiver Mouse",
    "Intel HID events", "HDA Intel PCH Mic", "HDA Intel PCH Headphone",
  ]
  const devpaths = [
    "platform/i8042/serio0", "LNXSYSTM:00", "pci0000:00/0000:00:14.0/usb1",
    "platform/thinkpad_acpi", "pci0000:00/0000:00:1f.3",
  ]
  const aaProfiles = [
    "/usr/bin/man", "man_filter", "man_groff", "nvidia_modprobe", "lsb_release",
    "/usr/bin/chromium", "tcpdump", "ping",
  ]

  // kernel ring-buffer chatter (gets a timestamp)
  const kfiller = (): string =>
    pick([
      () => `pci 0000:00:${pad2(num(0, 31))}.0: [${hex(4)}:${hex(4)}] type 00 class 0x${hex(6)}`,
      () => `pci 0000:00:${pad2(num(0, 31))}.0: reg 0x${num(10, 30)}: [mem 0x${hex(8)}-0x${hex(8)} 64bit pref]`,
      () => `usb ${num(1, 4)}-${num(1, 6)}: new high-speed USB device number ${num(2, 14)} using xhci_hcd`,
      () => `usb ${num(1, 4)}-${num(1, 6)}: New USB device found, idVendor=${hex(4)}, idProduct=${hex(4)}`,
      () => `hub ${num(1, 4)}-0:1.0: USB hub found`,
      () => `input: ${pick(inputs)} as /devices/${pick(devpaths)}/input/input${num(1, 30)}`,
      () => `ata${num(1, 6)}: SATA link up 6.0 Gbps (SStatus 133 SControl 300)`,
      () => `nvme nvme0: ${num(4, 16)}/0/0 default/read/poll queues`,
      () => `EXT4-fs (nvme0n1p${num(1, 3)}): mounted filesystem ${uuid()} r/w with ordered data mode`,
      () => `i915 0000:00:02.0: [drm] Finished loading DMC firmware i915/adlp_dmc.bin (v2.${num(10, 20)})`,
      () => `iwlwifi 0000:00:14.3: loaded firmware version ${num(70, 89)}.${hex(8)} op_mode iwlmvm`,
      () => `Bluetooth: hci0: Firmware revision ${num(0, 9)}.${num(0, 9)} build ${num(20, 99)}`,
      () => `e1000e 0000:00:1f.6 eth0: NIC Link is Up 1000 Mbps Full Duplex, Flow Control: Rx/Tx`,
      () => `audit: type=1400 audit(${num(100, 200)}.${num(100, 999)}:${num(2, 99)}): apparmor="STATUS" operation="profile_load" name="${pick(aaProfiles)}"`,
      () => `loop${num(0, 12)}: detected capacity change from 0 to ${num(100000, 900000)}`,
      () => `thermal thermal_zone${num(0, 9)}: registered as thermal_zone${num(0, 9)}`,
      () => `RAPL PMU: API unit is 2^-32 Joules, ${num(3, 5)} fixed counters, 655360 ms ovfl timer`,
      () => `Adding ${num(8000000, 16000000)}k swap on /dev/nvme0n1p3. Priority:-2 extents:1`,
      () => `r8169 0000:02:00.0 enp2s0: Link is Down`,
      () => `usbcore: registered new interface driver usbhid`,
    ])()

  // systemd descriptions (rendered with a [  OK  ] tag)
  const svcDesc = [
    "D-Bus System Message Bus", "Network Manager", "OpenSSH Daemon",
    "Network Time Synchronization", "Permit User Sessions", "Login Service",
    "User Login Management", "Authorization Manager", "Disk Manager",
    "Modem Manager", "Avahi mDNS/DNS-SD Stack", "CUPS Scheduler",
    "Bluetooth service", "Hostname Service", "Locale Service",
    "Time & Date Service", "Network Name Resolution", "Journal Service",
    "Rule-based Manager for Device Events and Files", "Load/Save Random Seed",
    "Apply Kernel Variables", "Create Static Device Nodes in /dev",
    "Remount Root and Kernel File Systems", "Setup Virtual Console",
    "Record System Boot/Shutdown in UTMP", "Flush Journal to Persistent Storage",
    "Save/Restore Sound Card State", "WPA supplicant", "Accounts Service",
    "Thermal Daemon Service", "Firmware update daemon", "Power Profiles daemon",
    "RealtimeKit Scheduling Policy Service", "User Manager for UID 1000",
    "Self Monitoring and Reporting Technology (SMART) Daemon",
    "Virtual Machine and Container Registration Service",
    "Simple Desktop Display Manager",
  ]
  const targetDesc = [
    "Basic System", "Sockets", "Timers", "Paths", "Local File Systems", "Swap",
    "Network", "Network is Online", "Remote File Systems", "System Initialization",
    "User and Group Name Lookups", "Host and Network Name Lookups", "Login Prompts",
    "Sound Card", "Bluetooth Support", "Smartcard", "Slices",
    "System Time Synchronized", "System Time Set", "Local Encrypted Volumes",
    "Preparation for Network", "First Boot Complete", "Containers",
  ]
  const mountDesc = [
    "/boot", "/boot/efi", "/home", "/home/jess", "Temporary Directory (/tmp)",
    "Kernel Debug File System", "Kernel Trace File System", "Huge Pages File System",
    "POSIX Message Queue File System", "Kernel Configuration File System",
    "FUSE Control File System", "RPC Pipe File System",
    "Arbitrary Executable File Formats File System",
  ]
  const socketDesc = [
    "D-Bus System Message Bus Socket", "Journal Socket", "Journal Socket (/dev/log)",
    "udev Control Socket", "udev Kernel Socket", "Network Service Netlink Socket",
    "Process Core Dump Socket", "PipeWire Multimedia System Socket",
    "Sound System Socket", "GnuPG cryptographic agent and passphrase cache",
    "Docker Socket for the API", "Open-iSCSI iscsid Socket",
  ]
  const oneshots = [
    "Load Kernel Modules", "Apply Kernel Variables", "Create System Users",
    "Create Static Device Nodes in /dev", "Coldplug All udev Devices",
    "Remount Root and Kernel File Systems", "Load/Save Random Seed",
    "Rebuild Journal Catalog", "Update UTMP about System Boot/Shutdown",
    "Create Volatile Files and Directories", "Set Up Additional Binary Formats",
    "Rebuild Dynamic Linker Cache", "Generate network units from Kernel command line",
    "Wait for udev To Complete Device Initialization",
  ]
  const founddev = [
    "Samsung SSD 980 1TB", "WDC WDS500G2B0C", "ST1000LM035-1RK172",
    "Crucial CT525MX300SSD1", "NVMe disk", "/dev/ttyS0", "VGA controller",
  ]
  const slices = [
    "User and Session Slice", "Slice /system/getty", "Slice /system/modprobe",
    "User Slice of UID 1000", "Slice /system/systemd-fsck", "Background tasks",
  ]

  const sfiller = (): string =>
    pick([
      () => `Started ${pick(svcDesc)}.`,
      () => `Reached target ${pick(targetDesc)}.`,
      () => `Mounted ${pick(mountDesc)}.`,
      () => `Listening on ${pick(socketDesc)}.`,
      () => `Finished ${pick(oneshots)}.`,
      () => `Found device ${pick(founddev)}.`,
      () => `Created slice ${pick(slices)}.`,
      () => `Starting ${pick(svcDesc)}...`,
    ])()

  /* ----- breadcrumbs: the hidden commands, posing as package installs -- *
   *  Phrased as real Arch invocations: pacman -S for the official-repo
   *  toys (fortune-mod / cowsay / sl / neofetch), paru -Syu for the
   *  AUR-flavored rest (the games, Jess's own hurry / nudge, coffee).
   *  The konami line poses as a kernel input device.                    */
  const breadcrumbs: BootLine[] = [
    ok("paru -Syu snake"),
    ok("paru -Syu 2048"),
    ok("paru -Syu tetris"),
    ok("paru -Syu breakout"),
    ok("paru -Syu asteroids"),
    ok("paru -Syu flappy"),
    ok("paru -Syu wordle"),
    ok("paru -Syu minesweeper"),
    ok("paru -Syu conway-life"),
    ok("paru -Syu pong"),
    ok("pacman -S cmatrix"),
    ok("pacman -S fortune-mod"),
    ok("pacman -S cowsay"),
    ok("pacman -S sl"),
    ok("pacman -S neofetch"),
    ok("paru -Syu coffee"),
    ok("paru -Syu hurry"),
    ok("paru -Syu nudge"),
    km(`input: Konami Code Detector as /devices/virtual/input/input${num(16, 29)}`),
  ]

  /* --------------------------- finale ----------------------------- */
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const finale: BootLine[] = [
    ok("Reached target Sound Card."),
    ok("Started Getty on tty1."),
    ok("Reached target Login Prompts."),
    ok("Reached target Multi-User System."),
    ok("Started GNOME Display Manager."),
    ok("Reached target Graphical Interface."),
    ok("Created slice User Slice of UID 1000."),
    ok("Started Session 1 of User jess."),
    info(""),
    info(`Arch Linux ${kver} (tty1)`),
    info(""),
    info("jessica-black login: jess (automatic login)"),
    info(`Last login: ${pick(days)} ${pick(months)} ${pad2(num(1, 28))} ${pad2(num(0, 23))}:${pad2(num(0, 59))}:${pad2(num(0, 59))} on tty1`),
  ]

  /* --------------------- assemble the middle ---------------------- */
  const KCOUNT = 52 // remaining kernel chatter after the header
  const SCOUNT = 372 // systemd unit output
  const middle: BootLine[] = []
  for (let i = 0; i < KCOUNT; i++) middle.push(km(kfiller()))
  for (let i = 0; i < SCOUNT; i++) {
    // a few late driver messages surface in the kernel log mid-init
    if (i > 0 && i % 21 === 0) middle.push(km(kfiller()))
    else middle.push(ok(sfiller()))
  }

  const body: BootLine[] = [...header, ...middle]

  // sprinkle breadcrumbs through the reel (after the first few header lines)
  const sprinkle = (line: BootLine) => {
    const lo = 6
    const at = lo + Math.floor(rand() * (body.length - lo))
    body.splice(at, 0, line)
  }
  breadcrumbs.forEach(sprinkle)

  // sprinkle the owner's own lines (BOOT_EXTRA), anywhere in the reel
  BOOT_EXTRA.forEach((e) =>
    sprinkle(typeof e === "string" ? km(e) : { kind: e.kind, text: e.text }),
  )

  const out: BootLine[] = [...body, ...finale]

  // monotonic kernel timestamps: "[   12.345678]". Mostly tiny steps with the
  // occasional longer pause, so it accelerates and stalls like a real boot.
  let t = rand() * 0.05
  for (const line of out) {
    if (line.kind !== "kmsg") continue
    t += rand() * rand() * 0.85 + 0.0006
    const s = Math.floor(t)
    const us = Math.floor((t - s) * 1e6)
    line.ts = `[${String(s).padStart(5)}.${String(us).padStart(6, "0")}]`
  }
  return out
}

const BOOT: BootLine[] = buildBoot()

/* --------------------------- achievements ------------------------ */
type Achievement = { id: string; name: string; desc: string }
const ACHIEVEMENTS: Achievement[] = [
  { id: "first-contact", name: "First Contact", desc: "ran your first command" },
  { id: "rtfm", name: "RTFM", desc: "actually read the help" },
  { id: "permission-denied", name: "Permission Denied", desc: "reached for sudo" },
  { id: "nice-try", name: "Nice Try", desc: "attempted rm -rf" },
  { id: "caffeinated", name: "Caffeinated", desc: "brewed a coffee" },
  { id: "cheat-code", name: "Cheat Code", desc: "entered the konami code" },
  { id: "speedrunner", name: "Speedrunner", desc: "skipped the boot" },
  { id: "interior-decorator", name: "Interior Decorator", desc: "tried every theme" },
  { id: "archaeologist", name: "Archaeologist", desc: "scrolled to the top of the boot log" },
  { id: "power-user", name: "Power User", desc: "ran twenty commands" },
  { id: "completionist", name: "Completionist", desc: "unlocked everything else" },
]
const ACH_POWER_USER_AT = 20

/* ----------------------------- themes ----------------------------- */

type Theme = "amber" | "green" | "paper" | "pride"
const THEMES: Theme[] = ["amber", "green", "paper", "pride"]
const THEME_NOTE: Record<Theme, string> = {
  amber: "phosphor amber on near-black (default)",
  green: "phosphor green on near-black",
  paper: "ink on warm paper (light)",
  pride: "rainbow wordmark — everyone's welcome",
}

/* ------------------------------------------------------------------ *
 *  TRANSCRIPT MODEL
 * ------------------------------------------------------------------ */

type Block =
  | { kind: "text"; node: JSX.Element }
  | { kind: "echo"; cmd: string; prompt: string } // the command the user "ran", and the prompt it ran under
  | { kind: "boot"; line: BootLine } // a boot reel line (kernel / systemd / bare)

// `home` marks the welcome card — the persistent header/"tab bar". Clicking a
// command collapses the transcript back to this line, then shows that command.
type Line = { id: number; block: Block; home?: boolean }

// Verb table — used for Tab completion and the not-found hint.
const COMMANDS = [
  "help",
  "man",
  "ls",
  "cd",
  "pwd",
  "whoami",
  "cat",
  "open",
  "experience",
  "skills",
  "resume",
  "writing",
  "projects",
  "contact",
  "tree",
  "theme",
  "history",
  "achievements",
  "games",
  "snake",
  "2048",
  "tetris",
  "breakout",
  "asteroids",
  "flappy",
  "wordle",
  "minesweeper",
  "life",
  "pong",
  "cmatrix",
  "threebody",
  "3bp",
  "neofetch",
  "clear",
] as const

// Real files `cat` can print, for the not-found hint. (Directories like skills/
// or projects/ aren't here — cat-ing a directory is an error; you `ls` those.)
const CAT_TARGETS = [
  "about",
  "readme",
  "resume",
  "contact",
  "attune",
  "fossa",
  "reynolds",
] as const

// Manual pages — `man <cmd>` prints one, classic-formatted. Concise but real;
// SEE ALSO entries chain to other pages. (Unknown command → "No manual entry".)
type ManEntry = { name: string; synopsis: string; desc: string; see?: string[] }
const MANPAGES: Record<string, ManEntry> = {
  ls: {
    name: "ls — list directory contents",
    synopsis: "ls [path]",
    desc: "Lists a directory — with no argument, the one you're in (cd moves you). Folders end in /; cat a file, ls a folder, run a game. Try `ls`, `ls ~/skills`, `ls /`.",
    see: ["cd", "cat", "tree"],
  },
  cd: {
    name: "cd — change the working directory",
    synopsis: "cd [path]",
    desc: "Moves around the tree: `cd skills`, `cd ..`, `cd ~` (home), `cd /` (root). The prompt and the top bar track where you are. Folders only — a file isn't a directory.",
    see: ["ls", "pwd", "tree"],
  },
  pwd: {
    name: "pwd — print working directory",
    synopsis: "pwd",
    desc: "Prints the absolute path you're standing in. You start in /home/jess; cd moves you, and the prompt follows.",
    see: ["cd", "ls"],
  },
  cat: {
    name: "cat — concatenate and print files",
    synopsis: "cat <file>",
    desc: "Prints a file: about, readme.md, resume.txt, contact, ~/experience/*.md, ~/skills/*.skill.md. Bare names work too (`cat rust`). cat a directory and it'll point you at `ls` instead.",
    see: ["ls", "cd", "resume"],
  },
  tree: {
    name: "tree — list contents as a tree",
    synopsis: "tree [path]",
    desc: "A recursive view from here (or a given path), drawn from the same filesystem ls and cd see. Click any name to open it.",
    see: ["ls", "cd"],
  },
  whoami: {
    name: "whoami — print the current user",
    synopsis: "whoami",
    desc: "You're a guest, handed a fresh handle each visit. The machine — and the résumé — belong to Jessica Black.",
    see: ["neofetch", "cat"],
  },
  skills: {
    name: "skills — list skill files",
    synopsis: "skills",
    desc: "Lists ~/skills/*.skill.md — the kind of capability files you'd hand an agent. cat one to read it.",
    see: ["cat", "resume", "projects"],
  },
  projects: {
    name: "projects — list the things I've built",
    synopsis: "projects",
    desc: "Lists ~/projects with a one-line note each. Open-source ones (hurry, nudge, circe, mite, unempty, procession, …) link to their code; others, like sandi, link to their own home. Click one, or `open <name>`, to visit it.",
    see: ["resume", "skills"],
  },
  resume: {
    name: "resume — print the full résumé",
    synopsis: "resume",
    desc: "The whole thing: experience, skills, writing, contact. Switch to the paper theme first if you're printing.",
    see: ["theme", "cat", "contact", "projects"],
  },
  theme: {
    name: "theme — set the colour theme",
    synopsis: "theme [amber|green|paper|pride|next]",
    desc: "Switches the phosphor. amber (default), green, paper (light), pride. `theme next` cycles. Persists across visits.",
    see: ["resume"],
  },
  games: {
    name: "games — the arcade",
    synopsis: "games | <name>",
    desc: "Lists the arcade and your bests. Run a name (snake, tetris, asteroids, wordle, …) to play fullscreen; Esc exits. Not everything is listed.",
    see: ["threebody", "help"],
  },
  threebody: {
    name: "threebody — simulate the three-body problem",
    synopsis: "threebody | 3bp",
    desc: "A real-time gravity simulation, integrated with velocity Verlet. Two modes: trisolaris — the books' setup, three suns of unequal mass plus a small planet dragged among them (a real four-body system) — and a chaotic scramble of three equal masses. r reseeds (no two runs alike), space pauses, 1/2 switch, [ ] change speed, t toggles trails, esc quits.",
    see: ["games", "neofetch"],
  },
  neofetch: {
    name: "neofetch — system + identity card",
    synopsis: "neofetch",
    desc: "The wordmark and the vitals: role, uptime (13 years), stack, focus, links.",
    see: ["whoami"],
  },
  contact: {
    name: "contact — how to reach Jessica",
    synopsis: "contact",
    desc: "Email and the usual links. Fastest path: me@jessica.black.",
    see: ["resume"],
  },
  history: {
    name: "history — command history",
    synopsis: "history",
    desc: "What you've typed this session; the up arrow walks it. Clicks don't count — those are website navigation, not shell history.",
    see: ["help"],
  },
  achievements: {
    name: "achievements — what you've unlocked",
    synopsis: "achievements",
    desc: "Eleven of them — some by doing, some by trying. No points; just the satisfaction.",
    see: ["help"],
  },
  clear: {
    name: "clear — clear the screen",
    synopsis: "clear",
    desc: "Wipes the transcript (Ctrl-L too). The boot log won't come back — scrolling up was your one chance.",
  },
  man: {
    name: "man — read the manual",
    synopsis: "man <command>",
    desc: "You're doing it right now. Meta, isn't it.",
    see: ["help"],
  },
  help: {
    name: "help — list commands",
    synopsis: "help",
    desc: "The overview. Not everything is listed — a good terminal rewards curiosity.",
    see: ["man", "games"],
  },
}

/* ------------------------------------------------------------------ *
 *  PRESENTATIONAL HELPERS  (pure, return JSX for the transcript)
 * ------------------------------------------------------------------ */

// Blocks live inside the transcript state, so they can't receive the live
// dispatcher as a normal prop from the boot path. We hand it down via context.
const RunContext = createContext<(cmd: string) => void>(() => {})
function useRun(): (cmd: string) => void {
  return useContext(RunContext)
}

// The visitor's guest handle, shared with transcript-embedded blocks.
const GuestContext = createContext<string>("guest")
function useGuest(): string {
  return useContext(GuestContext)
}

// Hovering/focusing a command "ghosts" it into the prompt. Components call this
// with the command string on enter, and null on leave.
const PreviewContext = createContext<(cmd: string | null) => void>(() => {})
function usePreview(): (cmd: string | null) => void {
  return useContext(PreviewContext)
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  const external = !href.startsWith("mailto:")
  return (
    <a
      className="jsh-link"
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
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
  const preview = usePreview()
  const dispatch = run ?? ctxRun
  return (
    <button
      type="button"
      className="jsh-cmd"
      onClick={() => dispatch(children)}
      onMouseEnter={() => preview(children)}
      onMouseLeave={() => preview(null)}
      onFocus={() => preview(children)}
      onBlur={() => preview(null)}
      aria-label={label ?? `run command: ${children}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------ games ---------------------------- */
// Lazy-loaded so they never weigh down the initial page. Each renders into the
// transcript and captures the keyboard via GameFrame. Add an entry here and it
// becomes a runnable command automatically.
const GAMES: Record<string, React.ComponentType> = {
  snake: dynamic(() => import("@/app/games/snake"), {
    ssr: false,
    loading: () => <p className="jsh-out jsh-muted">loading snake…</p>,
  }),
  "2048": dynamic(() => import("@/app/games/g2048"), {
    ssr: false,
    loading: () => <p className="jsh-out jsh-muted">loading 2048…</p>,
  }),
  tetris: dynamic(() => import("@/app/games/tetris"), {
    ssr: false,
    loading: () => <p className="jsh-out jsh-muted">loading tetris…</p>,
  }),
  breakout: dynamic(() => import("@/app/games/breakout"), {
    ssr: false,
    loading: () => <p className="jsh-out jsh-muted">loading breakout…</p>,
  }),
  asteroids: dynamic(() => import("@/app/games/asteroids"), {
    ssr: false,
    loading: () => <p className="jsh-out jsh-muted">loading asteroids…</p>,
  }),
  flappy: dynamic(() => import("@/app/games/flappy"), {
    ssr: false,
    loading: () => <p className="jsh-out jsh-muted">loading flappy…</p>,
  }),
  wordle: dynamic(() => import("@/app/games/wordle"), {
    ssr: false,
    loading: () => <p className="jsh-out jsh-muted">loading wordle…</p>,
  }),
  minesweeper: dynamic(() => import("@/app/games/minesweeper"), {
    ssr: false,
    loading: () => <p className="jsh-out jsh-muted">loading minesweeper…</p>,
  }),
  life: dynamic(() => import("@/app/games/life"), {
    ssr: false,
    loading: () => <p className="jsh-out jsh-muted">loading life…</p>,
  }),
  pong: dynamic(() => import("@/app/games/pong"), {
    ssr: false,
    loading: () => <p className="jsh-out jsh-muted">loading pong…</p>,
  }),
  // not a game in the arcade sense (no score, not in GAME_LIST) — a physics
  // toy, launched by the `3bp` / `threebody` command. Reuses the game overlay.
  threebody: dynamic(() => import("@/app/games/threebody"), {
    ssr: false,
    loading: () => <p className="jsh-out jsh-muted">loading three-body…</p>,
  }),
}
const GAME_LIST: Array<[string, string]> = [
  ["snake", "eat, grow, do not bite yourself"],
  ["2048", "slide tiles, make 2048"],
  ["tetris", "the blocks, the lines, the dread"],
  ["breakout", "paddle, ball, a wall to demolish"],
  ["asteroids", "thrust, wrap, shoot the rocks"],
  ["flappy", "tap to flap, thread the gaps"],
  ["wordle", "six guesses, five letters"],
  ["minesweeper", "flag the mines, sweep the rest"],
  ["life", "conway's game of life — draw + watch"],
  ["pong", "you vs the machine, first to 11"],
]

// Each game quietly persists a personal best; the games list surfaces it so the
// arcade feels lived-in. Semantics differ (score / streak / time / rally), so
// each formats its own. Life is a sandbox, so it has no entry.
const GAME_STAT: Record<string, { key: string; fmt: (n: number) => string }> = {
  snake: { key: "jsh-snake-best", fmt: (n) => `best ${n}` },
  "2048": { key: "jsh-2048-best", fmt: (n) => `best ${n}` },
  tetris: { key: "jsh-tetris-best", fmt: (n) => `best ${n}` },
  breakout: { key: "jsh-breakout-best", fmt: (n) => `best ${n}` },
  asteroids: { key: "jsh-asteroids-best", fmt: (n) => `best ${n}` },
  flappy: { key: "jsh-flappy-best", fmt: (n) => `best ${n}` },
  wordle: { key: "jsh-wordle-best", fmt: (n) => `streak ${n}` },
  minesweeper: { key: "jsh-mines-best", fmt: (n) => `${n}s` },
  pong: { key: "jsh-pong-best", fmt: (n) => `rally ${n}` },
}

/* ------------------------------------------------------------------ *
 *  VIRTUAL FILESYSTEM + SHELL
 *
 *  The site presents as a shell over a fake home directory, so the fake
 *  directory had better be real. This section is the one place that owns
 *  it: an in-memory tree plus a Shell that resolves paths (~, ., .., /,
 *  relative) and implements ls / cat / cd / pwd / tree the way a real
 *  shell would. Every "content command" (skills, projects, resume, …) is
 *  just an alias for an ls or cat of a known path — so typing `ls ~/skills`
 *  and clicking `skills` land in exactly the same place, and `cd skills`
 *  moves the prompt for real.
 *
 *  Files render rich JSX on `cat` (this is a website, not /bin/cat), so a
 *  node carries a `render` thunk instead of byte content. A directory may
 *  carry a custom `listing` (the pretty skills/projects/games views);
 *  without one it falls back to a generic `ls`. The whole tree is built
 *  from the same JOBS / SKILLS / PROJECTS / WRITING / GAME_LIST data the
 *  rest of the page renders — one source of truth, so ls, tree, and cat
 *  can never drift apart again.
 * ------------------------------------------------------------------ */

type RunCmd = (cmd: string) => void

interface FsFileNode {
  kind: "file"
  name: string // basename, with extension: "resume.txt", "rust.skill.md"
  note?: string // right-gutter note in ls / tree
  cmd?: string // preferred command when the name is clicked (its alias); else `cat <path>`
  open?: string // external URL — a "link file" (a project or a post)
  exe?: boolean // executable (a game): running the name launches it; cat is a gag
  render: (run: RunCmd) => JSX.Element // what `cat` prints
}
interface FsDirNode {
  kind: "dir"
  name: string // basename ("" only for the root)
  note?: string
  cmd?: string // preferred command when clicked (its alias); else `ls <path>`
  children: FsNode[]
  listing?: (run: RunCmd) => JSX.Element // rich `ls` view; omit for a generic listing
  treeMeta?: string // in `tree`, the right-gutter note for this directory
  treeLeaf?: boolean // in `tree`, stop here — show the dir but don't recurse into it
}
type FsNode = FsFileNode | FsDirNode

// Home is /home/jess. Paths are stored as segment arrays from the root.
const HOME_PATH = ["home", USER]

// "rust.skill.md" → "rust", "resume.txt" → "resume", "about" → "about".
// Used both for tab-friendly bare-name `cat` and for lenient path matching.
function fileBase(name: string): string {
  if (name.endsWith(".skill.md")) return name.slice(0, -".skill.md".length)
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(0, dot) : name
}

// First non-flag operand of an argument string (so `ls -la ~/skills` → "~/skills").
function firstOperand(arg: string): string {
  for (const tok of arg.trim().split(/\s+/)) {
    if (tok && !tok.startsWith("-")) return tok
  }
  return ""
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Build ~ from the data of record. Each array entry becomes a file or a
// directory; the rich blocks (SkillsBlock, ProjectsBlock, …) stay the custom
// `listing` for their directory, so `ls ~/skills` looks exactly like `skills`.
function buildHomeChildren(): FsNode[] {
  const jobs: FsNode[] = JOBS.map((j): FsFileNode => ({
    kind: "file",
    name: `${j.id}.md`,
    note: `${j.org} · ${j.years}`,
    cmd: `cat ~/experience/${j.id}.md`,
    render: () => <JobBlock job={j} expanded />,
  }))
  const skills: FsNode[] = SKILLS.map((s): FsFileNode => ({
    kind: "file",
    name: `${s.id}.skill.md`,
    note: s.description,
    cmd: `cat ~/skills/${s.id}`,
    render: () => <SkillFileBlock skill={s} />,
  }))
  const projects: FsNode[] = PROJECTS.map((p): FsFileNode => ({
    kind: "file",
    name: p.name,
    note: p.note,
    cmd: `open ${p.name}`,
    open: projectUrl(p),
    render: (run) => <ProjectFileBlock project={p} run={run} />,
  }))
  const writing: FsNode[] = WRITING.map((w): FsFileNode => {
    const file = `${slugify(w.title)}.md`
    return {
      kind: "file",
      name: file,
      note: w.where,
      open: w.url,
      render: () => <WritingFileBlock item={w} file={file} />,
    }
  })
  const games: FsNode[] = GAME_LIST.map(([id, note]): FsFileNode => ({
    kind: "file",
    name: id,
    note,
    cmd: id,
    exe: true,
    render: (run) => <BinaryBlock name={id} run={run} />,
  }))
  return [
    {
      kind: "file",
      name: "about",
      note: "who I am",
      cmd: "whoami",
      render: (run) => <WhoamiBlock run={run} />,
    },
    {
      kind: "file",
      name: "readme.md",
      note: "about this shell",
      cmd: "cat readme",
      render: (run) => <ReadmeBlock run={run} />,
    },
    {
      kind: "file",
      name: "resume.txt",
      note: "the whole résumé",
      cmd: "resume",
      render: (run) => <ResumeBlock run={run} />,
    },
    {
      kind: "file",
      name: "contact",
      note: "how to reach me",
      cmd: "contact",
      render: () => <ContactBlock />,
    },
    {
      kind: "dir",
      name: "experience",
      note: "where I've worked",
      cmd: "experience",
      children: jobs,
      listing: (run) => <ExperienceListing run={run} />,
      treeMeta: `${JOBS.length} roles`,
    },
    {
      kind: "dir",
      name: "skills",
      note: "what I'm fluent in",
      cmd: "skills",
      children: skills,
      listing: (run) => <SkillsBlock run={run} />,
      treeMeta: `${SKILLS.length} files`,
      treeLeaf: true,
    },
    {
      kind: "dir",
      name: "projects",
      note: "things I've built",
      cmd: "projects",
      children: projects,
      listing: (run) => <ProjectsBlock run={run} />,
      treeMeta: `${PROJECTS.length} projects`,
      treeLeaf: true,
    },
    {
      kind: "dir",
      name: "writing",
      note: "things I've written",
      cmd: "writing",
      children: writing,
      listing: () => <WritingBlock />,
      treeMeta: `${WRITING.length} posts`,
      treeLeaf: true,
    },
    {
      kind: "dir",
      name: "games",
      note: "the arcade",
      cmd: "games",
      children: games,
      listing: (run) => <GamesBlock run={run} />,
      treeMeta: `${GAME_LIST.length} games`,
      treeLeaf: true,
    },
  ]
}

const FS: FsDirNode = {
  kind: "dir",
  name: "",
  children: [
    {
      kind: "dir",
      name: "home",
      children: [{ kind: "dir", name: USER, children: buildHomeChildren() }],
    },
  ],
}

type LsResult =
  | { kind: "dir"; node: FsDirNode; segs: string[] }
  | { kind: "file"; node: FsFileNode; segs: string[] }
  | { kind: "error"; msg: string }
type CatResult =
  | { kind: "file"; node: FsFileNode }
  | { kind: "dir"; name: string }
  | { kind: "missing" }
  | { kind: "error"; msg: string }
type CdResult = { kind: "ok"; cwd: string[] } | { kind: "error"; msg: string }
type TreeRow = { prefix: string; name: string; isDir: boolean; cmd: string; meta?: string }
type TreeResult =
  | { kind: "dir"; label: string; rows: TreeRow[] }
  | { kind: "file"; node: FsFileNode; segs: string[] }
  | { kind: "error"; msg: string }

// The one object that knows the rules. Pure and React-free: it returns
// resolved nodes or shell-style errors, and the transcript layer decides how
// to paint them. cwd lives in React state and is passed in on every call.
// (Named ShellFs to avoid clashing with the page component, which is Shell.)
class ShellFs {
  private index = new Map<string, string[]>()

  constructor(
    readonly root: FsDirNode,
    readonly home: readonly string[],
  ) {
    this.indexFiles(root, [])
  }

  // Flat index of file basenames (with and without extension) → absolute path,
  // so `cat readme`, `cat attune`, `cat rust` resolve from anywhere, the way a
  // muscle-memory shortcut would. First writer wins; there are no collisions.
  private indexFiles(node: FsNode, segs: string[]) {
    const here = node.name ? [...segs, node.name] : [...segs]
    if (node.kind === "file") {
      if (!this.index.has(node.name)) this.index.set(node.name, here)
      const base = fileBase(node.name)
      if (!this.index.has(base)) this.index.set(base, here)
    } else {
      for (const c of node.children) this.indexFiles(c, here)
    }
  }

  // Resolve a path argument against cwd → absolute segments. Handles ~, /,
  // relative, ., and .. exactly like a real shell.
  resolve(cwd: readonly string[], arg: string): string[] {
    const a = arg.trim()
    if (a === "") return [...cwd] // no path means "right here", like a real shell
    if (a === "~") return [...this.home]
    if (a === "/") return []
    let segs: string[]
    let rest: string[]
    if (a.startsWith("~/")) {
      segs = [...this.home]
      rest = a.slice(2).split("/")
    } else if (a.startsWith("/")) {
      segs = []
      rest = a.slice(1).split("/")
    } else {
      segs = [...cwd]
      rest = a.split("/")
    }
    for (const part of rest) {
      if (part === "" || part === ".") continue
      if (part === "..") {
        if (segs.length) segs.pop()
        continue
      }
      segs.push(part)
    }
    return segs
  }

  // Walk the tree to a node. The final segment matches by exact name first,
  // then by extension-less base (so `cat skills/rust` finds rust.skill.md).
  lookup(segs: readonly string[]): FsNode | null {
    let node: FsNode = this.root
    for (const name of segs) {
      if (node.kind !== "dir") return null
      let next: FsNode | undefined
      for (const child of node.children) {
        if (child.name === name) {
          next = child
          break
        }
        if (!next && fileBase(child.name) === name) next = child
      }
      if (!next) return null
      node = next
    }
    return node
  }

  // ~/skills inside home, /etc elsewhere, ~ at home, / at root.
  pathLabel(segs: readonly string[]): string {
    const h = this.home
    let underHome = segs.length >= h.length
    for (let i = 0; underHome && i < h.length; i++) {
      underHome = segs[i] === h[i]
    }
    if (underHome) {
      const rest = segs.slice(h.length)
      return rest.length ? "~/" + rest.join("/") : "~"
    }
    return "/" + segs.join("/")
  }

  // Always the real absolute path (what `pwd` prints): /home/jess.
  absPath(segs: readonly string[]): string {
    return "/" + segs.join("/")
  }

  ls(cwd: readonly string[], arg: string): LsResult {
    const path = firstOperand(arg)
    const segs = this.resolve(cwd, path)
    const node = this.lookup(segs)
    if (!node)
      return { kind: "error", msg: `ls: cannot access '${path}': No such file or directory` }
    if (node.kind === "file") return { kind: "file", node, segs }
    return { kind: "dir", node, segs }
  }

  cat(cwd: readonly string[], arg: string): CatResult {
    const path = firstOperand(arg)
    if (!path) return { kind: "missing" }
    const segs = this.resolve(cwd, path)
    let node = this.lookup(segs)
    // Bare name (no slash) that isn't on the resolved path? Fall back to the
    // flat index: `cat rust` from ~ finds ~/skills/rust.skill.md.
    if (!node && !path.includes("/")) {
      const hit = this.index.get(path.toLowerCase())
      if (hit) node = this.lookup(hit)
    }
    if (!node) return { kind: "error", msg: `cat: ${path}: No such file or directory` }
    if (node.kind === "dir") return { kind: "dir", name: path }
    return { kind: "file", node }
  }

  cd(cwd: readonly string[], arg: string): CdResult {
    const path = firstOperand(arg) || "~" // bare `cd` goes home
    const segs = this.resolve(cwd, path)
    const node = this.lookup(segs)
    if (!node) return { kind: "error", msg: `cd: ${path}: No such file or directory` }
    if (node.kind !== "dir") return { kind: "error", msg: `cd: ${path}: Not a directory` }
    return { kind: "ok", cwd: segs }
  }

  tree(cwd: readonly string[], arg: string): TreeResult {
    const path = firstOperand(arg)
    const segs = this.resolve(cwd, path)
    const node = this.lookup(segs)
    if (!node)
      return {
        kind: "error",
        msg: `tree: ${path || this.pathLabel(segs)}: No such file or directory`,
      }
    if (node.kind === "file") return { kind: "file", node, segs }
    return { kind: "dir", label: this.pathLabel(segs), rows: this.treeRows(node, segs) }
  }

  // Flatten a directory into ASCII-tree rows. Dirs marked treeLeaf show as a
  // single line (with a count); everything else recurses, like real `tree`.
  private treeRows(dir: FsDirNode, dirSegs: readonly string[]): TreeRow[] {
    const rows: TreeRow[] = []
    const walk = (d: FsDirNode, segs: readonly string[], pad: string) => {
      d.children.forEach((c, i) => {
        const last = i === d.children.length - 1
        const childSegs = [...segs, c.name]
        const isDir = c.kind === "dir"
        // Folders drill in (cd && ls); files open their view (cat, or alias).
        const cmd = isDir
          ? `cd ${this.pathLabel(childSegs)} && ls`
          : (c.cmd ?? `cat ${this.pathLabel(childSegs)}`)
        const meta = c.kind === "dir" ? c.treeMeta : c.note
        rows.push({
          prefix: pad + (last ? "└── " : "├── "),
          name: isDir ? c.name + "/" : c.name,
          isDir,
          cmd,
          meta,
        })
        if (c.kind === "dir" && !c.treeLeaf) walk(c, childSegs, pad + (last ? "    " : "│   "))
      })
    }
    walk(dir, dirSegs, "")
    return rows
  }
}

const SHELL = new ShellFs(FS, HOME_PATH)

// Games take over the whole screen: a focused overlay above the shell. Esc, the
// ✕, or a click on the backdrop returns you to the prompt. Lazy-loaded.
function GameOverlay({ name, onExit }: { name: string; onExit: () => void }) {
  const Game = GAMES[name]
  // Safety net: Esc closes even if focus slipped off the game surface. (When the
  // game is focused, GameFrame handles Esc and stops it before it reaches here.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onExit])

  return (
    <GameExitContext.Provider value={onExit}>
      <dialog
        open
        className="jsh-game-overlay"
        aria-modal="true"
        aria-label={`${name} — fullscreen game`}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) onExit()
        }}
      >
        <div className="jsh-game-stage">
          {Game ? (
            <Game />
          ) : (
            <p className="jsh-out jsh-err">no such game: {name}</p>
          )}
          <p className="jsh-game-exit-note">
            press <b>Esc</b> to exit
          </p>
        </div>
      </dialog>
    </GameExitContext.Provider>
  )
}

function GamesBlock({ run }: { run: (c: string) => void }) {
  const preview = usePreview()
  // Pull each game's saved best (client-only — this block only ever renders
  // after a command, so there's no hydration to mismatch).
  const [bests, setBests] = useState<Record<string, number>>({})
  useEffect(() => {
    const out: Record<string, number> = {}
    for (const [id] of GAME_LIST) {
      const stat = GAME_STAT[id]
      if (!stat) continue
      try {
        const v = Number(window.localStorage.getItem(stat.key) || "0")
        if (v > 0) out[id] = v
      } catch {
        /* ignore */
      }
    }
    setBests(out)
  }, [])
  return (
    <div className="jsh-games">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> ls ~/games/
      </p>
      <ul className="jsh-sk-list">
        {GAME_LIST.map(([id, note]) => (
          <li key={id} className="jsh-sk-row">
            <button
              type="button"
              className="jsh-sk-file"
              onClick={() => run(id)}
              onMouseEnter={() => preview(id)}
              onMouseLeave={() => preview(null)}
              onFocus={() => preview(id)}
              onBlur={() => preview(null)}
              title={`play ${id}`}
            >
              {id}
            </button>
            <span className="jsh-sk-desc">
              {note}
              {bests[id] != null && (
                <span className="jsh-game-best"> · {GAME_STAT[id].fmt(bests[id])}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="jsh-out jsh-muted jsh-ls-hint">
        → click one, or type its name to play. arrows move; esc quits.
      </p>
    </div>
  )
}

/* ----------------------- terminal toys --------------------------- */
const FORTUNES = [
  "There are only two hard things in computer science: cache invalidation, naming things, and off-by-one errors.",
  "It works on my machine.",
  "Weeks of coding can save you hours of planning.",
  "There is no place like 127.0.0.1.",
  "Programming is 10% writing code and 90% understanding why it doesn't work.",
  "To understand recursion, you must first understand recursion.",
  "Real programmers count from zero.",
  "The best thing about a boolean is that even if you're wrong, you're only off by a bit.",
  "Premature optimization is the root of all evil. — Knuth",
  "Any sufficiently advanced bug is indistinguishable from a feature.",
  "git commit -m 'fixed'. (narrator: it was not fixed.)",
  "I'd tell you a UDP joke, but you might not get it.",
  "A SQL query walks into a bar, approaches two tables, and asks: may I join you?",
  "The cloud is just someone else's computer.",
  "Debugging: being the detective in a crime drama where you are also the murderer.",
  "It's not a bug, it's an undocumented feature.",
  "Old programmers never die. They just decompile.",
  "There are 10 kinds of people: those who read binary, and those who don't.",
]
function pickFortune(): string {
  return FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
}

function FortuneBlock() {
  return <p className="jsh-out jsh-measure">{pickFortune()}</p>
}

function cowBubble(text: string): string {
  const t = text.length > 44 ? text.slice(0, 43) + "…" : text
  const bar = "-".repeat(t.length + 2)
  return ` _${bar}_\n( ${t} )\n -${bar}-`
}
const COW = String.raw`        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||`
function CowsayBlock({ text }: { text: string }) {
  return <pre className="jsh-toy">{cowBubble(text) + "\n" + COW}</pre>
}

const APT_COW = String.raw`         (__)
         (oo)
   /------\/
  / |    ||
 *  /\---/\
    ~~   ~~
..."Have you mooed today?"`
function AptMooBlock() {
  return <pre className="jsh-toy">{APT_COW}</pre>
}

const SL_TRAIN = String.raw`      ====        ________                ___________
  _D _|  |_______/        \__I_I_____===__|_________|
   |(_)---  |   H\________/ |   |        =|___ ___|
   /     |  |   H  |  |     |   |         ||_| |_||
  |      |  |   H  |__--------------------| [___] |
  | ________|___H__/__|_____/[][]~\_______|       |
  | |      |-----------I_____I [][] []  D   |=======|__
__/ =| o |=-~~\  /~~\  /~~\  /~~\ ____Y___________|__
 |/-=|___|=    ||    ||    ||    |_____/~\___/
  \_/      \O=====O=====O=====O_/      \_/`
function SlBlock() {
  const [done, setDone] = useState(false)
  if (done) return null // collapse once the train has chuffed off-screen
  return (
    <div className="jsh-sl" aria-hidden="true">
      <pre className="jsh-sl-train" onAnimationEnd={() => setDone(true)}>
        {SL_TRAIN}
      </pre>
    </div>
  )
}

// A self-contained, decorative rotating status line. Cycles the gag pool, then
// settles on the real descriptor. Manages its own timing so it stays decoupled
// from the shell; assistive tech only ever hears the settled value.
function RotatingGag() {
  const [i, setI] = useState(0)
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])
  useEffect(() => {
    if (reduced) {
      setI(MOTD_CYCLE.length - 1)
      return
    }
    if (i >= MOTD_CYCLE.length - 1) return
    const t = window.setTimeout(() => setI((m) => m + 1), i === 0 ? 380 : 140)
    return () => window.clearTimeout(t)
  }, [i, reduced])
  const settled = i >= MOTD_CYCLE.length - 1
  return (
    <span className="jsh-nf-status">
      <span aria-hidden="true" className={settled ? "jsh-em" : "jsh-muted"}>
        {MOTD_CYCLE[i]}
      </span>
      {!settled && (
        <span className="jsh-cursor jsh-cursor-sm" aria-hidden="true">
          ▋
        </span>
      )}
      <span className="jsh-sr-only">{MOTD_CYCLE[MOTD_CYCLE.length - 1]}</span>
    </span>
  )
}

/* ------------------------------------------------------------------ *
 *  RETYPE — self-revising text
 *  A small primitive for "text that rewrites itself over time". It walks
 *  a list of frames, erasing the current one and typing the next — a
 *  terminal correcting itself in real time. Frames are strings or
 *  () => string thunks (resolved when reached, so randomness re-rolls
 *  each pass). Drop it anywhere a value should feel alive:
 *
 *    <Retype frames={["connecting…", "connected"]} />
 *    <Retype frames={[() => roll(), "0", "3"]} hold={[700, 400, 0]} />
 *    <Retype mode="swap" loop frames={MOTD} />   // hard cycle, no typing
 *
 *  Timing is per-frame: hold[i] is the pause after frame i finishes,
 *  think[i] the beat before erasing into frame i. Honors
 *  prefers-reduced-motion by jumping straight to the final frame.
 * ------------------------------------------------------------------ */
type Frame = string | (() => string)
const asText = (f: Frame): string => (typeof f === "function" ? f() : f)

function Retype({
  frames,
  typeMs = 52,
  eraseMs = 34,
  hold = 480,
  startDelay = 0,
  think = 0,
  mode = "retype",
  loop = false,
  cursor = true,
  className = "jsh-retype",
  srText,
}: {
  frames: Frame[]
  typeMs?: number
  eraseMs?: number
  hold?: number | number[]
  startDelay?: number
  think?: number | number[]
  mode?: "retype" | "swap"
  loop?: boolean
  cursor?: boolean
  className?: string
  srText?: string
}) {
  // Render a literal first frame immediately, but never call a random thunk
  // during render — keep SSR/first paint stable; the effect fills those in.
  const [text, setText] = useState(() =>
    typeof frames[0] === "string" ? frames[0] : "",
  )
  const [done, setDone] = useState(false)

  // Capture the latest props so the animation reads current config without
  // restarting on every re-render (inline array props change identity).
  const cfg = useRef({ frames, typeMs, eraseMs, hold, startDelay, think, mode, loop })
  cfg.current = { frames, typeMs, eraseMs, hold, startDelay, think, mode, loop }

  useEffect(() => {
    const c = cfg.current
    if (!c.frames.length) return
    const at = (v: number | number[], i: number, dflt: number) =>
      Array.isArray(v) ? v[i] ?? v[v.length - 1] ?? dflt : v

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(asText(c.frames[c.frames.length - 1]))
      setDone(true)
      return
    }

    let cancelled = false
    const timers: number[] = []
    const wait = (ms: number, fn: () => void) => {
      timers.push(window.setTimeout(() => !cancelled && fn(), Math.max(0, ms)))
    }

    let idx = 0
    let cur = asText(c.frames[0])
    setText(cur)
    setDone(false)

    const toNext = () => {
      const fr = cfg.current.frames
      if (idx >= fr.length - 1) {
        if (cfg.current.loop) {
          idx = -1
          advance()
        } else setDone(true)
        return
      }
      advance()
    }
    const advance = () => {
      const k = cfg.current
      idx += 1
      const target = asText(k.frames[idx])
      if (k.mode === "swap") {
        cur = target
        setText(cur)
        wait(at(k.hold, idx, 480), toNext)
        return
      }
      const type = () => {
        if (cur.length < target.length) {
          cur = target.slice(0, cur.length + 1)
          setText(cur)
          wait(k.typeMs, type)
        } else {
          wait(at(k.hold, idx, 480), toNext)
        }
      }
      const erase = () => {
        if (cur.length > 0) {
          cur = cur.slice(0, -1)
          setText(cur)
          wait(k.eraseMs, erase)
        } else type()
      }
      wait(at(k.think, idx, 0), erase)
    }

    wait(c.startDelay + at(c.hold, 0, 480), toNext)
    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
    }
    // Mount once: the animation plays from the start and reads cfg.current live.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <span className={className}>
      <span aria-hidden={srText !== undefined ? "true" : undefined}>{text}</span>
      {cursor && !done && (
        <span className="jsh-cursor jsh-cursor-sm" aria-hidden="true">
          ▋
        </span>
      )}
      {srText !== undefined && <span className="jsh-sr-only">{srText}</span>}
    </span>
  )
}

// A count that revises itself in real time: a giant number that backspaces
// down toward 0, hesitates, and settles on a small honest figure. Every value
// is re-rolled per load (see the ranges), so it tells a slightly different
// story each visit. Built on Retype; settles instantly under reduced-motion.
const randInt = (lo: number, hi: number) =>
  lo + Math.floor(Math.random() * (hi - lo + 1))
const withCommas = (n: number) => n.toLocaleString("en-US")

function AnimatedCount() {
  const [final] = useState(() => String(randInt(2, 5)))
  return (
    <Retype
      className="jsh-count"
      frames={[
        () => withCommas(randInt(1_073_741_824, 2_147_483_647)),
        () => withCommas(randInt(10_000, 99_999)),
        () => String(randInt(120, 999)),
        "0",
        final,
      ]}
      typeMs={52}
      eraseMs={36}
      hold={[900, 460, 460, 360, 0]}
      think={[0, 0, 0, 0, 650]}
      srText={final}
    />
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
  const [focused, setFocused] = useState(true)
  const [theme, setTheme] = useState<Theme>("amber")
  const [clock, setClock] = useState("")
  const [guest, setGuest] = useState("guest")
  const [achievements, setAchievements] = useState<string[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [matrixMode, setMatrixMode] = useState(false)
  // Current working directory, as segments from the root. `cd` moves it; the
  // prompt and the top bar track it. Starts at /home/jess (~).
  const [cwd, setCwd] = useState<string[]>(() => [...HOME_PATH])

  const idRef = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const tailSpacerRef = useRef<HTMLDivElement>(null)
  const bootCancel = useRef<(() => void) | null>(null)
  const scrollWelcomeTop = useRef(false)
  // True once the welcome card (the home header) is on screen — gates the
  // click-to-replace "tab bar" behavior.
  const hasHomeRef = useRef(false)
  const historyRef = useRef<string[]>(history)
  historyRef.current = history
  const themeRef = useRef<Theme>(theme)
  themeRef.current = theme
  const achievementsRef = useRef<string[]>(achievements)
  achievementsRef.current = achievements
  const usedThemesRef = useRef<Set<string> | null>(null)
  if (usedThemesRef.current === null) usedThemesRef.current = new Set()
  const cmdCountRef = useRef(0)
  const guestRef = useRef(guest)
  guestRef.current = guest
  // True while a fullscreen game is open — used to mute the shell's global key
  // handlers so they don't steal focus or advance behind the overlay.
  const activeGameRef = useRef<string | null>(null)
  activeGameRef.current = activeGame
  const matrixModeRef = useRef(false)
  matrixModeRef.current = matrixMode
  const cwdRef = useRef(cwd)
  cwdRef.current = cwd
  // Tab-completion cycle state (multiple candidates → cycle through them).
  const tabCycle = useRef<{ base: string; matches: string[]; idx: number } | null>(
    null,
  )

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

  // The prompt as it stands right now — captured per echo line so scrollback
  // keeps the path each command actually ran under, even after `cd` moves on.
  const ps1 = useCallback(
    () => `${guestRef.current}@${HOST}:${SHELL.pathLabel(cwdRef.current)}$`,
    [],
  )

  // Unlock an achievement once: persist it and drop a quiet toast in the
  // transcript. When everything else is unlocked, "completionist" follows.
  const unlock = useCallback(
    (id: string) => {
      if (achievementsRef.current.includes(id)) return
      const next = [...achievementsRef.current, id]
      achievementsRef.current = next
      setAchievements(next)
      try {
        window.localStorage.setItem("jsh-achievements", JSON.stringify(next))
      } catch {
        /* ignore */
      }
      const a = ACHIEVEMENTS.find((x) => x.id === id)
      if (a) pushText(<AchievementToast a={a} />)
      const others: string[] = []
      for (const achievement of ACHIEVEMENTS) {
        if (achievement.id !== "completionist") others.push(achievement.id)
      }
      if (id !== "completionist" && others.every((o) => next.includes(o))) {
        window.setTimeout(() => unlockRef.current("completionist"), 450)
      }
    },
    [pushText],
  )
  const unlockRef = useRef(unlock)
  useEffect(() => {
    unlockRef.current = unlock
  }, [unlock])

  /* -------------------- prefers-reduced-motion -------------------- */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  /* ------------------------ theme persistence --------------------- */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("jsh-theme") as Theme | null
      if (saved && (THEMES as string[]).includes(saved)) setTheme(saved)
      if (window.localStorage.getItem("jsh-matrix") === "1") setMatrixMode(true)
    } catch {
      /* localStorage may be unavailable; default theme is fine */
    }
  }, [])
  useEffect(() => {
    try {
      window.localStorage.setItem("jsh-theme", theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  /* ------------------ guest handle + saved progress --------------- */
  useEffect(() => {
    // A fresh handle every load — set client-side so SSR stays "guest".
    setGuest(makeGuest())
    try {
      const raw = window.localStorage.getItem("jsh-achievements")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          setAchievements(parsed.filter((x) => typeof x === "string"))
        }
      }
      const ut = window.localStorage.getItem("jsh-themes-used")
      if (ut) {
        const arr = JSON.parse(ut)
        if (Array.isArray(arr)) usedThemesRef.current = new Set(arr)
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, [])

  /* --------------------------- live clock ------------------------- */
  // Her local time (PT). Empty on the server + first paint to avoid a
  // hydration mismatch; the interval fills it in client-side.
  useEffect(() => {
    const tick = () => {
      try {
        setClock(
          PACIFIC_TIME_FORMAT.format(new Date()),
        )
      } catch {
        /* Intl/timeZone unsupported — skip the clock */
      }
    }
    tick()
    const t = window.setInterval(tick, 1000)
    return () => window.clearInterval(t)
  }, [])

  /* -------------------------- the boot ---------------------------- */
  // Build the transcript deterministically from a boot-progress count, so the
  // sequence is idempotent under re-runs and React 18 StrictMode double-mounts.
  const renderBoot = useCallback((count: number, done: boolean) => {
    const next: Line[] = []
    let n = 0
    for (let k = 0; k < count && k < BOOT.length; k++) {
      next.push({ id: ++n, block: { kind: "boot", line: BOOT[k] } })
    }
    if (done) {
      next.push({ id: ++n, block: { kind: "text", node: <WelcomeCard /> }, home: true })
    }
    idRef.current = n
    setLines(next)
  }, [])

  const finishBoot = useCallback(() => {
    scrollWelcomeTop.current = true
    renderBoot(BOOT.length, true)
    hasHomeRef.current = true
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

    // Advance several lines per tick so a ~40-line reel still finishes in ~1s.
    const TICK = 42
    const CHUNK = Math.max(1, Math.ceil(BOOT.length / 22))
    const step = () => {
      if (cancelled) return
      if (i < BOOT.length) {
        i = Math.min(BOOT.length, i + CHUNK)
        renderBoot(i, false)
        timers.push(window.setTimeout(step, TICK))
      } else {
        finishBoot()
        bootCancel.current = null
      }
    }
    timers.push(window.setTimeout(step, 120))

    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
      bootCancel.current = null
    }
    // run exactly once per reduced-motion value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced])

  /* --------------------- autoscroll on growth --------------------- */
  // Normally pin to the bottom. But the instant the boot reel finishes, snap the
  // welcome card to the TOP instead — so the boot log scrolls out of sight and
  // you only meet it again by scrolling up.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const spacer = tailSpacerRef.current
    if (scrollWelcomeTop.current) {
      scrollWelcomeTop.current = false
      const offset = (w: HTMLElement) =>
        w.getBoundingClientRect().top - el.getBoundingClientRect().top - 6
      const snap = () => {
        const w = el.querySelector(".jsh-welcome") as HTMLElement | null
        if (!w) return
        if (spacer) spacer.style.height = "0px"
        el.scrollTop += offset(w)
        // If the scroll bottomed out before the welcome reached the top, there
        // is not enough content below it — add exactly that much tail space so
        // the whole boot reel sits above the fold.
        const residual = offset(w)
        if (residual > 1 && spacer) {
          spacer.style.height = `${Math.ceil(residual)}px`
          el.scrollTop += residual
        }
      }
      snap()
      // Re-assert across the next frames + once fonts swap in, since both the
      // prompt mounting and the custom fonts reflow the long boot reel.
      requestAnimationFrame(() => {
        snap()
        requestAnimationFrame(snap)
      })
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(snap).catch(() => {})
      }
      return
    }
    // normal growth: drop any tail spacer and pin to the bottom
    if (spacer) spacer.style.height = "0px"
    el.scrollTop = el.scrollHeight
  }, [lines])

  /* ------------- focus the prompt when ready (no jump) ------------ */
  useEffect(() => {
    if (phase === "ready") inputRef.current?.focus({ preventScroll: true })
  }, [phase])

  /* --------- archaeologist: scroll up to the top of the boot ------ */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      if (phase === "ready" && el.scrollTop < 24 && el.querySelector(".jsh-bootline")) {
        unlockRef.current("archaeologist")
      }
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [phase])

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
    pushText(<HelpBlock run={clickRef.current} />)
  }, [pushText])

  const runLs = useCallback(
    (arg: string) => {
      const r = SHELL.ls(cwdRef.current, arg)
      if (r.kind === "error") return pushText(<Errline>{r.msg}</Errline>)
      if (r.kind === "file")
        return pushText(<FileLsBlock node={r.node} segs={r.segs} run={clickRef.current} />)
      // a directory: its rich listing if it has one, else a generic ls
      return pushText(
        r.node.listing ? (
          r.node.listing(clickRef.current)
        ) : (
          <DirListing node={r.node} segs={r.segs} run={clickRef.current} />
        ),
      )
    },
    [pushText],
  )

  const runCd = useCallback(
    (arg: string): boolean => {
      const r = SHELL.cd(cwdRef.current, arg)
      if (r.kind === "error") {
        pushText(<Errline>{r.msg}</Errline>)
        return false
      }
      // Update the ref synchronously so a chained `cd x && ls` sees the new cwd
      // immediately; setCwd moves the prompt on the next render. cd itself is
      // silent, like a real shell — the `&& ls` is what shows the contents.
      cwdRef.current = r.cwd
      setCwd(r.cwd)
      return true
    },
    [pushText],
  )

  const runPwd = useCallback(() => {
    pushText(<p className="jsh-out">{SHELL.absPath(cwdRef.current)}</p>)
  }, [pushText])

  const runTree = useCallback(
    (arg: string) => {
      const r = SHELL.tree(cwdRef.current, arg)
      if (r.kind === "error") return pushText(<Errline>{r.msg}</Errline>)
      if (r.kind === "file")
        return pushText(<FileLsBlock node={r.node} segs={r.segs} run={clickRef.current} />)
      return pushText(<TreeBlock label={r.label} rows={r.rows} run={clickRef.current} />)
    },
    [pushText],
  )

  const runNeofetch = useCallback(() => {
    pushText(
      <div className="jsh-block-pad">
        <NeofetchCard />
      </div>,
    )
  }, [pushText])

  const runMan = useCallback(
    (arg: string) => {
      const t = arg.trim().toLowerCase().split(/\s+/)[0]
      if (!t) {
        pushText(
          <Errline>
            What manual page do you want? e.g. <Cmd run={clickRef.current}>man ls</Cmd>.
          </Errline>,
        )
        return
      }
      const page = MANPAGES[t]
      if (!page) {
        pushText(<p className="jsh-out jsh-muted">No manual entry for {t}.</p>)
        return
      }
      pushText(<ManBlock cmd={t} page={page} />)
    },
    [pushText],
  )

  const runTheme = useCallback(
    (arg: string) => {
      const t = arg.trim().toLowerCase()
      if (!t || t === "list" || t === "ls") {
        pushText(<ThemeList current={themeRef.current} run={clickRef.current} />)
        return
      }
      const apply = (nx: Theme) => {
        setTheme(nx)
        const used = usedThemesRef.current ?? new Set<string>()
        usedThemesRef.current = used
        used.add(nx)
        try {
          window.localStorage.setItem("jsh-themes-used", JSON.stringify([...used]))
        } catch {
          /* ignore */
        }
        if (used.size >= THEMES.length) unlockRef.current("interior-decorator")
        pushText(
          <p className="jsh-out">
            <span className="jsh-ok">✓</span> theme → <span className="jsh-em">{nx}</span>{" "}
            <span className="jsh-muted">· {THEME_NOTE[nx]}</span>
          </p>,
        )
      }
      if (t === "next" || t === "cycle" || t === "toggle") {
        const idx = THEMES.indexOf(themeRef.current)
        apply(THEMES[(idx + 1) % THEMES.length])
        return
      }
      if ((THEMES as string[]).includes(t)) {
        apply(t as Theme)
        return
      }
      pushText(
        <Errline>
          theme: no theme &apos;{arg}&apos;. options:{" "}
          {THEMES.map((th, i) => (
            <span key={th}>
              {i > 0 ? " " : ""}
              <Cmd run={clickRef.current}>{`theme ${th}`}</Cmd>
            </span>
          ))}
        </Errline>,
      )
    },
    [pushText],
  )

  const runCat = useCallback(
    (arg: string) => {
      const r = SHELL.cat(cwdRef.current, arg)
      if (r.kind === "missing")
        return pushText(
          <Errline>
            cat: missing operand. try <Cmd run={clickRef.current}>cat about</Cmd> or{" "}
            <Cmd run={clickRef.current}>ls</Cmd>
          </Errline>,
        )
      if (r.kind === "dir")
        return pushText(
          <Errline>
            cat: {r.name}: Is a directory — try{" "}
            <Cmd run={clickRef.current}>{`ls ${r.name}`}</Cmd>
          </Errline>,
        )
      if (r.kind === "error")
        return pushText(
          <Errline>
            {r.msg}. known files:{" "}
            {CAT_TARGETS.map((c, i) => (
              <span key={c}>
                {i > 0 ? " " : ""}
                <Cmd run={clickRef.current}>{`cat ${c}`}</Cmd>
              </span>
            ))}{" "}
            · or <Cmd run={clickRef.current}>ls</Cmd> to look around
          </Errline>,
        )
      // a file: render its rich content
      return pushText(r.node.render(clickRef.current))
    },
    [pushText],
  )

  const runOpen = useCallback(
    (arg: string) => {
      const t = arg.trim().toLowerCase()
      if (!t) {
        pushText(
          <Errline>
            open: which one? try <Cmd run={clickRef.current}>open github</Cmd>,{" "}
            <Cmd run={clickRef.current}>open linkedin</Cmd>, or a repo like{" "}
            <Cmd run={clickRef.current}>open hurry</Cmd> —{" "}
            <Cmd run={clickRef.current}>projects</Cmd> lists them all
          </Errline>,
        )
        return
      }
      const link = LINKS.find((l) => l.key === t)
      const proj = PROJECTS.find((p) => p.name === t)
      const target = link?.url ?? (proj ? projectUrl(proj) : undefined)
      if (!target) {
        pushText(
          <Errline>
            open: {arg}: unknown target. try <Cmd run={clickRef.current}>ls</Cmd> to see
            what&apos;s here.
          </Errline>,
        )
        return
      }
      const isMail = target.startsWith("mailto:")
      pushText(
        <p className="jsh-out">
          <span className="jsh-ok">→</span> opening{" "}
          <Ext href={target}>{link?.label ?? proj?.name}</Ext>
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
  // `replace` is the website-mode path: a clicked command collapses the page
  // back to the welcome header (its "tab bar") and shows just that command, so
  // visitors can hop between experience / skills / resume without scrolling
  // back up. Typed commands append, like a real terminal. Commands are also
  // &&-chained (a folder click runs `cd <dir> && ls`).
  const run = useCallback(
    (raw: string, opts?: { replace?: boolean }) => {
      const replace = opts?.replace === true
      setPreview(null)
      const cmd = raw.trim()
      if (cmd.length === 0) {
        push({ kind: "echo", cmd: "", prompt: ps1() })
        return
      }

      // record history (dedupe consecutive) — typed commands only; clicks are
      // website navigation, not shell history.
      if (!replace) {
        setHistory((h) => (h[h.length - 1] === cmd ? h : [...h, cmd]))
      }
      setHistIdx(-1)

      if (cmd === "clear") {
        setLines([])
        idRef.current = 0
        hasHomeRef.current = false
        return
      }

      // website mode: drop everything below the welcome header before showing
      // this command, and re-pin the header to the top.
      if (replace && hasHomeRef.current) {
        scrollWelcomeTop.current = true
        setLines((prev) => {
          let homeIdx = -1
          for (let i = prev.length - 1; i >= 0; i--) {
            if (prev[i].home) {
              homeIdx = i
              break
            }
          }
          return homeIdx >= 0 ? prev.slice(0, homeIdx + 1) : prev
        })
      }

      push({ kind: "echo", cmd, prompt: ps1() })

      cmdCountRef.current += 1
      unlockRef.current("first-contact")
      if (cmdCountRef.current >= ACH_POWER_USER_AT) unlockRef.current("power-user")

      // Commands chain on && like a real shell: run each segment in order and
      // stop at the first failure. A folder click sends `cd <dir> && ls`, so it
      // drills in (the prompt moves) and shows the contents — like opening a
      // folder in a file browser. Most commands "succeed" (return undefined);
      // only a bad cd or an unknown command returns false to break the chain.
      const execOne = (segment: string): boolean | void => {
        const [head, ...rest] = segment.split(/\s+/)
        const arg = rest.join(" ")
        const h = head.toLowerCase()
        if (!h) return

        // a tiny nod to the classic pipe
        if (/^fortune\s*\|\s*cowsay$/i.test(segment)) {
          return pushText(<CowsayBlock text={pickFortune()} />)
        }
        // the vim escape reflex
        if (/^:(w?q!?|x)$/i.test(segment) || segment === "ZZ") {
          return pushText(
            <p className="jsh-out jsh-muted">
              not in an editor — but the reflex is respected. you&apos;re already free.
            </p>,
          )
        }

        switch (h) {
          case "help":
          case "?":
            unlockRef.current("rtfm")
            return runHelp()
          case "man":
          case "info":
            unlockRef.current("rtfm")
            return runMan(arg)
          // ---- real filesystem verbs (the Shell owns the rules) ----
          case "ls":
          case "ll":
          case "dir":
            return runLs(arg)
          case "cd":
          case "chdir":
            return runCd(arg)
          case "tree":
            return runTree(arg)
          case "cat":
          case "less":
          case "more":
            return runCat(arg)
          case "open":
          case "xdg-open":
          case "start":
            return runOpen(arg)
          // ---- content shortcuts: each is just an ls/cat of a known path ----
          case "whoami":
          case "about":
            return runCat("about")
          case "experience":
          case "work":
          case "jobs":
            return runLs("~/experience")
          case "skills":
            return runLs("~/skills")
          case "resume":
          case "cv":
            return runCat("~/resume.txt")
          case "writing":
          case "blog":
            return runLs("~/writing")
          case "projects":
          case "repos":
          case "oss":
            return runLs("~/projects")
          case "contact":
          case "email":
            return runCat("contact")
          case "readme":
            return runCat("readme")
          case "theme":
          case "color":
          case "colour":
            return runTheme(arg)
          case "neofetch":
          case "fetch":
            return runNeofetch()
          case "achievements":
          case "achievement":
          case "trophies":
            return pushText(<AchievementsBlock unlocked={achievementsRef.current} />)
          case "games":
          case "play":
            return runLs("~/games")
          case "history":
            return pushText(
              <HistoryBlock items={historyRef.current} run={clickRef.current} />,
            )
          case "coffee":
          case "make":
            unlockRef.current("caffeinated")
            return pushText(<CoffeeBlock />)
          case "fortune":
            return pushText(<FortuneBlock />)
          case "cowsay":
            return pushText(<CowsayBlock text={arg || pickFortune()} />)
          case "sl":
            return pushText(<SlBlock />)
          case "apt":
          case "apt-get":
            if (/\bmoo\b/.test(arg)) return pushText(<AptMooBlock />)
            return pushText(
              <p className="jsh-out jsh-muted">
                E: unable to locate package. (this is not that kind of machine.)
              </p>,
            )
          case "aptitude":
            if (/\bmoo\b/.test(arg))
              return pushText(
                <p className="jsh-out jsh-muted">
                  There are no Easter Eggs in this program.
                </p>,
              )
            return pushText(
              <Errline>
                aptitude: try <Cmd run={clickRef.current}>aptitude moo</Cmd>.
              </Errline>,
            )
          case "pwd":
            return runPwd()
          case "echo":
            return pushText(<p className="jsh-out">{arg || " "}</p>)
          case "vim":
          case "vi":
          case "nvim":
            return pushText(
              <p className="jsh-out jsh-muted">
                nice reflex — but nothing&apos;s open. to leave, type{" "}
                <Cmd run={clickRef.current}>:q</Cmd> like the rest of us.
              </p>,
            )
          case "nano":
            return pushText(
              <p className="jsh-out jsh-muted">
                nano? a gentle choice. this house runs vim, but you do you.
              </p>,
            )
          case "emacs":
            return pushText(
              <p className="jsh-out jsh-muted">
                emacs: a fine operating system, lacking only a decent editor. (kidding.
                mostly.)
              </p>,
            )
          case "ping":
            return pushText(
              <pre className="jsh-toy">{`PING jessica.black (127.0.0.1): 56 data bytes
64 bytes from 127.0.0.1: icmp_seq=0 time=0.013 ms
64 bytes from 127.0.0.1: icmp_seq=1 time=0.011 ms
--- jessica.black ping statistics ---
2 packets transmitted, 2 received, 0% loss. she's right here.`}</pre>,
            )
          case "cmatrix":
          case "matrix": {
            const next = !matrixModeRef.current
            setMatrixMode(next)
            try {
              window.localStorage.setItem("jsh-matrix", next ? "1" : "0")
            } catch {
              /* ignore */
            }
            return pushText(
              next ? (
                <p className="jsh-out jsh-muted">
                  wake up… matrix mode <span className="jsh-em">engaged</span>. (run{" "}
                  <Cmd run={clickRef.current}>cmatrix</Cmd> again to unplug.)
                </p>
              ) : (
                <p className="jsh-out jsh-muted">
                  matrix mode disengaged. welcome back to the desert of the real.
                </p>
              ),
            )
          }
          case "3bp":
          case "threebody":
          case "3body":
            setActiveGame("threebody")
            return
          case "sudo":
            unlockRef.current("permission-denied")
            return pushText(
              <Errline>
                {guestRef.current} is not in the sudoers file. this incident will be
                reported. (it won&apos;t. there is no one to report it to.)
              </Errline>,
            )
          case "rm":
            if (/-rf?\b/.test(arg) && /(\/|~|\*)/.test(arg)) {
              unlockRef.current("nice-try")
              return pushText(
                <p className="jsh-out jsh-muted">
                  nice try. this site is content-addressed; it heals.{" "}
                  <Cmd run={clickRef.current}>ls</Cmd>?
                </p>,
              )
            }
            return pushText(
              <Errline>rm: refusing. everything here is load-bearing.</Errline>,
            )
          case "exit":
          case "logout":
          case "quit":
            return pushText(
              <p className="jsh-out jsh-muted">
                there is no exit. there is only{" "}
                <Cmd run={clickRef.current}>open github</Cmd>.
              </p>,
            )
          default:
            if (GAMES[h]) {
              setActiveGame(h)
              return
            }
            pushText(
              <Errline>
                {head}: command not found. try <Cmd run={clickRef.current}>help</Cmd> —
                or just click something below.
              </Errline>,
            )
            return false
        }
      }

      // chain on && — run each segment, stop at the first failure
      for (const part of cmd.split("&&")) {
        const seg = part.trim()
        if (!seg) continue
        if (execOne(seg) === false) break
      }
    },
    [
      push,
      pushText,
      ps1,
      runHelp,
      runLs,
      runCd,
      runPwd,
      runCat,
      runOpen,
      runTree,
      runTheme,
      runNeofetch,
      runMan,
    ],
  )

  // Stable ref so child blocks (rendered into state) can call the latest run.
  const runRef = useRef(run)
  useEffect(() => {
    runRef.current = run
  }, [run])

  // Clicking a command (palette pills, command tokens, file names) navigates
  // like a website: it REPLACES the page content. Stored in a ref so the blocks
  // baked into the transcript always reach the live dispatcher.
  const clickRef = useRef<(cmd: string) => void>(() => {})
  clickRef.current = (cmd: string) => runRef.current(cmd, { replace: true })

  // The context dispatcher (palette, Cmd tokens, etc.) is the click path —
  // stable identity, always reaches live `run` in replace mode.
  const dispatch = useCallback((cmd: string) => clickRef.current(cmd), [])

  /* ------------------- konami code: a quiet wink ------------------ */
  useEffect(() => {
    const SEQ = [
      "arrowup",
      "arrowup",
      "arrowdown",
      "arrowdown",
      "arrowleft",
      "arrowright",
      "arrowleft",
      "arrowright",
      "b",
      "a",
    ]
    let pos = 0
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (activeGameRef.current) return // arrows belong to the game, not konami
      const k = e.key.toLowerCase()
      if (k === SEQ[pos]) {
        pos += 1
        if (pos === SEQ.length) {
          pos = 0
          unlockRef.current("cheat-code")
          pushText(<KonamiBlock run={clickRef.current} />)
        }
      } else {
        pos = k === SEQ[0] ? 1 : 0
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pushText])

  /* ------------------------ INPUT HANDLING ------------------------ */

  const onSubmit = useCallback(() => {
    const v = input
    setInput("")
    tabCycle.current = null
    run(v)
  }, [input, run])

  const onChange = useCallback((v: string) => {
    tabCycle.current = null // any edit resets Tab-cycling
    setPreview(null) // typing dismisses the hover-ghost
    setInput(v)
  }, [])

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
        const next = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1)
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
        e.preventDefault()
        const frag = input.trim().toLowerCase()
        if (!frag) return
        const cyc = tabCycle.current
        if (cyc && (cyc.base === frag || cyc.matches.includes(frag))) {
          // advance the cycle through the candidate list
          cyc.idx = (cyc.idx + 1) % cyc.matches.length
          setInput(cyc.matches[cyc.idx])
          return
        }
        const matches = COMMANDS.filter((c) => c.startsWith(frag))
        if (matches.length === 0) return
        if (matches.length === 1) {
          setInput(matches[0] + " ")
          tabCycle.current = null
          return
        }
        tabCycle.current = { base: frag, matches: [...matches], idx: 0 }
        setInput(matches[0])
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
        push({ kind: "echo", cmd: input + "^C", prompt: ps1() })
        setInput("")
        setHistIdx(-1)
        return
      }
    },
    [input, history, histIdx, onSubmit, push, ps1],
  )

  /* --------- global key affordance: any key skips the boot -------- */
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (activeGameRef.current) return // a fullscreen game owns the keyboard
      // While booting, any key (except pure modifiers) jumps to the prompt.
      if (phase === "booting" && bootCancel.current) {
        if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return
        bootCancel.current()
        unlockRef.current("speedrunner")
        window.setTimeout(() => inputRef.current?.focus(), 0)
        return
      }
      // When ready: a printable key focuses the prompt (so you can just start
      // typing from anywhere) — but never steal focus from another control.
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
    // preventScroll so a click that bubbles here doesn't yank the view to the
    // bottom and fight the click-to-replace snap that pins the header up top.
    if (phase === "ready") inputRef.current?.focus({ preventScroll: true })
  }, [phase])

  // Close the fullscreen game and hand focus back to the prompt.
  const onExitGame = useCallback(() => {
    setActiveGame(null)
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  /* ----------------------------- VIEW ----------------------------- */

  const promptStr = `${guest}@${HOST}:${SHELL.pathLabel(cwd)}$`
  const reveal = reduced ? "" : "jsh-reveal"

  return (
    <RunContext.Provider value={dispatch}>
      <GuestContext.Provider value={guest}>
      <PreviewContext.Provider value={setPreview}>
      <main
        className={`${plex.className} jsh-root`}
        data-reduced={reduced ? "1" : "0"}
        data-theme={theme}
        data-matrix={matrixMode ? "1" : "0"}
      >
        <StyleBlock />
        <SourceEggs />
        {matrixMode && <MatrixRain />}

        {/* one real, stable heading for SEO + assistive tech */}
        <h1 className="jsh-sr-only">
          Jessica Black — Founding Engineer building AI agent systems in Rust and
          TypeScript.
        </h1>

        {/* the terminal IS the page — full-bleed, full-height */}
        <section
          className={`jsh-term ${reveal}`}
          style={delay(0)}
          aria-label="jessica black — interactive shell"
        >
          <div className="jsh-topbar">
            <span className="jsh-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="jsh-topbar-title">
              {guest}@{HOST}
              <span className="jsh-faint">:</span>
              <span className="jsh-path">{SHELL.pathLabel(cwd)}</span>
            </span>
            <span className="jsh-topbar-right">
              <span className="jsh-clock jsh-tnum" aria-hidden="true">
                {clock ? `${clock} PT` : ""}
              </span>
              <span className="jsh-tty">{phase === "booting" ? "init" : "tty1"}</span>
            </span>
          </div>

          <div
            className="jsh-scroll"
            ref={scrollRef}
            onPointerDown={focusPrompt}
            role="log"
            aria-label="session transcript"
            aria-live="polite"
          >
            <div className="jsh-scroll-inner">
              {lines.map((l) => (
                <TranscriptRow key={l.id} line={l} reduced={reduced} />
              ))}

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
                      onChange={(e) => onChange(e.target.value)}
                      onKeyDown={onKeyDown}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      aria-label="terminal command input"
                    />
                    {input === "" && preview ? (
                      <span className="jsh-ghost" aria-hidden="true">
                        <span className="jsh-ghost-cmd">{preview}</span>
                        <span
                          className={`jsh-cursor ${focused ? "" : "jsh-cursor-hollow"}`}
                        >
                          ▋
                        </span>
                        <span className="jsh-ghost-enter">↵</span>
                      </span>
                    ) : (
                      <span className="jsh-caret-track" aria-hidden="true">
                        <span className="jsh-caret-ghost">{input}</span>
                        <span
                          className={`jsh-cursor ${focused ? "" : "jsh-cursor-hollow"}`}
                        >
                          ▋
                        </span>
                      </span>
                    )}
                  </span>
                </form>
              )}

              {phase === "booting" && (
                <p className="jsh-bootcursor">
                  <span className="jsh-cursor">▋</span>
                </p>
              )}
              <div ref={tailSpacerRef} className="jsh-tail-spacer" aria-hidden="true" />
            </div>
          </div>

          <div className="jsh-statusbar">
            <div className="jsh-status-hint">
              <span className="jsh-hint-key">type</span> <Cmd run={clickRef.current}>help</Cmd>
              <span className="jsh-muted"> · ↑↓ history · Tab completes · ⌃L clears</span>
              {phase === "booting" && (
                <span className="jsh-hint-skip"> · any key skips boot</span>
              )}
            </div>
            <nav className="jsh-status-nav" aria-label="primary">
              {LINKS.map((l) => (
                <Ext key={l.key} href={l.url}>
                  {l.key}
                </Ext>
              ))}
              <span className="jsh-foot-sep" aria-hidden="true">
                ::
              </span>
              <Cmd run={clickRef.current}>theme</Cmd>
            </nav>
          </div>
        </section>

        {activeGame && <GameOverlay name={activeGame} onExit={onExitGame} />}
      </main>
      </PreviewContext.Provider>
      </GuestContext.Provider>
    </RunContext.Provider>
  )
}

/* ------------------------------------------------------------------ *
 *  ROW RENDERER
 * ------------------------------------------------------------------ */

function TranscriptRow({ line, reduced }: { line: Line; reduced: boolean }) {
  const cls = reduced ? "" : "jsh-row-in"
  const b = line.block
  if (b.kind === "echo") {
    return (
      <div className={`jsh-echo ${cls}`}>
        <span className="jsh-ps1">{b.prompt}</span>
        <span className="jsh-echo-cmd">{b.cmd}</span>
      </div>
    )
  }
  if (b.kind === "boot") {
    // No per-row entrance animation — the reel prints fast, so a stagger would
    // just look chaotic. Three line shapes: a systemd status tag, a kernel
    // timestamp, or a bare line (pacman output / the login banner).
    const ln = b.line
    return (
      <div className={`jsh-bootline jsh-boot-${ln.kind}`}>
        {ln.kind === "ok" && (
          <span className="jsh-boot-tag jsh-boot-ok">[&nbsp;&nbsp;OK&nbsp;&nbsp;]</span>
        )}
        {ln.kind === "kmsg" && (
          <span className="jsh-boot-tag jsh-boot-ts">{ln.ts}</span>
        )}
        <span className="jsh-boot-label">{ln.text || " "}</span>
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
      <NeofetchCard />
      <p className="jsh-w-line jsh-measure jsh-muted">
        founding engineer building AI agent systems in Rust and TypeScript.
        thirteen years shipping distributed systems, program-analysis engines,
        and developer tools.
      </p>
      <PaletteRow />
    </div>
  )
}

// neofetch-style identity card: wordmark + key/value system info.
function NeofetchCard() {
  const guest = useGuest()
  const rows: Array<[string, React.ReactNode]> = [
    ["host", `${guest}@jessica.black`],
    ["role", "Founding Engineer @ Attune"],
    ["uptime", "13 years in production"],
    ["bugs in prod", <AnimatedCount key="bugs" />],
    ["shell", "jsh 13.0 · hooks only"],
    ["stack", "Rust · Haskell · Go · TypeScript"],
    ["focus", "AI agents · distributed systems"],
    ["where", "Mountain View, CA"],
    ["status", <RotatingGag key="status" />],
    [
      "links",
      <span className="jsh-nf-links" key="links">
        <Ext href={linkUrl("github")}>github</Ext>
        {" · "}
        <Ext href={linkUrl("linkedin")}>linkedin</Ext>
        {" · "}
        <Ext href={linkUrl("email")}>email</Ext>
      </span>,
    ],
  ]
  return (
    <div className="jsh-neofetch">
      <div className="jsh-nf-logo" aria-hidden="true">
        <span className={`${martian.className} jsh-nf-name`}>
          JESSICA
          <br />
          BLACK
        </span>
        <span className="jsh-nf-glyph">{">_"}</span>
      </div>
      <dl className="jsh-nf-table">
        {rows.map(([k, v]) => (
          <div key={k} className="jsh-nf-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// The clickable command palette. Dispatches through RunContext.
function PaletteRow() {
  const run = useRun()
  const preview = usePreview()
  return (
    <address className="jsh-palette" aria-label="suggested commands">
      {PALETTE_ITEMS.map(([cmd, hint]) => (
        <button
          key={cmd}
          type="button"
          className="jsh-pill"
          onClick={() => run(cmd)}
          onMouseEnter={() => preview(cmd)}
          onMouseLeave={() => preview(null)}
          onFocus={() => preview(cmd)}
          onBlur={() => preview(null)}
          title={hint}
        >
          <span className="jsh-pill-cmd">{cmd}</span>
          <span className="jsh-pill-hint">{hint}</span>
        </button>
      ))}
    </address>
  )
}

// A `man` page, classic-formatted: a justified header, sectioned body, and
// SEE ALSO links that chain to other pages.
function ManBlock({ cmd, page }: { cmd: string; page: ManEntry }) {
  const tag = `${cmd.toUpperCase()}(1)`
  return (
    <div className="jsh-man">
      <div className="jsh-man-head">
        <span>{tag}</span>
        <span>jsh manual</span>
        <span>{tag}</span>
      </div>
      <p className="jsh-man-sec">NAME</p>
      <p className="jsh-man-body">{page.name}</p>
      <p className="jsh-man-sec">SYNOPSIS</p>
      <p className="jsh-man-body">
        <span className="jsh-em">{page.synopsis}</span>
      </p>
      <p className="jsh-man-sec">DESCRIPTION</p>
      <p className="jsh-man-body jsh-measure">{page.desc}</p>
      {page.see && page.see.length > 0 && (
        <>
          <p className="jsh-man-sec">SEE ALSO</p>
          <p className="jsh-man-body">
            {page.see.map((s, i) => (
              <span key={s}>
                {i > 0 ? ", " : ""}
                <Cmd>{`man ${s}`}</Cmd>
              </span>
            ))}
          </p>
        </>
      )}
    </div>
  )
}

function HelpBlock({ run }: { run: (c: string) => void }) {
  return (
    <div className="jsh-help">
      <p className="jsh-out jsh-muted">available commands — click any to run:</p>
      <ul className="jsh-helpgrid">
        {HELP_ROWS.map(([c, d]) => {
          const base = c.split(" ")[0]
          return (
            <li key={c}>
              <Cmd run={run} label={`run ${base}`}>
                {base}
              </Cmd>
              {c.includes("<") && (
                <span className="jsh-help-arg">{c.slice(c.indexOf(" "))}</span>
              )}
              <span className="jsh-help-desc">{d}</span>
            </li>
          )
        })}
      </ul>
      <p className="jsh-out jsh-muted jsh-help-foot">
        history: <kbd className="jsh-kbd">↑</kbd> <kbd className="jsh-kbd">↓</kbd> ·
        complete: <kbd className="jsh-kbd">Tab</kbd> · or never type at all — everything
        is clickable. (not everything is listed — try what a terminal junkie would.)
      </p>
    </div>
  )
}

// `ls <dir>` — a directory as a clickable listing, generated from the live FS
// node. Files cat, folders ls, executables run; the per-node `cmd` (its alias)
// is used when present so a clicked name lands on the same view typing would.
function DirListing({
  node,
  segs,
  run,
}: {
  node: FsDirNode
  segs: string[]
  run: RunCmd
}) {
  const preview = usePreview()
  const label = SHELL.pathLabel(segs)
  return (
    <div className="jsh-ls">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> ls -la {label}
      </p>
      <p className="jsh-ls-total jsh-muted">
        total {node.children.length} · {USER} {USER}
      </p>
      <ul className="jsh-lslist">
        {node.children.map((e) => {
          const childPath = label === "/" ? `/${e.name}` : `${label}/${e.name}`
          // Folders drill in (cd && ls), like opening one in a file browser;
          // files open their view (cat, or their alias).
          const cmd =
            e.kind === "dir" ? `cd ${childPath} && ls` : (e.cmd ?? `cat ${childPath}`)
          const perm =
            e.kind === "dir" ? "drwxr-xr-x" : e.exe ? "-rwxr-xr-x" : "-rw-r--r--"
          return (
            <li key={e.name} className="jsh-lsrow">
              <span className="jsh-ls-perm jsh-muted">{perm}</span>
              <button
                type="button"
                className="jsh-ls-name"
                onClick={() => run(cmd)}
                onMouseEnter={() => preview(cmd)}
                onMouseLeave={() => preview(null)}
                onFocus={() => preview(cmd)}
                onBlur={() => preview(null)}
                title={cmd}
              >
                {e.kind === "dir" ? e.name + "/" : e.name}
              </button>
              {e.note && <span className="jsh-ls-role jsh-muted">{e.note}</span>}
            </li>
          )
        })}
      </ul>
      <p className="jsh-out jsh-muted jsh-ls-hint">
        → click a folder to step into it, or a file to read it.{" "}
        <span className="jsh-em">cd ..</span> goes back;{" "}
        <span className="jsh-em">pwd</span> shows where you are.
      </p>
    </div>
  )
}

// `ls <file>` — a single row, like a real `ls` of one file.
function FileLsBlock({
  node,
  segs,
  run,
}: {
  node: FsFileNode
  segs: string[]
  run: RunCmd
}) {
  const label = SHELL.pathLabel(segs)
  const cmd = node.cmd ?? `cat ${label}`
  return (
    <div className="jsh-ls">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> ls -la {label}
      </p>
      <ul className="jsh-lslist">
        <li className="jsh-lsrow">
          <span className="jsh-ls-perm jsh-muted">
            {node.exe ? "-rwxr-xr-x" : "-rw-r--r--"}
          </span>
          <button type="button" className="jsh-ls-name" onClick={() => run(cmd)} title={cmd}>
            {node.name}
          </button>
          {node.note && <span className="jsh-ls-role jsh-muted">{node.note}</span>}
        </li>
      </ul>
      <p className="jsh-out jsh-muted jsh-ls-hint">
        → it&apos;s a file — <Cmd run={run}>{cmd}</Cmd> to read it.
      </p>
    </div>
  )
}

// `ls ~/experience` — the three roles as collapsed cards (hover/cat to expand).
function ExperienceListing({ run }: { run: RunCmd }) {
  return (
    <div className="jsh-exp">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> ls ~/experience/
      </p>
      {JOBS.map((j) => (
        <JobBlock key={j.id} job={j} />
      ))}
      <p className="jsh-out jsh-muted jsh-ls-hint">
        → hover a card to expand, or <Cmd run={run}>cat ~/experience/attune.md</Cmd> for
        one. the printable version: <Cmd run={run}>resume</Cmd>.
      </p>
    </div>
  )
}

// `cat ~/projects/<name>` — a project's "file": its note and where it lives.
// Open-source ones link to code, others to their own home; clicking opens it.
function ProjectFileBlock({ project, run }: { project: Project; run: RunCmd }) {
  const url = projectUrl(project)
  const badge = project.lang ?? project.badge
  return (
    <div className="jsh-skillfile">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> cat ~/projects/{project.name}
      </p>
      <p className="jsh-out">
        <span className="jsh-em">{project.name}</span>
        {badge && <span className="jsh-muted"> · {badge}</span>}
      </p>
      <p className="jsh-out jsh-measure">{project.note}</p>
      {url ? (
        <p className="jsh-out jsh-muted">
          → <Ext href={url}>{url.replace(/^https?:\/\//, "")}</Ext> ·{" "}
          <Cmd run={run}>{`open ${project.name}`}</Cmd>
        </p>
      ) : (
        <p className="jsh-out jsh-muted">no public link — this one keeps to itself.</p>
      )}
    </div>
  )
}

// `cat ~/writing/<slug>.md` — a post's "file": title, venue, and the link.
function WritingFileBlock({ item, file }: { item: Writing; file: string }) {
  return (
    <div className="jsh-skillfile">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> cat ~/writing/{file}
      </p>
      <p className="jsh-out">
        <span className="jsh-em">{item.title}</span>
        <span className="jsh-muted"> · {item.where}</span>
      </p>
      <p className="jsh-out jsh-muted">
        → <Ext href={item.url}>{item.url.replace(/^https?:\/\//, "")}</Ext>
      </p>
    </div>
  )
}

// `cat ~/games/<name>` — games are "binaries", not text. Don't cat them; run them.
function BinaryBlock({ name, run }: { name: string; run: RunCmd }) {
  return (
    <p className="jsh-out jsh-muted">
      cat: {name}: binary file — it&apos;s a game, not a text file. <Cmd run={run}>{name}</Cmd>{" "}
      to play it. (arrows move; esc quits.)
    </p>
  )
}

function JobBlock({ job, expanded }: { job: Job; expanded?: boolean }) {
  // Hover-to-expand: bullets are revealed on hover/focus; `expanded` forces open
  // (used by `cat attune`). Both paths keep content in the DOM for a11y.
  return (
    <article
      className={`jsh-job ${expanded ? "jsh-job-open" : ""}`}
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
          {job.bullets.map((b) => (
            <li key={`${job.id}:${b}`}>
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

function SkillsBlock({ run }: { run: (c: string) => void }) {
  const preview = usePreview()
  return (
    <div className="jsh-skills">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> ls ~/skills/
      </p>
      <p className="jsh-ls-total jsh-muted">
        {SKILLS.length} skill files — the kind you hand an agent
      </p>
      <ul className="jsh-sk-list">
        {SKILLS.map((s) => (
          <li key={s.id} className="jsh-sk-row">
            <button
              type="button"
              className="jsh-sk-file"
              onClick={() => run(`cat ~/skills/${s.id}`)}
              onMouseEnter={() => preview(`cat ~/skills/${s.id}`)}
              onMouseLeave={() => preview(null)}
              onFocus={() => preview(`cat ~/skills/${s.id}`)}
              onBlur={() => preview(null)}
              title={`cat ~/skills/${s.id}.skill.md`}
            >
              {s.id}.skill.md
            </button>
            <span className="jsh-sk-desc">{s.description}</span>
          </li>
        ))}
      </ul>
      <p className="jsh-out jsh-muted jsh-ls-hint">
        → <Cmd run={run}>cat ~/skills/rust</Cmd> to read one. each is a real SKILL.md —
        name, description, body.
      </p>
    </div>
  )
}

function SkillFileBlock({ skill }: { skill: Skill }) {
  return (
    <div className="jsh-skillfile">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> cat ~/skills/{skill.id}.skill.md
      </p>
      <div className="jsh-fm">
        <p className="jsh-fm-rule">---</p>
        <p>
          <span className="jsh-fm-k">name:</span>{" "}
          <span className="jsh-fm-v">{skill.name}</span>
        </p>
        <p>
          <span className="jsh-fm-k">description:</span>{" "}
          <span className="jsh-fm-v">{skill.description}</span>
        </p>
        <p>
          <span className="jsh-fm-k">level:</span>{" "}
          <span className="jsh-fm-v">{skill.level}</span>
        </p>
        <p className="jsh-fm-rule">---</p>
      </div>
      <p className="jsh-out jsh-measure jsh-skillfile-body">{skill.body}</p>
    </div>
  )
}

function ResumeBlock({ run }: { run: (c: string) => void }) {
  return (
    <div className="jsh-resume">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> cat ~/resume.txt
      </p>
      <div className="jsh-resume-head">
        <span className="jsh-resume-name jsh-em">Jessica Black</span>
        <span className="jsh-muted">Founding Engineer · Mountain View, CA</span>
        <span className="jsh-muted">
          <Ext href={linkUrl("email")}>me@jessica.black</Ext> ·{" "}
          <Ext href={linkUrl("github")}>github.com/jssblck</Ext> ·{" "}
          <Ext href={linkUrl("linkedin")}>linkedin</Ext>
        </span>
      </div>
      <p className="jsh-out jsh-measure">
        Founding engineer building AI agent systems in Rust and TypeScript. 13 years
        shipping distributed systems, program-analysis engines, and developer tools.
        Deep fluency across Rust, Haskell, Go, and TypeScript.
      </p>
      <p className="jsh-resume-h">experience</p>
      {JOBS.map((j) => (
        <div key={j.id} className="jsh-resume-job">
          <div className="jsh-resume-jobhead">
            <span className="jsh-em">{j.org}</span>
            <span className="jsh-muted"> — {j.role}</span>
            <span className="jsh-muted jsh-tnum jsh-resume-dates">
              {j.start} – {j.end}
            </span>
          </div>
          <ul className="jsh-resume-bullets">
            {j.bullets.map((b) => (
              <li key={`${j.id}:${b}`}>
                <span className="jsh-bullet-mark" aria-hidden="true">
                  ›
                </span>
                <span>{withRepoLinks(b)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="jsh-resume-h">skills</p>
      <p className="jsh-out">{SKILLS.map((s) => s.name).join(" · ")}</p>
      <p className="jsh-resume-h">projects</p>
      <p className="jsh-out">
        {PROJECTS.map((p, i) => {
          const url = projectUrl(p)
          return (
            <span key={p.name}>
              {i > 0 ? " · " : ""}
              {url ? <Ext href={url}>{p.name}</Ext> : <span>{p.name}</span>}
            </span>
          )
        })}
      </p>
      <p className="jsh-out jsh-muted jsh-resume-foot">
        ↑ that&apos;s the whole résumé. or read it piece by piece:{" "}
        <Cmd run={run}>experience</Cmd> · <Cmd run={run}>skills</Cmd>.
      </p>
    </div>
  )
}

// `tree` — rendered from rows the Shell flattened out of the live FS, so it
// always matches what `ls` and `cd` see. Every name is clickable.
function TreeBlock({
  label,
  rows,
  run,
}: {
  label: string
  rows: TreeRow[]
  run: RunCmd
}) {
  const preview = usePreview()
  return (
    <div className="jsh-tree">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> tree {label}
      </p>
      <p className="jsh-tree-root">{label}</p>
      <ul className="jsh-tree-list">
        {rows.map((r) => (
          <li key={`${r.prefix}:${r.name}`} className="jsh-tree-row">
            <span className="jsh-tree-l">
              <span className="jsh-tree-branch" aria-hidden="true">
                {r.prefix}
              </span>
              <button
                type="button"
                className="jsh-tree-name"
                onClick={() => run(r.cmd)}
                onMouseEnter={() => preview(r.cmd)}
                onMouseLeave={() => preview(null)}
                onFocus={() => preview(r.cmd)}
                onBlur={() => preview(null)}
                title={r.cmd}
              >
                {r.name}
              </button>
            </span>
            {r.meta && <span className="jsh-tree-meta jsh-muted">{r.meta}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

function HistoryBlock({
  items,
  run,
}: {
  items: string[]
  run: (c: string) => void
}) {
  if (items.length === 0) {
    return (
      <p className="jsh-out jsh-muted">history: empty. you have run nothing. bold.</p>
    )
  }
  return (
    <div className="jsh-history">
      <ol className="jsh-hist-list">
        {items.map((c, i) => (
          <li key={`${i + 1}:${c}`}>
            <span className="jsh-hist-n jsh-faint jsh-tnum">{i + 1}</span>
            <Cmd run={run}>{c}</Cmd>
          </li>
        ))}
      </ol>
    </div>
  )
}

function ThemeList({
  current,
  run,
}: {
  current: Theme
  run: (c: string) => void
}) {
  return (
    <div className="jsh-themes">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> theme — set with <Cmd run={run}>theme green</Cmd>
        , or <Cmd run={run}>theme next</Cmd> to cycle:
      </p>
      <ul className="jsh-theme-list">
        {THEMES.map((th) => (
          <li key={th} className="jsh-theme-row">
            <span className={`jsh-theme-dot jsh-theme-dot-${th}`} aria-hidden="true" />
            <button type="button" className="jsh-sk-file" onClick={() => run(`theme ${th}`)}>
              {th}
            </button>
            <span className="jsh-theme-note jsh-muted">{THEME_NOTE[th]}</span>
            {th === current && <span className="jsh-theme-cur jsh-faint">← current</span>}
          </li>
        ))}
      </ul>
      <p className="jsh-out jsh-muted jsh-theme-foot">
        your choice is remembered. paper mode is for the recruiters who print things.
      </p>
    </div>
  )
}

function KonamiBlock({ run }: { run: (c: string) => void }) {
  return (
    <div className="jsh-konami">
      <p className="jsh-out jsh-em">↑ ↑ ↓ ↓ ← → ← → B A</p>
      <p className="jsh-out jsh-measure">
        +30 lives granted. spend them wisely. and, since you clearly read the
        manual, have a <Cmd run={run}>coffee</Cmd>.
      </p>
    </div>
  )
}

function CoffeeBlock() {
  return (
    <div className="jsh-coffee">
      <pre className="jsh-coffee-art" aria-hidden="true">
        {[
          "       ) )",
          "      ( (",
          "    .______.",
          "    |      |]",
          "    \\      /",
          "     `----'",
        ].join("\n")}
      </pre>
      <p className="jsh-out jsh-muted">brewed. ☕ black, no sugar.</p>
    </div>
  )
}

function AchievementToast({ a }: { a: Achievement }) {
  const run = useRun()
  return (
    <p className="jsh-out jsh-ach">
      <span className="jsh-ach-mark" aria-hidden="true">
        ✦
      </span>{" "}
      <span className="jsh-ach-label">achievement unlocked</span>{" "}
      <span className="jsh-ach-name">{a.name}</span>{" "}
      <span className="jsh-ach-desc jsh-muted">· {a.desc}</span>{" "}
      <button
        type="button"
        className="jsh-ach-link"
        onClick={() => run("achievements")}
      >
        see all
      </button>
    </p>
  )
}

function AchievementsBlock({ unlocked }: { unlocked: string[] }) {
  const run = useRun()
  const have = new Set(unlocked)
  const got = ACHIEVEMENTS.filter((a) => have.has(a.id)).length
  return (
    <div className="jsh-achs">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> cat ~/.achievements{" "}
        <span className="jsh-faint">
          ({got}/{ACHIEVEMENTS.length})
        </span>
      </p>
      <ul className="jsh-ach-list">
        {ACHIEVEMENTS.map((a) => {
          const done = have.has(a.id)
          return (
            <li
              key={a.id}
              className={`jsh-ach-row ${done ? "jsh-ach-done" : "jsh-ach-locked"}`}
            >
              <span className="jsh-ach-box" aria-hidden="true">
                {done ? "✦" : "·"}
              </span>
              <span className="jsh-ach-name">{done ? a.name : "???"}</span>
              <span className="jsh-ach-desc jsh-muted">
                {done ? a.desc : "locked"}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="jsh-out jsh-muted">
        some unlock by doing, some by trying. there is a <Cmd run={run}>help</Cmd>.
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
        projects:{" "}
        {PROJECTS.map((p, i) => {
          const url = projectUrl(p)
          return (
            <span key={p.name}>
              {i > 0 ? " · " : ""}
              {url ? <Ext href={url}>{p.name}</Ext> : <span>{p.name}</span>}
            </span>
          )
        })}
      </p>
    </div>
  )
}

// `projects` — the things Jess has built, listed like the skills/arcade blocks:
// a name, a one-line note, and a badge. Open-source projects badge their
// language and open their code; others (Sandi) badge "live · private" and open
// their own home. A name with a public home is clickable (dispatches
// `open <name>`); one with neither code nor site is just text.
function ProjectsBlock({ run }: { run: (c: string) => void }) {
  const preview = usePreview()
  return (
    <div className="jsh-projects">
      <p className="jsh-out jsh-muted">
        <span className="jsh-ok">$</span> ls ~/projects/
      </p>
      <p className="jsh-ls-total jsh-muted">
        {PROJECTS.length} projects — the open ones link to code
      </p>
      <ul className="jsh-sk-list">
        {PROJECTS.map((p) => {
          const url = projectUrl(p)
          const cmd = `open ${p.name}`
          const badge = p.lang ?? p.badge
          return (
            <li key={p.name} className="jsh-sk-row">
              {url ? (
                <button
                  type="button"
                  className="jsh-sk-file"
                  onClick={() => run(cmd)}
                  onMouseEnter={() => preview(cmd)}
                  onMouseLeave={() => preview(null)}
                  onFocus={() => preview(cmd)}
                  onBlur={() => preview(null)}
                  title={cmd}
                >
                  {p.name}
                </button>
              ) : (
                <span className="jsh-sk-file jsh-sk-file-static">{p.name}</span>
              )}
              <span className="jsh-sk-desc">
                {p.note}
                {badge && (
                  <span className={p.lang ? "jsh-game-best" : "jsh-proj-live"}>
                    {" "}
                    · {badge}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="jsh-out jsh-muted jsh-ls-hint">
        → click to open. open-source projects open their code on GitHub;{" "}
        <Cmd run={run}>open sandi</Cmd> visits her own place. more at{" "}
        <Cmd run={run}>open github</Cmd>.
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
        open to interesting problems — distributed systems, agent infrastructure,
        anything with a borrow checker.
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
        I build AI agent systems in Rust and TypeScript. Thirteen years shipping
        distributed systems, program-analysis engines, and developer tools — from a
        200k-project dependency-analysis platform to multi-agent orchestration built
        from scratch. I like hard problems with crisp correctness conditions:
        consensus, build caches, dependency graphs, type systems.
      </p>
      <p className="jsh-out jsh-muted">
        currently <span className="jsh-em">@ Attune</span>. previously tech lead{" "}
        <span className="jsh-em">@ FOSSA</span>. read more:{" "}
        <Cmd run={run}>experience</Cmd> · <Cmd run={run}>skills</Cmd> ·{" "}
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
        A personal site that presents as a full-screen shell session — one React
        file, hooks only. No terminal emulator, no framework gymnastics.
      </p>
      <p className="jsh-out jsh-muted">
        Everything here is also reachable by clicking. Start with <Cmd run={run}>ls</Cmd>{" "}
        or <Cmd run={run}>whoami</Cmd>. There is a <Cmd run={run}>theme</Cmd>,{" "}
        <Cmd run={run}>games</Cmd>, a few hidden toys (fortune, cowsay, sl, a{" "}
        <Cmd run={run}>threebody</Cmd> simulation), and a konami code.
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
  return <style>{CSS}</style>
}

// Real HTML comments for the source-divers. JSX {/* */} comments don't survive
// to the DOM, so we inject genuine <!-- --> nodes via an invisible wrapper.
const SOURCE_EGGS = [
  "you found the source. it borrow-checks.",
  "no framework was harmed. one file, hooks only, four themes.",
  "the REPL is real — try the up arrow. the history buffer works.",
  "psst — there are games (type `games`) and toys: fortune, cowsay, sl.",
  "yes, the konami code does something. ↑↑↓↓←→←→ b a. so does `coffee`.",
  "if you're reading this in devtools, you're exactly the kind of person I'd want to work with. say hi: me@jessica.black",
]

function SourceEggs() {
  return (
    <div hidden aria-hidden="true">
      {SOURCE_EGGS.join("\n")}
    </div>
  )
}

const CSS = String.raw`
:root, .jsh-root {
  --jsh-bg: #0c0c0e;
  --jsh-bg-2: #0e0e10;       /* terminal body */
  --jsh-chrome: #0b0b0d;     /* top + status bars */
  --jsh-surface: #111114;    /* pills, frontmatter */
  --jsh-surface-2: #141417;  /* hover surface, kbd */
  --jsh-fg: #e8e6df;
  --jsh-muted: #8a8780;
  --jsh-faint: #5b5953;
  --jsh-rule: #1f1f22;
  --jsh-rule-2: #17171a;
  --jsh-amber: #e0a23a;            /* the one accent */
  --jsh-amber-soft: #b9893a;       /* dimmer accent for secondary marks */
  --jsh-accent-weak: rgba(224, 162, 58, 0.13);
  --jsh-accent-line: rgba(224, 162, 58, 0.40);
  --jsh-scan: rgba(255, 255, 255, 0.025);
  --jsh-scan-blend: overlay;
  --jsh-err: #d98a6a;
}

/* phosphor green — same dark surfaces, different accent */
.jsh-root[data-theme="green"] {
  --jsh-amber: #7dd66e;
  --jsh-amber-soft: #5fa653;
  --jsh-accent-weak: rgba(125, 214, 110, 0.12);
  --jsh-accent-line: rgba(125, 214, 110, 0.38);
  --jsh-err: #d98a6a;
}

/* ink on warm paper — light mode for the people who print things */
.jsh-root[data-theme="paper"] {
  --jsh-bg: #f3f1ea;
  --jsh-bg-2: #efece3;
  --jsh-chrome: #e7e3d7;
  --jsh-surface: #eae6db;
  --jsh-surface-2: #e3ded0;
  --jsh-fg: #1a1813;
  --jsh-muted: #5f5c52;
  --jsh-faint: #938e80;
  --jsh-rule: #d6d1c3;
  --jsh-rule-2: #e0dccf;
  --jsh-amber: #a6610c;
  --jsh-amber-soft: #875510;
  --jsh-accent-weak: rgba(166, 97, 12, 0.10);
  --jsh-accent-line: rgba(166, 97, 12, 0.40);
  --jsh-scan: rgba(0, 0, 0, 0.028);
  --jsh-scan-blend: multiply;
  --jsh-err: #ab4524;
}

/* pride — dark and lavender-accented, with a rainbow wordmark */
.jsh-root[data-theme="pride"] {
  --jsh-bg: #0c0c0e;
  --jsh-bg-2: #100d14;
  --jsh-chrome: #0c0a10;
  --jsh-surface: #15101c;
  --jsh-surface-2: #1b1426;
  --jsh-fg: #ece9f2;
  --jsh-muted: #9991a8;
  --jsh-faint: #635a73;
  --jsh-rule: #251f30;
  --jsh-rule-2: #1c1726;
  --jsh-amber: #cf95ff;
  --jsh-amber-soft: #a07fd6;
  --jsh-accent-weak: rgba(207, 149, 255, 0.13);
  --jsh-accent-line: rgba(207, 149, 255, 0.42);
  --jsh-scan: rgba(255, 255, 255, 0.025);
  --jsh-scan-blend: overlay;
  --jsh-err: #ff8fa3;
}
.jsh-root[data-theme="pride"] .jsh-nf-name,
.jsh-root[data-theme="pride"] .jsh-nf-glyph {
  background: linear-gradient(95deg, #e40303, #ff8c00, #ffed00, #1aa340, #1763ff, #8a1bbd);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* matrix mode — a green takeover with live rain behind the (still-usable)
   terminal. Surfaces go translucent so the rain reads through; text glows. */
.jsh-root[data-matrix="1"] {
  --jsh-bg: #010a01;
  --jsh-bg-2: transparent;
  --jsh-chrome: rgba(2, 14, 4, 0.62);
  --jsh-surface: rgba(10, 34, 12, 0.5);
  --jsh-surface-2: rgba(16, 46, 18, 0.5);
  --jsh-fg: #c6ffc6;
  --jsh-muted: #5fcf6f;
  --jsh-faint: #2f7f3a;
  --jsh-rule: #16451c;
  --jsh-rule-2: #0f3214;
  --jsh-amber: #76ff95;
  --jsh-amber-soft: #46c46a;
  --jsh-accent-weak: rgba(118, 255, 149, 0.14);
  --jsh-accent-line: rgba(118, 255, 149, 0.42);
  --jsh-err: #ff9b9b;
}
.jsh-matrix-rain {
  position: fixed;
  inset: 0;
  z-index: 0;
  opacity: 0.5;
  pointer-events: none;
}
/* lift the terminal above the rain and let it show through the surfaces */
.jsh-root[data-matrix="1"] .jsh-term {
  position: relative;
  z-index: 1;
  background: transparent;
}
.jsh-root[data-matrix="1"] .jsh-scroll { background: transparent; }
.jsh-root[data-matrix="1"] .jsh-scroll,
.jsh-root[data-matrix="1"] .jsh-topbar,
.jsh-root[data-matrix="1"] .jsh-statusbar {
  text-shadow: 0 0 1px #021006, 0 0 7px rgba(118, 255, 149, 0.5);
}
.jsh-root[data-matrix="1"] .jsh-topbar,
.jsh-root[data-matrix="1"] .jsh-statusbar {
  backdrop-filter: blur(1px);
}
.jsh-root[data-reduced="1"] .jsh-matrix-rain { opacity: 0.34; }

.jsh-root {
  height: 100vh;
  height: 100dvh;
  background-color: var(--jsh-bg);
  color: var(--jsh-fg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  font-feature-settings: "kern" 1, "liga" 0, "calt" 0;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  letter-spacing: 0.1px;
}

/* faint scanline texture — atmosphere, not glitz */
.jsh-root::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  background-image: repeating-linear-gradient(
    to bottom,
    var(--jsh-scan) 0px,
    var(--jsh-scan) 1px,
    transparent 1px,
    transparent 3px
  );
  mix-blend-mode: var(--jsh-scan-blend);
  opacity: 0.6;
}

/* ---------------- the terminal: full-bleed, full-height ---------------- */
.jsh-term {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--jsh-bg-2);
}

.jsh-topbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px clamp(14px, 3vw, 30px);
  border-bottom: 1px solid var(--jsh-rule);
  background: var(--jsh-chrome);
  font-size: 11.5px;
  color: var(--jsh-muted);
}
.jsh-dots { display: inline-flex; gap: 6px; }
.jsh-dots i {
  width: 9px; height: 9px;
  border-radius: 50%;
  border: 1px solid var(--jsh-rule);
  display: block;
}
.jsh-dots i:nth-child(1) { border-color: var(--jsh-amber-soft); }
.jsh-topbar-title { color: var(--jsh-faint); letter-spacing: 0.3px; }
.jsh-path { color: var(--jsh-amber-soft); }
.jsh-topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
.jsh-clock { color: var(--jsh-faint); font-size: 11px; min-width: 78px; text-align: right; }
.jsh-tty {
  color: var(--jsh-faint);
  border: 1px solid var(--jsh-rule);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  letter-spacing: 0.5px;
}

.jsh-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px clamp(14px, 3vw, 30px) 22px;
  font-size: 13.5px;
  line-height: 1.62;
  scrollbar-width: thin;
  scrollbar-color: var(--jsh-rule) transparent;
}
.jsh-scroll-inner { max-width: 1180px; }
.jsh-scroll::-webkit-scrollbar { width: 10px; }
.jsh-scroll::-webkit-scrollbar-thumb {
  background: var(--jsh-rule);
  border-radius: 6px;
  border: 3px solid var(--jsh-bg-2);
}
.jsh-scroll::-webkit-scrollbar-track { background: transparent; }

.jsh-statusbar {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--jsh-rule);
  background: var(--jsh-chrome);
  padding: 8px clamp(14px, 3vw, 30px);
  font-size: 11.5px;
  color: var(--jsh-muted);
}
.jsh-hint-key { color: var(--jsh-faint); }
.jsh-hint-skip { color: var(--jsh-amber-soft); }
.jsh-status-nav { display: flex; flex-wrap: wrap; gap: 14px; align-items: baseline; }
.jsh-foot-sep { color: var(--jsh-faint); }

/* boot + echo + blocks */
.jsh-bootline {
  display: flex;
  gap: 8px;
  align-items: baseline;
  color: var(--jsh-muted);
  font-size: 12.5px;
  line-height: 1.5;
}
.jsh-boot-tag {
  flex: none;
  white-space: pre;
  font-variant-numeric: tabular-nums;
}
.jsh-boot-ok { color: var(--jsh-amber); }
.jsh-boot-ts { color: var(--jsh-faint); }
.jsh-boot-label {
  flex: 1;
  min-width: 0;
  color: var(--jsh-muted);
  word-break: break-word;
}
.jsh-boot-info .jsh-boot-label { color: var(--jsh-faint); }
.jsh-ok { color: var(--jsh-amber); }
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
.jsh-block-pad { padding: 4px 0; }
.jsh-out { margin: 3px 0; color: var(--jsh-fg); }
.jsh-muted { color: var(--jsh-muted); }
.jsh-faint { color: var(--jsh-faint); }
.jsh-em { color: var(--jsh-amber); font-weight: 500; }
.jsh-measure { max-width: 68ch; }

/* links + clickable command tokens */
.jsh-link {
  color: var(--jsh-amber);
  text-decoration: none;
  border-bottom: 1px solid var(--jsh-accent-line);
  transition: border-color 140ms ease, background 140ms ease;
  padding: 0 1px;
}
.jsh-link:hover { border-bottom-color: var(--jsh-amber); }
.jsh-link:focus-visible {
  outline: none;
  background: var(--jsh-accent-weak);
  border-bottom-color: var(--jsh-amber);
}

.jsh-cmd {
  font: inherit;
  color: var(--jsh-amber);
  background: transparent;
  border: none;
  border-bottom: 1px dashed var(--jsh-accent-line);
  padding: 0 1px;
  margin: 0 1px;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
}
.jsh-cmd:hover { border-bottom-style: solid; background: var(--jsh-accent-weak); }
.jsh-cmd:focus-visible {
  outline: none;
  background: var(--jsh-accent-weak);
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

/* hover-ghost: a hovered command appears faintly at the prompt, with a ↵ */
.jsh-ghost {
  position: absolute;
  left: 0;
  top: 0;
  display: inline-flex;
  align-items: baseline;
  pointer-events: none;
  white-space: pre;
  max-width: 100%;
}
.jsh-ghost-cmd { color: var(--jsh-faint); }
.jsh-ghost-enter {
  color: var(--jsh-amber-soft);
  margin-left: 10px;
  opacity: 0.75;
}

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

/* ---------------- welcome / neofetch / palette ---------------- */
.jsh-welcome { margin-top: 2px; }
.jsh-neofetch {
  display: flex;
  gap: clamp(18px, 4vw, 44px);
  align-items: flex-start;
  flex-wrap: wrap;
  padding: 2px 0 16px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--jsh-rule);
}
.jsh-nf-logo { display: flex; flex-direction: column; gap: 6px; }
.jsh-nf-name {
  font-size: clamp(30px, 6.4vw, 60px);
  line-height: 0.9;
  letter-spacing: -0.5px;
  font-weight: 700;
  color: var(--jsh-fg);
}
.jsh-nf-glyph { color: var(--jsh-amber); font-size: 14px; letter-spacing: 2px; }
.jsh-nf-table {
  margin: 2px 0 0;
  display: grid;
  gap: 3px 0;
  align-content: start;
  min-width: min(380px, 100%);
}
.jsh-nf-row {
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: 12px;
  align-items: baseline;
}
.jsh-nf-row dt { color: var(--jsh-amber-soft); font-size: 12px; letter-spacing: 0.3px; }
.jsh-nf-row dd { margin: 0; color: var(--jsh-fg); font-size: 13px; }
.jsh-nf-status { display: inline-flex; align-items: baseline; gap: 2px; }
.jsh-nf-links { color: var(--jsh-muted); }
.jsh-count {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  font-variant-numeric: tabular-nums;
}
.jsh-retype { display: inline-flex; align-items: baseline; gap: 2px; }

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
  background: var(--jsh-surface);
  border: 1px solid var(--jsh-rule);
  border-radius: 3px;
  padding: 6px 10px;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease;
}
.jsh-pill:hover { border-color: var(--jsh-amber-soft); background: var(--jsh-surface-2); }
.jsh-pill:focus-visible { outline: none; border-color: var(--jsh-amber); background: var(--jsh-surface-2); }
.jsh-pill-cmd { color: var(--jsh-amber); font-size: 12.5px; }
.jsh-pill-hint { color: var(--jsh-faint); font-size: 10px; letter-spacing: 0.2px; }

/* ---------------- help ---------------- */
.jsh-help { margin-top: 2px; }
.jsh-helpgrid { list-style: none; margin: 6px 0 8px; padding: 0; display: grid; gap: 3px 0; }
.jsh-helpgrid li {
  display: grid;
  grid-template-columns: 96px auto;
  align-items: baseline;
  column-gap: 12px;
}
.jsh-help-arg { color: var(--jsh-muted); margin-left: -8px; }
.jsh-help-desc { color: var(--jsh-muted); }
.jsh-help-foot { margin-top: 8px; }
.jsh-kbd {
  display: inline-block;
  border: 1px solid var(--jsh-rule);
  border-bottom-width: 2px;
  border-radius: 3px;
  padding: 0 5px;
  font-size: 11px;
  color: var(--jsh-fg);
  background: var(--jsh-surface-2);
}

/* ---------------- ls ---------------- */
.jsh-ls { margin-top: 2px; }
.jsh-ls-total { margin: 2px 0 6px; font-size: 12px; }
.jsh-lslist { list-style: none; margin: 0; padding: 0; }
.jsh-lsrow {
  display: grid;
  grid-template-columns: 108px 132px auto;
  align-items: baseline;
  column-gap: 12px;
  padding: 1px 0;
}
.jsh-ls-perm { font-size: 12px; letter-spacing: 0.3px; }
.jsh-ls-name {
  font: inherit;
  color: var(--jsh-amber);
  background: none;
  border: none;
  border-bottom: 1px dashed var(--jsh-accent-line);
  padding: 0;
  cursor: pointer;
  justify-self: start;
}
.jsh-ls-name:hover { border-bottom-style: solid; }
.jsh-ls-name:focus-visible { outline: none; background: var(--jsh-accent-weak); }
.jsh-ls-role { font-size: 12.5px; }
.jsh-ls-hint { margin-top: 7px; }

/* ---------------- skill files ---------------- */
.jsh-sk-list { list-style: none; margin: 6px 0 8px; padding: 0; display: grid; gap: 4px; }
.jsh-sk-row {
  display: grid;
  grid-template-columns: minmax(150px, 210px) 1fr;
  gap: 16px;
  align-items: baseline;
}
.jsh-sk-file {
  font: inherit;
  color: var(--jsh-amber);
  background: none;
  border: none;
  border-bottom: 1px dashed var(--jsh-accent-line);
  padding: 0;
  cursor: pointer;
  justify-self: start;
}
.jsh-sk-file:hover { border-bottom-style: solid; }
.jsh-sk-file:focus-visible { outline: none; background: var(--jsh-accent-weak); }
.jsh-sk-desc { color: var(--jsh-muted); font-size: 12.5px; }
.jsh-game-best { color: var(--jsh-amber-soft); font-variant-numeric: tabular-nums; }
/* a non-language project badge (e.g. sandi's "live · private") — full accent so
   it reads a touch brighter than the dim language badges. */
.jsh-proj-live { color: var(--jsh-amber); }
/* a project name with no public home: shown, but not a link. */
.jsh-sk-file-static { color: var(--jsh-fg); border-bottom: none; cursor: default; }

/* man pages */
.jsh-man { margin: 4px 0; font-size: 13px; }
.jsh-man-head {
  display: flex;
  justify-content: space-between;
  color: var(--jsh-faint);
  font-size: 11.5px;
  margin-bottom: 8px;
}
.jsh-man-sec {
  color: var(--jsh-amber);
  font-weight: 700;
  letter-spacing: 0.5px;
  margin: 10px 0 2px;
}
.jsh-man-body { margin: 0 0 2px; padding-left: 22px; color: var(--jsh-muted); }

.jsh-skillfile { margin-top: 2px; }
.jsh-fm {
  border-left: 2px solid var(--jsh-amber);
  background: var(--jsh-chrome);
  border-radius: 0 3px 3px 0;
  padding: 8px 12px;
  margin: 6px 0;
  font-size: 12.5px;
}
.jsh-fm p { margin: 1px 0; }
.jsh-fm-rule { color: var(--jsh-faint); }
.jsh-fm-k { color: var(--jsh-amber-soft); }
.jsh-fm-v { color: var(--jsh-fg); }
.jsh-skillfile-body { margin-top: 8px; }

/* ---------------- resume ---------------- */
.jsh-resume { margin-top: 2px; }
.jsh-resume-head { display: flex; flex-direction: column; gap: 1px; margin: 6px 0 10px; }
.jsh-resume-name { font-size: 15px; font-weight: 600; }
.jsh-resume-h {
  margin: 14px 0 4px;
  color: var(--jsh-amber-soft);
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--jsh-rule);
  padding-bottom: 3px;
}
.jsh-resume-job { margin: 7px 0; }
.jsh-resume-jobhead { font-size: 13px; }
.jsh-resume-dates { margin-left: 6px; white-space: nowrap; }
.jsh-resume-bullets { list-style: none; margin: 4px 0 0; padding: 0; display: grid; gap: 4px; }
.jsh-resume-bullets li {
  display: grid;
  grid-template-columns: 16px 1fr;
  align-items: baseline;
  font-size: 12.8px;
  line-height: 1.55;
}
.jsh-resume-bullets li > span:last-child { max-width: 72ch; }
.jsh-resume-foot { margin-top: 10px; }

/* ---------------- tree ---------------- */
.jsh-tree { margin-top: 2px; }
.jsh-tree-root { margin: 4px 0 2px; color: var(--jsh-fg); }
.jsh-tree-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.jsh-tree-row {
  display: grid;
  grid-template-columns: minmax(0, max-content) 1fr;
  gap: 18px;
  align-items: baseline;
}
.jsh-tree-branch { color: var(--jsh-faint); white-space: pre; }
.jsh-tree-name {
  font: inherit;
  color: var(--jsh-amber);
  background: none;
  border: none;
  border-bottom: 1px dashed var(--jsh-accent-line);
  padding: 0;
  cursor: pointer;
}
.jsh-tree-name:hover { border-bottom-style: solid; }
.jsh-tree-name:focus-visible { outline: none; background: var(--jsh-accent-weak); }
.jsh-tree-name-static { color: var(--jsh-fg); border: none; cursor: default; }
.jsh-tree-meta { font-size: 12px; }

/* ---------------- history / themes / konami / coffee ---------------- */
.jsh-hist-list { margin: 6px 0 4px; padding: 0 0 0 0; list-style: none; display: grid; gap: 2px; }
.jsh-hist-list li { display: flex; gap: 12px; align-items: baseline; }
.jsh-hist-n { min-width: 22px; text-align: right; font-size: 12px; }

.jsh-theme-list { list-style: none; margin: 6px 0 6px; padding: 0; display: grid; gap: 5px; }
.jsh-theme-row { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.jsh-theme-dot {
  width: 10px; height: 10px; border-radius: 2px;
  align-self: center;
  border: 1px solid var(--jsh-rule);
}
.jsh-theme-dot-amber { background: #e0a23a; }
.jsh-theme-dot-green { background: #7dd66e; }
.jsh-theme-dot-paper { background: #efece3; }
.jsh-theme-dot-pride {
  background: linear-gradient(95deg, #e40303, #ff8c00, #ffed00, #1aa340, #1763ff, #8a1bbd);
}
.jsh-theme-note { font-size: 12.5px; }
.jsh-theme-cur { font-size: 11px; }
.jsh-theme-foot { margin-top: 8px; }

/* achievements */
.jsh-ach { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 8px; }
.jsh-ach-mark { color: var(--jsh-amber); }
.jsh-ach-label {
  color: var(--jsh-faint);
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.jsh-ach-name { color: var(--jsh-amber); font-weight: 600; }
.jsh-ach-link {
  font: inherit;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--jsh-faint);
  border-bottom: 1px dashed var(--jsh-accent-line);
  padding: 0;
}
.jsh-ach-link:hover { border-bottom-style: solid; }
.jsh-ach-link:focus-visible { outline: none; background: var(--jsh-accent-weak); }
.jsh-ach-list { list-style: none; margin: 6px 0 8px; padding: 0; display: grid; gap: 3px; }
.jsh-ach-row {
  display: grid;
  grid-template-columns: 18px minmax(120px, max-content) 1fr;
  gap: 12px;
  align-items: baseline;
}
.jsh-ach-box { color: var(--jsh-amber-soft); }
.jsh-ach-desc { font-size: 12.5px; }
.jsh-ach-locked .jsh-ach-name,
.jsh-ach-locked .jsh-ach-box { color: var(--jsh-faint); }
.jsh-ach-done .jsh-ach-name { color: var(--jsh-amber); }

/* games */
.jsh-game {
  border: 1px solid var(--jsh-rule);
  border-radius: 4px;
  background: var(--jsh-bg-2);
  margin: 6px 0;
  outline: none;
  max-width: 540px;
}
.jsh-game:focus-visible { border-color: var(--jsh-amber-soft); }
.jsh-game-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--jsh-rule);
  background: var(--jsh-chrome);
  font-size: 12px;
}
.jsh-game-title { color: var(--jsh-amber); }
.jsh-game-status { color: var(--jsh-muted); }
.jsh-game-status b { color: var(--jsh-fg); font-weight: 600; }
.jsh-game-quit {
  margin-left: auto;
  font: inherit;
  font-size: 11px;
  color: var(--jsh-faint);
  background: none;
  border: 1px solid var(--jsh-rule);
  border-radius: 3px;
  padding: 1px 8px;
  cursor: pointer;
}
.jsh-game-quit:hover { color: var(--jsh-fg); border-color: var(--jsh-amber-soft); }
.jsh-game-body { padding: 10px; display: flex; justify-content: center; }
.jsh-game-canvas {
  display: block;
  max-width: 100%;
  height: auto;
  image-rendering: pixelated;
  border: 1px solid var(--jsh-rule-2);
}
.jsh-game-hint {
  padding: 6px 10px;
  border-top: 1px solid var(--jsh-rule);
  font-size: 11.5px;
  color: var(--jsh-muted);
}
.jsh-game-hint b { color: var(--jsh-amber-soft); font-weight: 600; }

/* fullscreen game overlay — a game takes over the whole shell */
.jsh-game-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(6px, 1.4vh, 18px);
  background: var(--jsh-bg);
  background-image: radial-gradient(circle at 50% 32%, var(--jsh-bg-2), var(--jsh-bg) 72%);
  animation: jsh-overlay-in 160ms ease;
}
@keyframes jsh-overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes jsh-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}
.jsh-game-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: 100%;
}
.jsh-game-overlay .jsh-game {
  margin: 0;
  max-width: 98vw;
  box-shadow: 0 12px 60px rgba(0, 0, 0, 0.45);
}
/* games open near-fullscreen — only a little inset from the screen edges */
.jsh-game-overlay .jsh-game-canvas {
  width: auto;
  height: min(74vh, 820px);
  max-width: 93vw;
}
/* the three-body sim sizes its own backing store (DPR-aware) and wants smooth
   scaling, not the pixel-art nearest-neighbor the arcade games use */
.jsh-game-overlay .jsh-game-canvas.jsh-sim-canvas {
  width: min(93vw, 1340px);
  height: min(78vh, 1000px);
  max-width: 93vw;
  image-rendering: auto;
}
.jsh-threebody-stage {
  position: relative;
  line-height: 0;
}
.jsh-threebody-stage .jsh-sim-canvas {
  display: block;
}
.jsh-threebody-alert {
  position: absolute;
  left: 50%;
  bottom: 18px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: min(320px, calc(100% - 36px));
  padding: 8px 12px;
  transform: translateX(-50%);
  background: color-mix(in srgb, var(--jsh-bg) 88%, transparent);
  border: 1px solid var(--jsh-amber-soft);
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
  color: var(--jsh-amber);
  line-height: 1.3;
  text-align: center;
  pointer-events: none;
}
.jsh-threebody-alert span {
  font-size: 12px;
}
.jsh-threebody-alert small {
  color: var(--jsh-muted);
  font-size: 11px;
}
.jsh-threebody-end {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  background: color-mix(in srgb, var(--jsh-bg) 82%, transparent);
  border: 1px solid var(--jsh-rule-2);
  color: var(--jsh-muted);
  text-align: center;
  line-height: 1.4;
  pointer-events: auto;
}
.jsh-threebody-end p {
  max-width: min(420px, 82%);
  margin: 0;
}
.jsh-threebody-end-title {
  color: var(--jsh-amber);
  font-size: 13px;
  letter-spacing: 0.04em;
}
.jsh-threebody-run {
  margin-top: 4px;
  font: inherit;
  color: var(--jsh-bg);
  background: var(--jsh-amber);
  border: 1px solid var(--jsh-amber-soft);
  border-radius: 3px;
  padding: 5px 14px;
  cursor: pointer;
}
.jsh-threebody-run:hover,
.jsh-threebody-run:focus-visible {
  background: var(--jsh-fg);
  outline: none;
}
.jsh-game-overlay .jsh-game-body { padding: clamp(10px, 2.2vh, 24px); }
.jsh-game-exit-note {
  margin: 0;
  font-size: 12.5px;
  color: var(--jsh-muted);
  letter-spacing: 0.3px;
}
.jsh-game-exit-note b {
  color: var(--jsh-fg);
  font-weight: 600;
  border: 1px solid var(--jsh-rule);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 1px 7px;
  margin: 0 3px;
}
.jsh-root[data-reduced="1"] .jsh-game-overlay { animation: none; }

/* terminal toys */
.jsh-toy {
  color: var(--jsh-amber-soft);
  font-size: 12px;
  line-height: 1.3;
  margin: 4px 0;
  white-space: pre;
  overflow-x: auto;
}
.jsh-sl {
  position: relative;
  overflow: hidden;
  height: 9.6em;
  margin: 4px 0;
}
.jsh-sl-train {
  position: absolute;
  top: 0;
  margin: 0;
  color: var(--jsh-amber-soft);
  font-size: 11px;
  line-height: 1.18;
  white-space: pre;
  animation: jsh-sl-run 3.4s linear forwards;
}
@keyframes jsh-sl-run {
  from { left: 100%; }
  to { left: -64ch; }
}
@media (prefers-reduced-motion: reduce) {
  .jsh-sl-train { animation: none; left: 0; }
}

.jsh-coffee-art {
  color: var(--jsh-amber-soft);
  font-size: 12px;
  line-height: 1.35;
  margin: 4px 0 6px;
  white-space: pre;
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
  background: var(--jsh-surface);
}
.jsh-job:focus-visible { border-color: var(--jsh-amber-soft); }
.jsh-job-head {
  display: grid;
  grid-template-columns: 64px 10px 1fr auto;
  align-items: baseline;
  column-gap: 10px;
}
.jsh-job-year { color: var(--jsh-amber-soft); font-weight: 600; }
.jsh-job-bar { width: 1px; align-self: stretch; background: var(--jsh-rule); justify-self: center; }
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
.jsh-job-bullets li > span:last-child { max-width: 70ch; }
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
.jsh-job-hover { display: block; margin-top: 8px; font-size: 10.5px; letter-spacing: 0.4px; opacity: 0.7; }
.jsh-job:hover .jsh-job-hover,
.jsh-job:focus-within .jsh-job-hover,
.jsh-job-open .jsh-job-hover { display: none; }

/* ---------------- writing / contact ---------------- */
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

.jsh-err { color: var(--jsh-err); }
.jsh-err-mark { color: var(--jsh-err); margin-right: 8px; }
.jsh-readme-fine { margin-top: 8px; font-size: 11.5px; opacity: 0.8; }

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

/* ---------------- responsive ---------------- */
@media (max-width: 560px) {
  .jsh-lsrow {
    grid-template-columns: auto;
    grid-template-areas: "name" "role";
    row-gap: 0;
  }
  .jsh-ls-perm { display: none; }
  .jsh-ls-name { grid-area: name; }
  .jsh-ls-role { grid-area: role; }
  .jsh-helpgrid li { grid-template-columns: 84px auto; }
  .jsh-job-head { grid-template-columns: 60px 1fr; row-gap: 2px; }
  .jsh-job-bar { display: none; }
  .jsh-job-dates { grid-column: 2; }
  .jsh-sk-row { grid-template-columns: 1fr; gap: 0; }
  .jsh-nf-table { min-width: 0; }
  .jsh-clock { display: none; }
  .jsh-tree-row { gap: 10px; }
}

/* ================= MOTION ================= */
.jsh-reveal {
  opacity: 0;
  transform: translateY(6px);
  animation: jsh-rise 480ms cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
  animation-delay: var(--jsh-d, 0ms);
}
@keyframes jsh-rise { to { opacity: 1; transform: translateY(0); } }
.jsh-row-in { animation: jsh-rowin 220ms ease both; }
@keyframes jsh-rowin {
  from { opacity: 0; transform: translateY(3px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ================= REDUCED MOTION ================= */
@media (prefers-reduced-motion: reduce) {
  .jsh-reveal, .jsh-row-in {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .jsh-cursor { animation: none !important; }
  .jsh-job-detail { transition: none !important; }
  .jsh-link, .jsh-cmd, .jsh-pill { transition: none !important; }
}
.jsh-root[data-reduced="1"] .jsh-reveal,
.jsh-root[data-reduced="1"] .jsh-row-in {
  animation: none !important;
  opacity: 1 !important;
  transform: none !important;
}
.jsh-root[data-reduced="1"] .jsh-cursor { animation: none !important; }
`
