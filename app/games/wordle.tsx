"use client"

/*
  wordle — six guesses at a five-letter word. Type a word and press Enter.
  Monochrome feedback, in keeping with the shell: a filled tile is the right
  letter in the right spot, an outlined tile is the right letter in the wrong
  spot, a dim tile is absent. On-screen keyboard tracks what you've learned and
  is clickable. Win streak persists.
*/

import { useCallback, useEffect, useRef, useState } from "react"
import { GameFrame } from "./_frame"

// Common five-letter words — the answer pool and the accepted-guess dictionary.
const WORDS =
  "about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alike alive allow alone along alter among anger angle angry apart apple apply arena argue arise array aside asset audio audit avoid award aware badly baker bases basic beach began begin begun being below bench billy birth black blame blank blast blind block blood board boost booth bound brain brand brave bread break breed brief bring broad broke brown build built buyer cable carry catch cause chain chair chaos charm chart chase cheap check chest chief child china chose civil claim class clean clear click climb clock close cloud coach coast could count court cover crack craft crash crazy cream crime cross crowd crown crude curve cycle daily dance dated dealt death debut delay depth doing doubt dozen draft drama drank dream dress drill drink drive drove dying eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fault favor fence fewer fiber field fifth fifty fight final first fixed flame flash fleet floor fluid focus force forth forty forum found frame frank fraud fresh front fruit fully funny giant given glass globe glory grace grade grain grand grant grass grave great green greet gross group grown guard guess guest guide happy harsh heart heavy hello hence horse hotel house human ideal image index inner input issue joint judge known label large laser later laugh layer learn lease least leave legal level light limit linen links lived liver loads logic loose lover lower lucky lunch lying magic major maker march match maybe mayor meant medal media metal might minor minus mixed model money month moral motor mount mouse mouth movie music needs nerve never newly night noble noise north noted novel nurse occur ocean offer often order other ought paint panel paper party peace phase phone photo piano piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize probe proof proud prove queen quick quiet quite radio raise range rapid ratio reach ready realm rebel refer relax reply rider ridge right rigid risky river rival roman rough round route royal rural scale scene scope score sense serve seven shade shall shape share sharp sheet shelf shell shift shine shirt shock shoot shore short shown sight silly since sixth sixty sized skill sleep slide small smart smile smoke solid solve sorry sound south space spare speak speed spend spent spice spite split spoke sport staff stage stair stake stand stark start state steam steel steep steer stick still stock stone stood store storm story strip stuck study stuff style sugar suite super sweet table taken taste taxes teach teeth terms theft their theme there these thick thing think third those three threw throw thumb tiger tight timer title today token topic total touch tower trace track trade trail train treat trend trial tribe trick tried tries truck truly trust truth twice twist tying ultra uncle under undue union unite unity until upper upset urban usage usual valid value video virus visit vital vocal voice waste watch water wheel where which while white whole whose woman world worry worse worst worth would wound write wrong wrote yield young youth"
    .split(" ")

type Cell = "correct" | "present" | "absent" | "empty"
type RowView = { id: string; letters: string[]; states: Cell[] }

function score(guess: string, answer: string): Cell[] {
  const res: Cell[] = ["absent", "absent", "absent", "absent", "absent"]
  const counts: Record<string, number> = {}
  for (const ch of answer) counts[ch] = (counts[ch] || 0) + 1
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      res[i] = "correct"
      counts[guess[i]]--
    }
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] === "correct") continue
    if (counts[guess[i]] > 0) {
      res[i] = "present"
      counts[guess[i]]--
    }
  }
  return res
}

const tileStyle = (state: Cell, filled: boolean): React.CSSProperties => {
  const base: React.CSSProperties = {
    width: 52,
    height: 52,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    fontWeight: 700,
    textTransform: "uppercase",
    borderRadius: 4,
    transition: "background 120ms ease, border-color 120ms ease, color 120ms ease",
  }
  if (state === "correct")
    return { ...base, background: "var(--jsh-amber)", color: "var(--jsh-bg)", border: "1px solid var(--jsh-amber)" }
  if (state === "present")
    return { ...base, background: "transparent", color: "var(--jsh-amber)", border: "2px solid var(--jsh-amber)" }
  if (state === "absent")
    return { ...base, background: "var(--jsh-surface)", color: "var(--jsh-muted)", border: "1px solid var(--jsh-rule)" }
  return {
    ...base,
    background: "transparent",
    color: "var(--jsh-fg)",
    border: `1px solid ${filled ? "var(--jsh-amber-soft)" : "var(--jsh-rule)"}`,
  }
}

const keyStyle = (state: Cell | undefined): React.CSSProperties => {
  const base: React.CSSProperties = {
    minWidth: 30,
    height: 42,
    padding: "0 8px",
    font: "inherit",
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase",
    borderRadius: 4,
    cursor: "pointer",
    border: "1px solid var(--jsh-rule)",
    background: "var(--jsh-surface-2)",
    color: "var(--jsh-fg)",
  }
  if (state === "correct")
    return { ...base, background: "var(--jsh-amber)", color: "var(--jsh-bg)", borderColor: "var(--jsh-amber)" }
  if (state === "present")
    return { ...base, background: "transparent", color: "var(--jsh-amber)", borderColor: "var(--jsh-amber)" }
  if (state === "absent")
    return { ...base, background: "var(--jsh-bg-2)", color: "var(--jsh-faint)", borderColor: "var(--jsh-rule-2)" }
  return base
}

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]
const CELL_KEYS = ["one", "two", "three", "four", "five"] as const
const rank: Record<Cell, number> = { empty: 0, absent: 1, present: 2, correct: 3 }

