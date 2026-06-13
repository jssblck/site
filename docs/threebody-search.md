# Threebody Seed Search

The visible `threebody` toy stays pure Newtonian: pairwise gravity, velocity-Verlet integration, and numerical softening for close passes. The search tooling does not change the physics. It only looks for initial conditions that keep the Newtonian system visually interesting for longer.

Run a bounded local search:

```powershell
npm run threebody:search -- --candidates 250 --frames 12000 --workers auto
```

Run the aggressive overnight search:

```powershell
npm run threebody:overnight
```

Promote reviewed overnight winners into the game:

```powershell
npm run threebody:promote
```

Run a long resumable search:

```powershell
npm run threebody:search -- --candidates 0 --seconds 21600 --frames 100000 --top 80 --workers auto --checkpoint .codex/threebody-search/custom-long-run.jsonl
```

Verify the current catalog:

```powershell
npm run threebody:verify -- --frames 12000
```

Raw search records are appended to the checkpoint path for that run. The default checkpoint is `.codex/threebody-search/results-v5.jsonl`; the overnight command uses `.codex/threebody-search/overnight-v5.jsonl`.

By default, `threebody:search` rewrites two app catalog files:

- `app/games/threebody-catalog.json` is the inspectable report with scoring metrics.
- `app/games/threebody-catalog.ts` is the typed module imported by the game.

The overnight command stages those files as `.codex/threebody-search/overnight-v5-catalog.json` and `.codex/threebody-search/overnight-v5-catalog.ts`. Review that staged output first, then run `npm run threebody:promote` to regenerate the app catalog from the overnight checkpoint.

## Time Scale

One search frame is one visual frame at the old full simulation rate: `BASE_SUBSTEPS` Verlet steps. With the current constants, that is:

```text
14 substeps * 0.0016 dt = 0.0224 sim-time units per search frame
```

The visible speed ladder is intentionally slower than the search cadence. At 60 FPS, the game advances about 1, 2, or 4 Verlet steps per rendered frame for visible 1x, 2x, and 4x. Visible 4x is the previous 1x. Approximate visible durations are:

```text
12,000 search frames  ~= 47 minutes at 1x, 23 minutes at 2x, 12 minutes at 4x
24,000 search frames  ~= 93 minutes at 1x, 47 minutes at 2x, 23 minutes at 4x
100,000 search frames ~= 6.5 hours at 1x, 3.2 hours at 2x, 97 minutes at 4x
```

The overnight command scores each candidate for up to 100,000 search frames and keeps the top 80.

## Scoring

Candidates score higher when they spend more simulated frames in an interesting bound dance:

- Bodies on long outbound arcs are rewarded if they remain bound or later return.
- Persistent positive-energy outward motion counts as escape and ends the dance window.
- Planet escape is penalized more strongly than star escape, including late escape after a long pretty opening.
- Broad, varied star motion scores higher than compact or low-area motion.
- Democratic three-star motion scores higher than a persistent central binary with the third star orbiting outside it.
- The planet scores higher when it changes nearest host star, has close encounters with all three stars, and does not spend the whole run dominated by one host.
- A long-lived same-pair hierarchy can end the scoring window as `hierarchical-lock` or `binary-pair-lock`.
- Stable-binary detection is deliberately soft. It can end a run after a long persistence window, but the scorer does not aggressively reject every temporary hierarchy.
- Planet close passes and planet engagement add bonuses because the planet is more fun when it participates in the dance.

The search samples mass triples around the original trisolaris masses and normalizes them to the same total mass. It also samples the rest of the initial conditions that define the preset:

- stellar triangle scale, rotation, spin, and angular-speed multiplier
- per-star position and velocity perturbations
- planet anchor, host star, radius, phase, direction, tangential speed, and radial speed

That keeps the visible toy pure Newtonian while letting brute force find setups where the planet stays bound, engaged, and beautiful for a long time.

Use `--workers auto` for long runs. It keeps one CPU available and uses the rest for candidate scoring. Use `--workers 1` when debugging deterministic script behavior.
