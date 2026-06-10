export type Body = { x: number; y: number; vx: number; vy: number; m: number; role?: "planet" }
export type Preset = "trisolaris" | "chaos"
export type Rng = () => number
export type MassTriple = readonly [number, number, number]
export type Vec2Tuple = readonly [number, number]

export type TrisolarisSetup = {
  starSide: number
  rotation: number
  spin: -1 | 1
  omegaScale: number
  starPositionJitter: readonly [Vec2Tuple, Vec2Tuple, Vec2Tuple]
  starVelocityJitter: readonly [Vec2Tuple, Vec2Tuple, Vec2Tuple]
  planetAnchor: "star" | "barycenter"
  planetHost: 0 | 1 | 2
  planetRadius: number
  planetPhase: number
  planetDirection: -1 | 1
  planetTangentScale: number
  planetRadialScale: number
  planetMass?: number
}

export type TrisolarisSeed = {
  id?: string
  seed: number
  masses: MassTriple
  setup?: TrisolarisSetup
}

export const PRESETS: Preset[] = ["trisolaris", "chaos"]
export const G = 1
export const SOFT2 = 0.0009 // softening squared; prevents divide-by-zero on close passes
export const DT = 0.0016 // integration step, in world time
export const BASE_SUBSTEPS = 14 // physics steps per frame before the display-speed multiplier
export const SPEEDS = [
  { label: 1, multiplier: 0.0625 },
  { label: 2, multiplier: 0.125 },
  { label: 4, multiplier: 0.25 },
] as const
export const DEFAULT_SPEED = 0 // index into SPEEDS -> 1x display, slowest presentation rate
export const TRAIL = 240 // points kept per body's tail
export const DEFAULT_TRISOLARIS_MASSES: MassTriple = [1.35, 1.0, 0.75]

export function makeRng(seed: number): Rng {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomSeed(rng: Rng = Math.random): number {
  return Math.floor(rng() * 0xffffffff) >>> 0
}

function randomCentered(rng: Rng): number {
  return rng() - 0.5
}

export function cloneBodies(bodies: readonly Body[]): Body[] {
  return bodies.map((b) => ({ ...b }))
}

export function centerOfMass(bodies: readonly Body[]): { x: number; y: number; vx: number; vy: number } {
  let m = 0
  let x = 0
  let y = 0
  let vx = 0
  let vy = 0
  for (const b of bodies) {
    m += b.m
    x += b.x * b.m
    y += b.y * b.m
    vx += b.vx * b.m
    vy += b.vy * b.m
  }
  if (m <= 0) return { x: 0, y: 0, vx: 0, vy: 0 }
  return { x: x / m, y: y / m, vx: vx / m, vy: vy / m }
}

// Subtract the center-of-mass velocity so the whole system does not drift off
// screen; the camera can then hold the center of mass still.
export function zeroMomentum(bodies: Body[]): Body[] {
  const c = centerOfMass(bodies)
  for (const b of bodies) {
    b.vx -= c.vx
    b.vy -= c.vy
  }
  return bodies
}

export function presetBodies(
  p: Preset,
  options: { seed?: number; rng?: Rng; masses?: MassTriple; setup?: TrisolarisSetup } = {},
): Body[] {
  const rng = options.rng ?? (options.seed === undefined ? Math.random : makeRng(options.seed))
  if (p === "trisolaris") {
    // Three suns of unequal mass, started on Lagrange's rotating equilateral
    // triangle. With comparable masses that configuration is unstable, so a
    // small kick tips it from an orderly stable era into a chaotic one.
    const masses = [...(options.masses ?? DEFAULT_TRISOLARIS_MASSES)] as [number, number, number]
    const setup = options.setup
    const Mtot = masses[0] + masses[1] + masses[2]
    const a = setup?.starSide ?? 1.35 // triangle side
    const circum = a / Math.sqrt(3) // centroid to vertex
    const spin = setup?.spin ?? (rng() < 0.5 ? 1 : -1)
    const rot = setup?.rotation ?? rng() * Math.PI * 2
    const omega =
      Math.sqrt((G * Mtot) / (a * a * a)) * (setup?.omegaScale ?? 1 + randomCentered(rng) * 0.03)
    const verts = [0, 1, 2].map((i) => {
      const ang = rot + (i * 2 * Math.PI) / 3
      return { x: Math.cos(ang) * circum, y: Math.sin(ang) * circum }
    })

    let cx = 0
    let cy = 0
    for (let i = 0; i < 3; i++) {
      cx += masses[i] * verts[i].x
      cy += masses[i] * verts[i].y
    }
    cx /= Mtot
    cy /= Mtot

    const stars: Body[] = verts.map((v, i) => {
      const rx = v.x - cx
      const ry = v.y - cy
      const pj = setup?.starPositionJitter[i] ?? [randomCentered(rng) * 0.03, randomCentered(rng) * 0.03]
      const vj = setup?.starVelocityJitter[i] ?? [randomCentered(rng) * 0.022, randomCentered(rng) * 0.022]
      return {
        x: v.x + pj[0],
        y: v.y + pj[1],
        vx: -ry * omega * spin + vj[0],
        vy: rx * omega * spin + vj[1],
        m: masses[i],
      }
    })

    const hostIndex = setup?.planetHost ?? 0
    const host = stars[hostIndex]
    const d = setup?.planetRadius ?? 0.26
    const pa = setup?.planetPhase ?? rng() * Math.PI * 2
    const anchor = setup?.planetAnchor === "barycenter" ? centerOfMass(stars) : host
    const anchorMass = setup?.planetAnchor === "barycenter" ? Mtot : host.m
    const baseSpeed = Math.sqrt((G * anchorMass) / d)
    const direction = setup?.planetDirection ?? spin
    const tangentSpeed = baseSpeed * (setup?.planetTangentScale ?? 1) * direction
    const radialSpeed = baseSpeed * (setup?.planetRadialScale ?? 0)
    const ux = Math.cos(pa)
    const uy = Math.sin(pa)
    const planet: Body = {
      x: anchor.x + ux * d,
      y: anchor.y + uy * d,
      vx: anchor.vx + ux * radialSpeed - uy * tangentSpeed,
      vy: anchor.vy + uy * radialSpeed + ux * tangentSpeed,
      m: setup?.planetMass ?? 0.00006,
      role: "planet",
    }
    return zeroMomentum([...stars, planet])
  }

  const bodies: Body[] = []
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + randomCentered(rng) * 1.2
    const r = 0.7 + rng() * 0.5
    bodies.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      vx: randomCentered(rng) * 0.95,
      vy: randomCentered(rng) * 0.95,
      m: 1,
    })
  }
  return zeroMomentum(bodies)
}