export default function Wordle() {
  const [answer, setAnswer] = useState("")
  const [guesses, setGuesses] = useState<string[]>([])
  const [current, setCurrent] = useState("")
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing")
  const [msg, setMsg] = useState("")
  const [shake, setShake] = useState(false)
  const [streak, setStreak] = useState(0)
  const [best, setBest] = useState(0)
  const bestRef = useRef(0)
  const streakRef = useRef(0)

  const newGame = useCallback(() => {
    setAnswer(WORDS[Math.floor(Math.random() * WORDS.length)])
    setGuesses([])
    setCurrent("")
    setStatus("playing")
    setMsg("")
  }, [])

  useEffect(() => {
    try {
      streakRef.current = Number(localStorage.getItem("jsh-wordle-streak") || "0")
      bestRef.current = Number(localStorage.getItem("jsh-wordle-best") || "0")
      setStreak(streakRef.current)
      setBest(bestRef.current)
    } catch {
      /* ignore */
    }
    newGame()
  }, [newGame])

  // live letter knowledge for the on-screen keyboard
  const letterState: Record<string, Cell> = {}
  for (const g of guesses) {
    const sc = score(g, answer)
    for (let i = 0; i < 5; i++) {
      const ch = g[i]
      if (rank[sc[i]] > rank[letterState[ch] ?? "empty"]) letterState[ch] = sc[i]
    }
  }

  const flash = (m: string) => {
    setMsg(m)
    setShake(true)
    window.setTimeout(() => setShake(false), 360)
  }

  const submit = useCallback(
    (g: string) => {
      if (g.length !== 5) return flash("five letters")
      if (!WORDS.includes(g)) return flash("not in word list")
      const next = [...guesses, g]
      setGuesses(next)
      setCurrent("")
      setMsg("")
      if (g === answer) {
        setStatus("won")
        const ns = streakRef.current + 1
        streakRef.current = ns
        setStreak(ns)
        if (ns > bestRef.current) {
          bestRef.current = ns
          setBest(ns)
        }
        try {
          localStorage.setItem("jsh-wordle-streak", String(ns))
          localStorage.setItem("jsh-wordle-best", String(bestRef.current))
        } catch {
          /* ignore */
        }
        setMsg(`solved in ${next.length} · enter to play again`)
      } else if (next.length >= 6) {
        setStatus("lost")
        streakRef.current = 0
        setStreak(0)
        try {
          localStorage.setItem("jsh-wordle-streak", "0")
        } catch {
          /* ignore */
        }
        setMsg(`it was ${answer.toUpperCase()} · enter to retry`)
      }
    },
    [guesses, answer],
  )

  const handle = useCallback(
    (key: string) => {
      if (status !== "playing") {
        if (key === "enter") newGame()
        return
      }
      if (key === "enter") submit(current)
      else if (key === "back") setCurrent((c) => c.slice(0, -1))
      else if (/^[a-z]$/.test(key)) setCurrent((c) => (c.length < 5 ? c + key : c))
    },
    [status, current, submit, newGame],
  )

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key
    if (k === "Enter") {
      e.preventDefault()
      handle("enter")
    } else if (k === "Backspace") {
      e.preventDefault()
      handle("back")
    } else if (/^[a-zA-Z]$/.test(k)) {
      e.preventDefault()
      handle(k.toLowerCase())
    }
  }

  // build the 6 rows for display
  const rowsView: RowView[] = []
  for (let r = 0; r < 6; r++) {
    if (r < guesses.length) {
      rowsView.push({ id: `guess:${r}:${guesses[r]}`, letters: guesses[r].split(""), states: score(guesses[r], answer) })
    } else if (r === guesses.length && status === "playing") {
      const letters = current.padEnd(5).split("")
      rowsView.push({ id: `current:${r}`, letters, states: Array.from({ length: 5 }, () => "empty") })
    } else {
      rowsView.push({
        id: `empty:${r}`,
        letters: Array.from({ length: 5 }, () => ""),
        states: Array.from({ length: 5 }, () => "empty"),
      })
    }
  }

  return (
    <GameFrame
      title="wordle"
      status={`streak ${streak} · best ${best}`}
      hint="type a word · enter submit · ⌫ delete · esc quit"
      onKey={onKey}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          padding: "4px 0",
        }}
      >
        <div
          style={{ display: "grid", gap: 6, animation: shake ? "jsh-shake 0.36s" : undefined }}
        >
          {rowsView.map((row) => (
            <div key={row.id} style={{ display: "grid", gridTemplateColumns: "repeat(5, 52px)", gap: 6 }}>
              {row.letters.map((ch, i) => (
                <div key={`${row.id}:${CELL_KEYS[i]}`} style={tileStyle(row.states[i], !!ch.trim())}>
                  {ch.trim()}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ minHeight: 16, fontSize: 12.5, color: "var(--jsh-muted)" }}>{msg}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          {ROWS.map((rowKeys, r) => (
            <div key={r} style={{ display: "flex", gap: 5 }}>
              {r === 2 && (
                <button
                  type="button"
                  style={keyStyle(undefined)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handle("enter")}
                >
                  enter
                </button>
              )}
              {rowKeys.split("").map((ch) => (
                <button
                  key={ch}
                  type="button"
                  style={keyStyle(letterState[ch])}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handle(ch)}
                >
                  {ch}
                </button>
              ))}
              {r === 2 && (
                <button
                  type="button"
                  style={keyStyle(undefined)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handle("back")}
                >
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </GameFrame>
  )
}
