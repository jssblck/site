# jessica.black

My personal site. It behaves like a live shell session: it boots, settles, then
takes commands. `help` works; clicking works too.

It's deliberately low-tech: one React component, no terminal-emulator library,
no CSS framework. Amber phosphor on near-black, no glow, no gradients.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run check    # oxlint + React Doctor + TypeScript
```

## Build

```bash
npm run build
npm start
```

## Commit gate

This checkout uses `.githooks/pre-commit` as its Git hooks path. The pre-commit
hook runs `npm run check` and blocks commits until oxlint, React Doctor, and
TypeScript all pass.

## Stack

- [Next.js](https://nextjs.org) (App Router) + [TypeScript](https://www.typescriptlang.org)
- React hooks for the REPL; component styles are inline, no framework
- Fonts: IBM Plex Mono (body) + Martian Mono (display), via `next/font`
- [Vercel Analytics](https://vercel.com/analytics)
