import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads"
import {
  BASE_SUBSTEPS,
  DEFAULT_TRISOLARIS_MASSES,
  DT,
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
  top: 64,
  seed: 0x5eed3b0d,
  checkpoint: ".codex/threebody-search/results-v5.jsonl",
  catalog: "app/games/threebody-catalog.json",
  catalogModule: "app/games/threebody-catalog.ts",
  progressEvery: 100,
  workers: 1,
}

const PLANET_MASS = 0.00006
const TWO_PI = Math.PI * 2

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
    } else if (key === "workers") {
      out.workers = value === "auto" ? 0 : Number(value)
    } else if (["checkpoint", "catalog", "catalogModule"].includes(key)) {
      out[key] = value
    } else {
      throw new Error(`Unknown option --${key}`)
    }
  }
  return out
}

function workerCount(options) {
  if (options.workers === 0) return Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1)
  return Math.max(1, Math.floor(options.workers))
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function writeFileAtomic(filePath, content) {
  ensureDir(filePath)
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`
  let lastError
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      fs.writeFileSync(tmp, content)
      fs.renameSync(tmp, filePath)
      return
    } catch (error) {
      lastError = error
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
      } catch {}
      sleepMs(25 * (attempt + 1))
    }
  }
  throw lastError
}

function roundTo(n, places) {
  const scale = 10 ** places
  return Math.round(n * scale) / scale
}

function roundMass(m) {
  return roundTo(m, 3)
}

function roundParam(n) {
  return roundTo(n, 4)
}

function fmt(n) {
  return fmtPlaces(n, 4)
}

function fmtPlaces(n, places) {
  return Number(n).toFixed(places).replace(/\.?0+$/, "")
}

function massKey(masses) {
  return masses.map((m) => m.toFixed(3)).join(":")
}

function hashString(value) {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

function setupKey(setup) {
  return setup ? hashString(JSON.stringify(setup)) : "legacy"
}

function candidateId(seed, masses, setup) {
  return `m-${massKey(masses).replaceAll(":", "-")}-s-${seed >>> 0}-i-${setupKey(setup)}`
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return []
  const text = fs.readFileSync(filePath, "utf8")
  const endedCleanly = /\r?\n$/.test(text)
  const lines = text.split(/\r?\n/)
  if (lines[lines.length - 1] === "") lines.pop()
  return lines.filter(Boolean).flatMap((line, index) => {
    try {
      return JSON.parse(line)
    } catch (error) {
      if (index === lines.length - 1 && !endedCleanly) {
        console.warn(`${filePath}:${index + 1}: ignored incomplete trailing JSONL record`)
        return []
      }
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
  const far = b.role === "planet" ? 5.6 : 4.4
  const veryFar = b.role === "planet" ? 14 : 7.2
  const positiveEnergyOutward = energy > 0.006 && radialVelocity > 0.012
  const escapeLike = r > far && energy > 0.006 && radialVelocity > 0.012
  const returned = radialVelocity < -0.025 || energy < -0.025 || r < far * 0.68
  const longArc = r > far * 0.7 && r < veryFar && energy < 0.006
  return { r, energy, radialVelocity, positiveEnergyOutward, escapeLike, returned, longArc }
}

export function scoreCandidate(candidate, options = {}) {
  const frames = options.frames ?? DEFAULTS.frames
  const substeps = options.substeps ?? DEFAULTS.substeps
  const bodies = presetBodies("trisolaris", {
    seed: candidate.seed,
    masses: candidate.masses,
    setup: candidate.setup,
  })
  const planetIndex = bodies.findIndex((b) => b.role === "planet")
  const escapeFrames = bodies.map(() => 0)
  const maxEscapeFrames = bodies.map(() => 0)
  const starEscapePersistence = 540
  const planetEscapePersistence = 240
  const stablePersistence = 1500
  const compactPersistence = 900
  const hierarchyPersistence = 1600
  const binaryPairPersistence = 3600

  let decayReason = "frame-limit"
  let danceFrames = frames
  let interestingFrames = 0
  let democraticFrames = 0
  let hierarchyFrames = 0
  let binaryPairFrames = 0
  let systemBoundFrames = 0
  let planetBoundFrames = 0
  let longArcFrames = 0
  let planetLongArcFrames = 0
  let planetEngagedFrames = 0
  let planetClosePasses = 0
  let planetHostFrames = 0
  let planetHostChanges = 0
  let planetHostRun = 0
  let maxPlanetHostRun = 0
  let lastPlanetHost = ""
  const planetHostCounts = new Map()
  const planetCloseHosts = new Set()
  let stableFrames = 0
  let compactFrames = 0
  let maxStableFrames = 0
  let maxCompactFrames = 0
  let maxRadius = 0
  let maxPlanetRadius = 0
  let areaSum = 0
  let closestPair = ""
  let closestPairRun = 0
  let maxClosestPairRun = 0
  let pairChanges = 0
  const seenPairs = new Set()
  const closestPairCounts = new Map()
  let hierarchyLockFrames = 0
  let maxHierarchyLockFrames = 0
  let binaryPairLockFrames = 0
  let maxBinaryPairLockFrames = 0

  for (let frame = 0; frame < frames; frame++) {
    for (let i = 0; i < substeps; i++) step(bodies, DT)

    const pairs = pairStats(bodies)
    areaSum += pairs.area
    if (closestPair === pairs.closestPair) {
      closestPairRun++
    } else {
      if (closestPair) pairChanges++
      closestPairRun = 1
    }
    closestPair = pairs.closestPair
    seenPairs.add(closestPair)
    maxClosestPairRun = Math.max(maxClosestPairRun, closestPairRun)
    closestPairCounts.set(closestPair, (closestPairCounts.get(closestPair) ?? 0) + 1)

    const stableLike = pairs.hierarchy > 4.6 && pairs.minPair < 0.98 && pairs.maxPair > 2.6
    const hierarchyLike = pairs.hierarchy > 2.05 && pairs.minPair < 1.16 && pairs.midPair > 1.25
    const binaryPairLike = pairs.hierarchy > 1.7 && pairs.minPair < 1.18 && pairs.midPair > 1.22
    const democraticLike = pairs.hierarchy < 1.85 && pairs.minPair > 0.5 && pairs.maxPair > 1.0 && pairs.maxPair < 5.4
    const compactLike = pairs.maxPair < 0.62
    if (stableLike) stableFrames++
    else stableFrames = Math.max(0, stableFrames - 4)
    if (hierarchyLike) {
      hierarchyFrames++
      hierarchyLockFrames++
    } else {
      hierarchyLockFrames = Math.max(0, hierarchyLockFrames - 3)
    }
    if (binaryPairLike) {
      binaryPairFrames++
      binaryPairLockFrames++
    } else {
      binaryPairLockFrames = Math.max(0, binaryPairLockFrames - 2)
    }
    if (democraticLike) democraticFrames++
    if (compactLike) compactFrames++
    else compactFrames = Math.max(0, compactFrames - 3)
    maxStableFrames = Math.max(maxStableFrames, stableFrames)
    maxCompactFrames = Math.max(maxCompactFrames, compactFrames)
    maxHierarchyLockFrames = Math.max(maxHierarchyLockFrames, hierarchyLockFrames)
    maxBinaryPairLockFrames = Math.max(maxBinaryPairLockFrames, binaryPairLockFrames)

    let anyEscapeVelocity = false
    let anyLongArc = false
    let planetNearestStar = Infinity
    let planetNearestStarId = ""
    let planetState = null
    const c = centerOfMass(bodies)
    for (let i = 0; i < bodies.length; i++) {
      const state = escapeState(bodies, i)
      if (i === planetIndex) planetState = state
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
        for (let starIndex = 0; starIndex < bodies.length; starIndex++) {
          const star = bodies[starIndex]
          if (star.role === "planet") continue
          const starDistance = Math.hypot(bodies[i].x - star.x, bodies[i].y - star.y)
          if (starDistance < planetNearestStar) {
            planetNearestStar = starDistance
            planetNearestStarId = String(starIndex)
          }
        }
      }
    }

    if (planetNearestStar < 0.9) planetClosePasses++
    if (planetNearestStar < 1.05 && planetNearestStarId) planetCloseHosts.add(planetNearestStarId)
    if (planetNearestStar < 2.2 && planetNearestStarId) {
      planetHostFrames++
      planetHostCounts.set(planetNearestStarId, (planetHostCounts.get(planetNearestStarId) ?? 0) + 1)
      if (lastPlanetHost && lastPlanetHost !== planetNearestStarId) {
        planetHostChanges++
        planetHostRun = 1
      } else {
        planetHostRun++
      }
      lastPlanetHost = planetNearestStarId
      maxPlanetHostRun = Math.max(maxPlanetHostRun, planetHostRun)
    } else {
      planetHostRun = 0
      lastPlanetHost = ""
    }
    if (planetNearestStar < 2.8 || planetState?.longArc) planetEngagedFrames++
    if (!anyEscapeVelocity) systemBoundFrames++
    if (planetState && !planetState.positiveEnergyOutward) planetBoundFrames++
    if (anyLongArc) longArcFrames++
    if (planetState?.longArc) planetLongArcFrames++

    const varied = pairs.area > 0.12 && pairs.maxStarRadius < 7.5
    if (!anyEscapeVelocity && !stableLike && !hierarchyLike && !compactLike && varied && planetNearestStar < 4.2) {
      interestingFrames++
    }

    const escapedIndex = escapeFrames.findIndex((n, index) => {
      const persistence = index === planetIndex ? planetEscapePersistence : starEscapePersistence
      return n > persistence
    })
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
    if (hierarchyLockFrames > hierarchyPersistence) {
      decayReason = "hierarchical-lock"
      danceFrames = frame
      break
    }
    if (binaryPairLockFrames > binaryPairPersistence) {
      decayReason = "binary-pair-lock"
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
  const democraticFraction = democraticFrames / observed
  const hierarchyFraction = hierarchyFrames / observed
  const binaryPairFraction = binaryPairFrames / observed
  const systemBoundFraction = systemBoundFrames / observed
  const planetBoundFraction = planetBoundFrames / observed
  const longArcFraction = longArcFrames / observed
  const planetLongArcFraction = planetLongArcFrames / observed
  const planetEngagedFraction = planetEngagedFrames / observed
  const pairVariety = Math.min(1, (pairChanges + seenPairs.size * 6) / 70)
  const dominantPairFraction = Math.max(0, ...closestPairCounts.values()) / observed
  const pairRunFraction = maxClosestPairRun / observed
  const closePassFraction = Math.min(1, planetClosePasses / observed)
  const planetHostFraction = planetHostFrames / observed
  const planetHostChangeRate = (planetHostChanges / observed) * 1000
  const planetSwitchScore = Math.min(1, planetHostChangeRate / 0.75)
  const planetHostCoverage = Math.min(1, planetCloseHosts.size / 3)
  const planetHostDominance =
    planetHostFrames > 0 ? Math.max(0, ...planetHostCounts.values()) / Math.max(1, planetHostFrames) : 1
  const planetHostRunFraction = maxPlanetHostRun / observed
  let planetHostEntropy = 0
  if (planetHostFrames > 0) {
    for (const count of planetHostCounts.values()) {
      const p = count / planetHostFrames
      planetHostEntropy -= p * Math.log(p)
    }
    planetHostEntropy /= Math.log(3)
  }
  const averageArea = areaSum / Math.max(1, danceFrames)
  const radiusPenalty = Math.min(0.22, Math.max(0, maxRadius - 42) / 160)
  const planetEscapePressure =
    planetIndex >= 0 ? Math.min(1, (maxEscapeFrames[planetIndex] ?? 0) / planetEscapePersistence) : 1
  const hierarchyLockPressure = Math.min(1, maxHierarchyLockFrames / hierarchyPersistence)
  const binaryPairLockPressure = Math.min(1, maxBinaryPairLockFrames / binaryPairPersistence)

  const qualityMultiplier =
    0.3 +
    interestingFraction * 0.28 +
    democraticFraction * 0.3 +
    systemBoundFraction * 0.12 +
    planetBoundFraction * 0.34 +
    Math.min(0.16, longArcFraction * 0.28) +
    Math.min(0.16, planetLongArcFraction * 0.28) +
    pairVariety * 0.1 +
    closePassFraction * 0.06 +
    planetEngagedFraction * 0.06 +
    planetSwitchScore * 0.2 +
    planetHostEntropy * 0.1 +
    planetHostCoverage * 0.14
  const hierarchyPenalty = Math.min(
    0.8,
    hierarchyFraction * 0.42 +
      binaryPairFraction * 0.34 +
      Math.max(0, dominantPairFraction - 0.5) * 0.5 +
      Math.max(0, pairRunFraction - 0.38) * 0.48 +
      hierarchyLockPressure * 0.32 +
      binaryPairLockPressure * 0.36,
  )
  const pairDominancePenalty = Math.min(0.24, Math.max(0, pairRunFraction - 0.36) * 0.38)
  const planetHostPenalty = Math.min(
    0.34,
    Math.max(0, planetHostDominance - 0.64) * 0.28 +
      Math.max(0, planetHostRunFraction - 0.42) * 0.26 +
      (1 - planetHostCoverage) * planetHostFraction * 0.18,
  )
  const stabilityPenalty =
    Math.min(0.16, (maxStableFrames + maxCompactFrames) / Math.max(1, observed) / 10) +
    hierarchyPenalty +
    pairDominancePenalty +
    planetHostPenalty
  const escapePressurePenalty = planetEscapePressure * 0.2
  const decayPenalty =
    decayReason === "planet-escape"
      ? 0.38
      : decayReason === "star-escape"
        ? 0.22
        : decayReason === "stable-binary" ||
            decayReason === "hierarchical-lock" ||
            decayReason === "binary-pair-lock" ||
            decayReason === "compact-lock"
          ? 0.16
          : 0
  const score = Math.round(
    danceFrames *
      Math.max(0.05, qualityMultiplier - stabilityPenalty - escapePressurePenalty - decayPenalty - radiusPenalty),
  )

  return {
    id: candidate.id ?? candidateId(candidate.seed, candidate.masses, candidate.setup),
    seed: candidate.seed >>> 0,
    masses: candidate.masses.map(roundMass),
    setup: candidate.setup ? roundSetup(candidate.setup) : undefined,
    score,
    danceFrames,
    simulatedFrames: frames,
    decayReason,
    quality: {
      interestingFraction: Number(interestingFraction.toFixed(3)),
      democraticFraction: Number(democraticFraction.toFixed(3)),
      hierarchyFraction: Number(hierarchyFraction.toFixed(3)),
      binaryPairFraction: Number(binaryPairFraction.toFixed(3)),
      systemBoundFraction: Number(systemBoundFraction.toFixed(3)),
      boundFraction: Number(systemBoundFraction.toFixed(3)),
      planetBoundFraction: Number(planetBoundFraction.toFixed(3)),
      longArcFraction: Number(longArcFraction.toFixed(3)),
      planetLongArcFraction: Number(planetLongArcFraction.toFixed(3)),
      planetEngagedFraction: Number(planetEngagedFraction.toFixed(3)),
      pairChanges,
      pairVariety: Number(pairVariety.toFixed(3)),
      dominantPairFraction: Number(dominantPairFraction.toFixed(3)),
      pairRunFraction: Number(pairRunFraction.toFixed(3)),
      planetClosePasses,
      planetHostChanges,
      planetSwitchScore: Number(planetSwitchScore.toFixed(3)),
      planetHostCoverage: Number(planetHostCoverage.toFixed(3)),
      planetHostEntropy: Number(planetHostEntropy.toFixed(3)),
      planetHostDominance: Number(planetHostDominance.toFixed(3)),
      planetHostRunFraction: Number(planetHostRunFraction.toFixed(3)),
      averageArea: Number(averageArea.toFixed(3)),
      maxRadius: Number(maxRadius.toFixed(2)),
      maxPlanetRadius: Number(maxPlanetRadius.toFixed(2)),
      radiusPenalty: Number(radiusPenalty.toFixed(3)),
      planetEscapePressure: Number(planetEscapePressure.toFixed(3)),
      hierarchyPenalty: Number(hierarchyPenalty.toFixed(3)),
      hierarchyLockPressure: Number(hierarchyLockPressure.toFixed(3)),
      binaryPairLockPressure: Number(binaryPairLockPressure.toFixed(3)),
      planetHostPenalty: Number(planetHostPenalty.toFixed(3)),
      maxStableFrames,
      maxHierarchyLockFrames,
      maxBinaryPairLockFrames,
      maxCompactFrames,
      maxEscapeFrames,
    },
  }
}

function sampleMasses(rng, index) {
  if (index % 5 === 0) return [...DEFAULT_TRISOLARIS_MASSES]
  const total = DEFAULT_TRISOLARIS_MASSES.reduce((a, b) => a + b, 0)
  const masses = DEFAULT_TRISOLARIS_MASSES.map((m) => m * Math.exp((rng() * 2 - 1) * 0.46)).sort((a, b) => b - a)
  const scale = total / masses.reduce((a, b) => a + b, 0)
  return masses.map((m) => roundMass(m * scale))
}

function randomCentered(rng) {
  return rng() - 0.5
}

function sampleVecJitter(rng, amplitude) {
  return [roundParam(randomCentered(rng) * amplitude), roundParam(randomCentered(rng) * amplitude)]
}

function samplePlanetHost(rng, masses) {
  const weights = masses.map((m) => m ** 1.4)
  const total = weights.reduce((a, b) => a + b, 0)
  let pick = rng() * total
  for (let i = 0; i < weights.length; i++) {
    pick -= weights[i]
    if (pick <= 0) return i
  }
  return 0
}

function sampleSetup(rng, masses) {
  const spin = rng() < 0.5 ? 1 : -1
  const starSide = roundParam(1.08 + rng() * 0.74)
  const posJitter = 0.006 + rng() * rng() * 0.085
  const velJitter = 0.004 + rng() * rng() * 0.06
  const planetAnchor = rng() < 0.84 ? "star" : "barycenter"
  const planetHost = samplePlanetHost(rng, masses)
  const planetRadius =
    planetAnchor === "star"
      ? roundParam(0.16 + rng() * rng() * 0.7)
      : roundParam(0.24 + rng() * rng() * 1.1)
  const planetTangentScale = roundParam(0.52 + rng() * 0.78)
  const planetRadialScale = roundParam(randomCentered(rng) * (0.08 + rng() * 0.56))

  return {
    starSide,
    rotation: roundParam(rng() * TWO_PI),
    spin,
    omegaScale: roundParam(0.91 + rng() * 0.18),
    starPositionJitter: [
      sampleVecJitter(rng, posJitter),
      sampleVecJitter(rng, posJitter),
      sampleVecJitter(rng, posJitter),
    ],
    starVelocityJitter: [
      sampleVecJitter(rng, velJitter),
      sampleVecJitter(rng, velJitter),
      sampleVecJitter(rng, velJitter),
    ],
    planetAnchor,
    planetHost,
    planetRadius,
    planetPhase: roundParam(rng() * TWO_PI),
    planetDirection: rng() < 0.84 ? spin : -spin,
    planetTangentScale,
    planetRadialScale,
  }
}

function roundSetup(setup) {
  const vec = (v) => [roundParam(v[0]), roundParam(v[1])]
  return {
    starSide: roundParam(setup.starSide),
    rotation: roundParam(setup.rotation),
    spin: setup.spin,
    omegaScale: roundParam(setup.omegaScale),
    starPositionJitter: setup.starPositionJitter.map(vec),
    starVelocityJitter: setup.starVelocityJitter.map(vec),
    planetAnchor: setup.planetAnchor,
    planetHost: setup.planetHost,
    planetRadius: roundParam(setup.planetRadius),
    planetPhase: roundParam(setup.planetPhase),
    planetDirection: setup.planetDirection,
    planetTangentScale: roundParam(setup.planetTangentScale),
    planetRadialScale: roundParam(setup.planetRadialScale),
    planetMass:
      setup.planetMass === undefined || Math.abs(setup.planetMass - PLANET_MASS) < 1e-12
        ? undefined
        : roundTo(setup.planetMass, 6),
  }
}

function nextCandidate(rng, index, seen) {
  for (let attempts = 0; attempts < 500; attempts++) {
    const masses = sampleMasses(rng, index + attempts)
    const seed = Math.floor(rng() * 0xffffffff) >>> 0
    const setup = sampleSetup(rng, masses)
    const id = candidateId(seed, masses, setup)
    if (!seen.has(id)) return { id, seed, masses, setup }
  }
  throw new Error("Could not generate a new candidate after 500 attempts")
}

function sortRecords(records) {
  return [...records].sort((a, b) => b.score - a.score || b.danceFrames - a.danceFrames)
}

function formatMassTuple(masses) {
  return `[${masses.map((m) => fmt(m)).join(", ")}]`
}

function formatVec(v) {
  return `[${fmt(v[0])}, ${fmt(v[1])}]`
}

function formatSetup(setup) {
  if (!setup) return ""
  return (
    "{ " +
    [
      `starSide: ${fmt(setup.starSide)}`,
      `rotation: ${fmt(setup.rotation)}`,
      `spin: ${setup.spin}`,
      `omegaScale: ${fmt(setup.omegaScale)}`,
      `starPositionJitter: [${setup.starPositionJitter.map(formatVec).join(", ")}]`,
      `starVelocityJitter: [${setup.starVelocityJitter.map(formatVec).join(", ")}]`,
      `planetAnchor: "${setup.planetAnchor}"`,
      `planetHost: ${setup.planetHost}`,
      `planetRadius: ${fmt(setup.planetRadius)}`,
      `planetPhase: ${fmt(setup.planetPhase)}`,
      `planetDirection: ${setup.planetDirection}`,
      `planetTangentScale: ${fmt(setup.planetTangentScale)}`,
      `planetRadialScale: ${fmt(setup.planetRadialScale)}`,
      setup.planetMass === undefined ? null : `planetMass: ${fmtPlaces(setup.planetMass, 6)}`,
    ]
      .filter(Boolean)
      .join(", ") +
    " }"
  )
}

function coreImportSpecifier(filePath) {
  const moduleDir = path.resolve(path.dirname(filePath))
  const corePath = path.resolve("app/games/threebody-core")
  let specifier = path.relative(moduleDir, corePath).replaceAll(path.sep, "/")
  if (!specifier.startsWith(".")) specifier = `./${specifier}`
  return specifier
}

function writeCatalogModule(filePath, records, options) {
  const sorted = sortRecords(records).slice(0, options.top)
  const entries = sorted
    .map((record) => {
      const setup = record.setup ? `, setup: ${formatSetup(record.setup)}` : ""
      return `  { id: "${record.id}", seed: ${record.seed >>> 0}, masses: ${formatMassTuple(record.masses)}${setup} },`
    })
    .join("\n")
  writeFileAtomic(
    filePath,
    `import type { TrisolarisSeed } from "${coreImportSpecifier(filePath)}"\n\n` +
      `// Generated by scripts/threebody-search.mjs. Edit the search inputs, not this file.\n` +
      `export const TRISOLARIS_SEEDS: TrisolarisSeed[] = [\n${entries}\n]\n`,
  )
}

