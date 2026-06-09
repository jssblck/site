import fs from "node:fs"
import path from "node:path"
import {
  BASE_SUBSTEPS,
  DEFAULT_TRISOLARIS_MASSES,
  DT,
  G,
  centerOfMass,
  makeRng,
  presetBodies,
  specificEnergy,
  step,
} from "../app/games/threebody-core.ts"

const DEFAULTS = {
  candidates: 120,
  frames: 9000,
  seconds: 0,
  substeps: BASE_SUBSTEPS,
  top: 24,
  seed: 0x5eed3b0d,
  checkpoint: ".codex/threebody-search/results-v2.jsonl",
  catalog: "app/games/threebody-catalog.json",
  catalogModule: "app/games/threebody-catalog.ts",
  progressEvery: 100,
}

function parseArgs(argv) {
  const out = { ...DEFAULTS, verifyCatalog: false }
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--verify-catalog") {
      out.verifyCatalog = true
      continue
    }
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`)
    const key = arg.slice(2)
    const value = argv[i + 1]
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for --${key}`)
    i++
    if (["candidates", "frames", "seconds", "substeps", "top", "seed", "progressEvery"].includes(key)) {
      out[key] = Number(value)
    } else if (["checkpoint", "catalog", "catalogModule"].includes(key)) {
      out[key] = value
    } else {
      throw new Error(`Unknown option --${key}`)
    }
  }
  return out
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function roundMass(m) {
  return Math.round(m * 1000) / 1000
}

function massKey(masses) {
  return masses.map((m) => m.toFixed(3)).join(":")
}

function candidateId(seed, masses) {
  return `m-${massKey(masses).replaceAll(":", "-")}-s-${seed >>> 0}`
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return []
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line)
      } catch (error) {
        throw new Error(`${filePath}:${index + 1}: invalid JSONL: ${error.message}`)
      }
    })
}

function covarianceArea(points) {
  let mx = 0
  let my = 0
  for (const p of points) {
    mx += p.x
    my += p.y
  }
  mx /= points.length
  my /= points.length
  let xx = 0
  let yy = 0
  let xy = 0
  for (const p of points) {
    const dx = p.x - mx
    const dy = p.y - my
    xx += dx * dx
    yy += dy * dy
    xy += dx * dy
  }
  xx /= points.length
  yy /= points.length
  xy /= points.length
  const tr = xx + yy
  const det = xx * yy - xy * xy
  const root = Math.sqrt(Math.max(0, tr * tr * 0.25 - det))
  return Math.sqrt(Math.max(0, (tr * 0.5 + root) * (tr * 0.5 - root)))
}

function pairStats(bodies) {
  const stars = bodies
    .map((body, index) => ({ body, index }))
    .filter(({ body }) => body.role !== "planet")
  const pairs = []
  for (let a = 0; a < stars.length; a++) {
    for (let b = a + 1; b < stars.length; b++) {
      const dx = stars[b].body.x - stars[a].body.x
      const dy = stars[b].body.y - stars[a].body.y
      pairs.push({
        id: `${stars[a].index}:${stars[b].index}`,
        d: Math.hypot(dx, dy),
      })
    }
  }
  pairs.sort((a, b) => a.d - b.d)
  const c = centerOfMass(stars.map(({ body }) => body))
  let maxStarRadius = 0
  for (const { body } of stars) {
    maxStarRadius = Math.max(maxStarRadius, Math.hypot(body.x - c.x, body.y - c.y))
  }
  return {
    closestPair: pairs[0]?.id ?? "none",
    minPair: pairs[0]?.d ?? Infinity,
    midPair: pairs[1]?.d ?? Infinity,
    maxPair: pairs[2]?.d ?? 0,
    hierarchy: (pairs[1]?.d ?? 1) / Math.max(pairs[0]?.d ?? 1, 1e-6),
    area: covarianceArea(stars.map(({ body }) => ({ x: body.x - c.x, y: body.y - c.y }))),
    maxStarRadius,
  }
}

