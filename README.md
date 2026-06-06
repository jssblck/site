# jessica.black

My personal site. It presents as a live shell session: it boots, settles, then
takes commands. Type `help` — or just click around, since everything is reachable
both ways.

It's deliberately low-tech. One React component, hooks only — no terminal-emulator
library, no CSS framework. Amber phosphor on near-black; no glow, no gradients.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Stack

- [Next.js](https://nextjs.org) (App Router) + [TypeScript](https://www.typescriptlang.org)
- React hooks for the REPL; component styles are inline — no framework
- Fonts: IBM Plex Mono (body) + Martian Mono (display), via `next/font`
- [Vercel Analytics](https://vercel.com/analytics)

<!-- yes, the history buffer works. try the up arrow. -->