function writeCatalog(filePath, records, options) {
  if (records.length === 0 && options.candidates === 0 && options.seconds === 0) {
    throw new Error(`No records found in checkpoint ${options.checkpoint}`)
  }
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

  writeFileAtomic(
    filePath,
    `${JSON.stringify(
      {
        schema: 4,
        generatedAt: new Date().toISOString(),
        source: {
          checkpoint: options.checkpoint,
          records: records.length,
          frames: options.frames,
          substeps: options.substeps,
          workers: workerCount(options),
        },
        scoring: {
          summary:
            "Higher scores favor long Newtonian runs where the planet remains bound, switches stellar hosts, and the stellar dance stays broad, democratic, and varied. Bound long arcs are rewarded; persistent positive-energy planet escape and long-lived binary or circumbinary hierarchy are penalized hard.",
          hardDecay: ["star-escape", "planet-escape", "hierarchical-lock", "binary-pair-lock", "compact-lock"],
          softDecay: ["stable-binary"],
          searchSpace:
            "Mass triples, stellar triangle scale, stellar phase/spin/velocity perturbations, and planet anchor, host, radius, phase, tangential speed, and radial speed.",
        },
        massSummary,
        candidates: sorted.map((record, index) => ({
          rank: index + 1,
          id: record.id,
          seed: record.seed,
          masses: record.masses,
          setup: record.setup,
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

function tryWriteCatalog(filePath, records, options) {
  try {
    writeCatalog(filePath, records, options)
  } catch (error) {
    console.warn(`catalog write skipped: ${error.message}`)
  }
}

function readCatalog(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"))
  return parsed.candidates ?? []
}

function printSummary(records, options) {
  const sorted = sortRecords(records).slice(0, Math.min(10, options.top))
  console.log(`records ${records.length}`)
  console.log(`frames per run ${options.frames}`)
  console.log(`workers ${workerCount(options)}`)
  console.log(`checkpoint ${options.checkpoint}`)
  console.log(`catalog ${options.catalog}`)
  console.log(`catalog module ${options.catalogModule}`)
  console.log("top candidates")
  for (const [index, record] of sorted.entries()) {
    const setup = record.setup
      ? ` anchor=${record.setup.planetAnchor} host=${record.setup.planetHost} pr=${record.setup.planetRadius} vt=${record.setup.planetTangentScale} vr=${record.setup.planetRadialScale}`
      : ""
    console.log(
      `${String(index + 1).padStart(2, " ")} score=${record.score} dance=${record.danceFrames} reason=${record.decayReason} seed=${record.seed} masses=${record.masses.join(",")}${setup}`,
    )
  }
}

function shouldContinue(completed, started, options) {
  const underCount = options.candidates > 0 ? completed < options.candidates : false
  const underTime = options.seconds > 0 ? Date.now() - started < options.seconds * 1000 : false
  return underCount || underTime
}

function appendRecord(filePath, record) {
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`)
}