function escapeState(bodies, index) {
  const c = centerOfMass(bodies)
  const b = bodies[index]
  const dx = b.x - c.x
  const dy = b.y - c.y
  const r = Math.hypot(dx, dy)
  const radialVelocity = ((b.vx - c.vx) * dx + (b.vy - c.vy) * dy) / Math.max(r, 1e-6)
  const energy = specificEnergy(bodies, index)
  const far = b.role === "planet" ? 5.8 : 4.4
  const veryFar = b.role === "planet" ? 9.5 : 7.2
  const positiveEnergyOutward = energy > 0.012 && radialVelocity > 0.015
  const escapeLike = r > far && energy > 0.012 && radialVelocity > 0.015
  const returned = radialVelocity < -0.025 || energy < -0.025 || r < far * 0.7
  const longArc = r > far * 0.72 && r < veryFar && energy < 0.018
  return { r, energy, radialVelocity, positiveEnergyOutward, escapeLike, returned, longArc }
}

export function scoreCandidate(candidate, options = {}) {
  const frames = options.frames ?? DEFAULTS.frames
  const substeps = options.substeps ?? DEFAULTS.substeps
  const bodies = presetBodies("trisolaris", {
    seed: candidate.seed,
    masses: candidate.masses,
  })
  const escapeFrames = bodies.map(() => 0)
  const maxEscapeFrames = bodies.map(() => 0)
  const escapePersistence = 540
  const stablePersistence = 1800
  const compactPersistence = 900

  let decayReason = "frame-limit"
  let danceFrames = frames
  let interestingFrames = 0
  let boundFrames = 0
  let longArcFrames = 0
  let planetClosePasses = 0
  let stableFrames = 0
  let compactFrames = 0
  let maxStableFrames = 0
  let maxCompactFrames = 0
  let maxRadius = 0
  let maxPlanetRadius = 0
  let areaSum = 0
  let closestPair = ""
  let pairChanges = 0
  const seenPairs = new Set()

  for (let frame = 0; frame < frames; frame++) {
    for (let i = 0; i < substeps; i++) step(bodies, DT)

    const pairs = pairStats(bodies)
    areaSum += pairs.area
    if (closestPair && closestPair !== pairs.closestPair) pairChanges++
    closestPair = pairs.closestPair
    seenPairs.add(closestPair)

    const stableLike = pairs.hierarchy > 5.2 && pairs.minPair < 0.95 && pairs.maxPair > 2.8
    const compactLike = pairs.maxPair < 0.62
    if (stableLike) stableFrames++
    else stableFrames = Math.max(0, stableFrames - 4)
    if (compactLike) compactFrames++
    else compactFrames = Math.max(0, compactFrames - 3)
    maxStableFrames = Math.max(maxStableFrames, stableFrames)
    maxCompactFrames = Math.max(maxCompactFrames, compactFrames)

    let anyEscapeVelocity = false
    let anyLongArc = false
    let planetNearestStar = Infinity
    const c = centerOfMass(bodies)
    for (let i = 0; i < bodies.length; i++) {
      const state = escapeState(bodies, i)
      maxRadius = Math.max(maxRadius, state.r)
      if (bodies[i].role === "planet") maxPlanetRadius = Math.max(maxPlanetRadius, state.r)
      if (state.longArc) anyLongArc = true
      if (state.positiveEnergyOutward) anyEscapeVelocity = true
      if (state.escapeLike) {
        escapeFrames[i]++
        maxEscapeFrames[i] = Math.max(maxEscapeFrames[i], escapeFrames[i])
      } else if (state.returned) {
        escapeFrames[i] = 0
      } else {
        escapeFrames[i] = Math.max(0, escapeFrames[i] - 2)
      }

      if (bodies[i].role === "planet") {
        for (const star of bodies) {
          if (star.role === "planet") continue
          planetNearestStar = Math.min(planetNearestStar, Math.hypot(bodies[i].x - star.x, bodies[i].y - star.y))
        }
      }
    }

    if (planetNearestStar < 0.85) planetClosePasses++
    if (!anyEscapeVelocity) boundFrames++
    if (anyLongArc) longArcFrames++

    const varied = pairs.area > 0.12 && pairs.maxStarRadius < 7.5
    if (!anyEscapeVelocity && !stableLike && !compactLike && varied) interestingFrames++

    const escapedIndex = escapeFrames.findIndex((n) => n > escapePersistence)
    if (escapedIndex >= 0) {
      decayReason = bodies[escapedIndex].role === "planet" ? "planet-escape" : "star-escape"
      danceFrames = frame
      break
    }
    if (stableFrames > stablePersistence) {
      decayReason = "stable-binary"
      danceFrames = frame
      break
    }
    if (compactFrames > compactPersistence) {
      decayReason = "compact-lock"
      danceFrames = frame
      break
    }

    const systemDrift = Math.hypot(c.x, c.y)
    if (!Number.isFinite(systemDrift) || !bodies.every((b) => Number.isFinite(b.x + b.y + b.vx + b.vy))) {
      decayReason = "non-finite"
      danceFrames = frame
      break
    }
  }

  const observed = Math.max(1, danceFrames)
  const interestingFraction = interestingFrames / observed
  const boundFraction = boundFrames / observed
  const longArcFraction = longArcFrames / observed
  const pairVariety = Math.min(1, (pairChanges + seenPairs.size * 6) / 70)
  const closePassFraction = Math.min(1, planetClosePasses / observed)
  const averageArea = areaSum / Math.max(1, danceFrames)
  const radiusPenalty = Math.min(0.18, Math.max(0, maxRadius - 42) / 180)

  const qualityMultiplier =
    0.62 +
    interestingFraction * 0.33 +
    boundFraction * 0.18 +
    Math.min(0.18, longArcFraction * 0.36) +
    pairVariety * 0.12 +
    closePassFraction * 0.06
  const stabilityPenalty = Math.min(0.16, (maxStableFrames + maxCompactFrames) / Math.max(1, observed) / 10)
  const score = Math.round(danceFrames * Math.max(0.2, qualityMultiplier - stabilityPenalty - radiusPenalty))

  return {
    id: candidate.id ?? candidateId(candidate.seed, candidate.masses),
    seed: candidate.seed >>> 0,
    masses: candidate.masses.map(roundMass),
    score,
    danceFrames,
    simulatedFrames: frames,
    decayReason,
    quality: {
      interestingFraction: Number(interestingFraction.toFixed(3)),
      boundFraction: Number(boundFraction.toFixed(3)),
      longArcFraction: Number(longArcFraction.toFixed(3)),
      pairChanges,
      pairVariety: Number(pairVariety.toFixed(3)),
      planetClosePasses,
      averageArea: Number(averageArea.toFixed(3)),
      maxRadius: Number(maxRadius.toFixed(2)),
      maxPlanetRadius: Number(maxPlanetRadius.toFixed(2)),
      radiusPenalty: Number(radiusPenalty.toFixed(3)),
      maxStableFrames,
      maxCompactFrames,
      maxEscapeFrames,
    },
  }
}

