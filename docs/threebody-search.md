# Threebody Seed Search

The visible `threebody` toy stays pure Newtonian: pairwise gravity, velocity-Verlet integration, and numerical softening for close passes. The search tooling does not change the physics. It only looks for initial conditions that keep the Newtonian system visually interesting for longer.

Run a bounded local search:

```powershell
npm run threebody:search -- --candidates 250 --frames 12000
```

Run the aggressive overnight search:

```powershell
npm run threebody:overnight
```

Run a long resumable search:

```powershell
npm run threebody:search -- --candidates 0 --seconds 21600 --frames 100000 --top 100 --checkpoint .codex/threebody-search/custom-long-run.jsonl
```

Verify the current catalog:

```powershell
npm run threebody:verify -- --frames 12000
```

Raw search records are appended to the checkpoint path for that run. The default checkpoint is `.codex/threebody-search/results-v2.jsonl`; the overnight command uses `.codex/threebody-search/overnight.jsonl`.

Each search rewrites two catalog files:

- `app/games/threebody-catalog.json` is the inspectable report with scoring metrics.
- `app/games/threebody-catalog.ts` is the typed module imported by the game.

## Time Scale

One search frame is one visual frame at the old full simulation rate: `BASE_SUBSTEPS` Verlet steps. With the current constants, that is:

```text
14 substeps * 0.0016 dt = 0.0224 sim-time units per search frame
```

The visible game now starts at 1x, which is the old 0.25x. At 60 FPS, approximate visible durations are:

```text
12,000 search frames ~= 12 minutes at visible 1x
24,000 search frames ~= 23 minutes at visible 1x
100,000 search frames ~= 97 minutes at visible 1x
```

The overnight command scores each candidate for up to 100,000 search frames and keeps the top 100.

## Scoring

Candidates score higher when they spend more simulated frames in an interesting bound dance:

- Bodies on long outbound arcs are rewarded if they remain bound or later return.
- Persistent positive-energy outward motion counts as escape and ends the dance window.
- Broad, varied star motion scores higher than compact or low-area motion.
- Stable-binary detection is deliberately soft. It can end a run after a long persistence window, but the scorer does not aggressively reject every temporary hierarchy.
- Planet close passes add a small bonus because the planet is more fun when it participates in the dance.

Mass triples are sampled around the original trisolaris masses and normalized to the same total mass. That keeps the search focused on stability and geometry rather than simply slowing the whole system by reducing mass.
