# site

Two sites, one per directory:

- `jessica.black/`: the main site, a Next.js app deployed on Vercel. See its
  README for the dev loop.
- `jssblck.now/`: a static one-page subset (intro and agentic projects) hosted
  on here.now. Edit `index.html`, then run `./publish.sh`.

Root-level config (`.github/`, `.bastion.yaml`, `.githooks/`) applies to the
whole repo. Content changes to either site go through the prose gate.