function sampleMasses(rng, index) {
  if (index % 5 === 0) return [...DEFAULT_TRISOLARIS_MASSES]
  const total = DEFAULT_TRISOLARIS_MASSES.reduce((a, b) => a + b, 0)
  const masses = DEFAULT_TRISOLARIS_MASSES.map((m) => m * Math.exp((rng() * 2 - 1) * 0.42)).sort((a, b) => b - a)
  const scale = total / masses.reduce((a, b) => a + b, 0)
  return masses.map((m) => roundMass(m * scale))
}

function nextCandidate(rng, index, seen) {
  for (let attempts = 0; attempts < 500; attempts++) {
    const masses = sampleMasses(rng, index + attempts)
    const seed = Math.floor(rng() * 0xffffffff) >>> 0
    const id = candidateId(seed, masses)
    if (!seen.has(id)) return { id, seed, masses }
  }
  throw new Error("Could not generate a new candidate after 500 attempts")
}

function sortRecords(records) {
  return [...records].sort((a, b) => b.score - a.score || b.danceFrames - a.danceFrames)
}

function formatMassTuple(masses) {
  return `[${masses.map((m) => Number(m).toFixed(3).replace(/\.?0+$/, "")).join(", ")}]`
}

function writeCatalogModule(filePath, records, options) {
  const sorted = sortRecords(records).slice(0, options.top)
  ensureDir(filePath)
  const entries = sorted
    .map(
      (record) =>
        `  { id: "${record.id}", seed: ${record.seed >>> 0}, masses: ${formatMassTuple(record.masses)} },`,
    )
    .join("\n")
  fs.writeFileSync(
    filePath,
    `import type { TrisolarisSeed } from "./threebody-core"\n\n` +
      `// Generated by scripts/threebody-search.mjs. Edit the search inputs, not this file.\n` +
      `export const TRISOLARIS_SEEDS: TrisolarisSeed[] = [\n${entries}\n]\n`,
  )
}

