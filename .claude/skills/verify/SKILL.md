---
name: verify
description: Build, launch, and drive this site to verify a change end to end. Use whenever a change to the shell (app/shell.tsx), the games, or public/ assets needs runtime confirmation, not just typecheck.
---

# Verifying changes to jessica.black

The whole site is one client component (`app/shell.tsx`) that renders a fake
terminal. Verifying a change means running commands in that terminal and
reading the transcript, plus loading any static assets under `public/`
directly.

## Launch

```bash
npm run dev -- --port 3457 > /tmp/site-dev.log 2>&1 &
# ready in under a second; confirm with:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3457/
```

`npm run check` covers lint (oxlint), react-doctor, and tsc. That is CI, not
verification; run the app too.

## Drive the shell

Open `localhost:3457` in the preview browser. The boot reel takes about two
to three seconds before the prompt input exists; wait for
`document.querySelector("input")` to be non-null.

Gotchas that cost time on the first pass:

- `preview_type` and `preview_press` returned malformed MCP results against
  this page. Drive the prompt through `preview_evaluate` instead. React
  controlled inputs ignore plain `.value =`, so use the native setter and
  dispatch both events:

```js
const run = (cmd) => {
  const i = document.querySelector("input")
  i.focus()
  const set = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, "value").set
  set.call(i, cmd)
  i.dispatchEvent(new Event("input", { bubbles: true }))
  i.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
  return new Promise((r) => setTimeout(r, 150))
}
```

- Output lands asynchronously; read `document.body.innerText` after a short
  delay rather than in the same evaluate call.
- `open <target>` calls `window.open(url, "_blank", "noreferrer,noopener")`.
  To assert the URL without leaving the page, stub it first:
  `window.__opened = []; window.open = (u, t, f) => { window.__opened.push({u, t, f}); return null }`.

## Flows worth driving

- The command under test, plus its aliases (the dispatch switch in
  `shell.tsx` maps several verbs to one handler).
- `help`, `man <cmd>`, and `tree ~` when adding a command or a home
  directory entry; they render from the same data and should all show it.
- `cat <name>` with and without the file extension (the flat index resolves
  both).
- Static decks and assets: fetch `/talks/<name>.html` for a 200, then load
  it and confirm keyboard navigation (ArrowRight advances `#cur`).
- An unknown argument to the changed command, to see the error path.