// Pairwise gravitational acceleration, with softening. Newton's third law lets
// us do each pair once.
export function accel(bodies: readonly Body[]): Array<{ ax: number; ay: number }> {
  const acc = bodies.map(() => ({ ax: 0, ay: 0 }))
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].x - bodies[i].x
      const dy = bodies[j].y - bodies[i].y
      const d2 = dx * dx + dy * dy + SOFT2
      const inv = G / (d2 * Math.sqrt(d2))
      const fx = dx * inv
      const fy = dy * inv
      acc[i].ax += fx * bodies[j].m
      acc[i].ay += fy * bodies[j].m
      acc[j].ax -= fx * bodies[i].m
      acc[j].ay -= fy * bodies[i].m
    }
  }
  return acc
}

// One velocity-Verlet step: drift on the half-kick, recompute, kick again.
export function step(bodies: Body[], dt: number) {
  const a = accel(bodies)
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].x += bodies[i].vx * dt + 0.5 * a[i].ax * dt * dt
    bodies[i].y += bodies[i].vy * dt + 0.5 * a[i].ay * dt * dt
  }
  const a2 = accel(bodies)
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].vx += 0.5 * (a[i].ax + a2[i].ax) * dt
    bodies[i].vy += 0.5 * (a[i].ay + a2[i].ay) * dt
  }
}

export function specificEnergy(bodies: readonly Body[], index: number): number {
  const c = centerOfMass(bodies)
  const b = bodies[index]
  const vx = b.vx - c.vx
  const vy = b.vy - c.vy
  let potential = 0
  for (let j = 0; j < bodies.length; j++) {
    if (j === index) continue
    const dx = bodies[j].x - b.x
    const dy = bodies[j].y - b.y
    potential -= (G * bodies[j].m) / Math.sqrt(dx * dx + dy * dy + SOFT2)
  }
  return 0.5 * (vx * vx + vy * vy) + potential
}