function writeCatalog(filePath, records, options) {
  const sorted = sortRecords(records).slice(0, options.top)
  const massGroups = new Map()
  for (const record of records) {
    const key = massKey(record.masses)
    const current = massGroups.get(key) ?? { masses: record.masses, count: 0, bestScore: 0, bestDanceFrames: 0 }
    current.count++
    current.bestScore = Math.max(current.bestScore, record.score)
    current.bestDanceFrames = Math.max(current.bestDanceFrames, record.danceFrames)
    massGroups.set(key, current)
  }
  const massSummary = [...massGroups.values()]
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, 12)

  ensureDir(filePath)
  fs.writeFileSync(
    filePath,
    `${JSON.stringify(
      {
        schema: 1,
        generatedAt: new Date().toISOString(),
        source: {
          checkpoint: options.checkpoint,
          records: records.length,
          frames: options.frames,
          substeps: options.substeps,
        },
        scoring: {
          summary:
            "Higher scores favor long periods where all bodies remain bound while the stellar dance stays broad and varied. Long outbound arcs are rewarded when they do not persist as positive-energy escapes.",
          hardDecay: ["star-escape", "planet-escape", "compact-lock"],
          softDecay: ["stable-binary"],
        },
        massSummary,
        candidates: sorted.map((record, index) => ({
          rank: index + 1,
          id: record.id,
          seed: record.seed,
          masses: record.masses,
          score: record.score,
          danceFrames: record.danceFrames,
          decayReason: record.decayReason,
          quality: record.quality,
        })),
      },
      null,
      2,
    )}\n`,
  )
  writeCatalogModule(options.catalogModule, records, options)
}

function readCatalog(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"))
  return parsed.candidates ?? []
}

function printSummary(records, options) {
  const sorted = sortRecords(records).slice(0, Math.min(10, options.top))
  console.log(`records ${records.length}`)
  console.log(`frames per run ${options.frames}`)
  console.log(`checkpoint ${options.checkpoint}`)
  console.log(`catalog ${options.catalog}`)
  console.log(`catalog module ${options.catalogModule}`)
  console.log("top candidates")
  for (const [index, record] of sorted.entries()) {
    console.log(
      `${String(index + 1).padStart(2, " ")} score=${record.score} dance=${record.danceFrames} reason=${record.decayReason} seed=${record.seed} masses=${record.masses.join(",")}`,
    )
  }
}

async function main() {
  const options = parseArgs(process.argv)
  if (options.verifyCatalog) {
    const candidates = readCatalog(options.catalog)
    const records = candidates.map((candidate) => scoreCandidate(candidate, options))
    printSummary(records, options)
    return
  }

  ensureDir(options.checkpoint)
  const existing = readJsonl(options.checkpoint)
  const seen = new Set(existing.map((record) => record.id))
  const records = [...existing]
  const rng = makeRng(options.seed + existing.length * 1013904223)
  const started = Date.now()
  let completed = 0

  while (completed < options.candidates || (options.seconds > 0 && Date.now() - started < options.seconds * 1000)) {
    if (options.seconds > 0 && Date.now() - started >= options.seconds * 1000) break
    const candidate = nextCandidate(rng, records.length + completed, seen)
    seen.add(candidate.id)
    const record = scoreCandidate(candidate, options)
    records.push(record)
    fs.appendFileSync(options.checkpoint, `${JSON.stringify(record)}\n`)
    completed++
    if (completed % options.progressEvery === 0) {
      writeCatalog(options.catalog, records, options)
      console.log(`searched ${completed} new / ${records.length} total; best=${sortRecords(records)[0]?.score ?? 0}`)
    }
  }

  writeCatalog(options.catalog, records, options)
  printSummary(records, options)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
