# jessica.black

My personal site: one page, no client JavaScript beyond analytics. Content lives
in `app/content.ts`; layout in `app/page.tsx`; styles in `styles/globals.css`.
Talk decks are static HTML under `public/talks/`.

## Develop

Run from this directory:

```bash
npm install
npm run dev      # http://localhost:3000
npm run check    # oxlint + React Doctor + TypeScript
npm run build
```

The repo pre-commit hook (`../.githooks/pre-commit`) runs `npm run check` here.

## Stack

- [Next.js](https://nextjs.org) (App Router) + [TypeScript](https://www.typescriptlang.org)
- IBM Plex Mono via `next/font`
- [Vercel Analytics](https://vercel.com/analytics)