function progress(records, completed, options) {
  tryWriteCatalog(options.catalog, records, options)
  console.log(`searched ${completed} new / ${records.length} total; best=${sortRecords(records)[0]?.score ?? 0}`)
}

async function runSerial(options, records, rng, seen) {
  const started = Date.now()
  let completed = 0
  while (shouldContinue(completed, started, options)) {
    const candidate = nextCandidate(rng, records.length + completed, seen)
    seen.add(candidate.id)
    const record = scoreCandidate(candidate, options)
    records.push(record)
    appendRecord(options.checkpoint, record)
    completed++
    if (completed % options.progressEvery === 0) progress(records, completed, options)
  }
}

async function runParallel(options, records, rng, seen) {
  const started = Date.now()
  const count = workerCount(options)
  let completed = 0
  let submitted = 0
  let inFlight = 0
  let settled = false

  await new Promise((resolve, reject) => {
    const workers = Array.from({ length: count }, () => new Worker(new URL(import.meta.url), { workerData: options }))

    const fail = (error) => {
      if (settled) return
      settled = true
      for (const worker of workers) worker.terminate().catch(() => {})
      reject(error)
    }

    const dispatch = (worker) => {
      if (settled) return
      if (!shouldContinue(submitted, started, options)) {
        if (inFlight === 0) {
          settled = true
          for (const w of workers) w.postMessage({ type: "stop" })
          resolve()
        }
        return
      }
      let candidate
      try {
        candidate = nextCandidate(rng, records.length + submitted, seen)
      } catch (error) {
        fail(error)
        return
      }
      seen.add(candidate.id)
      submitted++
      inFlight++
      worker.postMessage({ type: "score", candidate })
    }

    for (const worker of workers) {
      worker.on("message", (message) => {
        if (message.type === "record") {
          inFlight--
          records.push(message.record)
          appendRecord(options.checkpoint, message.record)
          completed++
          if (completed % options.progressEvery === 0) progress(records, completed, options)
          dispatch(worker)
        } else if (message.type === "error") {
          fail(new Error(message.error))
        }
      })
      worker.on("error", fail)
      worker.on("exit", (code) => {
        if (!settled && code !== 0) fail(new Error(`worker exited with code ${code}`))
      })
      dispatch(worker)
    }
  })
}

async function workerMain() {
  parentPort.on("message", (message) => {
    if (message.type === "stop") {
      process.exit(0)
      return
    }
    try {
      const record = scoreCandidate(message.candidate, workerData)
      parentPort.postMessage({ type: "record", record })
    } catch (error) {
      parentPort.postMessage({ type: "error", error: error.stack ?? error.message })
    }
  })
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
  if (workerCount(options) > 1 && (options.candidates > 0 || options.seconds > 0)) {
    await runParallel(options, records, rng, seen)
  } else {
    await runSerial(options, records, rng, seen)
  }

  writeCatalog(options.catalog, records, options)
  printSummary(records, options)
}

if (isMainThread) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
} else {
  workerMain().catch((error) => {
    parentPort?.postMessage({ type: "error", error: error.stack ?? error.message })
  })
}
